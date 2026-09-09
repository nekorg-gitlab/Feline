import { MatchResult, replaceMatch } from '../internal';
import { InlineMDParser, InlineMDRule } from './type';

export const runInlineRule = (
  text: string,
  rule: InlineMDRule,
  parse: InlineMDParser,
): string | undefined => {
  const matchResult = rule.match(text);
  if (matchResult) {
    const content = rule.html(parse, matchResult);
    return replaceMatch(text, matchResult, content, (txt) => [parse(txt)]).join('');
  }
  return undefined;
};

export const runInlineRules = (
  text: string,
  rules: InlineMDRule[],
  parse: InlineMDParser,
): string | undefined => {
  const matchResults = rules.map((rule) => rule.match(text));

  let targetRule: InlineMDRule | undefined;
  let targetResult: MatchResult | undefined;

  for (let i = 0; i < matchResults.length; i += 1) {
    const currentResult = matchResults[i];
    if (currentResult && typeof currentResult.index === 'number') {
      if (
        !targetResult ||
        (typeof targetResult?.index === 'number' && currentResult.index < targetResult.index)
      ) {
        targetResult = currentResult;
        targetRule = rules[i];
      }
    }
  }

  if (targetRule && targetResult) {
    const content = targetRule.html(parse, targetResult);
    return replaceMatch(text, targetResult, content, (txt) => [parse(txt)]).join('');
  }
  return undefined;
};
