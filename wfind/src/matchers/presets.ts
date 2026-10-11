import { Matcher, RegexMatcher } from './types.js';

export interface PresetDefinition {
  /** プリセットの正式名 */
  name: string;
  /** 別名 (日本語名など) */
  aliases: string[];
  description: string;
  /** Matcher を生成する。正規表現で表せないプリセットは独自の Matcher を返せばよい */
  create(label: string, section: string, ignoreCase: boolean): Matcher;
}

function regexPreset(
  name: string,
  aliases: string[],
  description: string,
  source: string,
  flags = 'u',
): PresetDefinition {
  return {
    name,
    aliases,
    description,
    create: (label, section, ignoreCase) =>
      new RegexMatcher('preset', label, section, source, ignoreCase ? flags + 'i' : flags),
  };
}

/**
 * 組み込みプリセット。
 * 「氏名」のように正規表現だけでは判定できないものは、Matcher を実装したクラスを
 * create で返すプリセットとしてここに追加する。
 */
const PRESETS: PresetDefinition[] = [
  regexPreset(
    'email',
    ['メールアドレス', 'mail'],
    'メールアドレス',
    String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}`,
  ),
  regexPreset(
    'phone-jp',
    ['電話番号', 'phone'],
    '日本の電話番号 (固定・携帯・フリーダイヤル、ハイフン/括弧区切り)',
    String.raw`(?<![0-9０-９])(?:0[0-9]{1,4}[-(（ ]?[0-9]{1,4}[-)） ]?[0-9]{3,4}|\+81[- ]?[0-9]{1,4}[- ]?[0-9]{1,4}[- ]?[0-9]{4})(?![0-9０-９])`,
  ),
  regexPreset(
    'postal-code-jp',
    ['郵便番号', 'zip-jp'],
    '日本の郵便番号 (〒123-4567 / 123-4567)',
    String.raw`(?:〒\s?)?(?<![0-9])[0-9]{3}-[0-9]{4}(?![0-9])`,
  ),
  regexPreset(
    'ipv4',
    ['IPアドレス'],
    'IPv4 アドレス',
    String.raw`(?<![0-9.])(?:(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])(?![0-9.])`,
  ),
  regexPreset(
    'credit-card',
    ['クレジットカード番号'],
    'クレジットカード番号らしき16桁の数字 (4桁区切り可)',
    String.raw`(?<![0-9])[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}(?![0-9])`,
  ),
];

export function listPresets(): readonly PresetDefinition[] {
  return PRESETS;
}

export function findPreset(name: string): PresetDefinition | undefined {
  const key = name.toLowerCase();
  return PRESETS.find((p) => p.name === key || p.aliases.some((a) => a.toLowerCase() === key));
}
