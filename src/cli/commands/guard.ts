// CLI command: agentguard guard — start the governed action runtime.
// Reads stdin for action proposals (JSON), evaluates them, writes results to stdout.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createKernel } from '../../agentguard/kernel.js';
import type { KernelConfig } from '../../agentguard/kernel.js';
import { createLiveRegistry } from '../../agentguard/adapters/registry.js';
import { createJsonlSink } from '../../agentguard/sinks/jsonl.js';
import { loadYamlPolicy } from '../../agentguard/policies/yaml-loader.js';
import { renderBanner, renderKernelResult, renderMonitorStatus } from '../../agentguard/renderers/tui.js';
import type { RawAgentAction } from '../../agentguard/core/aab.js';

export interface GuardOptions {
  policy?: string;
  dryRun?: boolean;
  verbose?: boolean;
  stdin?: boolean;
}

function loadPolicyFile(policyPath: string): unknown[] {
  const absPath = resolve(policyPath);
  if (!existsSync(absPath)) {
    process.stderr.write(`  \x1b[31mError:\x1b[0m Policy file not found: ${absPath}\n`);
    process.exit(1);
  }

  const content = readFileSync(absPath, 'utf8');

  if (absPath.endsWith('.yaml') || absPath.endsWith('.yml')) {
    const policy = loadYamlPolicy(content, policyPath);
    return [{ id: policy.id, name: policy.name, rules: policy.rules, severity: policy.severity }];
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    process.stderr.write(`  \x1b[31mError:\x1b[0m Failed to parse policy file: ${absPath}\n`);
    process.exit(1);
  }
}

function findDefaultPolicy(): string | null {
  const candidates = ['agentguard.yaml', 'agentguard.yml', 'agentguard.json', '.agentguard.yaml', '.agentguard.yml'];
  for (const name of candidates) {
    if (existsSync(name)) return name;
  }
  return null;
}

export async function guard(_args: string[], options: GuardOptions = {}): Promise<number> {
  // Resolve policy
  const policyPath = options.policy || findDefaultPolicy();
  const policyDefs = policyPath ? loadPolicyFile(policyPath) : [];

  // Build kernel config
  const kernelConfig: KernelConfig = {
    policyDefs,
    dryRun: options.dryRun ?? false,
    adapters: options.dryRun ? undefined : createLiveRegistry(),
  };

  const kernel = createKernel(kernelConfig);
  const runId = kernel.getRunId();

  // Add JSONL sink
  const jsonlSink = createJsonlSink({ runId });
  kernelConfig.sinks = [jsonlSink];

  // Re-create kernel with sink (sinks are set at creation time)
  const fullKernel = createKernel({
    ...kernelConfig,
    runId,
    sinks: [jsonlSink],
  });

  // Render banner
  const policyName = policyPath || 'default (no file)';
  process.stderr.write(
    renderBanner({
      policyName,
      invariantCount: 6,
      verbose: options.verbose,
    })
  );
  process.stderr.write(`  ${'\x1b[2m'}run: ${runId}${'\x1b[0m'}\n\n`);

  if (options.stdin) {
    // Read actions from stdin (one JSON per line)
    return processStdin(fullKernel, options);
  }

  // Interactive mode: read from stdin line by line
  process.stderr.write(`  ${'\x1b[2m'}Listening for actions on stdin (JSON per line)...${'\x1b[0m'}\n`);
  process.stderr.write(`  ${'\x1b[2m'}Press Ctrl+C to stop.${'\x1b[0m'}\n\n`);

  return processStdin(fullKernel, options);
}

async function processStdin(kernel: ReturnType<typeof createKernel>, options: GuardOptions): Promise<number> {
  return new Promise((resolvePromise) => {
    let buffer = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const rawAction = JSON.parse(trimmed) as RawAgentAction;
          const result = await kernel.propose(rawAction);

          // Render result to stderr
          process.stderr.write(renderKernelResult(result, options.verbose) + '\n');
          if (result.decision.violations.length > 0 || !result.allowed) {
            process.stderr.write(renderMonitorStatus(result.decision) + '\n');
          }

          // Write machine-readable result to stdout
          const output = {
            allowed: result.allowed,
            executed: result.executed,
            action: result.decision.intent.action,
            target: result.decision.intent.target,
            reason: result.decision.decision.reason,
            violations: result.decision.violations.map((v) => v.name),
            runId: result.runId,
          };
          process.stdout.write(JSON.stringify(output) + '\n');
        } catch (err) {
          process.stderr.write(`  \x1b[31mError:\x1b[0m Invalid JSON input: ${(err as Error).message}\n`);
        }
      }
    });

    process.stdin.on('end', () => {
      kernel.shutdown();
      resolvePromise(0);
    });

    process.on('SIGINT', () => {
      kernel.shutdown();
      process.stderr.write('\n  \x1b[33mAgentGuard stopped.\x1b[0m\n\n');
      resolvePromise(0);
    });
  });
}
