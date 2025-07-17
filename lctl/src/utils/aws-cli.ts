import { spawn } from 'child_process';
import { Logger } from './logger';
import { LambdaConfig } from './config';

export interface LambdaFunctionInfo {
  FunctionName: string;
  Runtime: string;
  Handler: string;
  MemorySize: number;
  Timeout: number;
  LastModified: string;
  CodeSize: number;
  State: string;
  Architectures?: string[];
  Description?: string;
  Environment?: {
    Variables: Record<string, string>;
  };
  Layers?: Array<{
    Arn: string;
  }>;
}

export class AwsCliManager {
  constructor(
    private region?: string,
    private profile?: string,
    private logger?: Logger
  ) {}

  async deployFunction(functionName: string, config: LambdaConfig, zipPath: string): Promise<void> {
    // Check if function exists
    const functionExists = await this.functionExists(functionName);

    if (functionExists) {
      await this.updateFunction(functionName, config, zipPath);
    } else {
      await this.createFunction(functionName, config, zipPath);
    }
  }

  private async functionExists(functionName: string): Promise<boolean> {
    try {
      await this.runAwsCommand(['lambda', 'get-function', '--function-name', functionName]);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async createFunction(functionName: string, config: LambdaConfig, zipPath: string): Promise<void> {
    this.logger?.info('Creating new Lambda function...');

    const args = [
      'lambda', 'create-function',
      '--function-name', functionName,
      '--runtime', config.runtime,
      '--role', config.role,
      '--handler', config.handler,
      '--zip-file', `fileb://${zipPath}`,
    ];

    // Add optional parameters
    if (config.description) {
      args.push('--description', config.description);
    }

    if (config.memory) {
      args.push('--memory-size', config.memory.toString());
    }

    if (config.timeout) {
      args.push('--timeout', config.timeout.toString());
    }

    if (config.architecture && config.architecture !== 'x86_64') {
      args.push('--architectures', config.architecture);
    }

    if (config.environment && Object.keys(config.environment).length > 0) {
      const envVars = Object.entries(config.environment)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      args.push('--environment', `Variables={${envVars}}`);
    }

    if (config.layers && config.layers.length > 0) {
      args.push('--layers', config.layers.join(' '));
    }

    if (config.tags && Object.keys(config.tags).length > 0) {
      const tags = Object.entries(config.tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      args.push('--tags', tags);
    }

    await this.runAwsCommand(args);

    // Set additional configurations
    await this.setAdditionalConfigurations(functionName, config);
  }

  private async updateFunction(functionName: string, config: LambdaConfig, zipPath: string): Promise<void> {
    this.logger?.info('Updating existing Lambda function...');

    // Update function code
    await this.runAwsCommand([
      'lambda', 'update-function-code',
      '--function-name', functionName,
      '--zip-file', `fileb://${zipPath}`,
    ]);

    // Update function configuration
    const configArgs = [
      'lambda', 'update-function-configuration',
      '--function-name', functionName,
      '--runtime', config.runtime,
      '--role', config.role,
      '--handler', config.handler,
    ];

    if (config.description) {
      configArgs.push('--description', config.description);
    }

    if (config.memory) {
      configArgs.push('--memory-size', config.memory.toString());
    }

    if (config.timeout) {
      configArgs.push('--timeout', config.timeout.toString());
    }

    if (config.environment) {
      const envVars = Object.entries(config.environment)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      configArgs.push('--environment', `Variables={${envVars}}`);
    }

    if (config.layers) {
      configArgs.push('--layers', config.layers.join(' '));
    }

    await this.runAwsCommand(configArgs);

    // Set additional configurations
    await this.setAdditionalConfigurations(functionName, config);
  }

  private async setAdditionalConfigurations(functionName: string, config: LambdaConfig): Promise<void> {
    // Set reserved concurrency
    if (config.reserved_concurrency !== undefined) {
      await this.runAwsCommand([
        'lambda', 'put-reserved-concurrency-capacity',
        '--function-name', functionName,
        '--reserved-concurrency-capacity', config.reserved_concurrency.toString(),
      ]);
    }

    // Set VPC configuration
    if (config.vpc) {
      await this.runAwsCommand([
        'lambda', 'update-function-configuration',
        '--function-name', functionName,
        '--vpc-config', `SubnetIds=${config.vpc.subnets.join(',')},SecurityGroupIds=${config.vpc.security_groups.join(',')}`,
      ]);
    }

    // Set dead letter queue
    if (config.dead_letter_queue) {
      await this.runAwsCommand([
        'lambda', 'update-function-configuration',
        '--function-name', functionName,
        '--dead-letter-config', `TargetArn=${config.dead_letter_queue.target_arn}`,
      ]);
    }

    // Set ephemeral storage
    if (config.ephemeral_storage) {
      await this.runAwsCommand([
        'lambda', 'update-function-configuration',
        '--function-name', functionName,
        '--ephemeral-storage', `Size=${config.ephemeral_storage}`,
      ]);
    }
  }

  async deleteFunction(functionName: string): Promise<void> {
    await this.runAwsCommand([
      'lambda', 'delete-function',
      '--function-name', functionName,
    ]);
  }

  async getFunctionInfo(functionName: string): Promise<LambdaFunctionInfo> {
    const result = await this.runAwsCommand([
      'lambda', 'get-function',
      '--function-name', functionName,
    ]);

    const response = JSON.parse(result);
    return response.Configuration;
  }

  private async runAwsCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const baseArgs = ['aws'];

      if (this.profile) {
        baseArgs.push('--profile', this.profile);
      }

      if (this.region) {
        baseArgs.push('--region', this.region);
      }

      baseArgs.push('--output', 'json');

      const fullArgs = [...baseArgs, ...args];

      this.logger?.verbose(`Running command: ${fullArgs.join(' ')}`);

      const child = spawn(fullArgs[0], fullArgs.slice(1), {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`AWS CLI command failed (exit code ${code}): ${stderr || stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn AWS CLI: ${error.message}`));
      });
    });
  }
}
