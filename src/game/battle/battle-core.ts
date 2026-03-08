// Re-exports from domain/battle.ts for backward compatibility

export {
  createBattleState,
  getTurnOrder,
  resolveMove,
  applyDamage,
  applyHealing,
  isFainted,
  cacheChance,
  attemptCache,
  pickEnemyMove,
  executeTurn,
  simulateBattle,
  calcDamage,
  isHealMove,
  calcHealing,
} from '../../domain/battle.js';
