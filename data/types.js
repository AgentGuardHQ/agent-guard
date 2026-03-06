// Type data — inlined from types.json
// To regenerate: node scripts/sync-data.js
export const TYPES = {
  types: [
    'frontend',
    'backend',
    'devops',
    'testing',
    'architecture',
    'security',
    'ai'
  ],
  typeColors: {
    frontend: '#3498db',
    backend: '#e74c3c',
    devops: '#f39c12',
    testing: '#2ecc71',
    architecture: '#9b59b6',
    security: '#e94560',
    ai: '#00d2ff'
  },
  effectiveness: {
    frontend: {
      frontend: 1,
      backend: 1.5,
      devops: 1,
      testing: 1.5,
      architecture: 0.5,
      security: 1,
      ai: 0.5
    },
    backend: {
      frontend: 0.5,
      backend: 1,
      devops: 1.5,
      testing: 1,
      architecture: 1.5,
      security: 0.5,
      ai: 1
    },
    devops: {
      frontend: 1,
      backend: 0.5,
      devops: 1,
      testing: 1.5,
      architecture: 1,
      security: 1.5,
      ai: 0.5
    },
    testing: {
      frontend: 0.5,
      backend: 1,
      devops: 0.5,
      testing: 1,
      architecture: 1.5,
      security: 1,
      ai: 1.5
    },
    architecture: {
      frontend: 1.5,
      backend: 0.5,
      devops: 1,
      testing: 0.5,
      architecture: 1,
      security: 1.5,
      ai: 1
    },
    security: {
      frontend: 1,
      backend: 1.5,
      devops: 0.5,
      testing: 1,
      architecture: 0.5,
      security: 1,
      ai: 1.5
    },
    ai: {
      frontend: 1.5,
      backend: 1,
      devops: 1.5,
      testing: 0.5,
      architecture: 1,
      security: 0.5,
      ai: 1
    }
  }
};
