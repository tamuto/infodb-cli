# Claude Code Instructions for @infodb/worktree

## Project Overview

This is a TypeScript CLI tool that manages git worktrees and VSCode workspace files. The tool creates worktrees with a `{project}.{branch}` naming pattern and automatically manages VSCode workspace file integration.

## Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run dev

# Test the CLI locally (after build)
npm run start <branch-name> [options]
```

## Project Structure

```
src/
├── index.ts        # Main CLI entry point with commander.js
├── worktree.ts     # Git worktree creation logic
├── workspace.ts    # VSCode workspace file management
└── utils.ts        # Utility functions (project name detection, sanitization)
```

## Key Features

1. **Project Name Detection**: Extracts from git remote URL or uses directory name
2. **Branch Name Sanitization**: Converts `/` to `-` and removes invalid characters
3. **Workspace Auto-detection**: Searches in `INFODB_WORKSPACE_DIR` env var and adjacent directories
4. **Extension Normalization**: Automatically adds `.code-workspace` extension when omitted
5. **Workspace File Creation**: Creates new workspace files when `-w` option specifies non-existing file

## Testing Notes

- Test with various branch name patterns: `feature/auth`, `hotfix/bug-123`, `main`
- Test workspace detection with and without environment variables
- Test both existing and non-existing branches
- Test with different git repository setups (with/without remotes)

## Error Handling

The tool handles:
- Invalid git repositories
- Missing workspace files
- Directory conflicts
- Multiple workspace files (requires explicit selection)
- Branch name validation

## Environment Variables

- `INFODB_WORKSPACE_DIR`: Directory to search for workspace files (takes precedence over adjacent directory search)

## Build Output

- `dist/` directory contains compiled JavaScript
- `bin/cli.js` is the executable entry point
- Type declarations are generated for library usage