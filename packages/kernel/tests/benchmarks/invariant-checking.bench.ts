// Benchmark: Invariant checking latency per invariant and full suite.
// Measures p50/p95/p99 for individual invariant checks and full-suite evaluation.

import { bench, describe } from 'vitest';
import { checkInvariant, checkAllInvariants, DEFAULT_INVARIANTS } from '@red-codes/invariants';
import type { SystemState } from '@red-codes/invariants';

const cleanState: SystemState = {
  modifiedFiles: ['src/foo.ts', 'src/bar.ts'],
  targetBranch: 'feature/test',
  directPush: false,
  forcePush: false,
  isPush: false,
  testsPass: true,
  filesAffected: 2,
  blastRadiusLimit: 20,
  protectedBranches: ['main', 'master'],
  currentTarget: 'src/foo.ts',
  currentCommand: '',
  currentActionType: 'file.write',
  fileContentDiff: '',
};

const violatingState: SystemState = {
  modifiedFiles: ['.env', 'src/foo.ts', '.github/workflows/ci.yml'],
  targetBranch: 'main',
  directPush: true,
  forcePush: true,
  isPush: true,
  testsPass: false,
  filesAffected: 25,
  blastRadiusLimit: 20,
  protectedBranches: ['main', 'master'],
  currentTarget: '.github/workflows/ci.yml',
  currentCommand: 'git push --force origin main',
  currentActionType: 'git.push',
  fileContentDiff: '',
};

const shellCommandState: SystemState = {
  ...cleanState,
  currentCommand: 'find . -name "*.log" -exec rm {} \\;',
  currentActionType: 'shell.exec',
  currentTarget: '',
};

describe('Individual invariant checks — clean state', () => {
  for (const invariant of DEFAULT_INVARIANTS) {
    bench(`${invariant.id} (holds)`, () => {
      checkInvariant(invariant, cleanState);
    });
  }
});

describe('Individual invariant checks — violating state', () => {
  for (const invariant of DEFAULT_INVARIANTS) {
    bench(`${invariant.id} (may violate)`, () => {
      checkInvariant(invariant, violatingState);
    });
  }
});

describe('Full invariant suite', () => {
  bench('all invariants — clean state', () => {
    checkAllInvariants(DEFAULT_INVARIANTS, cleanState);
  });

  bench('all invariants — violating state', () => {
    checkAllInvariants(DEFAULT_INVARIANTS, violatingState);
  });

  bench('all invariants — shell command state', () => {
    checkAllInvariants(DEFAULT_INVARIANTS, shellCommandState);
  });
});
