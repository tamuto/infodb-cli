#!/usr/bin/env node

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Hello from CLI template!');
    console.log('Usage: mycli <command>');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'help':
      console.log('Available commands:');
      console.log('  help    - Show this help message');
      console.log('  version - Show version');
      break;
    case 'version':
      console.log('Version 0.1.0');
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Run "mycli help" for available commands');
  }
}

main();
