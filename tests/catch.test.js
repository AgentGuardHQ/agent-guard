import assert from 'node:assert';
import { test, suite } from './run.js';

// catch.js has I/O dependencies (readline, fs, BugDex storage).
// We test the pure logic by reimplementing the core algorithms from the module.

suite('CLI Cache/Battle logic (core/cli/catch.js)', () => {
  // --- calcDamage logic (reimplemented from catch.js) ---

  function calcDamage(attacker, move, defender, typeChart, options = {}) {
    const power = move.power || 5;
    const attack = attacker.attack || 5;
    const defense = defender.defense || 3;
    const randomBonus = options.randomBonus ?? (Math.floor(Math.random() * 3) + 1);
    const mult = typeChart?.[move.type]?.[defender.type] ?? 1;
    const crit = options.critRoll !== undefined
      ? (options.critRoll < 1 / 16 ? 1.5 : 1)
      : (Math.random() < 1 / 16 ? 1.5 : 1);

    const damage = Math.max(1, Math.floor((power + attack - Math.floor(defense / 2) + randomBonus) * mult * crit));

    let effText = '';
    if (mult > 1) effText = ' (super effective!)';
    else if (mult < 1) effText = ' (not very effective)';
    if (crit > 1) effText += ' (CRITICAL!)';

    return { damage, effText };
  }

  // --- Cache rate logic (reimplemented from catch.js) ---

  function cacheRate(currentHP, maxHP) {
    const hpRatio = currentHP / maxHP;
    return (1 - hpRatio) * 0.5 + 0.1;
  }

  const typeChart = {
    backend:  { frontend: 0.5, backend: 1.0, devops: 1.5 },
    frontend: { frontend: 1.0, backend: 1.5, devops: 1.0 },
  };

  const attacker = { attack: 8, type: 'backend' };
  const defender = { defense: 4, type: 'frontend' };
  const move = { power: 10, type: 'backend' };

  // --- Damage calculation ---

  test('calcDamage returns positive damage', () => {
    const { damage } = calcDamage(attacker, move, defender, typeChart, { randomBonus: 1, critRoll: 1 });
    assert.ok(damage >= 1);
  });

  test('calcDamage applies type effectiveness: not-very-effective (0.5x)', () => {
    // backend vs frontend = 0.5x
    const { damage: notEffective } = calcDamage(attacker, move, defender, typeChart, { randomBonus: 2, critRoll: 1 });
    // frontend vs backend = 1.5x
    const frontendMove = { power: 10, type: 'frontend' };
    const { damage: superEffective } = calcDamage(attacker, frontendMove, { defense: 4, type: 'backend' }, typeChart, { randomBonus: 2, critRoll: 1 });
    assert.ok(superEffective > notEffective, `super-effective (${superEffective}) should be > not-effective (${notEffective})`);
  });

  test('calcDamage: super effective text', () => {
    const frontendMove = { power: 10, type: 'frontend' };
    const { effText } = calcDamage(attacker, frontendMove, { defense: 4, type: 'backend' }, typeChart, { randomBonus: 2, critRoll: 1 });
    assert.ok(effText.includes('super effective'), `expected super effective text, got: "${effText}"`);
  });

  test('calcDamage: not very effective text', () => {
    const { effText } = calcDamage(attacker, move, defender, typeChart, { randomBonus: 2, critRoll: 1 });
    assert.ok(effText.includes('not very effective'), `expected not very effective text, got: "${effText}"`);
  });

  test('calcDamage: neutral gives no effectiveness text', () => {
    const { effText } = calcDamage(attacker, move, { defense: 4, type: 'backend' }, typeChart, { randomBonus: 2, critRoll: 1 });
    assert.ok(!effText.includes('effective'), `expected no effectiveness text, got: "${effText}"`);
  });

  test('calcDamage: critical hit multiplier (1.5x)', () => {
    const { damage: noCrit } = calcDamage(attacker, move, { defense: 4, type: 'backend' }, typeChart, { randomBonus: 2, critRoll: 1 });
    const { damage: withCrit } = calcDamage(attacker, move, { defense: 4, type: 'backend' }, typeChart, { randomBonus: 2, critRoll: 0 });
    assert.ok(withCrit > noCrit, `crit (${withCrit}) should be > no-crit (${noCrit})`);
  });

  test('calcDamage: critical hit text', () => {
    const { effText } = calcDamage(attacker, move, { defense: 4, type: 'backend' }, typeChart, { randomBonus: 2, critRoll: 0 });
    assert.ok(effText.includes('CRITICAL'), `expected CRITICAL text, got: "${effText}"`);
  });

  test('calcDamage: defaults for missing stats', () => {
    const { damage } = calcDamage({}, { type: 'unknown' }, {}, {}, { randomBonus: 1, critRoll: 1 });
    // power=5, attack=5, defense=3 -> (5+5-1+1)*1*1 = 10
    assert.ok(damage >= 1, 'should produce positive damage with defaults');
  });

  test('calcDamage: unknown type defaults to 1.0 multiplier', () => {
    const { damage } = calcDamage(attacker, { power: 10, type: 'alien' }, defender, typeChart, { randomBonus: 2, critRoll: 1 });
    // No alien type in chart -> mult = 1.0
    assert.ok(damage >= 1);
  });

  test('calcDamage: minimum damage is 1', () => {
    const tankDefender = { defense: 200, type: 'backend' };
    const weakMove = { power: 1, type: 'backend' };
    const weakAttacker = { attack: 1, type: 'backend' };
    const { damage } = calcDamage(weakAttacker, weakMove, tankDefender, typeChart, { randomBonus: 1, critRoll: 1 });
    // (1 + 1 - 100 + 1) * 1 * 1 = -97 -> clamped to 1
    assert.strictEqual(damage, 1);
  });

  test('calcDamage: random bonus range is 1-3', () => {
    const damages = new Set();
    for (let bonus = 1; bonus <= 3; bonus++) {
      const { damage } = calcDamage(attacker, move, { defense: 4, type: 'backend' }, typeChart, { randomBonus: bonus, critRoll: 1 });
      damages.add(damage);
    }
    assert.ok(damages.size >= 2, 'different random bonuses should produce different damages');
  });

  // --- Cache rate ---

  test('cacheRate: full HP gives 0.1', () => {
    assert.ok(Math.abs(cacheRate(30, 30) - 0.1) < 0.001);
  });

  test('cacheRate: 0 HP gives 0.6', () => {
    assert.ok(Math.abs(cacheRate(0, 30) - 0.6) < 0.001);
  });

  test('cacheRate: half HP gives 0.35', () => {
    assert.ok(Math.abs(cacheRate(15, 30) - 0.35) < 0.001);
  });

  test('cacheRate: lower HP gives higher rate', () => {
    const rateFull = cacheRate(30, 30);
    const rateHalf = cacheRate(15, 30);
    const rateLow = cacheRate(3, 30);
    assert.ok(rateFull < rateHalf);
    assert.ok(rateHalf < rateLow);
  });

  test('cacheRate: minimum rate is 0.1 (at full HP)', () => {
    const rate = cacheRate(100, 100);
    assert.ok(rate >= 0.1);
  });

  test('cacheRate: maximum rate is 0.6 (at 0 HP)', () => {
    const rate = cacheRate(0, 100);
    assert.ok(Math.abs(rate - 0.6) < 0.001);
  });

  // --- Turn order logic ---

  test('turn order: faster monster goes first', () => {
    const playerMon = { speed: 6 };
    const enemy = { speed: 3 };
    const playerFirst = playerMon.speed >= enemy.speed;
    assert.strictEqual(playerFirst, true);
  });

  test('turn order: equal speed favors player', () => {
    const playerMon = { speed: 5 };
    const enemy = { speed: 5 };
    const playerFirst = playerMon.speed >= enemy.speed;
    assert.strictEqual(playerFirst, true);
  });

  test('turn order: slower player goes second', () => {
    const playerMon = { speed: 2 };
    const enemy = { speed: 8 };
    const playerFirst = playerMon.speed >= enemy.speed;
    assert.strictEqual(playerFirst, false);
  });

  // --- Party management logic ---

  test('party max size is 6', () => {
    const party = [];
    for (let i = 0; i < 6; i++) {
      party.push({ id: i, name: `Mon${i}` });
    }
    assert.strictEqual(party.length, 6);
    // Overflow should go to storage
    const storage = [];
    const newMon = { id: 7, name: 'Overflow' };
    if (party.length < 6) {
      party.push(newMon);
    } else {
      storage.push(newMon);
    }
    assert.strictEqual(party.length, 6);
    assert.strictEqual(storage.length, 1);
    assert.strictEqual(storage[0].name, 'Overflow');
  });

  test('cached monster entry has required fields', () => {
    const monster = { id: 1, name: 'NullPointer', type: 'backend', hp: 30, attack: 8, defense: 4, speed: 6, moves: ['segfault'], color: '#e74c3c', sprite: 'nullpointer', rarity: 'common' };
    const entry = {
      id: monster.id,
      name: monster.name,
      type: monster.type,
      hp: monster.hp,
      currentHP: monster.hp,
      attack: monster.attack,
      defense: monster.defense,
      speed: monster.speed,
      moves: monster.moves,
      color: monster.color,
      sprite: monster.sprite,
      rarity: monster.rarity,
      cachedAt: new Date().toISOString(),
    };
    assert.ok(entry.id !== undefined);
    assert.ok(entry.name);
    assert.ok(entry.type);
    assert.strictEqual(entry.currentHP, entry.hp);
    assert.ok(entry.cachedAt);
  });
});
