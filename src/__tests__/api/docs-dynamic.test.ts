/** @jest-environment node */

import { runRoute } from "@/lib/effect";
import { getOpenApiSpec } from "@/app/api/docs/dynamic/handlers";

describe("GET /api/docs/dynamic", () => {
  test("returns a generated OpenAPI 3 spec with the route paths", async () => {
    const res = await runRoute(getOpenApiSpec);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);
    const spec = await res.json();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info["x-generator"]).toBe("swagger-jsdoc");
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(["/api/samples", "/api/traits"]));
  });
});
