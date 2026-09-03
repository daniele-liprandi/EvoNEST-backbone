import crypto from "crypto";

/**
 * Generates a random API key with the EvoNEST prefix.
 * @param {number} length - Length of the random part (default: 32)
 * @returns {string} Generated API key
 */
export function generateApiKey(length = 32) {
  const safeLength = Math.max(16, length);
  const token = crypto
    .randomBytes(Math.ceil((safeLength * 3) / 4))
    .toString("base64url")
    .slice(0, safeLength);
  return `evo_${token}`;
}
