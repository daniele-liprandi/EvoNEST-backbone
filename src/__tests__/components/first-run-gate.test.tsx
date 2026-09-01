import { render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { FirstRunGate } from "@/components/first-run-gate"
import { checkConfigExists } from "@/utils/config-utils"

const originalFetch = global.fetch

function mockFetch(handler: (url: string) => unknown) {
  global.fetch = jest.fn((url: string) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(handler(String(url))) }),
  ) as unknown as typeof fetch
}

afterEach(() => {
  global.fetch = originalFetch
  jest.clearAllMocks()
})

describe("checkConfigExists", () => {
  test("one request; true when sampletypes has data", async () => {
    mockFetch(() => ({ type: "sampletypes", data: [{ value: "animal" }] }))
    await expect(checkConfigExists()).resolves.toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith("/api/config/types?type=sampletypes")
  })

  test("false when sampletypes is empty or missing", async () => {
    mockFetch(() => ({ data: [] }))
    await expect(checkConfigExists()).resolves.toBe(false)
  })

  test("false when the request fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch
    jest.spyOn(console, "error").mockImplementation(() => {})
    await expect(checkConfigExists()).resolves.toBe(false)
  })
})

describe("FirstRunGate", () => {
  test("renders children once a config exists", async () => {
    mockFetch(() => ({ data: [{ value: "animal" }] }))
    render(<FirstRunGate><div>the app</div></FirstRunGate>)
    expect(await screen.findByText("the app")).toBeInTheDocument()
  })

  test("blocks with the setup wizard when there is no config", async () => {
    mockFetch((url) => (url.includes("presets") ? [] : { data: [] }))
    render(<FirstRunGate><div>the app</div></FirstRunGate>)
    await waitFor(() => expect(screen.getByText("About your lab")).toBeInTheDocument())
    expect(screen.queryByText("the app")).not.toBeInTheDocument()
  })
})
