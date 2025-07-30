import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { Logger } from './logger';

export interface LambdaConfig {
  function_name?: string;
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
  requirements?: string[];
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

  // Permission settings
  permissions?: Array<{
    service?: string;
    principal?: string;
    source_arn?: string;
    statement_id?: string;
    action?: string;
  }>;

  // シンプルなデプロイメント設定
  log_retention_days?: number;
  auto_create_log_group?: boolean;
  zip_excludes?: string[];
  
  // Functions directory
  functionsDirectory?: string;
}

export interface DeployConfig {
  runtime?: string;
  handler?: string;
  role?: string;
}

export class ConfigManager {
  constructor(
    private functionName: string,
    private logger: Logger
  ) {}

  async loadConfig(overrides: DeployConfig): Promise<LambdaConfig> {
    const configDirectory = 'configs';
    const functionsDirectory = 'functions';
    const yamlPath = path.resolve(configDirectory, `${this.functionName}.yaml`);
    let yamlConfig: Partial<LambdaConfig> = {};

    // YAML config is now required
    try {
      const yamlContent = await fs.readFile(yamlPath, 'utf-8');
      const parsedYaml = yaml.parse(yamlContent);
      this.logger.verbose(`Parsed YAML before substitution:`, parsedYaml);
      yamlConfig = this.substituteVariables(parsedYaml);
      this.logger.verbose(`Loaded YAML config from: ${yamlPath}`);
      this.logger.verbose(`YAML config after substitution:`, yamlConfig);
    } catch (error) {
      if (error instanceof Error) {
        if ((error as any).code === 'ENOENT') {
          throw new Error(`YAML config file is required but not found: ${yamlPath}`);
        }
        // 変数展開エラーの場合、エラーを再スローしてユーザーに通知
        throw error;
      } else {
        throw new Error(`Failed to load YAML config from: ${yamlPath}`);
      }
    }

    // Set defaults
    const defaultHandler = `${this.functionName}.handler`;
    const config: LambdaConfig = {
      function_name: yamlConfig.function_name || this.functionName,
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
      requirements: yamlConfig.requirements || [],
      environment: yamlConfig.environment || {},
      layers: yamlConfig.layers || [],
      vpc: yamlConfig.vpc,
      dead_letter_queue: yamlConfig.dead_letter_queue,
      tags: yamlConfig.tags || {},
      permissions: yamlConfig.permissions || [],
      log_retention_days: yamlConfig.log_retention_days || 7,
      auto_create_log_group: yamlConfig.auto_create_log_group !== false,
      zip_excludes: yamlConfig.zip_excludes || ['*.git*', 'node_modules/*', '*.zip', 'dist/*', '.DS_Store'],
      functionsDirectory: functionsDirectory,
    };

    // Validate required fields
    if (!config.role) {
      throw new Error('IAM role ARN is required. Specify with --role option or in YAML config.');
    }

    return config;
  }

  private substituteVariables(obj: any): any {
    if (typeof obj === 'string') {
      // Replace ${ENV_VAR} with environment variables
      const result = obj.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
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
