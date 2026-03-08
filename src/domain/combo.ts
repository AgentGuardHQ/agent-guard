// Pure combo/streak system for BugMon
// Tracks consecutive bug resolutions without failures.
// No DOM, no Node.js APIs — pure functions with state passed in.

import type { ComboState, ComboTier } from '../core/types.js';

/**
 * XP multiplier tiers based on combo count.
 * Combo 1 = no bonus, 2 = 1.5x, 3-4 = 2x, 5-9 = 3x, 10+ = 5x
 */
const COMBO_TIERS: readonly ComboTier[] = [
  { min: 10, multiplier: 5.0, label: 'UNSTOPPABLE' },
  { min: 5, multiplier: 3.0, label: 'ON FIRE' },
  { min: 3, multiplier: 2.0, label: 'COMBO' },
  { min: 2, multiplier: 1.5, label: 'DOUBLE' },
];

/** Create a fresh combo state. */
export function createComboState(): ComboState {
  return {
    streak: 0,
    maxStreak: 0,
    totalBonusXP: 0,
  };
}

/** Record a successful bug resolution. */
export function recordResolution(state: ComboState): {
  state: ComboState;
  multiplier: number;
  tier: ComboTier | null;
} {
  const newStreak = state.streak + 1;
  const newState: ComboState = {
    streak: newStreak,
    maxStreak: Math.max(state.maxStreak, newStreak),
    totalBonusXP: state.totalBonusXP,
  };

  const tier = getTier(newStreak);
  const multiplier = tier ? tier.multiplier : 1.0;

  return { state: newState, multiplier, tier };
}

/** Record a failure (resets streak). */
export function recordFailure(state: ComboState): {
  state: ComboState;
  brokeStreak: number;
} {
  const brokeStreak = state.streak;
  const newState: ComboState = {
    streak: 0,
    maxStreak: state.maxStreak,
    totalBonusXP: state.totalBonusXP,
  };
  return { state: newState, brokeStreak };
}

/** Apply a combo multiplier to base XP and track bonus. */
export function applyComboXP(
  state: ComboState,
  baseXP: number,
  multiplier: number,
): { state: ComboState; totalXP: number; bonusXP: number } {
  const totalXP = Math.floor(baseXP * multiplier);
  const bonusXP = totalXP - baseXP;
  const newState: ComboState = {
    ...state,
    totalBonusXP: state.totalBonusXP + bonusXP,
  };
  return { state: newState, totalXP, bonusXP };
}

/** Get the current combo tier for a given streak count. */
export function getTier(streak: number): ComboTier | null {
  for (const tier of COMBO_TIERS) {
    if (streak >= tier.min) return tier;
  }
  return null;
}

/** Format a combo notification string (no ANSI — caller handles styling). */
export function formatCombo(streak: number, tier: ComboTier | null): string | null {
  if (!tier) return null;
  return `${tier.label} x${streak}! (${tier.multiplier}x XP)`;
}
