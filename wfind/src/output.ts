import chalk from 'chalk';
import { LineResult } from './search.js';

const MAX_DISPLAY_WIDTH = 300;

export function formatLine(result: LineResult): string {
  const labels = [...new Set(result.hits.map((h) => h.matcher.label))];
  const column = result.hits[0].start + 1;
  return (
    `${chalk.magenta(result.file)}:${chalk.green(result.line)}:${column}: ` +
    `${highlight(result)}  ${chalk.yellow(`[${labels.join(', ')}]`)}`
  );
}

export function toJson(result: LineResult): object {
  return {
    file: result.file,
    line: result.line,
    content: result.content,
    matches: result.hits.map((h) => ({
      column: h.start + 1,
      text: h.text,
      kind: h.matcher.kind,
      label: h.matcher.label,
      section: h.matcher.section,
    })),
  };
}

function highlight(result: LineResult): string {
  // 重なり合う一致範囲をまとめる
  const ranges: { start: number; end: number }[] = [];
  for (const hit of result.hits) {
    const last = ranges[ranges.length - 1];
    if (last && hit.start <= last.end) {
      last.end = Math.max(last.end, hit.end);
    } else {
      ranges.push({ start: hit.start, end: hit.end });
    }
  }

  // minify されたファイルなど長い行は最初の一致付近だけ表示する
  const line = result.content;
  let from = 0;
  let to = line.length;
  if (line.length > MAX_DISPLAY_WIDTH) {
    from = Math.max(0, ranges[0].start - 50);
    to = Math.min(line.length, from + MAX_DISPLAY_WIDTH);
  }

  let out = from > 0 ? '…' : '';
  let pos = from;
  for (const r of ranges) {
    if (r.start >= to) break;
    const start = Math.max(r.start, pos);
    const end = Math.min(r.end, to);
    out += line.slice(pos, start) + chalk.red.bold(line.slice(start, end));
    pos = end;
  }
  out += line.slice(pos, to);
  if (to < line.length) out += '…';
  return out.trim();
}
