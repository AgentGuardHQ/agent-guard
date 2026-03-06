// Monster data — inlined from monsters.json (descriptions stripped for size)
// To regenerate: node scripts/sync-data.js
export const MONSTERS = [
  {
    id: 1,
    name: 'NullPointer',
    type: 'memory',
    hp: 30,
    attack: 8,
    defense: 4,
    speed: 6,
    moves: [
      'segfault',
      'hotfix'
    ],
    color: '#e74c3c',
    sprite: 'nullpointer'
  },
  {
    id: 2,
    name: 'RaceCondition',
    type: 'logic',
    hp: 25,
    attack: 6,
    defense: 3,
    speed: 10,
    moves: [
      'threadlock',
      'hotfix'
    ],
    color: '#f39c12',
    sprite: 'racecondition'
  },
  {
    id: 3,
    name: 'MemoryLeak',
    type: 'memory',
    hp: 40,
    attack: 5,
    defense: 6,
    speed: 3,
    moves: [
      'garbagecollect',
      'memorydump'
    ],
    color: '#2ecc71',
    sprite: 'memoryleak'
  },
  {
    id: 4,
    name: 'Deadlock',
    type: 'logic',
    hp: 35,
    attack: 7,
    defense: 8,
    speed: 2,
    moves: [
      'mutex',
      'forcequit'
    ],
    color: '#8e44ad',
    sprite: 'deadlock'
  },
  {
    id: 5,
    name: 'OffByOne',
    type: 'logic',
    hp: 28,
    attack: 7,
    defense: 5,
    speed: 7,
    moves: [
      'nullcheck',
      'rollback'
    ],
    color: '#e67e22',
    sprite: 'offbyone'
  },
  {
    id: 6,
    name: 'MergeConflict',
    type: 'syntax',
    hp: 32,
    attack: 6,
    defense: 7,
    speed: 4,
    moves: [
      'refactor',
      'patchdeploy'
    ],
    color: '#8e44ad',
    sprite: 'mergeconflict'
  },
  {
    id: 7,
    name: 'CallbackHell',
    type: 'runtime',
    hp: 27,
    attack: 9,
    defense: 3,
    speed: 8,
    moves: [
      'hotreload',
      'bluescreen'
    ],
    color: '#c0392b',
    sprite: 'callbackhell'
  },
  {
    id: 8,
    name: 'Heisenbug',
    type: 'logic',
    hp: 26,
    attack: 7,
    defense: 4,
    speed: 9,
    moves: [
      'nullcheck',
      'typemismatch'
    ],
    color: '#d4ac0d',
    sprite: 'heisenbug'
  },
  {
    id: 9,
    name: 'InfiniteLoop',
    type: 'runtime',
    hp: 45,
    attack: 4,
    defense: 5,
    speed: 1,
    moves: [
      'coredump',
      'hotreload'
    ],
    color: '#e74c3c',
    sprite: 'infiniteloop'
  },
  {
    id: 10,
    name: 'SpaghettiCode',
    type: 'syntax',
    hp: 33,
    attack: 8,
    defense: 5,
    speed: 3,
    moves: [
      'refactor',
      'compile'
    ],
    color: '#7d3c98',
    sprite: 'spaghetticode'
  },
  {
    id: 11,
    name: 'StackOverflow',
    type: 'runtime',
    hp: 30,
    attack: 9,
    defense: 4,
    speed: 6,
    moves: [
      'bufferoverrun',
      'bluescreen'
    ],
    color: '#cb4335',
    sprite: 'stackoverflow'
  },
  {
    id: 12,
    name: 'IndexOutOfBounds',
    type: 'memory',
    hp: 28,
    attack: 8,
    defense: 3,
    speed: 8,
    moves: [
      'bufferoverrun',
      'segfault'
    ],
    color: '#27ae60',
    sprite: 'indexoutofbounds'
  },
  {
    id: 13,
    name: 'CSSFloat',
    type: 'frontend',
    hp: 29,
    attack: 6,
    defense: 4,
    speed: 9,
    moves: [
      'cacheinvalidation',
      'hotfix'
    ],
    color: '#3498db',
    sprite: 'cssfloat'
  },
  {
    id: 14,
    name: '404NotFound',
    type: 'frontend',
    hp: 24,
    attack: 5,
    defense: 5,
    speed: 10,
    moves: [
      'dommanipulation',
      'nullcheck'
    ],
    color: '#2980b9',
    sprite: '404notfound'
  },
  {
    id: 15,
    name: 'DeprecatedAPI',
    type: 'backend',
    hp: 38,
    attack: 7,
    defense: 7,
    speed: 2,
    moves: [
      'sqlinjection',
      'apitimeout'
    ],
    color: '#1abc9c',
    sprite: 'deprecatedapi'
  },
  {
    id: 16,
    name: 'BrokenPipe',
    type: 'backend',
    hp: 30,
    attack: 8,
    defense: 4,
    speed: 7,
    moves: [
      'apitimeout',
      'memorydump'
    ],
    color: '#16a085',
    sprite: 'brokenpipe'
  },
  {
    id: 17,
    name: 'GitBlame',
    type: 'devops',
    hp: 31,
    attack: 6,
    defense: 6,
    speed: 5,
    moves: [
      'dockerkill',
      'pipelinefailure'
    ],
    color: '#e67e22',
    sprite: 'gitblame'
  },
  {
    id: 18,
    name: 'ForkBomb',
    type: 'devops',
    hp: 22,
    attack: 10,
    defense: 2,
    speed: 9,
    moves: [
      'pipelinefailure',
      'forcequit'
    ],
    color: '#d35400',
    sprite: 'forkbomb'
  },
  {
    id: 19,
    name: 'UnhandledPromise',
    type: 'testing',
    hp: 27,
    attack: 5,
    defense: 7,
    speed: 6,
    moves: [
      'assertionerror',
      'mockoverride'
    ],
    color: '#f1c40f',
    sprite: 'unhandledpromise'
  },
  {
    id: 20,
    name: 'RegexDenial',
    type: 'testing',
    hp: 34,
    attack: 8,
    defense: 5,
    speed: 4,
    moves: [
      'assertionerror',
      'threadlock'
    ],
    color: '#d4ac0d',
    sprite: 'regexdenial'
  }
];
