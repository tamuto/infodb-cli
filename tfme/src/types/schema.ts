// Terraform Provider Schema Types

export interface ProviderSchema {
  format_version: string;
  provider_schemas: {
    [key: string]: {
      provider: SchemaBlock;
      resource_schemas?: {
        [key: string]: SchemaBlock;
      };
      data_source_schemas?: {
        [key: string]: SchemaBlock;
      };
    };
  };
}

export interface SchemaBlock {
  version: number;
  block: Block;
}

export interface Block {
  attributes?: {
    [key: string]: Attribute;
  };
  block_types?: {
    [key: string]: BlockType;
  };
  description?: string;
  description_kind?: string;
  deprecated?: boolean;
}

export interface Attribute {
  type: any;
  description?: string;
  description_kind?: string;
  required?: boolean;
  optional?: boolean;
  computed?: boolean;
  sensitive?: boolean;
  deprecated?: boolean;
}

export interface BlockType {
  nesting_mode: string;
  block: Block;
  min_items?: number;
  max_items?: number;
}

// YAML Output Types

export interface YamlProviderInfo {
  namespace: string;
  name: string;
  version: string;
}

export interface YamlResource {
  name: string;
  type: 'resource' | 'data_source' | 'provider';
  description: {
    en_us: string;
    ja_jp: string;
  };
  attributes: {
    [key: string]: YamlAttribute;
  };
  blocks?: {
    [key: string]: YamlBlock;
  };
  warning?: string;
}

export interface YamlAttribute {
  name: string;
  type: string;
  description: {
    en_us: string;
    ja_jp: string;
  };
  required?: boolean;
  optional?: boolean;
  computed?: boolean;
  sensitive?: boolean;
  default_value?: any;
  possible_values?: any[];
  warning?: string;
}

export interface YamlBlock {
  name: string;
  nesting_mode: string;
  description: {
    en_us: string;
    ja_jp: string;
  };
  attributes: {
    [key: string]: YamlAttribute;
  };
  min_items?: number;
  max_items?: number;
  warning?: string;
}

export interface YamlOutput {
  provider_info: YamlProviderInfo;
  provider_config?: YamlResource;
  resources?: {
    [key: string]: YamlResource;
  };
  data_sources?: {
    [key: string]: YamlResource;
  };
}
