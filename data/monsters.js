// Monster data — inlined from monsters.json (descriptions stripped for size)
// To regenerate: node scripts/sync-data.js
export const MONSTERS = [
  {
    id: 1,
    name: 'NullPointer',
    type: 'backend',
    hp: 30,
    attack: 8,
    defense: 4,
    speed: 6,
    moves: [
      'segfault',
      'unhandledexception',
      'memoryaccess'
    ],
    color: '#e74c3c',
    sprite: 'nullpointer',
    rarity: 'common',
    theme: 'runtime error',
    evolution: 'OptionalChaining',
    evolvesTo: 21,
    passive: null
  },
  {
    id: 2,
    name: 'CallbackHell',
    type: 'backend',
    hp: 27,
    attack: 9,
    defense: 3,
    speed: 8,
    moves: [
      'recursiveloop',
      'stackoverflowmove',
      'eventstorm'
    ],
    color: '#c0392b',
    sprite: 'callbackhell',
    rarity: 'common',
    theme: 'nested async chaos',
    evolution: 'PromiseChain',
    finalEvolution: 'AsyncAwait',
    evolvesTo: 23,
    passive: null
  },
  {
    id: 3,
    name: 'RaceCondition',
    type: 'backend',
    hp: 25,
    attack: 6,
    defense: 3,
    speed: 10,
    moves: [
      'threadcollision',
      'deadlockmove',
      'datacorruption'
    ],
    color: '#f39c12',
    sprite: 'racecondition',
    rarity: 'uncommon',
    theme: 'concurrency bug',
    evolution: null,
    passive: {
      name: 'NonDeterministic',
      description: 'Randomly acts twice per turn'
    }
  },
  {
    id: 4,
    name: 'MemoryLeak',
    type: 'backend',
    hp: 45,
    attack: 5,
    defense: 7,
    speed: 2,
    moves: [
      'heapoverflow',
      'garbagestorm',
      'referencetrap'
    ],
    color: '#2ecc71',
    sprite: 'memoryleak',
    rarity: 'common',
    theme: 'resource exhaustion',
    evolution: 'GarbageCollector',
    evolvesTo: 29,
    passive: null
  },
  {
    id: 5,
    name: 'DivSoup',
    type: 'frontend',
    hp: 28,
    attack: 6,
    defense: 5,
    speed: 7,
    moves: [
      'layoutshift',
      'zindexwar',
      'margincollapse'
    ],
    color: '#3498db',
    sprite: 'divsoup',
    rarity: 'common',
    theme: 'messy HTML layout',
    evolution: 'Flexbox',
    finalEvolution: 'CSSGrid',
    evolvesTo: 25,
    passive: null
  },
  {
    id: 6,
    name: 'SpinnerOfDoom',
    type: 'frontend',
    hp: 35,
    attack: 7,
    defense: 6,
    speed: 3,
    moves: [
      'loadingloop',
      'timeout',
      'retryrequest'
    ],
    color: '#2980b9',
    sprite: 'spinnerofdoom',
    rarity: 'common',
    theme: 'infinite loading spinner',
    evolution: null,
    passive: null
  },
  {
    id: 7,
    name: 'StateHydra',
    type: 'frontend',
    hp: 32,
    attack: 9,
    defense: 4,
    speed: 5,
    moves: [
      'reduxstorm',
      'contextexplosion',
      'statemutation'
    ],
    color: '#1abc9c',
    sprite: 'statehydra',
    rarity: 'uncommon',
    theme: 'complex state management',
    evolution: null,
    passive: null
  },
  {
    id: 8,
    name: 'MergeConflict',
    type: 'devops',
    hp: 32,
    attack: 6,
    defense: 7,
    speed: 4,
    moves: [
      'conflictmarkers',
      'forcepush',
      'detachedhead'
    ],
    color: '#e67e22',
    sprite: 'mergeconflict',
    rarity: 'common',
    theme: 'git chaos',
    evolution: 'RebaseMaster',
    evolvesTo: 27,
    passive: null
  },
  {
    id: 9,
    name: 'CIPhantom',
    type: 'devops',
    hp: 26,
    attack: 8,
    defense: 3,
    speed: 9,
    moves: [
      'flakytestmove',
      'pipelinecrash',
      'dependencymismatch'
    ],
    color: '#d35400',
    sprite: 'ciphantom',
    rarity: 'uncommon',
    theme: 'failing CI pipeline',
    evolution: null,
    passive: null
  },
  {
    id: 10,
    name: 'DockerDaemon',
    type: 'devops',
    hp: 38,
    attack: 7,
    defense: 6,
    speed: 4,
    moves: [
      'containerspawn',
      'imagepull',
      'portbinding'
    ],
    color: '#f39c12',
    sprite: 'dockerdaemon',
    rarity: 'common',
    theme: 'container chaos',
    evolution: null,
    passive: null
  },
  {
    id: 11,
    name: 'FlakyTest',
    type: 'testing',
    hp: 24,
    attack: 7,
    defense: 4,
    speed: 8,
    moves: [
      'randomfail',
      'timingissue',
      'mockbreak'
    ],
    color: '#27ae60',
    sprite: 'flakytest',
    rarity: 'common',
    theme: 'nondeterministic failures',
    evolution: null,
    passive: {
      name: 'RandomFailure',
      description: '50% chance to ignore damage'
    }
  },
  {
    id: 12,
    name: 'AssertionError',
    type: 'testing',
    hp: 30,
    attack: 8,
    defense: 5,
    speed: 6,
    moves: [
      'expectedmismatch',
      'edgecase',
      'strictmode'
    ],
    color: '#2ecc71',
    sprite: 'assertionerror',
    rarity: 'common',
    theme: 'failed expectations',
    evolution: null,
    passive: null
  },
  {
    id: 13,
    name: 'Monolith',
    type: 'architecture',
    hp: 50,
    attack: 6,
    defense: 9,
    speed: 1,
    moves: [
      'couplingstrike',
      'dependencyweb',
      'refactorresist'
    ],
    color: '#8e44ad',
    sprite: 'monolith',
    rarity: 'uncommon',
    theme: 'massive legacy system',
    evolution: 'Microservice',
    evolvesTo: 28,
    passive: null
  },
  {
    id: 14,
    name: 'CleanArchitecture',
    type: 'architecture',
    hp: 28,
    attack: 7,
    defense: 7,
    speed: 6,
    moves: [
      'dependencyrule',
      'interfacesegregation',
      'abstractionshield'
    ],
    color: '#9b59b6',
    sprite: 'cleanarchitecture',
    rarity: 'uncommon',
    theme: 'layered architecture purity',
    evolution: null,
    passive: null
  },
  {
    id: 15,
    name: 'SQLInjector',
    type: 'security',
    hp: 26,
    attack: 10,
    defense: 3,
    speed: 7,
    moves: [
      'tabledrop',
      'queryescape',
      'privilegeescalation'
    ],
    color: '#e94560',
    sprite: 'sqlinjector',
    rarity: 'uncommon',
    theme: 'injection attacks',
    evolution: null,
    passive: null
  },
  {
    id: 16,
    name: 'XSSpecter',
    type: 'security',
    hp: 25,
    attack: 9,
    defense: 3,
    speed: 9,
    moves: [
      'scriptinjection',
      'domhijack',
      'cookietheft'
    ],
    color: '#c0392b',
    sprite: 'xsspecter',
    rarity: 'uncommon',
    theme: 'cross-site scripting',
    evolution: null,
    passive: null
  },
  {
    id: 17,
    name: 'PromptGoblin',
    type: 'ai',
    hp: 27,
    attack: 8,
    defense: 4,
    speed: 8,
    moves: [
      'promptinjection',
      'contextflood',
      'tokenoverflow'
    ],
    color: '#00d2ff',
    sprite: 'promptgoblin',
    rarity: 'uncommon',
    theme: 'prompt engineering chaos',
    evolution: 'PromptEngineer',
    evolvesTo: 30,
    passive: null
  },
  {
    id: 18,
    name: 'HalluciBot',
    type: 'ai',
    hp: 30,
    attack: 7,
    defense: 5,
    speed: 7,
    moves: [
      'confidentanswer',
      'fabricatedcitation',
      'creativeguess'
    ],
    color: '#00b4d8',
    sprite: 'hallucibot',
    rarity: 'common',
    theme: 'hallucinating model',
    evolution: null,
    passive: null
  },
  {
    id: 19,
    name: 'TheSingularity',
    type: 'ai',
    hp: 55,
    attack: 10,
    defense: 8,
    speed: 8,
    moves: [
      'recursiveselfimprove',
      'computeoverload',
      'alignmenttest'
    ],
    color: '#ff006e',
    sprite: 'thesingularity',
    rarity: 'legendary',
    theme: 'runaway intelligence',
    evolution: null,
    passive: null
  },
  {
    id: 20,
    name: 'TheLegacySystem',
    type: 'architecture',
    hp: 60,
    attack: 7,
    defense: 10,
    speed: 1,
    moves: [
      'untouchablemodule',
      'tribalknowledge',
      'refactorcurse'
    ],
    color: '#6c3483',
    sprite: 'thelegacysystem',
    rarity: 'legendary',
    theme: 'ancient unstoppable codebase',
    evolution: null,
    passive: null
  },
  {
    id: 21,
    name: 'OptionalChaining',
    type: 'backend',
    hp: 38,
    attack: 9,
    defense: 6,
    speed: 8,
    moves: [
      'segfault',
      'memoryaccess',
      'safeaccess'
    ],
    color: '#e67e22',
    sprite: 'optionalchaining',
    rarity: 'evolved',
    theme: 'safe property access',
    evolution: 'TypeSafety',
    evolvesTo: 22,
    evolvedFrom: 1,
    passive: null
  },
  {
    id: 22,
    name: 'TypeSafety',
    type: 'backend',
    hp: 45,
    attack: 11,
    defense: 9,
    speed: 7,
    moves: [
      'segfault',
      'safeaccess',
      'typecheck',
      'unhandledexception'
    ],
    color: '#3498db',
    sprite: 'typesafety',
    rarity: 'evolved',
    theme: 'compile-time guarantees',
    evolution: null,
    evolvedFrom: 21,
    passive: null
  },
  {
    id: 23,
    name: 'PromiseChain',
    type: 'backend',
    hp: 35,
    attack: 10,
    defense: 5,
    speed: 9,
    moves: [
      'recursiveloop',
      'stackoverflowmove',
      'asyncresolve'
    ],
    color: '#2980b9',
    sprite: 'promisechain',
    rarity: 'evolved',
    theme: 'orderly async flow',
    evolution: 'AsyncAwait',
    evolvesTo: 24,
    evolvedFrom: 2,
    passive: null
  },
  {
    id: 24,
    name: 'AsyncAwait',
    type: 'backend',
    hp: 42,
    attack: 12,
    defense: 7,
    speed: 10,
    moves: [
      'asyncresolve',
      'stackoverflowmove',
      'eventstorm',
      'recursiveloop'
    ],
    color: '#1abc9c',
    sprite: 'asyncawait',
    rarity: 'evolved',
    theme: 'transcendent async mastery',
    evolution: null,
    evolvedFrom: 23,
    passive: null
  },
  {
    id: 25,
    name: 'Flexbox',
    type: 'frontend',
    hp: 35,
    attack: 8,
    defense: 7,
    speed: 8,
    moves: [
      'layoutshift',
      'zindexwar',
      'flexalign'
    ],
    color: '#2471a3',
    sprite: 'flexbox',
    rarity: 'evolved',
    theme: 'flexible layout mastery',
    evolution: 'CSSGrid',
    evolvesTo: 26,
    evolvedFrom: 5,
    passive: null
  },
  {
    id: 26,
    name: 'CSSGrid',
    type: 'frontend',
    hp: 42,
    attack: 10,
    defense: 9,
    speed: 7,
    moves: [
      'layoutshift',
      'flexalign',
      'gridsnap',
      'zindexwar'
    ],
    color: '#1a5276',
    sprite: 'cssgrid',
    rarity: 'evolved',
    theme: 'two-dimensional layout mastery',
    evolution: null,
    evolvedFrom: 25,
    passive: null
  },
  {
    id: 27,
    name: 'RebaseMaster',
    type: 'devops',
    hp: 42,
    attack: 9,
    defense: 10,
    speed: 7,
    moves: [
      'forcepush',
      'conflictmarkers',
      'cleanhistory',
      'detachedhead'
    ],
    color: '#d4ac0d',
    sprite: 'rebasemaster',
    rarity: 'evolved',
    theme: 'git mastery',
    evolution: null,
    evolvedFrom: 8,
    passive: null
  },
  {
    id: 28,
    name: 'Microservice',
    type: 'architecture',
    hp: 35,
    attack: 9,
    defense: 6,
    speed: 8,
    moves: [
      'interfacesegregation',
      'abstractionshield',
      'dependencyrule',
      'servicemesh'
    ],
    color: '#7d3c98',
    sprite: 'microservice',
    rarity: 'evolved',
    theme: 'decomposed architecture',
    evolution: null,
    evolvedFrom: 13,
    passive: null
  },
  {
    id: 29,
    name: 'GarbageCollector',
    type: 'backend',
    hp: 50,
    attack: 7,
    defense: 10,
    speed: 5,
    moves: [
      'heapoverflow',
      'garbagestorm',
      'referencetrap',
      'memoryreclaim'
    ],
    color: '#1e8449',
    sprite: 'garbagecollector',
    rarity: 'evolved',
    theme: 'memory optimization',
    evolution: null,
    evolvedFrom: 4,
    passive: null
  },
  {
    id: 30,
    name: 'PromptEngineer',
    type: 'ai',
    hp: 38,
    attack: 10,
    defense: 7,
    speed: 9,
    moves: [
      'promptinjection',
      'contextflood',
      'tokenoverflow',
      'fewshotlearn'
    ],
    color: '#0096c7',
    sprite: 'promptengineer',
    rarity: 'evolved',
    theme: 'mastered prompt craft',
    evolution: null,
    evolvedFrom: 17,
    passive: null
  }
];
