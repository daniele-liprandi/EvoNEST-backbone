import type { NextRequest } from 'next/server'

/**
 * Returns true when the request carries a valid MASTRA_SERVICE_SECRET header.
 * Used by routes that are excluded from the NextAuth middleware (proxy.js) so
 * that they remain accessible to the Mastra service but not to unauthenticated
 * external callers.
 *
 * Browser clients that have a session should fall through to a normal
 * getServerSession() check — this function only handles service-to-service auth.
 */
export function isServiceRequest(request: NextRequest): boolean {
  const secret = process.env.MASTRA_SERVICE_SECRET
  if (!secret) return false
  return request.headers.get('x-service-key') === secret
}
