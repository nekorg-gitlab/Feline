import { replaceMatch } from '../internal';
import { BlockMDParser, BlockMDRule } from './type';

export const runBlockRule = (
  text: string,
  rule: BlockMDRule,
  parse: BlockMDParser,
  parseInline?: (txt: string) => string,
): string | undefined => {
  const matchResult = rule.match(text);
  if (matchResult) {
    const content = rule.html(matchResult, parseInline);
    return replaceMatch(text, matchResult, content, (txt) => [parse(txt, parseInline)]).join('');
  }
  return undefined;
};
