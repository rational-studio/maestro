import { highlight } from '@/lib/shiki';
import type { BundledLanguage } from 'shiki';

import CodeTabsClient from './CommandTabsClient';

type Variant = 'pnpm' | 'npm' | 'yarn';

export default async function CommandTabs({ commands }: { commands: Record<Variant, string> }) {
  const entries = Object.entries(commands) as Array<[Variant, string]>;
  const lang: BundledLanguage = 'bash';
  const highlighted: Record<Variant, string> = {
    pnpm: await highlight(commands.pnpm, lang, 'github-light-high-contrast'),
    npm: await highlight(commands.npm, lang, 'github-light-high-contrast'),
    yarn: await highlight(commands.yarn, lang, 'github-light-high-contrast'),
  };
  const highlightedDark: Record<Variant, string> = {
    pnpm: await highlight(commands.pnpm, lang, 'github-dark-high-contrast'),
    npm: await highlight(commands.npm, lang, 'github-dark-high-contrast'),
    yarn: await highlight(commands.yarn, lang, 'github-dark-high-contrast'),
  };
  return <CodeTabsClient entries={entries} highlighted={highlighted} highlightedDark={highlightedDark} />;
}
