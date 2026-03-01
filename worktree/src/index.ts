#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { createWorktree, removeWorktree } from './worktree';
import { addToWorkspace, removeFromWorkspace } from './workspace';

const program = new Command();

program
  .name('@infodb/worktree')
  .description('CLI tool to manage git worktrees and VSCode workspace files')
  .version('1.4.0');

program
  .command('add')
  .argument('<workspace-name>', 'Name of the workspace file (.code-workspace extension optional)')
  .argument('[branch-name]', 'Name of the branch for the worktree (not required with --folder-only)')
  .option('-d, --directory <dir>', 'Custom directory name for the worktree (defaults to project.branch pattern)')
  .option('--folder-only', 'Add current directory to workspace without creating a worktree')
  .action(async (workspaceName: string, branchName: string | undefined, options: { directory?: string; folderOnly?: boolean }) => {
    // Validate workspace name
    if (!workspaceName || workspaceName.trim() === '') {
      console.error('❌ Error: Workspace name cannot be empty');
      process.exit(1);
    }

    if (options.folderOnly) {
      const folderPath = process.cwd();
      try {
        const workspaceFile = await addToWorkspace(workspaceName, folderPath);
        if (workspaceFile) {
          console.log(`✅ Added '${path.basename(folderPath)}' to workspace '${path.basename(workspaceFile)}'`);
        } else {
          console.log(`✅ Added '${folderPath}' to workspace`);
          console.log('💡 Workspace file not found or could not be updated.');
        }
      } catch (error) {
        console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
      return;
    }

    // Validate branch name
    if (!branchName || branchName.trim() === '') {
      console.error('❌ Error: Branch name cannot be empty');
      process.exit(1);
    }

    // Validate branch name format (allow most git-valid characters)
    if (!/^[a-zA-Z0-9._/-]+$/.test(branchName)) {
      console.error('❌ Error: Branch name contains invalid characters. Use letters, numbers, dots, underscores, hyphens, and forward slashes only.');
      process.exit(1);
    }

    try {
      const worktreePath = await createWorktree(branchName, options.directory);

      // Add to specified workspace
      const workspaceFile = await addToWorkspace(workspaceName, worktreePath);

      if (workspaceFile) {
        console.log(`✅ Created worktree '${branchName}' and added to workspace '${path.basename(workspaceFile)}'`);
      } else {
        console.log(`✅ Created worktree '${branchName}' at ${worktreePath}`);
        console.log('💡 Workspace file not found or could not be updated.');
      }
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command('remove')
  .alias('rm')
  .argument('<workspace-name>', 'Name of the workspace file (.code-workspace extension optional)')
  .argument('[branch-name]', 'Name of the branch/worktree to remove (not required with --folder-only)')
  .option('--folder-only', 'Remove current directory from workspace without removing the worktree')
  .action(async (workspaceName: string, branchName: string | undefined, options: { folderOnly?: boolean }) => {
    // Validate workspace name
    if (!workspaceName || workspaceName.trim() === '') {
      console.error('❌ Error: Workspace name cannot be empty');
      process.exit(1);
    }

    if (options.folderOnly) {
      const folderPath = process.cwd();
      try {
        const workspaceFile = await removeFromWorkspace(workspaceName, folderPath);
        if (workspaceFile) {
          console.log(`✅ Removed '${path.basename(folderPath)}' from workspace '${path.basename(workspaceFile)}'`);
        } else {
          console.log(`✅ Removed '${folderPath}' from workspace`);
          console.log('💡 Workspace file not found or could not be updated.');
        }
      } catch (error) {
        console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
      return;
    }

    // Validate branch name
    if (!branchName || branchName.trim() === '') {
      console.error('❌ Error: Branch name cannot be empty');
      process.exit(1);
    }

    try {
      const worktreePath = await removeWorktree(branchName);

      // Remove from specified workspace
      const workspaceFile = await removeFromWorkspace(workspaceName, worktreePath);

      if (workspaceFile) {
        console.log(`✅ Removed worktree '${branchName}' and removed from workspace '${path.basename(workspaceFile)}'`);
      } else {
        console.log(`✅ Removed worktree '${branchName}' from ${worktreePath}`);
        console.log('💡 Workspace file not found or could not be updated.');
      }
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

if (process.argv.length < 3) {
  program.help();
}

program.parse();