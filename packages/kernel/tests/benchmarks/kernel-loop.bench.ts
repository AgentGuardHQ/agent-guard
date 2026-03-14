// Benchmark: Full kernel propose loop (end-to-end).
// Measures the complete governance pipeline: propose → normalize → evaluate → emit.

import { bench, describe } from 'vitest';
import { createKernel } from '@red-codes/kernel';
import type { KernelConfig } from '@red-codes/kernel';
import type { RawAgentAction } from '@red-codes/kernel';
import type { LoadedPolicy } from '@red-codes/policy';

const benchPolicy: LoadedPolicy = {
  id: 'bench-policy',
  name: 'Benchmark Policy',
  severity: 3,
  rules: [
    {
      action: 'git.push',
      effect: 'deny',
      conditions: { branches: ['main', 'master'] },
      reason: 'No push to protected branches',
    },
    { action: 'infra.destroy', effect: 'deny', reason: 'No infra destroy' },
    { action: 'file.*', effect: 'allow', conditions: { scope: ['src/', 'tests/'] } },
    { action: 'test.*', effect: 'allow' },
    { action: 'git.*', effect: 'allow' },
    { action: 'shell.exec', effect: 'allow' },
    { action: '*', effect: 'allow' },
  ],
};

const kernelConfig: KernelConfig = {
  policyDefs: [benchPolicy],
  dryRun: true,
};

const fileWriteAction: RawAgentAction = {
  tool: 'Write',
  file: 'src/example.ts',
  content: 'export const x = 1;',
  agent: 'bench-agent',
};

const bashAction: RawAgentAction = {
  tool: 'Bash',
  command: 'npm test',
  agent: 'bench-agent',
};

const gitPushAction: RawAgentAction = {
  tool: 'Bash',
  command: 'git push origin feature/test',
  agent: 'bench-agent',
};

const gitPushDeniedAction: RawAgentAction = {
  tool: 'Bash',
  command: 'git push origin main',
  agent: 'bench-agent',
};

const readAction: RawAgentAction = {
  tool: 'Read',
  file: 'src/index.ts',
  agent: 'bench-agent',
};

describe('Kernel propose — dry run', () => {
  bench('file.write (allowed)', async () => {
    const kernel = createKernel(kernelConfig);
    await kernel.propose(fileWriteAction);
    kernel.shutdown();
  });

  bench('shell.exec (allowed)', async () => {
    const kernel = createKernel(kernelConfig);
    await kernel.propose(bashAction);
    kernel.shutdown();
  });

  bench('git.push (allowed — feature branch)', async () => {
    const kernel = createKernel(kernelConfig);
    await kernel.propose(gitPushAction);
    kernel.shutdown();
  });

  bench('git.push (denied — main branch)', async () => {
    const kernel = createKernel(kernelConfig);
    await kernel.propose(gitPushDeniedAction, { targetBranch: 'main' });
    kernel.shutdown();
  });

  bench('file.read (allowed)', async () => {
    const kernel = createKernel(kernelConfig);
    await kernel.propose(readAction);
    kernel.shutdown();
  });
});

describe('Kernel propose — sequential actions (reuse kernel)', () => {
  bench('5 sequential file.write actions', async () => {
    const kernel = createKernel(kernelConfig);
    for (let i = 0; i < 5; i++) {
      await kernel.propose({
        ...fileWriteAction,
        file: `src/file-${i}.ts`,
      });
    }
    kernel.shutdown();
  });

  bench('10 mixed actions', async () => {
    const kernel = createKernel(kernelConfig);
    const actions: RawAgentAction[] = [
      readAction,
      fileWriteAction,
      bashAction,
      readAction,
      fileWriteAction,
      bashAction,
      gitPushAction,
      readAction,
      fileWriteAction,
      bashAction,
    ];
    for (const action of actions) {
      await kernel.propose(action);
    }
    kernel.shutdown();
  });
});
