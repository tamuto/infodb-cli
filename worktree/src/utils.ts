import { execSync } from 'child_process';
import path from 'path';

export function getProjectName(): string {
  try {
    // Try to get project name from git remote
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8', stdio: 'pipe' }).trim();
    
    // Extract repository name from various URL formats
    const match = remoteUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Fallback: use current directory name
  }

  // Fallback to current directory name
  const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  return path.basename(repoRoot);
}

export function sanitizeBranchName(branchName: string): string {
  return branchName
    // Replace invalid characters with hyphens
    .replace(/[<>:"|?*\/\\]/g, '-')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

export function createDirectoryName(projectName: string, branchName: string): string {
  const sanitizedBranch = sanitizeBranchName(branchName);
  return `${projectName}.${sanitizedBranch}`;
}

export function normalizeWorkspaceFileName(fileName: string): string {
  // Add .code-workspace extension if not present
  if (!fileName.endsWith('.code-workspace')) {
    return `${fileName}.code-workspace`;
  }
  return fileName;
}