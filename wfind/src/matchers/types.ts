/** 1行の中で見つかった一致箇所 (start は 0 始まり、end は排他的) */
export interface MatchRange {
  start: number;
  end: number;
}

export type MatcherKind = 'text' | 'regex' | 'preset';

/**
 * キーワード1件分の検索器。
 * 固定文字列・正規表現・プリセット(「電話番号」等の抽象指定)はすべてこのインターフェースで扱う。
 * 将来、辞書や形態素解析を使う「氏名」検出などもこのインターフェースを実装すれば追加できる。
 */
export interface Matcher {
  readonly kind: MatcherKind;
  /** 出力に表示するラベル */
  readonly label: string;
  /** キーワードが定義されていたセクション */
  readonly section: string;
  findAll(line: string): MatchRange[];
}

/** 正規表現ベースの Matcher (text / regex / 正規表現で表現できるプリセットで共用) */
export class RegexMatcher implements Matcher {
  private readonly regex: RegExp;

  constructor(
    readonly kind: MatcherKind,
    readonly label: string,
    readonly section: string,
    source: string,
    flags: string,
  ) {
    const unique = new Set(flags.split(''));
    unique.add('g');
    this.regex = new RegExp(source, [...unique].join(''));
  }

  findAll(line: string): MatchRange[] {
    const results: MatchRange[] = [];
    this.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = this.regex.exec(line)) !== null) {
      if (m[0].length === 0) {
        // 空文字一致での無限ループを防ぐ
        this.regex.lastIndex++;
        continue;
      }
      results.push({ start: m.index, end: m.index + m[0].length });
    }
    return results;
  }
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
