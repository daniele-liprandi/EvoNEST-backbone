import swaggerJSDoc from "swagger-jsdoc";
import { NextResponse } from "next/server";
import path from "path";

/**
 * @swagger
 * /api/docs/dynamic:
 *   get:
 *     summary: Get dynamically generated OpenAPI specification
 *     description: This endpoint uses swagger-jsdoc to automatically scan API route files and generate OpenAPI spec from JSDoc comments
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: OpenAPI specification generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Complete OpenAPI 3.0 specification
 */
export async function GET() {
  try {
    // swagger-jsdoc configuration
    const options = {
      definition: {
        openapi: "3.0.0",
        info: {
          title: "EvoNEST API",
          version: "1.1.0",
          description: `
# EvoNEST General Documentation

**The EvoNEST User Guide and the EvoNEST Developer Guide are found here**: https://daniele-liprandi.github.io/EvoNEST-backbone/

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
                : "http://localhost:3000",
            description:
              process.env.NODE_ENV === "development"
                ? "Development server"
                : "Production server",
          },
        ],
        tags: [
          {
            name: "Users",
            description: "User account management and authentication",
          },
          {
            name: "Samples",
            description: "Biological sample management and taxonomic data",
          },
          {
            name: "Traits",
            description: "Trait measurements and statistical analysis",
          },
          {
            name: "Experiments",
            description: "Experimental procedures and raw data management",
          },
          {
            name: "Files",
            description: "File upload, storage, and metadata management",
          },
          {
            name: "Utilities",
            description:
              "Helper functions for geocoding, image search, and data processing",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
            sessionAuth: {
              type: "apiKey",
              in: "cookie",
              name: "session",
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
          {
            sessionAuth: [],
          },
        ],
      },
      // Automatically scan all API routes
      apis: ["./src/app/api/**/route.js", "./src/app/api/**/route.ts"],
    };

    // Generate OpenAPI specification
    const swaggerSpec = swaggerJSDoc(options);

    // Add some runtime information
    swaggerSpec.info.generatedAt = new Date().toISOString();
    swaggerSpec.info["x-generator"] = "swagger-jsdoc";
    swaggerSpec.info["x-source"] = "JSDoc comments in API route files";

    return NextResponse.json(swaggerSpec, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating OpenAPI spec:", error);
    return NextResponse.json(
      {
        error: "Failed to generate OpenAPI specification",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
