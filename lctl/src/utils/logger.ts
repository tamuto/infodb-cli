import chalk from 'chalk';

export class Logger {
  constructor(private verbose: boolean = false) {}

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  warning(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  verbose(message: string, data?: any): void {
    if (this.verbose) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  debug(message: string, data?: any): void {
    if (this.verbose) {
      console.log(chalk.magenta('🐛'), chalk.magenta(message));
      if (data) {
        console.log(chalk.magenta(JSON.stringify(data, null, 2)));
      }
    }
  }
}