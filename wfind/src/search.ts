import fs from 'node:fs/promises';
import path from 'node:path';
import { Matcher } from './matchers/index.js';

export const DEFAULT_EXCLUDES = ['.git', 'node_modules'];

export interface SearchOptions {
  /** 除外するファイル名・ディレクトリ名 */
  excludes: string[];
  /** これより大きいファイルはスキップする (bytes) */
  maxFileSize: number;
}

export interface Hit {
  matcher: Matcher;
  start: number;
  end: number;
  text: string;
}

export interface LineResult {
  file: string;
  /** 1 始まり */
  line: number;
  content: string;
  hits: Hit[];
}

export interface SearchStats {
  filesScanned: number;
  filesSkipped: number;
}

/** target 以下のファイルを走査し、一致した行を順に返す */
export async function* search(
  target: string,
  matchers: Matcher[],
  options: SearchOptions,
  stats: SearchStats,
): AsyncGenerator<LineResult> {
  for await (const file of walk(target, new Set(options.excludes))) {
    const content = await readTextFile(file, options.maxFileSize);
    if (content === null) {
      stats.filesSkipped++;
      continue;
    }
    stats.filesScanned++;
    yield* searchText(file, content, matchers);
  }
}

export function* searchText(file: string, content: string, matchers: Matcher[]): Generator<LineResult> {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hits: Hit[] = [];
    for (const matcher of matchers) {
      for (const range of matcher.findAll(line)) {
        hits.push({ matcher, ...range, text: line.slice(range.start, range.end) });
      }
    }
    if (hits.length > 0) {
      hits.sort((a, b) => a.start - b.start || b.end - a.end);
      yield { file, line: i + 1, content: line, hits };
    }
  }
}

async function* walk(target: string, excludes: Set<string>): AsyncGenerator<string> {
  const stat = await fs.lstat(target);
  if (stat.isFile()) {
    yield target;
    return;
  }
  if (!stat.isDirectory()) return;

  let entries;
  try {
    entries = await fs.readdir(target, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (excludes.has(entry.name)) continue;
    const full = path.join(target, entry.name);
    // シンボリックリンクはループ防止のため辿らない
    if (entry.isDirectory()) {
      yield* walk(full, excludes);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/** UTF-8 テキストとして読み込む。バイナリ・サイズ超過・読み込み失敗時は null */
async function readTextFile(file: string, maxFileSize: number): Promise<string | null> {
  try {
    const stat = await fs.stat(file);
    if (stat.size > maxFileSize) return null;
    const buffer = await fs.readFile(file);
    if (buffer.subarray(0, 8000).includes(0)) return null;
    const text = buffer.toString('utf-8');
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    return null;
  }
}
