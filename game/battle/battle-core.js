// Re-exports from domain/battle.js for backward compatibility
// All battle logic now lives in domain/battle.js

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
