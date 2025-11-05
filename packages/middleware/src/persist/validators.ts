/**
 * Inventory validation utilities.
 * Ensures each Step kind in the workflow inventory is unique.
 */

import { type StepCreatorAny } from '@motif-ts/core';

export function validateInventory(inventory: readonly StepCreatorAny[]) {
  const counts: Record<string, number> = {};
  for (const creator of inventory) {
    const k = creator.kind;
    counts[k] = (counts[k] ?? 0) + 1;
  }

  const dupDetails: string[] = [];
  for (const k in counts) {
    const c = counts[k];
    if (c > 1) {
      dupDetails.push(`${k} (${c}x)`);
    }
  }

  if (dupDetails.length) {
    const details = dupDetails.join(', ');
    throw new Error(
      `motif-ts Workflow Inventory contains duplicate Step kinds: ${details}. Each Step kind must be unique.`,
    );
  }
}
