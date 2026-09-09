import { findAndReplace } from '../../utils/findAndReplace';
import { ESC_BLOCK_SEQ, UN_ESC_BLOCK_SEQ } from './block/rules';
import { EscapeRule, CAP_INLINE_SEQ } from './inline/rules';
import { runInlineRule } from './inline/runner';
import { replaceMatch } from './internal';

export const unescapeMarkdownInlineSequences = (text: string): string =>
  runInlineRule(text, EscapeRule, (t) => {
    if (t === '') return t;
    return unescapeMarkdownInlineSequences(t);
  }) ?? text;

export const escapeMarkdownInlineSequences = (text: string): string => {
  const regex = new RegExp(`(${CAP_INLINE_SEQ})`, 'g');
  return findAndReplace(
    text,
    regex,
    ([, g1]) => `\\${g1}`,
    (t) => t,
  ).join('');
};

const replaceBlockSequence = (
  text: string,
  pattern: RegExp,
  toContent: (g1: string) => string,
  processPart: (text: string) => string,
): string => {
  const match = text.match(pattern);
  if (!match) return processPart(text);
  return replaceMatch(text, match, toContent(match[1]), (t) => [processPart(t)]).join('');
};

export const unescapeMarkdownBlockSequences = (
  text: string,
  processPart: (text: string) => string,
): string => replaceBlockSequence(text, ESC_BLOCK_SEQ, (g1) => g1, processPart);

export const escapeMarkdownBlockSequences = (
  text: string,
  processPart: (text: string) => string,
): string => replaceBlockSequence(text, UN_ESC_BLOCK_SEQ, (g1) => `\\${g1}`, processPart);
