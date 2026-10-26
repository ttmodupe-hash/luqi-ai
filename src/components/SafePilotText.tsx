import { Fragment } from 'react';

/**
 * Intentionally tiny, safe renderer for the verified, bounded pilot reply.
 * Supports only non-nested **bold** and *italic* emphasis.
 * React escapes arbitrary strings; no HTML, links, images or Markdown runtime.
 */
export default function SafePilotText({ text }: { text: string }) {
  const tokens: Array<{ start: number; end: number; inner: string; kind: 'strong' | 'em' }> = [];
  const matcher = /(\*\*[^*\n]{1,600}\*\*|\*[^*\n]{1,600}\*)/g;
  for (const match of text.matchAll(matcher)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const strong = raw.startsWith('**');
    const inner = raw.slice(strong ? 2 : 1, strong ? -2 : -1);
    tokens.push({ start, end: start + raw.length, inner, kind: strong ? 'strong' : 'em' });
  }
  const result: React.ReactNode[] = [];
  let cursor = 0;
  for (const [i, token] of tokens.entries()) {
    if (token.start < cursor) continue;
    if (cursor < token.start) result.push(<Fragment key={'text-'+i}>{text.slice(cursor, token.start)}</Fragment>);
    result.push(token.kind === 'strong'
      ? <strong key={'em-'+i}>{token.inner}</strong>
      : <em key={'em-'+i}>{token.inner}</em>);
    cursor = token.end;
  }
  if (cursor < text.length) result.push(<Fragment key="remaining">{text.slice(cursor)}</Fragment>);
  return <>{result}</>;
}
