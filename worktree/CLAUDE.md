# Claude Code Instructions for @infodb/worktree

## Project Overview

This is a TypeScript CLI tool that manages git worktrees and VSCode workspace files. The tool creates worktrees with a `{project}.{branch}` naming pattern and automatically manages VSCode workspace file integration. It supports both creating (`add`) and removing (`remove`) worktrees with workspace integration.

## Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run dev

# Test the CLI locally (after build)
npm run start add <workspace-name> <branch-name> [options]
npm run start remove <workspace-name> <branch-name>
```

## Project Structure

```
src/
├── index.ts        # Main CLI entry point with commander.js (add/remove commands)
├── worktree.ts     # Git worktree creation and removal logic
├── workspace.ts    # VSCode workspace file management (add/remove from workspace)
└── utils.ts        # Utility functions (project name detection, sanitization)
```

## Key Features

1. **Project Name Detection**: Extracts from git remote URL or uses directory name
2. **Branch Name Sanitization**: Converts `/` to `-` and removes invalid characters
3. **Workspace Management**: Searches in `INFODB_WORKSPACE_DIR` env var and adjacent directories
4. **Extension Normalization**: Automatically adds `.code-workspace` extension when omitted
5. **Workspace File Creation**: Creates new workspace files when specified workspace doesn't exist
6. **Worktree Creation**: Creates worktrees and adds them to specified workspace files
7. **Worktree Removal**: Removes worktrees and cleans them up from workspace files

## Testing Notes

- Test with various branch name patterns: `feature/auth`, `hotfix/bug-123`, `main`
- Test workspace detection with and without environment variables
- Test both existing and non-existing branches
- Test with different git repository setups (with/without remotes)
- Test add command: `npm run start add my-workspace feature/test`
- Test remove command: `npm run start remove my-workspace feature/test`
- Test with custom directory names
- Test workspace file creation and cleanup

## Error Handling

The tool handles:
- Invalid git repositories
- Missing workspace files
- Directory conflicts
- Worktree not found for removal
- Branch name validation
- Workspace file parsing errors
- Force removal of corrupted worktrees

## Environment Variables

- `INFODB_WORKSPACE_DIR`: Directory to search for workspace files (takes precedence over adjacent directory search)

## Build Output

- `dist/` directory contains compiled JavaScript
- `bin/cli.js` is the executable entry point
- Type declarations are generated for library usage

## CLI Commands

### Add Command
```bash
npm run start add <workspace-name> <branch-name> [options]
```
- Creates worktree with `{project}.{branch}` naming pattern
- Adds worktree to specified workspace file
- Creates workspace file if it doesn't exist
- Options: `-d, --directory` for custom directory name

### Remove Command
```bash
npm run start remove <workspace-name> <branch-name>
# or
npm run start rm <workspace-name> <branch-name>
```
- Removes worktree using git worktree remove
- Removes worktree entry from specified workspace file
- Handles force removal for corrupted worktrees

## Version Management

When updating the version, make sure to update both files:

1. **package.json**: Update the `version` field
2. **src/index.ts**: Update the `.version()` call in the CLI program setup

### Version Update Steps
```bash
# 1. Update version in both files
# package.json: "version": "X.Y.Z"
# src/index.ts: .version('X.Y.Z')

# 2. Commit and push changes
git add package.json src/index.ts
git commit -m "Update version to X.Y.Z"
git push
```