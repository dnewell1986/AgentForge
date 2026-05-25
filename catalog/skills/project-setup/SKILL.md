# Skill: Project Setup

Scaffolds complete, production-ready project structures from scratch inside a VS Code workspace.

## When to use this skill

Use this skill when the user wants to:
- Create a new project from scratch
- Set up an entire project framework (TypeScript, React, Node.js, VS Code extension, MCP server)
- Initialise a repository with all configuration files, folder structure, and dependencies
- The user says "new project", "create a workspace", "set up a [framework] project", or "scaffold"

**Do NOT use this skill for:**
- Creating a single file or adding a component to an existing project
- Modifying existing codebases
- Simple code examples or snippets

## Project types supported

### TypeScript Library / CLI
```
/src
  index.ts
  /commands
/test
package.json          (type: "module", exports, scripts)
tsconfig.json         (strict, ES2022, Node16)
.eslintrc.json
.prettierrc
jest.config.ts
.gitignore
README.md
```

### React App (Vite + TypeScript)
```
/src
  main.tsx
  App.tsx
  /components
  /hooks
  /styles
index.html
vite.config.ts
tsconfig.json
package.json
.gitignore
README.md
```

### Node.js API (Express + TypeScript)
```
/src
  server.ts
  /routes
  /middleware
  /services
  /models
package.json
tsconfig.json
.env.example
Dockerfile
.gitignore
README.md
```

### VS Code Extension
```
/src
  extension.ts
  /commands
  /providers
  /services
  /views
  /models
package.json          (contributes: commands, views, configuration)
tsconfig.json
.vscodeignore
.gitignore
README.md
```

### MCP Server (Model Context Protocol)
```
/src
  server.ts
  /tools
  /resources
package.json
tsconfig.json
mcp.json
README.md
```

## Setup steps

For each project type, follow these steps in order:

1. **Confirm requirements** — Ask the user for project name, target runtime/framework version, and any specific dependencies before generating files.
2. **Create folder structure** — Create all directories first, then files.
3. **Write configuration files** — `package.json`, `tsconfig.json`, linting, formatting configs.
4. **Write source scaffolding** — Entry point and at least one example module per layer.
5. **Install dependencies** — Run `npm install` in the terminal.
6. **Verify** — Run `npm run build` or `tsc --noEmit` to confirm the scaffold compiles cleanly.
7. **Summarise** — List created files and the commands to start development (`npm run dev`, `npm run watch`, etc.).

## Standards applied to all projects

- TypeScript strict mode (`"strict": true`)
- ESLint with `@typescript-eslint` rules
- `.gitignore` excluding `node_modules/`, `dist/`, `out/`, `.env`
- `README.md` with project description, prerequisites, and quick-start commands
- Scripts: `build`, `dev`/`watch`, `lint`, `test`
