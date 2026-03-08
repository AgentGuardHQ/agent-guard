// Boss encounters — triggered by systemic failures, not individual errors
// Bosses represent large-scale development problems that require
// fixing the underlying issue (not just one error) to defeat.

/**
 * Boss trigger types (detected by the CLI adapter):
 *   'multiple-test-failures'  — 3+ test failures in a single run
 *   'heap-growth'             — heap out of memory / allocation failures
 *   'npm-conflict'            — ERESOLVE, peer dependency conflicts
 *   'pipeline-failure'        — CI pipeline errors (detected from output)
 *   'type-explosion'          — 10+ TypeErrors in a single session
 *   'syntax-cascade'          — 5+ SyntaxErrors (usually a bad refactor)
 */

export const BOSSES = [
  {
    id: 'test-suite-hydra',
    name: 'Test Suite Hydra',
    type: 'testing',
    trigger: 'multiple-test-failures',
    triggerThreshold: 3,
    hp: 200,
    attack: 15,
    defense: 10,
    speed: 4,
    moves: ['assertion-storm', 'flaky-regenerate', 'coverage-drain'],
    defeatCondition: 'All tests pass',
    description:
      'A many-headed beast that grows stronger with each failing test. Cut one head and two more appear.',
    rarity: 'boss',
    ascii: [
      '   ╱O╲ ╱O╲ ╱O╲   ',
      '   │ │ │ │ │ │   ',
      '   ╰─┤ │ ├─╯     ',
      '     │ │ │        ',
      '     ╰─┼─╯        ',
      '    ╱█████╲       ',
      '   ╱███████╲      ',
      '   ▓▓▓▓▓▓▓▓▓      ',
    ],
  },
  {
    id: 'memory-leak-titan',
    name: 'Memory Leak Titan',
    type: 'backend',
    trigger: 'heap-growth',
    triggerThreshold: 1,
    hp: 300,
    attack: 10,
    defense: 15,
    speed: 2,
    moves: ['heap-overflow', 'garbage-storm', 'reference-trap'],
    defeatCondition: 'No memory warnings in 5 minutes',
    description:
      'A slow-moving colossus that grows endlessly, consuming all available memory. It never releases what it takes.',
    rarity: 'boss',
    ascii: [
      '      ╭─────╮      ',
      '     ╱ ●   ● ╲     ',
      '    │   ___   │    ',
      '    │  |   |  │    ',
      '   ╱│  |MEM|  │╲   ',
      '  ╱ │  |___|  │ ╲  ',
      ' ╱  ╰─────────╯  ╲ ',
      ' ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ',
    ],
  },
  {
    id: 'dependency-kraken',
    name: 'Dependency Kraken',
    type: 'devops',
    trigger: 'npm-conflict',
    triggerThreshold: 1,
    hp: 250,
    attack: 12,
    defense: 12,
    speed: 3,
    moves: ['version-tangle', 'peer-conflict', 'lockfile-smash'],
    defeatCondition: 'Clean install with no conflicts',
    description:
      'A tentacled horror lurking in node_modules. Each tentacle is a conflicting dependency version.',
    rarity: 'boss',
    ascii: [
      '    ╭──●──╮        ',
      '   ╱╱ ◉ ◉ ╲╲       ',
      '  ││ ~~~~~ ││      ',
      '  │╰───────╯│      ',
      ' ╱│ │ │ │ │ │╲     ',
      '╱ │╱ │╱ │╱ │╱ ╲    ',
      '~ ~ ~ ~ ~ ~ ~ ~   ',
      '  node_modules     ',
    ],
  },
  {
    id: 'ci-dragon',
    name: 'CI Dragon',
    type: 'devops',
    trigger: 'pipeline-failure',
    triggerThreshold: 1,
    hp: 500,
    attack: 18,
    defense: 8,
    speed: 5,
    moves: ['pipeline-fire', 'deploy-block', 'status-check-deny'],
    defeatCondition: 'Pipeline passes',
    description:
      'An ancient dragon that guards the deployment gate. Its fire is the red X on your PR checks.',
    rarity: 'boss',
    ascii: [
      '        /\\_/\\       ',
      '     __/ x x \\__    ',
      '    /  \\  ^  /  \\   ',
      '   { 🔥 }   { 🔥 } ',
      '    \\  \\_____/  /   ',
      '     \\  CI/CD  /    ',
      '      \\ ✗ ✗ ✗ /     ',
      '       \\_____/      ',
    ],
  },
  {
    id: 'type-error-swarm',
    name: 'TypeError Swarm',
    type: 'backend',
    trigger: 'type-explosion',
    triggerThreshold: 10,
    hp: 180,
    attack: 8,
    defense: 5,
    speed: 12,
    moves: ['null-barrage', 'undefined-rain', 'type-coerce'],
    defeatCondition: 'No TypeErrors for 3 minutes',
    description: 'A buzzing swarm of TypeErrors. Each one is small, but together they overwhelm.',
    rarity: 'boss',
    ascii: [
      '  ×× ×× ×× ×× ××  ',
      ' × null × undef ×  ',
      '  ×× ×× ×× ×× ××  ',
      ' × NaN × null × ×  ',
      '  ×× ×× ×× ×× ××  ',
      ' × undef × NaN ×   ',
      '  ×× ×× ×× ×× ××  ',
      '    ~SWARM~         ',
    ],
  },
  {
    id: 'syntax-cascade',
    name: 'Syntax Cascade',
    type: 'frontend',
    trigger: 'syntax-cascade',
    triggerThreshold: 5,
    hp: 150,
    attack: 14,
    defense: 6,
    speed: 8,
    moves: ['unexpected-token', 'bracket-mismatch', 'semicolon-rain'],
    defeatCondition: 'No SyntaxErrors remain',
    description:
      'A cascading waterfall of syntax errors. Fix one and three more tumble out from the refactor.',
    rarity: 'boss',
    ascii: [
      '   { ( [ < > ] ) }  ',
      '    ╲ ╲ ╲ ╱ ╱ ╱    ',
      '     ╲ ╲ ╳ ╱ ╱     ',
      '      ╲ ╳ ╳ ╱      ',
      '       ╳ ╳ ╳       ',
      '      ╱ ╳ ╳ ╲      ',
      '     ╱ ╱ ╳ ╲ ╲     ',
      '    ; ; ; ; ; ;     ',
    ],
  },
];

