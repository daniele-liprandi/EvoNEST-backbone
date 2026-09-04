import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { SWRConfig } from "swr"
import { useCurrentUser } from "@/hooks/useCurrentUser"

let session: unknown = { user: { name: "admin", sub: "demo|admin" } }
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: session, status: "authenticated" }),
}))

const originalFetch = global.fetch

// Mirror the global SWRConfig fetcher: throw on a non-OK response.
function mockFetch(handler: (url: string) => { status?: number; body: unknown }) {
  global.fetch = jest.fn((url: string) => {
    const { status = 200, body } = handler(String(url))
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    })
  }) as unknown as typeof fetch
}

function Probe() {
  const { isAdmin, userError } = useCurrentUser()
  return (
    <div>
      <span data-testid="isAdmin">{String(isAdmin)}</span>
      <span data-testid="error">{userError ? "error" : "ok"}</span>
    </div>
  )
}

const renderProbe = () =>
  render(
    <SWRConfig
      value={{
        dedupingInterval: 0,
        provider: () => new Map(),
        fetcher: async (url: string) => {
          const res = await fetch(url)
          if (!res.ok) {
            const e = new Error("fetch failed") as Error & { status: number }
            e.status = res.status
            throw e
          }
          return res.json()
        },
      }}
    >
      <Probe />
    </SWRConfig>,
  )

afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
  session = { user: { name: "admin", sub: "demo|admin" } }
})

test("a signed-in admin reads back as admin", async () => {
  mockFetch((url) =>
    url.endsWith("/role")
      ? { body: { role: "admin", isAdmin: true, capabilities: [] } }
      : { body: { auth0id: "demo|admin", role: "admin" } },
  )
  renderProbe()
  await waitFor(() => expect(screen.getByTestId("isAdmin")).toHaveTextContent("true"))
})

test("a 401 on the role route surfaces as an error, not a silent non-admin", async () => {
  mockFetch(() => ({ status: 401, body: { error: "Unauthorized", code: "unauthorized" } }))
  renderProbe()
  await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("error"))
  expect(screen.getByTestId("isAdmin")).toHaveTextContent("false")
})
