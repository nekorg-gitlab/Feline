import { MatchResult, MatchRule } from '../internal';

export type BlockMDParser = (text: string, parseInline?: (txt: string) => string) => string;

export type BlockMatchConverter = (
  match: MatchResult,
  parseInline?: (txt: string) => string,
) => string;

export type BlockMDRule = {
  match: MatchRule; // A function that matches a specific markdown pattern.
  html: BlockMatchConverter; // A function that converts the match to HTML.
};
