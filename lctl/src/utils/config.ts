import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { Logger } from './logger';

export interface LambdaConfig {
  runtime: string;
  handler: string;
  role: string;
  architecture?: string;
  memory?: number;
  timeout?: number;
  description?: string;
  reserved_concurrency?: number;
  provisioned_concurrency?: number;
  ephemeral_storage?: number;
  files?: string[];
  environment?: Record<string, string>;
  layers?: string[];
  vpc?: {
    subnets: string[];
    security_groups: string[];
  };
  dead_letter_queue?: {
    target_arn: string;
  };
  tags?: Record<string, string>;

  // シンプルなデプロイメント設定
  log_retention_days?: number;
  auto_create_log_group?: boolean;
  zip_excludes?: string[];
}

export interface DeployConfig {
  runtime?: string;
  handler?: string;
  role?: string;
}

export class ConfigManager {
  constructor(
    private functionName: string,
    private params: Record<string, string>,
    private logger: Logger
  ) {}

  async loadConfig(overrides: DeployConfig): Promise<LambdaConfig> {
    const yamlPath = path.join(process.cwd(), `${this.functionName}.yaml`);
    let yamlConfig: Partial<LambdaConfig> = {};

    // Try to load YAML config
    try {
      const yamlContent = await fs.readFile(yamlPath, 'utf-8');
      const parsedYaml = yaml.parse(yamlContent);
      yamlConfig = this.substituteVariables(parsedYaml);
      this.logger.verbose(`Loaded YAML config from: ${yamlPath}`);
    } catch (error) {
      this.logger.verbose(`No YAML config found at: ${yamlPath}`);
    }

    // Set defaults
    const defaultHandler = `${this.functionName}.handler`;
    const config: LambdaConfig = {
      runtime: overrides.runtime || yamlConfig.runtime || 'python3.12',
      handler: overrides.handler || yamlConfig.handler || defaultHandler,
      role: overrides.role || yamlConfig.role || '',
      architecture: yamlConfig.architecture || 'x86_64',
      memory: yamlConfig.memory || 128,
      timeout: yamlConfig.timeout || 3,
      description: yamlConfig.description,
      reserved_concurrency: yamlConfig.reserved_concurrency,
      provisioned_concurrency: yamlConfig.provisioned_concurrency,
      ephemeral_storage: yamlConfig.ephemeral_storage,
      files: yamlConfig.files || ['.'],
      environment: yamlConfig.environment || {},
      layers: yamlConfig.layers || [],
      vpc: yamlConfig.vpc,
      dead_letter_queue: yamlConfig.dead_letter_queue,
      tags: yamlConfig.tags || {},
      log_retention_days: yamlConfig.log_retention_days || 7,
      auto_create_log_group: yamlConfig.auto_create_log_group !== false,
      zip_excludes: yamlConfig.zip_excludes || ['*.git*', 'node_modules/*', '*.zip', 'dist/*', '.DS_Store'],
    };

    // Validate required fields
    if (!config.role) {
      throw new Error('IAM role ARN is required. Specify with --role option or in YAML config.');
    }

    return config;
  }

  private substituteVariables(obj: any): any {
    if (typeof obj === 'string') {
      // Replace $key with params
      let result = obj;
      for (const [key, value] of Object.entries(this.params)) {
        result = result.replace(new RegExp(`\\$${key}\\b`, 'g'), value);
      }

      // Replace ${ENV_VAR} with environment variables
      result = result.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
        const envValue = process.env[envVar];
        if (envValue === undefined) {
          throw new Error(`Environment variable ${envVar} is not defined`);
        }
        return envValue;
      });

      return result;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.substituteVariables(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteVariables(value);
      }
      return result;
    }

    return obj;
  }
}
