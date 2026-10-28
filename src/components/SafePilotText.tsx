import { Fragment, type ReactNode } from 'react';

/** A small, intentionally restricted Markdown renderer.
 * Never interpret remote HTML or create links/scripts from model output.
 */
function inline(text: string, prefix: string): ReactNode[] {
  const match = /(`[^`\n]{1,300}`|\*\*[^*\n]{1,600}\*\*|\*[^*\n]{1,600}\*)/g;
  const nodes: ReactNode[] = [];
  let end = 0, i = 0;
  for (const token of text.matchAll(match)) {
    const start = token.index ?? 0;
    if (start > end) nodes.push(<Fragment key={prefix + '-t-' + i}>{text.slice(end, start)}</Fragment>);
    const value = token[0], key = prefix + '-m-' + i;
    if (value.startsWith('**')) nodes.push(<strong key={key}>{value.slice(2, -2)}</strong>);
    else if (value.startsWith('`')) nodes.push(<code key={key}>{value.slice(1, -1)}</code>);
    else nodes.push(<em key={key}>{value.slice(1, -1)}</em>);
    end = start + value.length; i++;
  }
  if (end < text.length) nodes.push(<Fragment key={prefix + '-end'}>{text.slice(end)}</Fragment>);
  return nodes;
}
function isStructure(line: string) {
  return /^\s{0,3}(?:#{1,3}\s+|[-*+]\s+|\d{1,2}[.)]\s+|(?:\*{3,}|-{3,}|_{3,})\s*$|```)/.test(line);
}
export default function SafePilotText({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s{0,3}(?:\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr key={'hr-' + i} />); i++; continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/);
    if (heading) {
      const contents = inline(heading[2], 'h-' + i);
      blocks.push(heading[1].length === 1 ? <h2 key={'h-' + i}>{contents}</h2> :
        heading[1].length === 2 ? <h3 key={'h-' + i}>{contents}</h3> :
        <h4 key={'h-' + i}>{contents}</h4>);
      i++; continue;
    }
    if (/^\s{0,3}```/.test(line)) {
      const start = i++; const code: string[] = [];
      while (i < lines.length && !/^\s{0,3}```/.test(lines[i]) && code.length < 200) code.push(lines[i++]);
      if (i < lines.length && /^\s{0,3}```/.test(lines[i])) i++;
      blocks.push(<pre key={'code-' + start}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const bullet = /^\s{0,3}[-*+]\s+(.+)$/.exec(line);
    const ordered = /^\s{0,3}(\d{1,2})[.)]\s+(.+)$/.exec(line);
    if (bullet || ordered) {
      const start = i, entries: ReactNode[] = [], listType = bullet ? 'bullet' : 'ordered';
      while (i < lines.length) {
        const m = listType === 'bullet' ? /^\s{0,3}[-*+]\s+(.+)$/.exec(lines[i]) :
          /^\s{0,3}\d{1,2}[.)]\s+(.+)$/.exec(lines[i]);
        if (!m) break;
        entries.push(<li key={i}>{inline(m[m.length - 1], 'li-' + i)}</li>); i++;
      }
      blocks.push(listType === 'bullet' ? <ul key={'ul-' + start}>{entries}</ul> :
        <ol key={'ol-' + start}>{entries}</ol>);
      continue;
    }
    const start = i, rows: ReactNode[] = [];
    while (i < lines.length && lines[i].trim() && (!isStructure(lines[i]) || i === start)) {
      if (rows.length) rows.push(<Fragment key={'br-' + i}>{'\n'}</Fragment>);
      rows.push(...inline(lines[i], 'p-' + i)); i++;
    }
    blocks.push(<p key={'p-' + start}>{rows}</p>);
  }
  return <>{blocks}</>;
}
