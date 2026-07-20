import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { Logger } from './logger';
import { substituteEnvVariables } from './env';

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

  // Function URL settings
  function_url?: {
    auth_type: 'NONE' | 'AWS_IAM';
    invoke_mode?: 'BUFFERED' | 'RESPONSE_STREAM';
    qualifier?: string;
    cors?: {
      allow_origins?: string[];
      allow_methods?: string[];
      allow_headers?: string[];
      expose_headers?: string[];
      allow_credentials?: boolean;
      max_age?: number;
    };
  };

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

  async loadConfig(overrides: DeployConfig, options: { defer?: boolean } = {}): Promise<LambdaConfig> {
    const configDirectory = 'configs';
    const functionsDirectory = 'functions';
    const yamlPath = path.resolve(configDirectory, `${this.functionName}.yaml`);
    let yamlConfig: Partial<LambdaConfig> = {};

    // YAML config is now required
    try {
      const yamlContent = await fs.readFile(yamlPath, 'utf-8');
      const parsedYaml = yaml.parse(yamlContent) ?? {};
      this.logger.verbose(`Parsed YAML before substitution:`, parsedYaml);
      // defer=true (makezip/export) の場合、${VAR} は生成物の実行時まで展開しない。
      // 同じ資材を複数の環境にデプロイできるよう、role/function_name/environment 等
      // すべてのフィールドでプレースホルダのまま保持する。
      // info/delete は AWS を直接呼び出すため、実際の値が必要で即時展開する。
      yamlConfig = options.defer ? parsedYaml : substituteEnvVariables(parsedYaml);
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
      function_url: yamlConfig.function_url,
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
}
