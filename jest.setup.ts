// Polyfills for Node built-ins that the jsdom test environment does not expose
// but that dependencies (whatwg-url via the mongodb driver, etc.) rely on.
import { TextEncoder, TextDecoder } from 'util'

if (typeof globalThis.TextEncoder === 'undefined') {
  // @ts-expect-error - Node's TextEncoder is assignable at runtime
  globalThis.TextEncoder = TextEncoder
}
if (typeof globalThis.TextDecoder === 'undefined') {
  // @ts-expect-error - Node's TextDecoder is assignable at runtime
  globalThis.TextDecoder = TextDecoder
}

// Modules that read a required env var at import time need a value under test.
// The filesystem and database are mocked in the code paths under test; these are
// placeholders. The Mongo URI has a short server-selection timeout so a test
// that forgets to mock the client fails in ~1s instead of hanging.
process.env.STORAGE_PATH ||= '/tmp/evonest-test-storage'
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/evonest-test?serverSelectionTimeoutMS=1000'
