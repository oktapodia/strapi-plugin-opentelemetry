import type { NormalizeConfig } from '../config/types';
import { DEFAULT_NORMALIZE_RULES } from '../config/defaults';

const compileRules = (normalize: NormalizeConfig | undefined): Array<[RegExp, string]> => {
  if (!normalize) {
    return DEFAULT_NORMALIZE_RULES.map(([pattern, replacement]) => [
      new RegExp(pattern, 'g'),
      replacement,
    ]);
  }

  if (typeof normalize === 'function') {
    return [];
  }

  return normalize.map(([pattern, replacement]) => [new RegExp(pattern, 'g'), replacement]);
};

export const normalizePath = (
  path: string,
  normalize: NormalizeConfig | undefined,
  context: { method: string }
): string => {
  if (typeof normalize === 'function') {
    return normalize(path, context);
  }

  let normalized = path;
  const rules = compileRules(normalize);

  for (const [pattern, replacement] of rules) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized;
};

export const shouldIgnorePath = (path: string, ignorePaths: string[]): boolean => {
  return ignorePaths.some((candidate) => {
    if (candidate.startsWith('/') && candidate.endsWith('/') && candidate.length > 2) {
      const source = candidate.slice(1, -1);
      return new RegExp(source).test(path);
    }

    return path === candidate || path.startsWith(`${candidate}/`);
  });
};
