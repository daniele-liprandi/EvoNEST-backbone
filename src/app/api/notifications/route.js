import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Cache variables
let cachedNotifications = null
let cacheTimestamp = null
const CACHE_DURATION = 2.5 * 60 * 1000 // 2.5 minutes in milliseconds

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique notification identifier
 *           example: "notif_001"
 *         title:
 *           type: string
 *           description: Notification title
 *           example: "System Maintenance"
 *         message:
 *           type: string
 *           description: Notification content
 *           example: "The system will be down for maintenance on..."
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           description: Notification type
 *           example: "info"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the notification was created
 *           example: "2024-03-15T10:30:00Z"
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: Notification priority level
 *           example: "medium"
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get system notifications
 *     description: |
 *       Retrieves all current system notifications from an external JSON source with intelligent caching and fallback mechanisms.
 *       
 *       **Caching Strategy:**
 *       - Responses are cached for 2.5 minutes to improve performance
 *       - Fresh data is fetched from external source when cache expires
 *       - Cache is updated automatically on successful external fetch
 *       **Fallback Strategy:**
 *       1. External JSON source (currently hardcoded due to environment variable configuration issues)
 *       2. Cached data (even if expired) when external source fails
 *       3. Local notifications.json file as final fallback
 *       
 *       **Current Implementation Note:**
 *       - `NOTIFICATIONS_URL` is temporarily hardcoded to "https://raw.githubusercontent.com/daniele-liprandi/EvoNEST-news/refs/heads/main/notifications.json"
 *       - This is a temporary workaround due to environment variable configuration issues
 *       - Future versions should properly configure this as an environment variable
 *     tags:
 *       - Utilities
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully from external source
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *             examples:
 *               cached_response:
 *                 summary: Cached response (returned within 2.5 minutes)
 *                 description: Fast response from in-memory cache
 *               fresh_response:
 *                 summary: Fresh response (after cache expiration)
 *                 description: New data fetched from external source
 *       206:
 *         description: Partial content - notifications retrieved from fallback source due to external source failure
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
 *                   description: Warning message about fallback usage
 *                   example: "Using cached data due to external source failure"
 *                 error:
 *                   type: string
 *                   description: Details about the original error
 *                   example: "Failed to fetch notifications: 503"
 *             examples:
 *               cached_fallback:
 *                 summary: Using expired cached data
 *                 description: External source failed, returning stale cached data
 *               local_fallback:
 *                 summary: Using local file fallback
 *                 description: External source failed and no cache available, using local file
 *       500:
 *         description: Failed to fetch notifications from all sources (external, cache, and local fallback)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch notifications"
 */
export async function GET() {
 
  try {
    // Check if we have cached data that's still valid
    const now = Date.now()
    if (cachedNotifications && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedNotifications)
    }

    // HACK IT DOESN"T WORK WTHHHHH Fetch notifications from external source
    const NOTIFICATIONS_URL = "https://raw.githubusercontent.com/daniele-liprandi/EvoNEST-news/refs/heads/main/notifications.json"
    
    if (!NOTIFICATIONS_URL) {
      throw new Error('NOTIFICATIONS_URL environment variable not set', Object.keys(process.env))
    }

    const response = await fetch(NOTIFICATIONS_URL, {
      // Disable Next.js caching to ensure fresh data
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.status}`)
    }

    const notifications = await response.json()

    // Update cache
    cachedNotifications = notifications
    cacheTimestamp = now

    // Send the notifications as a response
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    
    // If we have cached data, return it even if it's expired
    if (cachedNotifications) {
      return NextResponse.json({
        notifications: cachedNotifications,
        warning: 'Using cached data due to external source failure',
        error: error.message
      }, { status: 206 }) // 206 Partial Content - we have some data but not fresh
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
        notifications: fallbackNotifications,
        warning: 'Using local fallback data due to external source failure',
        error: error.message
      }, { status: 206 }) // 206 Partial Content - we have fallback data
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