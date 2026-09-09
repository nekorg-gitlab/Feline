import { replaceMatch } from '../internal';
import { BlockQuoteRule, CodeBlockRule, ESC_BLOCK_SEQ, HeadingRule, ListRule } from './rules';
import { runBlockRule } from './runner';
import { BlockMDParser } from './type';

export const parseBlockMD: BlockMDParser = (text, parseInline) => {
  if (text === '') return text;
  let result: string | undefined;

  if (!result) result = runBlockRule(text, CodeBlockRule, parseBlockMD, parseInline);
  if (!result) result = runBlockRule(text, BlockQuoteRule, parseBlockMD, parseInline);
  if (!result) result = runBlockRule(text, ListRule, parseBlockMD, parseInline);
  if (!result) result = runBlockRule(text, HeadingRule, parseBlockMD, parseInline);

  if (!result) {
    result = text
      .split('\n')
      .map((lineText) => {
        const match = lineText.match(ESC_BLOCK_SEQ);
        if (!match) {
          return parseInline?.(lineText) ?? lineText;
        }

        const [, g1] = match;
        return replaceMatch(lineText, match, g1, (t) => [parseInline?.(t) ?? t]).join('');
      })
      .join('<br/>');
  }

  return result ?? text;
};
