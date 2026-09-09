import { MatchResult, MatchRule } from '../internal';

export type InlineMDParser = (text: string) => string;

export type InlineMatchConverter = (parse: InlineMDParser, match: MatchResult) => string;

export type InlineMDRule = {
  match: MatchRule; // A function that matches a specific markdown pattern.
  html: InlineMatchConverter; // A function that converts the match to HTML.
};
