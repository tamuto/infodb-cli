import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { getProjectName, createDirectoryName } from './utils';

export async function createWorktree(branchName: string, customDirectoryName?: string): Promise<string> {
  // Validate we're in a git repository
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch {
    throw new Error('Not in a git repository');
  }

  // Get the repository root
  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  
  // Use custom directory name or create project.branch pattern
  const dirName = customDirectoryName || createDirectoryName(getProjectName(), branchName);
  const worktreePath = path.join(repoRoot, '..', dirName);

  // Check if directory already exists
  if (existsSync(worktreePath)) {
    throw new Error(`Directory '${worktreePath}' already exists`);
  }

  // Check if branch exists locally
  let branchExists = false;
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branchName}`, { stdio: 'pipe' });
    branchExists = true;
  } catch {
    // Branch doesn't exist locally, check if it exists on remote
    try {
      execSync(`git show-ref --verify --quiet refs/remotes/origin/${branchName}`, { stdio: 'pipe' });
      // Remote branch exists, we'll create a local tracking branch
    } catch {
      // Branch doesn't exist anywhere, we'll create a new branch
    }
  }

  try {
    if (branchExists) {
      // Create worktree from existing local branch
      execSync(`git worktree add "${worktreePath}" ${branchName}`, { stdio: 'inherit' });
    } else {
      // Try to create worktree from remote branch, or create new branch if it doesn't exist
      try {
        // Try to create from remote branch
        execSync(`git worktree add -b ${branchName} "${worktreePath}" origin/${branchName}`, { stdio: 'inherit' });
      } catch {
        // Create new branch from current HEAD
        execSync(`git worktree add -b ${branchName} "${worktreePath}"`, { stdio: 'inherit' });
      }
    }
  } catch (error) {
    throw new Error(`Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`);
  }

  return worktreePath;
}