import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { normalizeWorkspaceFileName } from './utils';

interface WorkspaceFolder {
  name?: string;
  path: string;
}

interface WorkspaceConfig {
  folders: WorkspaceFolder[];
  settings?: Record<string, any>;
  extensions?: {
    recommendations?: string[];
  };
}

export function findWorkspaceFiles(): string[] {
  const workspaceFiles: string[] = [];
  
  // Check environment variable first
  const envWorkspaceDir = process.env.INFODB_WORKSPACE_DIR;
  if (envWorkspaceDir && existsSync(envWorkspaceDir)) {
    try {
      const files = readdirSync(envWorkspaceDir)
        .filter(file => file.endsWith('.code-workspace'))
        .map(file => path.join(envWorkspaceDir, file));
      workspaceFiles.push(...files);
    } catch {
      // Ignore errors reading directory
    }
  }
  
  // Check adjacent directories
  try {
    const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    const parentDir = path.dirname(repoRoot);
    
    const files = readdirSync(parentDir)
      .filter(file => file.endsWith('.code-workspace'))
      .map(file => path.join(parentDir, file));
    workspaceFiles.push(...files);
  } catch {
    // Ignore errors
  }
  
  return [...new Set(workspaceFiles)]; // Remove duplicates
}

function createEmptyWorkspace(currentRepoPath: string): WorkspaceConfig {
  // Use absolute path for current repository
  const repoName = path.basename(currentRepoPath);
  
  return {
    folders: [
      {
        name: repoName,
        path: currentRepoPath
      }
    ],
    settings: {},
    extensions: {
      recommendations: []
    }
  };
}

function resolveWorkspaceFile(workspaceFile: string, forCreation: boolean = false): string {
  // Use provided workspace file with normalized extension
  let targetWorkspaceFile = normalizeWorkspaceFileName(workspaceFile);
  
  // If it's not an absolute path, try to find it in the search directories
  if (!path.isAbsolute(targetWorkspaceFile)) {
    const fileName = path.basename(targetWorkspaceFile);
    
    if (!forCreation) {
      // For existing files, search in available workspaces first
      const availableWorkspaces = findWorkspaceFiles();
      const matchingWorkspace = availableWorkspaces.find(ws => 
        path.basename(ws) === fileName
      );
      
      if (matchingWorkspace) {
        return matchingWorkspace;
      }
    }
    
    // For new files or when not found, prefer INFODB_WORKSPACE_DIR
    const envWorkspaceDir = process.env.INFODB_WORKSPACE_DIR;
    if (envWorkspaceDir && existsSync(envWorkspaceDir)) {
      targetWorkspaceFile = path.join(envWorkspaceDir, fileName);
    } else {
      targetWorkspaceFile = path.resolve(targetWorkspaceFile);
    }
  }
  
  return targetWorkspaceFile;
}

export async function addToWorkspace(workspaceFile: string, worktreePath: string): Promise<string | null> {
  // First try to find existing workspace file
  let targetWorkspaceFile = resolveWorkspaceFile(workspaceFile, false);
  let isNewFile = false;
  
  // Check if workspace file exists, if not resolve for creation
  if (!existsSync(targetWorkspaceFile)) {
    targetWorkspaceFile = resolveWorkspaceFile(workspaceFile, true);
    isNewFile = true;
    console.log(`📝 Creating new workspace file: ${path.basename(targetWorkspaceFile)}`);
  }
  
  const absoluteWorkspacePath = targetWorkspaceFile;

  // Read existing workspace configuration or create new one
  let workspaceConfig: WorkspaceConfig;
  
  if (isNewFile) {
    // Get current repository path for new workspace
    const currentRepoPath = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    
    // Create new workspace configuration with current repo
    workspaceConfig = createEmptyWorkspace(currentRepoPath);
  } else {
    // Read existing workspace file
    try {
      const content = readFileSync(absoluteWorkspacePath, 'utf8');
      workspaceConfig = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse workspace file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Ensure folders array exists
  if (!workspaceConfig.folders) {
    workspaceConfig.folders = [];
  }

  // Get the folder name from the path
  const folderName = path.basename(worktreePath);
  
  // Use full path for workspace folder
  const folderPath = worktreePath;

  // Check if this path is already in the workspace
  const existingFolder = workspaceConfig.folders.find(folder => {
    return path.resolve(folder.path) === path.resolve(worktreePath);
  });

  if (existingFolder) {
    console.log(`⚠️  Folder '${folderName}' is already in the workspace`);
    return absoluteWorkspacePath;
  }

  // Add the new folder
  workspaceConfig.folders.push({
    name: folderName,
    path: folderPath
  });

  // Sort folders by name
  workspaceConfig.folders.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Write the updated workspace configuration
  try {
    writeFileSync(absoluteWorkspacePath, JSON.stringify(workspaceConfig, null, 2));
  } catch (error) {
    throw new Error(`Failed to write workspace file: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return absoluteWorkspacePath;
}

export async function removeFromWorkspace(workspaceFile: string, worktreePath: string): Promise<string | null> {
  let targetWorkspaceFile = resolveWorkspaceFile(workspaceFile);
  
  // Check if workspace file exists
  if (!existsSync(targetWorkspaceFile)) {
    throw new Error(`Workspace file not found: ${path.basename(targetWorkspaceFile)}`);
  }
  
  const absoluteWorkspacePath = targetWorkspaceFile;

  // Read existing workspace configuration
  let workspaceConfig: WorkspaceConfig;
  try {
    const content = readFileSync(absoluteWorkspacePath, 'utf8');
    workspaceConfig = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse workspace file: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Ensure folders array exists
  if (!workspaceConfig.folders) {
    workspaceConfig.folders = [];
  }

  // Find and remove the folder
  const initialLength = workspaceConfig.folders.length;
  workspaceConfig.folders = workspaceConfig.folders.filter(folder => {
    return path.resolve(folder.path) !== path.resolve(worktreePath);
  });

  if (workspaceConfig.folders.length === initialLength) {
    const folderName = path.basename(worktreePath);
    console.log(`⚠️  Folder '${folderName}' was not found in the workspace`);
    return absoluteWorkspacePath;
  }

  // Write the updated workspace configuration
  try {
    writeFileSync(absoluteWorkspacePath, JSON.stringify(workspaceConfig, null, 2));
  } catch (error) {
    throw new Error(`Failed to write workspace file: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return absoluteWorkspacePath;
}