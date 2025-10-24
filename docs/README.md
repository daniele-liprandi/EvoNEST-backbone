# EvoNEST Documentation

This directory contains the source files for the EvoNEST documentation website, built with [VitePress](https://vitepress.dev/).

## Local Development with Docker

### Prerequisites

- Docker and Docker Compose
- Basic familiarity with Docker

### Setup

1. Navigate to the docs directory:
```bash
cd docs
```

2. Build and start the development server:
```bash
docker-compose up
```

The documentation will be available at `http://localhost:5173`

### Alternative: One-time setup
```bash
# Build the image
docker-compose build

# Start development server
docker-compose up docs
```

## Building for Production

```bash
# Build the documentation
docker-compose --profile build run --rm docs-build

# The built files will be in .vitepress/dist/
```

## Alternative Node.js Setup (if you have Node.js installed)

```bash
npm install
npm run docs:dev      # Development
npm run docs:build    # Production build
npm run docs:preview  # Preview build
```

## Documentation Structure

```
docs/
├── .vitepress/
│   └── config.js          # VitePress configuration
├── public/                # Static assets
├── getting-started/       # Getting started guides
├── user-docs/           # User documentation
├── developer-docs/      # Developer documentation
└── index.md             # Homepage
```

## Contributing to Documentation

1. Create a new branch for your changes
2. Make your edits to the relevant markdown files
3. Test locally with `npm run docs:dev`
4. Submit a pull request

### Writing Guidelines

- Use clear, concise language
- Include code examples where appropriate
- Add images or diagrams for complex concepts
- Follow the existing structure and style
- Test all links and code examples

## Deployment

The documentation is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment is handled by the GitHub Actions workflow in `.github/workflows/docs.yml`.

## Configuration

Key configuration options in `.vitepress/config.js`:

- **base**: Set to your repository name for GitHub Pages
- **title**: Site title
- **description**: Site description
- **themeConfig**: Navigation, sidebar, and theme settings

Make sure to update the GitHub repository URL and other links to match your actual repository.
