# Markdown Features Guide

This page demonstrates all the enhanced markdown features available in EvoNEST documentation.

## Task lists (checkboxes)

You can now create interactive task lists:

**Syntax:**
```markdown
- [ ] Unchecked task
- [x] Completed task
- [ ] Another pending task
```

**Rendered output:**

### Example: installation checklist
- [x] Install Docker Desktop
- [x] Download EvoNEST repository
- [ ] Configure environment variables
- [ ] Start the application

### Example: daily lab tasks
- [ ] Check backup status
- [ ] Review new samples
- [ ] Calibrate equipment
- [ ] Update logbook

---

## Footnotes

Add footnotes to provide additional context without cluttering the main text.

**Syntax:**
```markdown
This is a statement that needs clarification[^1].

Another statement with a different note[^note2].

[^1]: This is the first footnote.
[^note2]: This is the second footnote with a custom identifier.
```

**Example:**

EvoNEST uses Docker containers[^docker] for easy deployment across different platforms. The system supports multiple authentication providers[^auth] including Auth0 and Keycloak.

[^docker]: Docker is a containerization platform that packages applications with their dependencies.
[^auth]: Authentication providers handle user login and identity verification.

---

## Attributes (cSS classes & iDs)

Add custom classes and IDs to markdown elements for styling.

**Syntax:**
```markdown
# Heading {#custom-id}
Paragraph with custom class {.highlight}
**Bold text** {.important}
```

**Example:**

### Special callout {#important-section}

This paragraph has a custom class. {.custom-style}

> **Note:** This feature is useful for custom theming. {.note-box}

---

## Already built-in vitePress features

VitePress also includes these features by default:

### Custom containers

```markdown
::: tip Title
This is a tip
:::

::: warning
This is a warning
:::

::: danger
This is a danger box
:::

::: details Click to expand
Hidden content here
:::
```

**Rendered:**

::: tip Pro Tip
Use task lists in your tutorial modules for better user guidance!
:::

::: warning Important
Make sure Docker is running before starting EvoNEST.
:::

::: danger Data Loss Warning
Always back up your database before running migrations!
:::

::: details Additional Information
You can nest markdown inside details blocks:
- Item 1
- Item 2
- Item 3
:::

### Code groups

```markdown
::: code-group
\`\`\`bash [npm]
npm install evonest
\`\`\`

\`\`\`bash [yarn]
yarn add evonest
\`\`\`
:::
```

**Rendered:**

::: code-group
```bash [Docker]
docker-compose up -d
```

```bash [Manual]
npm run dev
```
:::

### Tables

| Feature | Supported | Notes |
|---------|-----------|-------|
| Task Lists | ✅ | GitHub-style checkboxes |
| Footnotes | ✅ | Automatic numbering |
| Attributes | ✅ | CSS classes and IDs |
| Containers | ✅ | tip, warning, danger, details |

### Emoji support

VitePress supports emoji shortcuts:

- :tada: `:tada:` - Celebration
- :rocket: `:rocket:` - Launch
- :warning: `:warning:` - Warning
- :white_check_mark: `:white_check_mark:` - Success
- :x: `:x:` - Error

### Line highlighting in code blocks

```js{2,4-6}
export default {
  name: 'EvoNEST', // [!code highlight]
  version: '1.0.0',
  features: [
    'Samples',
    'Traits'
  ]
}
```

### Focused lines

```js
export default {
  name: 'EvoNEST',
  version: '1.0.0', // [!code focus]
  features: ['Samples', 'Traits']
}
```

### Diff highlighting

```js
export default {
  name: 'EvoNEST',
  version: '1.0.0', // [!code --]
  version: '2.0.0', // [!code ++]
}
```

---

## Practical examples

### Using task lists in tutorial modules

**Before starting this module:**
- [x] Complete Module 1: Preparation
- [x] Complete Module 2: Installation
- [ ] Review the configuration guide
- [ ] Prepare sample data

### Using footnotes in technical docs

The EvoNEST Backbone uses Next.js[^nextjs] with App Router[^approuter] for server-side rendering and API routes.

[^nextjs]: Next.js is a React framework for building web applications.
[^approuter]: The App Router is Next.js 13+ routing paradigm using the app directory.

### Using attributes for styling

#### Custom styled heading {#custom-heading .primary-color}

This paragraph needs attention. {.highlight-box}

**Important point** {.text-bold .text-red}

---

## Tips for documentation writers

1. **Use task lists for:**
   - Prerequisites checklists
   - Step-by-step procedures
   - Verification checkpoints
   - Progress tracking

2. **Use footnotes for:**
   - Technical definitions
   - External references
   - Additional context
   - Acronym explanations

3. **Use attributes for:**
   - Custom styling
   - Anchor links
   - Special formatting
   - Accessibility improvements

4. **Use containers for:**
   - Important callouts
   - Warnings and errors
   - Collapsible sections
   - Tips and best practices

---

## Reference

### Installed plugins

| Plugin | Purpose | Documentation |
|--------|---------|--------------|
| `markdown-it-task-lists` | GitHub-style task lists | [GitHub](https://github.com/revin/markdown-it-task-lists) |
| `markdown-it-attrs` | Add attributes to elements | [GitHub](https://github.com/arve0/markdown-it-attrs) |
| `markdown-it-footnote` | Footnote support | [GitHub](https://github.com/markdown-it/markdown-it-footnote) |

### VitePress built-in features

- Custom Containers (tip, warning, danger, details, info)
- Code Groups
- Line Highlighting
- Emoji Support
- Tables
- Math Equations (via KaTeX)

See the [VitePress Markdown Guide](https://vitepress.dev/guide/markdown) for complete documentation.
