/**
 * Returns a headers object containing the service authentication key.
 * Merge this into the headers of every internal fetch call so that the
 * Next.js route handlers can identify requests as coming from the Mastra service.
 */
export function serviceAuthHeader(): Record<string, string> {
  const secret = process.env.MASTRA_SERVICE_SECRET
  return secret ? { 'x-service-key': secret } : {}
}
