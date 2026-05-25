# Catalog Schema Reference

## catalog.json

The root file must be valid JSON with this top-level structure:

```json
{
  "agents":       [ ...PackageEntry ],
  "skills":       [ ...PackageEntry ],
  "instructions": [ ...PackageEntry ]
}
```

All three arrays are required. Any may be empty (`[]`).

## PackageEntry

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique identifier across the entire catalog. Use kebab-case. |
| `name` | `string` | Yes | Human-readable display name. |
| `description` | `string` | Yes | One or two sentences describing what the package does and who it is for. |
| `author` | `string` | Yes | Author name or GitHub username. |
| `version` | `string` | Yes | SemVer string e.g. `"1.0.0"`. |
| `tags` | `string[]` | Yes | Array of lowercase tag strings. Minimum two. Used for search. |
| `installPath` | `string` | Yes | Workspace-relative directory where files are written, e.g. `.github/agents/my-agent`. |
| `files` | `string[]` | Yes | Paths to downloadable files, **relative to the directory containing `catalog.json`**. |
| `icon` | `string` | No | URL to a square PNG or SVG icon (optional, reserved for future use). |

## File path resolution

Given a catalog URL of:
```
https://raw.githubusercontent.com/org/repo/main/catalog/catalog.json
```

A `files` entry of `"agents/my-agent/agent.md"` resolves to:
```
https://raw.githubusercontent.com/org/repo/main/catalog/agents/my-agent/agent.md
```

Each file is installed at `{workspaceRoot}/{installPath}/{basename}`.

## Install path conventions

| Category | Recommended installPath |
|---|---|
| Agent | `.github/agents/{agent-id}` |
| Skill | `.github/skills/{skill-id}` |
| Instruction | `.github/instructions` |

## Example entry

```json
{
  "id": "solution-architect",
  "name": "Solution Architect",
  "description": "Replatforming and M&A integration expert. Produces ADRs and C4 diagrams.",
  "author": "agentforge",
  "version": "1.0.0",
  "tags": ["architecture", "migration", "adr", "c4"],
  "installPath": ".github/agents/solution-architect",
  "files": [
    "agents/solution-architect/agent.md"
  ]
}
```
