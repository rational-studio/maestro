import { createHighlighter, type BundledLanguage } from 'shiki';

const cacheKey = '__motifShikiCache' as const;
type Cache = Map<string, string>;

declare global {
  var __motifShikiCache: Cache | undefined;
  var __motifHighlighter: Promise<import('shiki').Highlighter> | undefined;
}

function getCache(): Cache {
  if (!globalThis[cacheKey]) {
    globalThis[cacheKey] = new Map();
  }
  return globalThis[cacheKey]!;
}

function getHighlighter() {
  if (!globalThis.__motifHighlighter) {
    globalThis.__motifHighlighter = createHighlighter({
      themes: ['github-light-high-contrast', 'github-dark-high-contrast'],
      langs: ['ts', 'tsx', 'bash', 'json'],
    });
  }
  return globalThis.__motifHighlighter;
}

type ThemeName = 'github-light-high-contrast' | 'github-dark-high-contrast';

export async function highlight(code: string, lang: BundledLanguage, theme: ThemeName) {
  const key = `${theme}:${lang}:${code}`;
  const cache = getCache();
  const hit = cache.get(key);
  if (hit) return hit;
  const highlighter = await getHighlighter();
  let html: string;
  try {
    html = highlighter.codeToHtml(code, { lang, theme });
  } catch {
    const fallback: ThemeName = theme.includes('dark') ? 'github-dark-high-contrast' : 'github-light-high-contrast';
    html = highlighter.codeToHtml(code, { lang, theme: fallback });
  }
  cache.set(key, html);
  return html;
}
