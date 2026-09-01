import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Cache variables
let cachedNotifications = null
let cacheTimestamp = null
const CACHE_DURATION = 2.5 * 60 * 1000 // 2.5 minutes in milliseconds

// Sent on every response so the browser (and any CDN in front of this route)
// also cache the result, instead of every open tab's 5-minute poll always
// reaching this handler.
const CACHE_CONTROL = `public, max-age=${Math.round(CACHE_DURATION / 1000)}, stale-while-revalidate=3600`

// Memoized app version, read once from package.json, for minVersion/maxVersion
// gating below. `undefined` means "not yet read"; `null` means "read failed".
let appVersion
function getAppVersion() {
  if (appVersion !== undefined) return appVersion
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
    appVersion = pkg.version || null
  } catch {
    appVersion = null
  }
  return appVersion
}

function parseVersion(v) {
  const parts = String(v ?? '').split('.').map((p) => parseInt(p, 10) || 0)
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

function compareVersions(a, b) {
  const [a1, a2, a3] = parseVersion(a)
  const [b1, b2, b3] = parseVersion(b)
  return a1 - b1 || a2 - b2 || a3 - b3
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

// The feed originally used { name, description, icon, color, time }, with a
// homegrown "yymmdd-hh:mm" timestamp. Both shapes are accepted here so the
// feed repo can move to the current one on its own schedule.
function legacyTimeToIso(time) {
  const match = /^(\d{2})(\d{2})(\d{2})-(\d{2}):(\d{2})$/.exec(time || '')
  if (!match) return null
  const [, yy, mm, dd, hh, min] = match
  const date = new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min)))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeNotification(raw, index) {
  const title = raw.title || raw.name || 'Update'
  const date = raw.date || legacyTimeToIso(raw.time) || new Date(0).toISOString()
  return {
    id: raw.id || `${slugify(title)}-${slugify(date)}` || `notification-${index}`,
    date,
    title,
    body: raw.body || raw.description || '',
    level: raw.level || 'info',
    link: raw.link || null,
    icon: raw.icon || null,
    color: raw.color || null,
  }
}

// A notification can name the app version range it applies to, so a
// deployment on an older build doesn't get told about a feature it doesn't
// have yet. No range on the item means "always visible".
function isVisibleForVersion(raw) {
  const version = getAppVersion()
  if (!version) return true // can't tell our own version -> don't hide anything
  if (raw.minVersion && compareVersions(version, raw.minVersion) < 0) return false
  if (raw.maxVersion && compareVersions(version, raw.maxVersion) > 0) return false
  return true
}

function prepareNotifications(rawList) {
  return (Array.isArray(rawList) ? rawList : [])
    .filter(isVisibleForVersion)
    .map(normalizeNotification)
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Stable identifier — the client uses this to remember dismissals
 *           example: "taxon-rename-2026-09-01"
 *         date:
 *           type: string
 *           format: date-time
 *           description: When the notification was published
 *           example: "2026-09-01T10:00:00Z"
 *         title:
 *           type: string
 *           example: "Bulk taxon rename"
 *         body:
 *           type: string
 *           description: Notification content
 *           example: "You can now rename a taxon across a whole selection of samples."
 *         level:
 *           type: string
 *           enum: [info, warning, critical]
 *           example: "info"
 *         link:
 *           type: string
 *           nullable: true
 *           example: "https://github.com/daniele-liprandi/EvoNEST-backbone/releases"
 *         icon:
 *           type: string
 *           nullable: true
 *           example: "💬"
 *         color:
 *           type: string
 *           nullable: true
 *           example: "#3b82f6"
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get developer news
 *     description: |
 *       Retrieves the developer news feed shown from the bell icon, with caching and fallback.
 *
 *       **Caching:**
 *       - In-memory cache for 2.5 minutes, plus a `next.revalidate`-backed fetch
 *         cache on the upstream request and a `Cache-Control` header on the
 *         response, so a cold instance doesn't re-fetch on every poll either.
 *
 *       **Fallback, in order:**
 *       1. External JSON source (`NOTIFICATIONS_URL`, defaulting to the public EvoNEST-news feed)
 *       2. Cached data (even if expired) when the external source fails
 *       3. Local `public/notifications.json` as the final fallback
 *
 *       Items accept either the current schema (`id`, `date`, `title`, `body`,
 *       `level`) or the legacy one (`name`, `description`, `time`); an item
 *       naming `minVersion`/`maxVersion` is hidden outside that app version range.
 *     tags:
 *       - Utilities
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       206:
 *         description: Partial content - retrieved from a fallback source
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 warning:
 *                   type: string
 *                   example: "Using cached data due to external source failure"
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch notifications: 503"
 *       500:
 *         description: Failed to fetch notifications from all sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch notifications from all sources"
 */
export async function GET() {
  try {
    // Check if we have cached data that's still valid
    const now = Date.now()
    if (cachedNotifications && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(prepareNotifications(cachedNotifications), {
        headers: { 'Cache-Control': CACHE_CONTROL },
      })
    }

    // Override the news feed with NOTIFICATIONS_URL; the default is the public
    // EvoNEST-news feed so a fresh install still shows release notes.
    const NOTIFICATIONS_URL =
      process.env.NOTIFICATIONS_URL ||
      "https://raw.githubusercontent.com/daniele-liprandi/EvoNEST-news/refs/heads/main/notifications.json"

    const response = await fetch(NOTIFICATIONS_URL, {
      // Next's fetch cache, shared across instances, backs up the in-memory
      // cache above (which is per-instance and lost on every cold start).
      next: { revalidate: Math.round(CACHE_DURATION / 1000) },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`)
    }

    const notifications = await response.json()

    // Update cache
    cachedNotifications = notifications
    cacheTimestamp = now

    return NextResponse.json(prepareNotifications(notifications), {
      headers: { 'Cache-Control': CACHE_CONTROL },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)

    // If we have cached data, return it even if it's expired
    if (cachedNotifications) {
      return NextResponse.json({
        notifications: prepareNotifications(cachedNotifications),
        warning: 'Using cached data due to external source failure',
        error: error.message
      }, { status: 206, headers: { 'Cache-Control': CACHE_CONTROL } }) // 206 Partial Content - we have some data but not fresh
    }

    // Fallback to local file if external source fails and no cache
    try {
      const filePath = path.join(process.cwd(), 'public', 'notifications.json')
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const fallbackNotifications = JSON.parse(fileContents)

      // Cache the fallback data too
      cachedNotifications = fallbackNotifications
      cacheTimestamp = Date.now()

      return NextResponse.json({
        notifications: prepareNotifications(fallbackNotifications),
        warning: 'Using local fallback data due to external source failure',
        error: error.message
      }, { status: 206, headers: { 'Cache-Control': CACHE_CONTROL } }) // 206 Partial Content - we have fallback data
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
      return NextResponse.json({
        error: 'Failed to fetch notifications from all sources',
        details: {
          primaryError: error.message,
          fallbackError: fallbackError.message
        }
      }, { status: 500 })
    }
  }
}
