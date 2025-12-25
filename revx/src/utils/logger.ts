import chalk from 'chalk';

export class Logger {
  constructor(private isVerbose: boolean = false) {}

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  warning(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  verbose(message: string, data?: any): void {
    if (this.isVerbose) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  debug(message: string, data?: any): void {
    if (this.isVerbose) {
      console.log(chalk.magenta('🐛'), chalk.magenta(message));
      if (data) {
        console.log(chalk.magenta(JSON.stringify(data, null, 2)));
      }
    }
  }

  server(message: string): void {
    console.log(chalk.cyan('🚀'), message);
  }

  request(method: string, path: string): void {
    const methodColor = this.getMethodColor(method);
    console.log(chalk.gray('→'), methodColor(method.padEnd(7)), chalk.white(path));
  }

  private getMethodColor(method: string): typeof chalk.green {
    switch (method.toUpperCase()) {
      case 'GET':
        return chalk.green;
      case 'POST':
        return chalk.blue;
      case 'PUT':
        return chalk.yellow;
      case 'DELETE':
        return chalk.red;
      case 'PATCH':
        return chalk.magenta;
      default:
        return chalk.white;
    }
  }
}
