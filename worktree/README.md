# @infodb/worktree

A TypeScript CLI tool for managing git worktrees and VSCode workspace files.

## Installation

```bash
npm install -g @infodb/worktree
```

Or use with pnpx:

```bash
pnpx @infodb/worktree <command> [arguments] [options]
```

## Usage

### Add Command (Create Worktree)

Create a git worktree for a branch and add it to a VSCode workspace:

```bash
pnpx @infodb/worktree add <workspace-name> <branch-name> [options]
```

This creates a worktree directory named `{project}.{branch}` (e.g., `myproject.feature-new-feature`)

#### Basic Usage

```bash
pnpx @infodb/worktree add my-workspace feature/new-feature
```

Note: 
- `.code-workspace` extension is optional and will be added automatically
- If the workspace file doesn't exist, it will be created automatically with the current repository included

#### Custom Directory Name

Specify a custom directory name for the worktree:

```bash
pnpx @infodb/worktree add my-workspace feature/new-feature --directory custom-folder-name
```

### Remove Command (Delete Worktree)

Remove a git worktree and remove it from a VSCode workspace:

```bash
pnpx @infodb/worktree remove <workspace-name> <branch-name>
```

Alias: `rm`

```bash
pnpx @infodb/worktree rm my-workspace feature/new-feature
```

### Environment Variable

Set the workspace search directory:

```bash
export INFODB_WORKSPACE_DIR="/path/to/workspaces"
pnpx @infodb/worktree feature/new-feature
```

### Commands

#### `add <workspace-name> <branch-name> [options]`
Create a new worktree and add it to the specified workspace.

**Options:**
- `-d, --directory <dir>`: Custom directory name for the worktree (defaults to project.branch pattern)

#### `remove <workspace-name> <branch-name>`
Remove an existing worktree and remove it from the specified workspace.

**Aliases:** `rm`

### Global Options

- `-h, --help`: Display help information
- `-V, --version`: Display version number

## How it works

1. **Project Name Detection**: Detects project name from git remote URL or uses directory name as fallback
2. **Directory Naming**: Creates worktree with `{project}.{branch}` pattern (e.g., `myproject.feature-auth`)
3. **Branch Name Sanitization**: Converts `/` to `-` and removes invalid filesystem characters
4. **Git Worktree Creation**: Creates a new git worktree in a directory adjacent to your current repository
5. **Branch Handling**: 
   - If the branch exists locally, uses it
   - If the branch exists on remote, creates a local tracking branch
   - If the branch doesn't exist, creates a new branch from current HEAD
6. **Workspace Detection**: Automatically searches for `.code-workspace` files in:
   - `INFODB_WORKSPACE_DIR` environment variable location (if set)
   - Adjacent directories to the repository
7. **VSCode Integration**: Adds the worktree directory to the detected or specified VSCode workspace file

## Requirements

- Git repository
- Node.js 16 or higher
- VSCode workspace file (optional, for workspace integration)

## Examples

```bash
# Create worktree and add to workspace
pnpx @infodb/worktree add my-project main
# Creates: myproject.main/

# Create worktree for feature branch (branch name gets sanitized)
pnpx @infodb/worktree add my-project feature/user-auth
# Creates: myproject.feature-user-auth/

# Create worktree with workspace file (extension optional, creates if not exists)
pnpx @infodb/worktree add project feature/user-auth

# Create worktree with custom directory name
pnpx @infodb/worktree add my-project hotfix/critical-bug --directory hotfix-urgent

# Remove worktree and remove from workspace
pnpx @infodb/worktree remove my-project feature/user-auth

# Remove using alias
pnpx @infodb/worktree rm my-project hotfix/critical-bug

# Use environment variable for workspace search
export INFODB_WORKSPACE_DIR="/home/user/workspaces"
pnpx @infodb/worktree add my-project feature/new-feature
```