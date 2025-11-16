import { readFileSync } from 'fs';
import { stringify } from 'yaml';

/**
 * Simple JSON to YAML converter
 * No transformation, just direct conversion
 */
export class Converter {
  /**
   * Convert JSON file to YAML string
   */
  static jsonToYaml(jsonPath: string): string {
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);

    return stringify(jsonData, {
      indent: 2,
      lineWidth: 0,
      defaultStringType: 'PLAIN',
    });
  }

  /**
   * Convert JSON string to YAML string
   */
  static jsonStringToYaml(jsonString: string): string {
    const jsonData = JSON.parse(jsonString);

    return stringify(jsonData, {
      indent: 2,
      lineWidth: 0,
      defaultStringType: 'PLAIN',
    });
  }

  /**
   * Convert JSON object to YAML string
   */
  static objectToYaml(obj: any): string {
    return stringify(obj, {
      indent: 2,
      lineWidth: 0,
      defaultStringType: 'PLAIN',
    });
  }
}
