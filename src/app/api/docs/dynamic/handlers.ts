import { Effect } from "effect";
// swagger-jsdoc ships no type declarations.
// @ts-expect-error - untyped module
import swaggerJSDoc from "swagger-jsdoc";
import { ok, InternalError } from "@/lib/effect";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EvoNEST API",
      version: "2.0.0",
      description: `
# EvoNEST General Documentation

**The EvoNEST User documentation and the EvoNEST Developer Docs are found here**: https://daniele-liprandi.github.io/EvoNEST-backbone/

# EvoNEST API Documentation

The EvoNEST API allows users to interact with the MongoDB databases generated in their NEST, plus it gives access to utility functions useful in ecological, evolutionary and biological research.

## Features

- **Samples Management**: Create, update, and retrieve biological samples with taxonomic information
- **Traits Measurement**: Record and analyze trait measurements with statistical calculations
- **Experiments**: Manage measurements, documents and raw data
- **File Storage**: Upload and manage research files with metadata
- **User Management**: Handle user accounts and permissions
- **Utilities**: Geocoding, species image search, and data processing tools

## Authentication

Most endpoints require proper authentication and database access permissions.

## Data Format

All endpoints return JSON data unless otherwise specified. Dates are in ISO 8601 format.
      `,
      contact: {
        name: "Daniele Liprandi",
        email: "daniele.liprandi@gmail.com",
        url: "https://github.com/daniele-liprandi/EvoNEST-backbone",
      },
      license: {
        name: "GNU Affero General Public License v3.0",
        url: "https://opensource.org/licenses/AGPL-3.0",
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "development"
            ? "http://localhost:3005"
            : process.env.NEXTAUTH_URL || "http://localhost:3002",
        description:
          process.env.NODE_ENV === "development" ? "Development server" : "Production server",
      },
    ],
    tags: [
      { name: "Users", description: "User account management and authentication" },
      { name: "Samples", description: "Biological sample management and taxonomic data" },
      { name: "Traits", description: "Trait measurements and statistical analysis" },
      { name: "Experiments", description: "Experimental procedures and raw data management" },
      { name: "Files", description: "File upload, storage, and metadata management" },
      {
        name: "Utilities",
        description: "Helper functions for geocoding, image search, and data processing",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        sessionAuth: { type: "apiKey", in: "cookie", name: "session" },
        // Used by the /ext export routes. The key must travel in a header —
        // a key in the URL leaks into access logs, proxy logs and Referer.
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
          description: "EvoNEST API key. Also accepted as 'Authorization: Bearer <key>'.",
        },
      },
    },
    security: [{ bearerAuth: [] }, { sessionAuth: [] }],
  },
  apis: [
    "./src/app/api/**/route.js",
    "./src/app/api/**/route.ts",
    "./src/app/api/**/route.tsx",
  ],
};

export const getOpenApiSpec = Effect.gen(function* () {
  const spec = yield* Effect.try({
    try: () => swaggerJSDoc(options) as Record<string, unknown> & { info: Record<string, unknown> },
    catch: (cause) => new InternalError({ message: "Failed to generate OpenAPI specification", cause }),
  });

  spec.info.generatedAt = new Date().toISOString();
  spec.info["x-generator"] = "swagger-jsdoc";
  spec.info["x-source"] = "JSDoc comments in API route files";

  return yield* ok(spec, {
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
});
