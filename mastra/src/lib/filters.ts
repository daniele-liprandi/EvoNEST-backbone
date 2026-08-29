/**
 * Filter helpers shared by the query tools.
 *
 * Filter params come from the language model (via /api/nlfilter) or, for the
 * standalone query tools, straight from a tool call. Neither source is trusted,
 * so keys are validated before they reach MongoDB.
 */

/** Strip the _gte / _lte range suffix to get the underlying field name. */
export function baseField(key: string): string {
  return key.replace(/_(gte|lte)$/, '')
}

/**
 * Drop any filter key that is a MongoDB operator, a dotted path, or (when a
 * column list is given) not a real column. Returns the safe params and the
 * list of rejected keys for logging.
 */
export function sanitizeFilterParams(
  params: Record<string, string>,
  allowedColumns?: string[],
): { params: Record<string, string>; rejected: string[] } {
  const allowed = allowedColumns ? new Set(allowedColumns) : null
  const safe: Record<string, string> = {}
  const rejected: string[] = []

  for (const [key, value] of Object.entries(params)) {
    const field = baseField(key)
    const bad =
      key.startsWith('$') ||
      key.includes('.') ||
      field.length === 0 ||
      (allowed !== null && !allowed.has(field))
    if (bad) {
      rejected.push(key)
      continue
    }
    safe[key] = value
  }

  return { params: safe, rejected }
}

// Sorts after any real ISO timestamp, so an upper bound of "2024-03-20"
// still matches the stored value "2024-03-20T14:00:00Z".
const DAY_END = String.fromCharCode(0xffff)

/**
 * Turn URL-style filter params into a MongoDB filter document.
 *
 * Date fields are stored as ISO strings, and the UI (useUrlFilters) compares
 * them lexicographically on the YYYY-MM-DD prefix. The _gte / _lte branches
 * mirror that with string bounds rather than Date objects, which never
 * matched a string field.
 */
export function buildMongoFilter(params: Record<string, string>): Record<string, unknown> {
  const mongo: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue
    if (key.endsWith('_gte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $gte: value.slice(0, 10) }
    } else if (key.endsWith('_lte')) {
      const field = key.slice(0, -4)
      mongo[field] = { ...mongo[field], $lte: value.slice(0, 10) + DAY_END }
    } else if (value.includes('*')) {
      const pattern = '^' + value
        .split('*')
        .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') + '$'
      mongo[key] = { $regex: new RegExp(pattern, 'i') }
    } else if (value.includes(',')) {
      mongo[key] = { $in: value.split(',').map((v) => v.trim()).filter(Boolean) }
    } else {
      mongo[key] = value
    }
  }
  return mongo
}

export function buildFilterUrl(entity: 'samples' | 'traits', params: Record<string, string>): string {
  const path = entity === 'samples' ? '/samples/general' : '/traits'
  const qs = new URLSearchParams(params).toString()
  return qs ? `${path}?${qs}` : path
}
