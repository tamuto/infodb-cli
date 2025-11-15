import { readFileSync } from 'fs';
import type {
  ProviderSchema,
  Block,
  Attribute,
  BlockType,
  YamlProviderInfo,
  YamlResource,
  YamlAttribute,
  YamlBlock,
} from '../types/schema.js';

export class SchemaParser {
  private schema: ProviderSchema;

  constructor(jsonPath: string) {
    const content = readFileSync(jsonPath, 'utf-8');
    this.schema = JSON.parse(content);
  }

  /**
   * Get list of providers in the schema
   */
  getProviders(): string[] {
    return Object.keys(this.schema.provider_schemas);
  }

  /**
   * Get provider info from provider name
   */
  getProviderInfo(providerName: string): YamlProviderInfo {
    const parts = providerName.split('/');
    const namespace = parts.length > 1 ? parts[0] : 'hashicorp';
    const name = parts.length > 1 ? parts[1] : parts[0];

    // Version would need to come from provider config or elsewhere
    return {
      namespace,
      name,
      version: 'unknown',
    };
  }

  /**
   * Get resources for a specific provider
   */
  getResources(providerName: string): { [key: string]: YamlResource } {
    const providerSchema = this.schema.provider_schemas[providerName];
    if (!providerSchema?.resource_schemas) {
      return {};
    }

    const resources: { [key: string]: YamlResource } = {};
    for (const [resourceName, resourceSchema] of Object.entries(providerSchema.resource_schemas)) {
      resources[resourceName] = this.convertToYamlResource(resourceName, resourceSchema.block, 'resource');
    }
    return resources;
  }

  /**
   * Get a specific resource
   */
  getResource(providerName: string, resourceName: string): YamlResource | null {
    const providerSchema = this.schema.provider_schemas[providerName];
    const resourceSchema = providerSchema?.resource_schemas?.[resourceName];

    if (!resourceSchema) {
      return null;
    }

    return this.convertToYamlResource(resourceName, resourceSchema.block, 'resource');
  }

  /**
   * Convert Terraform block to YAML resource
   */
  private convertToYamlResource(
    name: string,
    block: Block,
    type: 'resource' | 'data_source' | 'provider'
  ): YamlResource {
    const resource: YamlResource = {
      name,
      type,
      description: {
        en_us: block.description || '',
        ja_jp: '',
      },
      attributes: {},
    };

    // Convert attributes
    if (block.attributes) {
      for (const [attrName, attr] of Object.entries(block.attributes)) {
        resource.attributes[attrName] = this.convertToYamlAttribute(attrName, attr);
      }
    }

    // Convert block types
    if (block.block_types) {
      resource.blocks = {};
      for (const [blockName, blockType] of Object.entries(block.block_types)) {
        resource.blocks[blockName] = this.convertToYamlBlock(blockName, blockType);
      }
    }

    return resource;
  }

  /**
   * Convert Terraform attribute to YAML attribute
   */
  private convertToYamlAttribute(name: string, attr: Attribute): YamlAttribute {
    return {
      name,
      type: this.formatType(attr.type),
      description: {
        en_us: attr.description || '',
        ja_jp: '',
      },
      required: attr.required,
      optional: attr.optional,
      computed: attr.computed,
      sensitive: attr.sensitive,
    };
  }

  /**
   * Convert Terraform block type to YAML block
   */
  private convertToYamlBlock(name: string, blockType: BlockType): YamlBlock {
    const yamlBlock: YamlBlock = {
      name,
      nesting_mode: blockType.nesting_mode,
      description: {
        en_us: blockType.block.description || '',
        ja_jp: '',
      },
      attributes: {},
    };

    if (blockType.block.attributes) {
      for (const [attrName, attr] of Object.entries(blockType.block.attributes)) {
        yamlBlock.attributes[attrName] = this.convertToYamlAttribute(attrName, attr);
      }
    }

    if (blockType.min_items !== undefined) {
      yamlBlock.min_items = blockType.min_items;
    }
    if (blockType.max_items !== undefined) {
      yamlBlock.max_items = blockType.max_items;
    }

    return yamlBlock;
  }

  /**
   * Format Terraform type to string
   */
  private formatType(type: any): string {
    if (typeof type === 'string') {
      return type;
    }
    if (Array.isArray(type)) {
      return type.join(' ');
    }
    return JSON.stringify(type);
  }
}
