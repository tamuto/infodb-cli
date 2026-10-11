import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'smol-toml';

export const DEFAULT_SECTION = 'default';

export function defaultConfigPath(): string {
  return path.join(os.homedir(), '.config', 'infodb-wfind', 'keywords.toml');
}

/** 固定文字列 */
export interface TextKeyword {
  type: 'text';
  value: string;
  label?: string;
  ignoreCase?: boolean;
}

/** 正規表現 */
export interface RegexKeyword {
  type: 'regex';
  value: string;
  label?: string;
  flags?: string;
}

/** 抽象指定 (「電話番号」「氏名」など) */
export interface PresetKeyword {
  type: 'preset';
  value: string;
  label?: string;
  ignoreCase?: boolean;
}

export type KeywordSpec = TextKeyword | RegexKeyword | PresetKeyword;

export interface KeywordConfig {
  path: string;
  sections: Map<string, KeywordSpec[]>;
}

export class ConfigError extends Error {}

export function loadConfig(configPath: string): KeywordConfig {
  if (!fs.existsSync(configPath)) {
    throw new ConfigError(
      `Config file not found: ${configPath}\nRun "wfind init" to create a sample config.`,
    );
  }

  let data: Record<string, unknown>;
  try {
    data = parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
  } catch (error) {
    throw new ConfigError(`Failed to parse ${configPath}: ${(error as Error).message}`);
  }

  const sections = new Map<string, KeywordSpec[]>();
  for (const [name, body] of Object.entries(data)) {
    if (!isPlainObject(body)) {
      throw new ConfigError(`[${name}] must be a table (section)`);
    }
    const keywords = body.keywords ?? [];
    if (!Array.isArray(keywords)) {
      throw new ConfigError(`[${name}] keywords must be an array`);
    }
    sections.set(
      name,
      keywords.map((k, i) => parseKeyword(k, `[${name}] keywords[${i}]`)),
    );
  }

  return { path: configPath, sections };
}

function parseKeyword(raw: unknown, where: string): KeywordSpec {
  if (typeof raw === 'string') {
    return { type: 'text', value: raw };
  }
  if (!isPlainObject(raw)) {
    throw new ConfigError(`${where}: keyword must be a string or an inline table`);
  }

  const kinds = (['text', 'regex', 'preset'] as const).filter((k) => raw[k] !== undefined);
  if (kinds.length !== 1) {
    throw new ConfigError(`${where}: specify exactly one of "text", "regex" or "preset"`);
  }
  const type = kinds[0];
  const value = raw[type];
  if (typeof value !== 'string' || value.length === 0) {
    throw new ConfigError(`${where}: "${type}" must be a non-empty string`);
  }

  const label = optionalString(raw.label, `${where}.label`);
  switch (type) {
    case 'regex':
      return { type, value, label, flags: optionalString(raw.flags, `${where}.flags`) };
    case 'text':
    case 'preset':
      return { type, value, label, ignoreCase: optionalBoolean(raw.ignoreCase, `${where}.ignoreCase`) };
  }
}

function optionalString(value: unknown, where: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new ConfigError(`${where} must be a string`);
  return value;
}

function optionalBoolean(value: unknown, where: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new ConfigError(`${where} must be a boolean`);
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/**
 * 検索に使うキーワードを返す。
 * default セクションは常に含まれ、section が指定されていればそのセクションのキーワードを追加する。
 */
export function resolveKeywords(
  config: KeywordConfig,
  section: string = DEFAULT_SECTION,
): { section: string; spec: KeywordSpec }[] {
  if (section !== DEFAULT_SECTION && !config.sections.has(section)) {
    const available = [...config.sections.keys()].join(', ') || '(none)';
    throw new ConfigError(`Section "${section}" not found in ${config.path}. Available: ${available}`);
  }

  const names = section === DEFAULT_SECTION ? [DEFAULT_SECTION] : [DEFAULT_SECTION, section];
  return names.flatMap((name) =>
    (config.sections.get(name) ?? []).map((spec) => ({ section: name, spec })),
  );
}

export const SAMPLE_CONFIG = `# wfind keywords
#
# [default] セクションのキーワードは常に検索対象になります。
# 個別セクションを指定した場合 (wfind -s <section>) は 個別セクション + default で検索します。
#
# キーワードの書き方:
#   "文字列"                                   固定文字列
#   { text = "文字列", ignoreCase = true }     固定文字列 (大文字小文字を無視)
#   { regex = "正規表現", flags = "i" }        正規表現 (JavaScript の RegExp 構文)
#   { preset = "電話番号" }                    抽象指定 (wfind presets で一覧表示)
#   いずれも label = "表示名" を付けられます。

[default]
keywords = [
  { regex = "AKIA[0-9A-Z]{16}", label = "AWS Access Key" },
  { regex = "-----BEGIN [A-Z ]*PRIVATE KEY-----", label = "Private Key" },
  { preset = "メールアドレス" },
]

[example]
keywords = [
  "社外秘",
  { text = "Confidential", ignoreCase = true },
  { preset = "電話番号" },
]
`;
