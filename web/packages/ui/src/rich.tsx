import { Fragment, type ReactNode } from "react";

/**
 * Renders a translated sentence that marks words for styling, e.g.
 * rich(t("Choose a <hl>category</hl>"), { hl: (text) => <span className="text-brand-500">{text}</span> }).
 * Translators move the tags with the words, so emphasis survives word order.
 */
export function rich(text: string, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const render = tags[match[1]!];
    parts.push(<Fragment key={match.index}>{render ? render(match[2]!) : match[2]}</Fragment>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
