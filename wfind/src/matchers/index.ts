import { ConfigError, KeywordSpec } from '../config.js';
import { findPreset, listPresets } from './presets.js';
import { escapeRegExp, Matcher, RegexMatcher } from './types.js';

export type { Matcher, MatchRange } from './types.js';
export { listPresets } from './presets.js';

export interface BuildOptions {
  /** すべてのキーワードで大文字小文字を無視する */
  ignoreCase?: boolean;
}

export function createMatcher(spec: KeywordSpec, section: string, options: BuildOptions = {}): Matcher {
  switch (spec.type) {
    case 'text': {
      const ignoreCase = options.ignoreCase || spec.ignoreCase;
      return new RegexMatcher('text', spec.label ?? spec.value, section, escapeRegExp(spec.value), ignoreCase ? 'iu' : 'u');
    }
    case 'regex': {
      const flags = (spec.flags ?? '') + (options.ignoreCase ? 'i' : '');
      try {
        return new RegexMatcher('regex', spec.label ?? `/${spec.value}/`, section, spec.value, flags);
      } catch (error) {
        throw new ConfigError(`[${section}] invalid regex /${spec.value}/: ${(error as Error).message}`);
      }
    }
    case 'preset': {
      const preset = findPreset(spec.value);
      if (!preset) {
        const names = listPresets().map((p) => p.name).join(', ');
        throw new ConfigError(`[${section}] unknown preset "${spec.value}". Available: ${names}`);
      }
      return preset.create(spec.label ?? spec.value, section, Boolean(options.ignoreCase || spec.ignoreCase));
    }
  }
}
