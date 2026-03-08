// Pure boss trigger evaluation logic
// No DOM, no Node.js APIs — pure domain logic.
// Boss data definitions live in src/meta/bosses.ts

import type { BossDefinition, BossTrigger } from '../meta/bosses.js';

/**
 * Evaluate whether a boss encounter should trigger given current error counts
 * and the latest error message.
 *
 * Pure function: takes data in, returns result. No side effects.
 */
export function checkBossEncounter(
  bosses: readonly BossDefinition[],
  triggers: Readonly<Record<string, BossTrigger>>,
  errorCounts: Map<string, number>,
  latestMessage: string,
): { boss: BossDefinition; trigger: string } | null {
  for (const [triggerId, trigger] of Object.entries(triggers)) {
    if (trigger.errorTypes) {
      let total = 0;
      for (const et of trigger.errorTypes) {
        total += errorCounts.get(et) || 0;
      }
      if (total >= trigger.threshold) {
        const boss = bosses.find((b) => b.trigger === triggerId);
        if (boss) return { boss, trigger: triggerId };
      }
    }

    if (trigger.patterns && trigger.window === 'single') {
      for (const pat of trigger.patterns) {
        if (pat.test(latestMessage)) {
          const boss = bosses.find((b) => b.trigger === triggerId);
          if (boss) return { boss, trigger: triggerId };
        }
      }
    }
  }

  return null;
}
