#!/usr/bin/env node

/**
 * Generate OpenAPI specification for static documentation
 * This script replicates the logic from /api/docs/dynamic/route.js
 * but runs in a Node.js environment without Next.js dependencies
 */

const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

console.log('Generating OpenAPI specification...');

// Check if API files exist
const fs = require('fs');
const glob = require('glob');

// Find API files
const apiFiles = [
  './src/app/api/**/route.js',
  './src/app/api/**/route.ts',
  './src/app/api/**/route.tsx',
];

// Get all matching files
const allFiles = [];
apiFiles.forEach(pattern => {
  const files = glob.sync(pattern);
  allFiles.push(...files);
});

console.log(`Found ${allFiles.length} API files to process`);
// swagger-jsdoc configuration (matches your API route)
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EvoNEST API',
      version: '2.0.0',
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
        name: 'Daniele Liprandi',
        email: 'daniele.liprandi@gmail.com',
        url: 'https://github.com/daniele-liprandi/EvoNEST-backbone'
      },
      license: {
        name: 'GNU Affero General Public License v3.0',
        url: 'https://opensource.org/licenses/AGPL-3.0'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'Users',
        description: 'User account management and authentication'
      },
      {
        name: 'Samples',
        description: 'Biological sample management and taxonomic data'
      },
      {
        name: 'Traits',
        description: 'Trait measurements and statistical analysis'
      },
      {
        name: 'Experiments',
        description: 'Experimental procedures and raw data management'
      },
      {
        name: 'Files',
        description: 'File upload, storage, and metadata management'
      },
      {
        name: 'Utilities',
        description: 'Helper functions for geocoding, image search, and data processing'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      },
      {
        sessionAuth: []
      }
    ]
  },
  // Scan all API routes for JSDoc comments
  apis: apiFiles.flatMap(pattern => glob.sync(pattern)),
};

try {
  if (options.apis.length === 0) {
    console.log('No API files found. Creating minimal spec...');
    const minimalSpec = {
      ...options.definition,
      paths: {},
      components: { schemas: {} }
    };
    
    // Write minimal specification
    const outputPath = path.join(process.cwd(), 'openapi-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(minimalSpec, null, 2));
    console.log('Minimal OpenAPI specification generated!');
    return;
  }

  // Test each file individually to find problematic ones
  const workingFiles = [];
  
  for (const file of options.apis) {
    try {
      const testOptions = {
        ...options,
        apis: [file]
      };
      swaggerJSDoc(testOptions);
      workingFiles.push(file);
    } catch (error) {
      console.log(`Warning: Skipping ${file} due to parsing error: ${error.message}`);
    }
  }
  
  console.log(`Processing ${workingFiles.length}/${options.apis.length} files successfully`);
  
  // Generate spec with working files only
  const finalOptions = {
    ...options,
    apis: workingFiles
  };
  
  const swaggerSpec = swaggerJSDoc(finalOptions);
  
  // Add generation metadata
  swaggerSpec.info.generatedAt = new Date().toISOString();
  swaggerSpec.info['x-generator'] = 'swagger-jsdoc (static build)';
  swaggerSpec.info['x-source'] = 'JSDoc comments in API route files';
  swaggerSpec.info['x-build-context'] = 'GitHub Actions';

  // Write the specification to a file
  const outputPath = path.join(process.cwd(), 'openapi-spec.json');
  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
  
  console.log('OpenAPI specification generated successfully!');
  console.log(`Output: ${outputPath}`);
  console.log(`Found ${Object.keys(swaggerSpec.paths || {}).length} API endpoints`);
  console.log(`Found ${Object.keys(swaggerSpec.components?.schemas || {}).length} schema definitions`);
  
  if (workingFiles.length < options.apis.length) {
    console.log(`Warning: ${options.apis.length - workingFiles.length} files were skipped due to parsing errors`);
  }

} catch (error) {
  console.error('Error generating OpenAPI specification:', error.message);
  
  // Try to create a minimal spec as fallback
  console.log('Attempting to create minimal fallback spec...');
  try {
    const fallbackSpec = {
      ...options.definition,
      paths: {},
      components: { schemas: {} },
      info: {
        ...options.definition.info,
        description: options.definition.info.description + '\n\n**Note: This is a fallback specification due to parsing errors.**'
      }
    };
    
    const outputPath = path.join(process.cwd(), 'openapi-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(fallbackSpec, null, 2));
    console.log('Fallback OpenAPI specification created');
    process.exit(0); // Exit successfully with fallback
  } catch (fallbackError) {
    console.error('Failed to create fallback spec:', fallbackError.message);
    process.exit(1);
  }
}
