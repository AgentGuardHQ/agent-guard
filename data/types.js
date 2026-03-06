// Type data — inlined from types.json
// To regenerate: node scripts/sync-data.js
export const TYPES = {
  types: [
    'memory',
    'logic',
    'runtime',
    'syntax',
    'frontend',
    'backend',
    'devops',
    'testing'
  ],
  typeColors: {
    memory: '#2ecc71',
    logic: '#f39c12',
    runtime: '#e74c3c',
    syntax: '#9b59b6',
    frontend: '#3498db',
    backend: '#1abc9c',
    devops: '#e67e22',
    testing: '#f1c40f'
  },
  effectiveness: {
    memory: {
      memory: 1,
      logic: 1,
      runtime: 1.5,
      syntax: 0.5,
      frontend: 1.5,
      backend: 0.5,
      devops: 1,
      testing: 1
    },
    logic: {
      memory: 1,
      logic: 1,
      runtime: 0.5,
      syntax: 1.5,
      frontend: 1,
      backend: 1,
      devops: 1.5,
      testing: 0.5
    },
    runtime: {
      memory: 0.5,
      logic: 1.5,
      runtime: 1,
      syntax: 1,
      frontend: 0.5,
      backend: 1,
      devops: 1,
      testing: 1.5
    },
    syntax: {
      memory: 1.5,
      logic: 0.5,
      runtime: 1,
      syntax: 1,
      frontend: 1,
      backend: 1.5,
      devops: 0.5,
      testing: 1
    },
    frontend: {
      memory: 0.5,
      logic: 1,
      runtime: 1.5,
      syntax: 1,
      frontend: 1,
      backend: 0.5,
      devops: 1.5,
      testing: 1
    },
    backend: {
      memory: 1.5,
      logic: 1,
      runtime: 1,
      syntax: 0.5,
      frontend: 1.5,
      backend: 1,
      devops: 1,
      testing: 0.5
    },
    devops: {
      memory: 1,
      logic: 0.5,
      runtime: 1,
      syntax: 1.5,
      frontend: 0.5,
      backend: 1,
      devops: 1,
      testing: 1.5
    },
    testing: {
      memory: 1,
      logic: 1.5,
      runtime: 0.5,
      syntax: 1,
      frontend: 1,
      backend: 1.5,
      devops: 0.5,
      testing: 1
    }
  }
};
