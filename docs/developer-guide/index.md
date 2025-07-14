# Developer Guide

Welcome to the EvoNEST Developer Guide. This page helps you get started with development, testing, and contributing.

## Quick Links

- **[Sample Cards Development](./component-development.md)** – Modular card system for sample pages
- **[Experiment Parser Development](./experiment-parser-development.md)** – Create custom parsers for automatic trait generation
- **[Measurement to Trait Mapping](./experiment-to-trait.md)** – How to map experiments to traits, in order to automatically generate traits for a certain sample based on the uploaded measurement file.

## Prerequisites

- **Docker & Docker Compose** (all development is containerized)
- **VSCode** (recommended editor)
- **.env files** for configuration (see `.env.example`)

## Environment Configuration

Copy `.env.example` to `.env.development` or `.env.production` and set your secrets:

```bash
NEXTAUTH_URL=http://localhost:3005
NEXTAUTH_SECRET=your-secret-here
MONGODB_URI=mongodb://root:pass@mongo_dev:27017
STORAGE_PATH=/usr/evonest/file_storage_dev
```

## Running the App (Development)

```bash
docker-compose -f docker-compose.dev.yml up -d
```
- App: [http://localhost:3005](http://localhost:3005)
- Mongo Express: [http://localhost:8081](http://localhost:8081)

## API Documentation

Interactive API docs are available at:
- [http://localhost:3005/api-docs](http://localhost:3005/api-docs) (dev)
- [http://localhost:3000/api-docs](http://localhost:3000/api-docs) (prod)

Docs are auto-generated from Swagger annotations in `src/app/api`.

## Testing

- **API tests** are recommended
- **Migration scripts must have tests** (see `src/migrations/*/migration.test.js`)
- Run all tests:
  ```bash
  npm test
  ```

## Project Structure

```
EvoNext/
├── src/
│   ├── app/           # Next.js app & API
│   ├── components/    # UI components
│   ├── hooks/         # React hooks
│   ├── lib/           # Utilities
│   ├── utils/         # Helpers
│   └── middleware.js
├── public/            # Static assets
├── docs/              # Documentation
├── backup_scripts/    # DB backup scripts
├── migrations/        # DB migrations (with tests)
└── docker-compose.yml # Docker config
```

## Troubleshooting

See the [Quick Start Guide](../getting-started/quick-start.md#common-issues) for common Docker and MongoDB issues.

---

For more, see the README and in-code comments. This guide is intentionally minimal and focused on getting started quickly.
