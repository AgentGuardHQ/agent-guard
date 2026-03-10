// Shared policy discovery and loading — used by guard and claude-hook commands.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { loadYamlPolicy, parseYamlPolicy } from '../policy/yaml-loader.js';
import { resolveExtends, mergePolicies } from '../policy/pack-loader.js';

const DEFAULT_POLICY_CANDIDATES = [
  'agentguard.yaml',
  'agentguard.yml',
  'agentguard.json',
  '.agentguard.yaml',
  '.agentguard.yml',
];

export function findDefaultPolicy(): string | null {
  for (const name of DEFAULT_POLICY_CANDIDATES) {
    if (existsSync(name)) return name;
  }
  return null;
}

export function loadPolicyFile(policyPath: string): unknown[] {
  const absPath = resolve(policyPath);
  if (!existsSync(absPath)) {
    process.stderr.write(`  \x1b[31mError:\x1b[0m Policy file not found: ${absPath}\n`);
    process.exit(1);
  }

  const content = readFileSync(absPath, 'utf8');

  if (absPath.endsWith('.yaml') || absPath.endsWith('.yml')) {
    const localPolicy = loadYamlPolicy(content, policyPath);

    // Check for extends (policy packs)
    const def = parseYamlPolicy(content);
    if (def.extends && def.extends.length > 0) {
      const baseDir = dirname(absPath);
      const { policies: packPolicies, errors } = resolveExtends(def.extends, baseDir);

      for (const err of errors) {
        process.stderr.write(`  \x1b[33mWarning:\x1b[0m ${err}\n`);
      }

      const merged = mergePolicies(localPolicy, packPolicies);
      return merged.map((p) => ({ id: p.id, name: p.name, rules: p.rules, severity: p.severity }));
    }

    return [
      {
        id: localPolicy.id,
        name: localPolicy.name,
        rules: localPolicy.rules,
        severity: localPolicy.severity,
      },
    ];
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    process.stderr.write(`  \x1b[31mError:\x1b[0m Failed to parse policy file: ${absPath}\n`);
    process.exit(1);
  }
}

export function loadPolicyDefs(policyPath?: string): unknown[] {
  const resolved = policyPath || findDefaultPolicy();
  return resolved ? loadPolicyFile(resolved) : [];
}
