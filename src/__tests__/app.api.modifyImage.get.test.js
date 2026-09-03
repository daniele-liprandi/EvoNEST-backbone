/** @jest-environment node */

jest.mock("sharp", () => {
  const chain = {
    metadata: jest.fn().mockResolvedValue({ width: 200, height: 200 }),
    extend: jest.fn(() => chain),
    composite: jest.fn(() => chain),
    png: jest.fn(() => chain),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from("png")),
  };
  return jest.fn(() => chain);
});

const { Effect } = require("effect");
const { runRoute, testAuth, testNoAuth } = require("@/lib/effect");
const { labelQrImage } = require("@/app/api/modifyImage/handlers");

const authed = testAuth({ sub: "u1", name: "T" });

const okImageResponse = () =>
  new Response(Buffer.from("img"), { status: 200, headers: { "content-type": "image/png" } });

const call = (qrcodeurl, extra = "", layer = authed) =>
  runRoute(
    labelQrImage(
      new Request(`http://localhost/api/modifyImage?qrcodeurl=${encodeURIComponent(qrcodeurl)}${extra}`),
    ).pipe(Effect.provide(layer)),
  );

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = jest.fn().mockResolvedValue(okImageResponse());
});
afterEach(() => jest.restoreAllMocks());

describe("GET /api/modifyImage URL validation", () => {
  test("fetches from an allowed host", async () => {
    const res = await call("https://barcodeapi.org/api/qr/ABC");
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("401 without a session", async () => {
    const res = await call("https://barcodeapi.org/api/qr/ABC", "", testNoAuth);
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test.each([
    ["a disallowed host", "https://evil.example.com/x.png"],
    ["an internal address", "https://169.254.169.254/latest/meta-data/"],
    ["a non-https scheme", "http://barcodeapi.org/api/qr/ABC"],
    ["a file scheme", "file:///etc/passwd"],
    ["a non-URL", "not-a-url"],
  ])("rejects %s with 400 and never fetches", async (_label, url) => {
    const res = await call(url);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("propagates a download failure as 500", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("aborted"));
    expect((await call("https://barcodeapi.org/api/qr/ABC")).status).toBe(500);
  });

  test("rejects an oversized image with 500", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(Buffer.from("img"), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(10 * 1024 * 1024) },
      }),
    );
    expect((await call("https://barcodeapi.org/api/qr/ABC")).status).toBe(500);
  });
});
