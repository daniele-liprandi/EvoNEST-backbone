# Contributing to EvoNEST

Thank you for your interest in contributing to EvoNEST! We welcome contributions from the community to help improve this platform for biodiversity research.

## Table of contents

- [Code of conduct](#code-of-conduct)
- [How can I contribute?](#how-can-i-contribute)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Coding standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. We are committed to providing a welcoming experience for everyone, regardless of background or identity.

## How can I contribute?

There are many ways to contribute to EvoNEST:

### Reporting bugs

If you find a bug, please create an issue on our [GitHub repository](https://github.com/daniele-liprandi/EvoNEST-backbone/issues) with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots (if applicable)
- Your environment details (OS, browser, Docker version)

### Suggesting enhancements

We welcome feature requests! Please open an issue with:

- A clear description of the feature
- Why this feature would be useful
- Potential implementation approach (if you have ideas)
- Examples or mockups (if applicable)

### Contributing code

We accept pull requests for:

- Bug fixes
- New features
- Performance improvements
- Documentation improvements
- Test coverage improvements

### Contributing documentation

Documentation improvements are always welcome! This includes:

- Fixing typos or clarifying existing docs
- Adding examples and tutorials
- Translating documentation
- Writing guides for specific use cases

## Getting started

### Prerequisites

Before you start contributing, make sure you have:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- [Git](https://git-scm.com/) installed
- [Node.js](https://nodejs.org/) (v18 or higher) for local development
- Basic familiarity with JavaScript/TypeScript and React
- Understanding of Next.js 14 (App Router) is helpful

### Setting up your development environment

1. **Fork the repository**

   Visit [https://github.com/daniele-liprandi/EvoNEST-backbone](https://github.com/daniele-liprandi/EvoNEST-backbone) and click the "Fork" button.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR-USERNAME/EvoNEST-backbone.git
   cd EvoNEST-backbone
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/daniele-liprandi/EvoNEST-backbone.git
   ```

4. **Set up environment files**

   Generate a secret key:
   ```bash
   openssl rand -base64 32
   ```

   Create `.env.local`:
   ```txt
   NEXTAUTH_SECRET=your-generated-secret
   ```

   Create `.env.development`:
   ```txt
   NEXTAUTH_URL=http://localhost:3005
   MONGODB_URI=mongodb://evonest_user:your_password@mongo_dev:27017
   STORAGE_PATH='/usr/evonest/file_storage_dev'
   ```

   Update MongoDB credentials in `docker-compose.dev.yml` to match your password.

5. **Start the development environment**

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

6. **Access EvoNEST**

   Open your browser to [http://localhost:3005](http://localhost:3005)

## Development workflow

### Creating a new branch

Always create a new branch for your work:

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a new branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Use branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

### Making changes

1. **Make your changes** in your branch
2. **Test your changes** thoroughly
3. **Run the test suite** (see [Testing](#testing))
4. **Commit your changes** with clear, descriptive messages

### Commit message guidelines

Write clear commit messages following this format:

```
<type>: <subject>

<body (optional)>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add CSV import functionality for samples

fix: resolve authentication timeout issue in production

docs: update installation guide with troubleshooting steps
```

## Coding standards

### JavaScript/TypeScript

- Use ES6+ features
- Follow existing code style in the project
- Use meaningful variable and function names
- Add JSDoc comments for functions and components
- Avoid deeply nested code - prefer early returns

### React components

- Use functional components with hooks
- Keep components focused on a single responsibility
- Extract reusable logic into custom hooks
- Use TypeScript for new components when possible

### File organization

```
src/
├── app/              # Next.js App Router pages
│   ├── (nest)/      # Authenticated routes
│   └── api/         # API routes
├── components/       # React components
│   ├── ui/          # Base UI components
│   ├── forms/       # Form components
│   └── nest/        # EvoNEST-specific components
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
└── shared/          # Shared configuration and types
```

### Database operations

- Always use `get_database_user()` to get the user's active database
- Handle MongoDB ObjectIds as strings in most contexts
- Include `logbook` entries for data modifications
- Update `recentChangeDate` when modifying documents

### API routes

Follow this pattern for API routes:

```javascript
import { get_database_user } from "@/app/api/utils/get_database_user";
import { get_or_create_client } from "@/app/api/utils/mongodbClient";

export async function GET(request) {
    try {
        const dbName = await get_database_user();
        const client = await get_or_create_client();
        const collection = client.db(dbName).collection("samples");

        // Your logic here

        return Response.json({ success: true, data: result });
    } catch (error) {
        console.error("Error:", error);
        return Response.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
```

## Testing

### Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test-watch

# Run tests in __tests__ directories only
npm run nxtest

# Run a specific test file
npx jest src/path/to/test.test.js
```

### Writing tests

- Write tests for new features and bug fixes
- Use `mongodb-memory-server` for database testing
- Test both success and error cases
- Use descriptive test names

Example test structure:

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

describe('Feature Name', () => {
    let mongoServer, client, db;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        client = await MongoClient.connect(uri);
        db = client.db('test');
    });

    afterAll(async () => {
        await client.close();
        await mongoServer.stop();
    });

    it('should perform expected behavior', async () => {
        // Test implementation
    });
});
```

## Documentation

### Code documentation

- Add JSDoc comments for functions
- Document complex logic with inline comments
- Update README.md if you change setup/installation
- Document any new environment variables

### User documentation

If your contribution affects user-facing features:

1. Update relevant pages in `docs/user-docs/`
2. Add screenshots if applicable
3. Update the FAQ if needed
4. Consider adding examples to the workshop tutorial

### Developer documentation

If you add developer features:

1. Update `docs/developer-docs/`
2. Add code examples
3. Document APIs and interfaces
4. Update architecture diagrams if needed

## License

By contributing to EvoNEST, you agree that your contributions will be licensed under the same license as the project (AGPL3.0, check LICENSE file for details).

## Recognition

Contributors will be:
- Listed in the project's contributors
- Acknowledged in release notes
- Credited in the documentation

Thank you for contributing to EvoNEST! Your efforts help advance biodiversity research worldwide.

## Questions?

If you have questions about contributing, please:
1. Check the [documentation](https://daniele-liprandi.github.io/EvoNEST-backbone/)
2. Search existing [GitHub issues](https://github.com/daniele-liprandi/EvoNEST-backbone/issues)
3. Open a new issue with the "question" label

---

*This contributing guide is adapted from open source best practices and tailored for the EvoNEST project.*
