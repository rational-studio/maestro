import { highlight } from '@/lib/shiki';
import type { BundledLanguage } from 'shiki';

export default async function CodeHighlight({
  code,
  lang,
  ariaLabel,
}: {
  code: string;
  lang: BundledLanguage;
  ariaLabel?: string;
}) {
  const [light, dark] = await Promise.all([
    highlight(code, lang, 'github-light-high-contrast'),
    highlight(code, lang, 'github-dark-high-contrast'),
  ]);
  return (
    <div role="region" aria-label={ariaLabel ?? 'Code example'} className="not-prose">
      <div className="block dark:hidden" dangerouslySetInnerHTML={{ __html: light }} />
      <div className="hidden dark:block" dangerouslySetInnerHTML={{ __html: dark }} />
    </div>
  );
}
