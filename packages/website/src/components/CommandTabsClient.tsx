'use client';

import { useState } from 'react';

type Variant = 'pnpm' | 'npm' | 'yarn';

export default function CommandTabsClient({
  entries,
  highlighted,
  highlightedDark,
}: {
  entries: Array<[Variant, string]>;
  highlighted: Record<Variant, string>;
  highlightedDark: Record<Variant, string>;
}) {
  const [active, setActive] = useState<Variant>(entries[0][0]);
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/15">
      <div className="flex gap-2 border-b border-black/10 p-2 dark:border-white/15">
        {entries.map(([variant]) => (
          <button
            key={variant}
            onClick={() => setActive(variant)}
            className={
              variant === active
                ? 'rounded px-3 py-1 bg-black text-white dark:bg-white dark:text-black'
                : 'rounded px-3 py-1 bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
            }
          >
            {variant}
          </button>
        ))}
      </div>
      <div className="p-3">
        <div className="block dark:hidden" dangerouslySetInnerHTML={{ __html: highlighted[active] }} />
        <div className="hidden dark:block" dangerouslySetInnerHTML={{ __html: highlightedDark[active] }} />
      </div>
    </div>
  );
}
