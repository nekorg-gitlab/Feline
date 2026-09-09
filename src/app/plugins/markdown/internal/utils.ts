export type MatchResult = RegExpMatchArray | RegExpExecArray;

export type MatchRule = (text: string) => MatchResult | null;

export const beforeMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice(0, match.index);

export const afterMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice((match.index ?? 0) + match[0].length);

export const replaceMatch = <C>(
  text: string,
  match: MatchResult,
  content: C,
  processPart: (txt: string) => Array<string | C>,
): Array<string | C> => [
  ...processPart(beforeMatch(text, match)),
  content,
  ...processPart(afterMatch(text, match)),
];
