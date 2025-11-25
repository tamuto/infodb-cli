import prompts from 'prompts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PromptResponse {
  projectName: string;
  template: 'basic' | 'cli' | 'server' | 'library';
}

async function main() {
  console.log('\nWelcome to create-myts!\n');

  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-project',
      validate: (value: string) => {
        if (!value) return 'Project name is required';
        if (!/^[a-z0-9-_]+$/.test(value)) {
          return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
        }
        return true;
      }
    },
    {
      type: 'select',
      name: 'template',
      message: 'Select a template:',
      choices: [
        { title: 'basic', value: 'basic', description: 'Minimal TypeScript setup with tsc' },
        { title: 'cli', value: 'cli', description: 'CLI application template' },
        { title: 'server', value: 'server', description: 'HTTP server template' },
        { title: 'library', value: 'library', description: 'Library template' }
      ],
      initial: 0
    }
  ]) as PromptResponse;

  if (!response.projectName || !response.template) {
    console.log('\nOperation cancelled.');
    process.exit(1);
  }

  const { projectName, template } = response;
  const targetDir = path.join(process.cwd(), projectName);

  // Check if directory already exists
  if (fs.existsSync(targetDir)) {
    console.error(`\nError: Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  // Get template source directory
  // When built, __dirname will be in 'dist', so templates are at ../templates
  const templatesDir = path.join(__dirname, '..', 'templates');
  const templateSource = path.join(templatesDir, template);

  if (!fs.existsSync(templateSource)) {
    console.error(`\nError: Template "${template}" not found.`);
    process.exit(1);
  }

  try {
    // Copy template to target directory
    console.log(`\nScaffolding project in ${targetDir}...`);
    fs.cpSync(templateSource, targetDir, { recursive: true });

    // Update package.json with project name
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      packageJson.name = projectName;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    }

    console.log('\nDone! Now run:\n');
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev`);
    console.log('');

    // Optional: Auto install dependencies
    const { autoInstall } = await prompts({
      type: 'confirm',
      name: 'autoInstall',
      message: 'Install dependencies now?',
      initial: true
    });

    if (autoInstall) {
      console.log('\nInstalling dependencies...\n');
      await installDependencies(targetDir);
      console.log('\nDependencies installed successfully!\n');
      console.log('Run the following to get started:\n');
      console.log(`  cd ${projectName}`);
      console.log(`  npm run dev`);
      console.log('');
    }
  } catch (error) {
    console.error('\nError creating project:', error);
    process.exit(1);
  }
}

function installDependencies(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`npm install exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
