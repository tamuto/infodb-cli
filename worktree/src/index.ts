#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { createWorktree } from './worktree';
import { addToWorkspace } from './workspace';

const program = new Command();

program
  .name('@infodb/worktree')
  .description('CLI tool to manage git worktrees and VSCode workspace files')
  .version('1.0.0');

program
  .argument('<branch-name>', 'Name of the branch for the worktree')
  .option('-w, --workspace <file>', 'VSCode workspace file to update (.code-workspace extension optional)')
  .option('-d, --directory <dir>', 'Custom directory name for the worktree (defaults to project.branch pattern)')
  .action(async (branchName: string, options: { workspace?: string; directory?: string }) => {
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
      
      // Try to add to workspace (either specified or auto-detected)
      const workspaceFile = await addToWorkspace(options.workspace || null, worktreePath);
      
      if (workspaceFile) {
        const workspaceAction = options.workspace ? 'added to' : 'added to auto-detected';
        console.log(`✅ Created worktree '${branchName}' and ${workspaceAction} workspace '${path.basename(workspaceFile)}'`);
      } else {
        console.log(`✅ Created worktree '${branchName}' at ${worktreePath}`);
        if (!options.workspace) {
          console.log('💡 No workspace file found. Use -w to specify a workspace file.');
        }
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