/**
 * Boss trigger patterns — maps error-parser output to boss triggers.
 */
export const BOSS_TRIGGERS = {
  'multiple-test-failures': {
    errorTypes: ['assertion'],
    threshold: 3,
    window: 'session',
  },
  'heap-growth': {
    errorTypes: ['memory-leak'],
    patterns: [/heap out of memory/i, /allocation failed/i],
    threshold: 1,
    window: 'session',
  },
  'npm-conflict': {
    patterns: [/ERESOLVE/i, /peer dep/i, /could not resolve/i, /conflicting peer/i],
    threshold: 1,
    window: 'single',
  },
  'pipeline-failure': {
    patterns: [/pipeline failed/i, /ci failed/i, /build failed/i, /workflow.*failed/i],
    threshold: 1,
    window: 'single',
  },
  'type-explosion': {
    errorTypes: ['null-reference', 'type-mismatch', 'type-error'],
    threshold: 10,
    window: 'session',
  },
  'syntax-cascade': {
    errorTypes: ['syntax'],
    threshold: 5,
    window: 'session',
  },
};

/**
 * Check if a boss encounter should be triggered based on accumulated errors.
 *
 * @param {Map<string, number>} errorCounts - Map of error type → count this session
 * @param {string} latestMessage - The latest error message text
 * @returns {{boss: object, trigger: string} | null}
 */
export function checkBossEncounter(errorCounts, latestMessage) {
  for (const [triggerId, trigger] of Object.entries(BOSS_TRIGGERS)) {
    // Check error type accumulation
    if (trigger.errorTypes) {
      let total = 0;
      for (const et of trigger.errorTypes) {
        total += errorCounts.get(et) || 0;
      }
      if (total >= trigger.threshold) {
        const boss = BOSSES.find((b) => b.trigger === triggerId);
        if (boss) return { boss, trigger: triggerId };
      }
    }

    // Check pattern matching on latest message
    if (trigger.patterns && trigger.window === 'single') {
      for (const pat of trigger.patterns) {
        if (pat.test(latestMessage)) {
          const boss = BOSSES.find((b) => b.trigger === triggerId);
          if (boss) return { boss, trigger: triggerId };
        }
      }
    }
  }

  return null;
}
