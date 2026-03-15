// Dependency graph simulator — predicts transitive impact of package.json changes.
// Builds a workspace dependency graph and identifies downstream dependents
// affected by modifications to a package's dependency declarations.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { get, request as httpsRequest } from 'node:https';
import type { NormalizedIntent } from '@red-codes/policy';
import type { ActionSimulator, SimulationResult } from './types.js';

/** Minimal shape of a package.json for dependency parsing */
interface PackageManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

/** A node in the workspace dependency graph */
export interface WorkspaceNode {
  /** Package name from package.json */
  name: string;
  /** Relative directory path within the monorepo */
  dir: string;
  /** Direct workspace dependencies (package names) */
  workspaceDeps: string[];
}

/** A package flagged as having a known vulnerability */
export interface VulnerablePackage {
  /** Package name */
  name: string;
  /** Severity level from the advisory */
  severity: string;
  /** Advisory URL or identifier */
  advisory: string;
}

/** Result of the dependency graph analysis */
export interface DependencyGraphAnalysis {
  /** The package being modified */
  targetPackage: string;
  /** Total declared dependencies (deps + devDeps + peerDeps) */
  totalDeclaredDeps: number;
  /** Workspace packages that directly depend on the target */
  directDependents: string[];
  /** Workspace packages that transitively depend on the target */
  transitiveDependents: string[];
  /** Total workspace packages in the monorepo */
  totalWorkspacePackages: number;
  /** Whether the target is the monorepo root */
  isRoot: boolean;
  /** Packages in the dependency chain with known vulnerabilities */
  vulnerablePackages?: VulnerablePackage[];
  /** Packages in the dependency chain that are deprecated */
  deprecatedPackages?: string[];
}

/** Check if the intent is a write to a package.json file */
function isPackageJsonWrite(intent: NormalizedIntent): boolean {
  if (intent.action !== 'file.write') return false;
  const target = intent.target || '';
  return basename(target) === 'package.json';
}

/** Safely read and parse a JSON file, returning null on any error */
function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** Whether network-based vulnerability/deprecation checks are enabled */
function isNetworkEnabled(): boolean {
  return process.env.AGENTGUARD_NO_NETWORK !== '1';
}

/** Fetch JSON from a URL using node:https with a timeout */
function fetchJson(url: string, timeoutMs = 5000): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    try {
      const req = get(url, { headers: { Accept: 'application/json' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>);
          } catch {
            resolve(null);
          }
        });
        res.on('error', () => resolve(null));
      });
      req.on('error', () => resolve(null));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Check a package for deprecation by querying the npm registry.
 * Returns the deprecation message if deprecated, null otherwise.
 */
export async function checkDeprecation(packageName: string): Promise<string | null> {
  const data = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
  if (!data) return null;

  // Check top-level deprecated field
  if (typeof data.deprecated === 'string') return data.deprecated;

  // Check the latest dist-tag version for deprecation
  const distTags = data['dist-tags'] as Record<string, string> | undefined;
  const versions = data.versions as Record<string, Record<string, unknown>> | undefined;
  if (distTags?.latest && versions) {
    const latestVersion = versions[distTags.latest];
    if (latestVersion && typeof latestVersion.deprecated === 'string') {
      return latestVersion.deprecated;
    }
  }

  return null;
}

/**
 * Check packages for known vulnerabilities using the npm bulk advisory API.
 * Returns an array of vulnerable packages with severity and advisory info.
 */
export async function checkVulnerabilities(
  packages: Record<string, string>
): Promise<VulnerablePackage[]> {
  const results: VulnerablePackage[] = [];
  if (Object.keys(packages).length === 0) return results;

  // Use the npm bulk advisory endpoint
  const postData = JSON.stringify(packages);
  const url = new URL('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk');

  return new Promise((resolve) => {
    try {
      const req = httpsRequest(
        {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 10000,
        },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            resolve(results);
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString()) as Record<
                string,
                Array<{ severity: string; url: string; title: string }>
              >;
              for (const [pkgName, advisories] of Object.entries(data)) {
                if (Array.isArray(advisories)) {
                  for (const advisory of advisories) {
                    results.push({
                      name: pkgName,
                      severity: advisory.severity || 'unknown',
                      advisory: advisory.url || advisory.title || 'unknown',
                    });
                  }
                }
              }
            } catch {
              // Parse error — return what we have
            }
            resolve(results);
          });
          res.on('error', () => resolve(results));
        }
      );
      req.on('error', () => resolve(results));
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(results);
      });
      req.write(postData);
      req.end();
    } catch {
      resolve(results);
    }
  });
}

/**
 * Check all declared dependencies for vulnerabilities and deprecations.
 * Returns { vulnerablePackages, deprecatedPackages } or null if network is disabled.
 */
export async function checkDependencyHealth(
  pkg: PackageManifest
): Promise<{ vulnerablePackages: VulnerablePackage[]; deprecatedPackages: string[] } | null> {
  if (!isNetworkEnabled()) return null;

  const allDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  const depNames = Object.keys(allDeps);
  if (depNames.length === 0) return { vulnerablePackages: [], deprecatedPackages: [] };

  // Run vulnerability and deprecation checks concurrently
  const [vulnerablePackages, ...deprecationResults] = await Promise.all([
    checkVulnerabilities(allDeps),
    ...depNames.map(async (name) => {
      const msg = await checkDeprecation(name);
      return msg ? name : null;
    }),
  ]);

  const deprecatedPackages = deprecationResults.filter((name): name is string => name !== null);

  return { vulnerablePackages, deprecatedPackages };
}

/** Find the monorepo root by searching up from the target path for pnpm-workspace.yaml or root package.json with workspaces */
export function findMonorepoRoot(startPath: string): string | null {
  let dir = dirname(startPath);
  const maxDepth = 10;
  for (let i = 0; i < maxDepth; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const pkg = readJsonSafe<PackageManifest>(join(dir, 'package.json'));
    if (pkg?.workspaces) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Resolve workspace glob patterns into actual package directories */
function resolveWorkspaceGlobs(root: string): string[] {
  // Read pnpm-workspace.yaml or package.json workspaces
  const pnpmWsPath = join(root, 'pnpm-workspace.yaml');
  let patterns: string[] = [];

  if (existsSync(pnpmWsPath)) {
    try {
      const content = readFileSync(pnpmWsPath, 'utf8');
      // Simple YAML parsing for packages list (avoids dependency on YAML parser)
      const lines = content.split('\n');
      let inPackages = false;
      for (const line of lines) {
        if (/^packages\s*:/.test(line)) {
          inPackages = true;
          continue;
        }
        if (inPackages) {
          const match = line.match(/^\s+-\s+['"]?([^'"]+)['"]?$/);
          if (match) {
            patterns.push(match[1].trim());
          } else if (/^\S/.test(line)) {
            inPackages = false;
          }
        }
      }
    } catch {
      // Fall through to package.json workspaces
    }
  }

  if (patterns.length === 0) {
    const rootPkg = readJsonSafe<PackageManifest>(join(root, 'package.json'));
    if (rootPkg?.workspaces) {
      patterns = Array.isArray(rootPkg.workspaces)
        ? rootPkg.workspaces
        : rootPkg.workspaces.packages || [];
    }
  }

  // Expand simple glob patterns (dir/*) into actual directories
  // We avoid complex glob libraries; instead walk one level for each pattern
  const dirs: string[] = [];
  for (const pattern of patterns) {
    const globStar = pattern.replace(/\/\*$/, '').replace(/\*$/, '');
    const parentDir = join(root, globStar);
    if (!existsSync(parentDir)) continue;

    try {
      const entries = readdirSync(parentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pkgJsonPath = join(parentDir, entry.name, 'package.json');
          if (existsSync(pkgJsonPath)) {
            dirs.push(join(globStar, entry.name));
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  return dirs;
}

/** Build the workspace dependency graph */
export function buildWorkspaceGraph(root: string): WorkspaceNode[] {
  const workspaceDirs = resolveWorkspaceGlobs(root);
  const nodes: WorkspaceNode[] = [];
  const workspaceNames = new Set<string>();

  // First pass: collect all workspace package names, caching parsed manifests
  const manifests = new Map<string, PackageManifest | null>();
  for (const dir of workspaceDirs) {
    const pkg = readJsonSafe<PackageManifest>(join(root, dir, 'package.json'));
    manifests.set(dir, pkg);
    if (pkg?.name) {
      workspaceNames.add(pkg.name);
    }
  }

  // Second pass: build nodes with workspace-internal dependencies (uses cached manifests)
  for (const dir of workspaceDirs) {
    const pkg = manifests.get(dir);
    if (!pkg?.name) continue;

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    const workspaceDeps = Object.keys(allDeps).filter((dep) => workspaceNames.has(dep));

    nodes.push({
      name: pkg.name,
      dir,
      workspaceDeps,
    });
  }

  return nodes;
}

/** Find all workspace packages that transitively depend on the given package */
export function findTransitiveDependents(
  graph: WorkspaceNode[],
  targetPackage: string
): { direct: string[]; transitive: string[] } {
  // Build a reverse dependency map: package -> packages that depend on it
  const reverseDeps = new Map<string, Set<string>>();
  for (const node of graph) {
    for (const dep of node.workspaceDeps) {
      if (!reverseDeps.has(dep)) reverseDeps.set(dep, new Set());
      reverseDeps.get(dep)!.add(node.name);
    }
  }

  const direct = [...(reverseDeps.get(targetPackage) ?? [])];

  // BFS to find all transitive dependents
  const visited = new Set<string>();
  const queue = [targetPackage];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const dependents = reverseDeps.get(current);
    if (dependents) {
      for (const dep of dependents) {
        if (!visited.has(dep)) queue.push(dep);
      }
    }
  }

  // Remove the target itself from the result
  visited.delete(targetPackage);
  const transitive = [...visited];

  return { direct, transitive };
}

/** Count total declared dependencies from a package manifest */
function countDeclaredDeps(pkg: PackageManifest): number {
  return (
    Object.keys(pkg.dependencies ?? {}).length +
    Object.keys(pkg.devDependencies ?? {}).length +
    Object.keys(pkg.peerDependencies ?? {}).length
  );
}

/** Analyze the dependency graph for a package.json write */
export function analyzeDependencyGraph(
  targetPath: string,
  root: string | null
): DependencyGraphAnalysis | null {
  const pkg = readJsonSafe<PackageManifest>(targetPath);
  const targetName = pkg?.name ?? basename(dirname(targetPath));

  if (!root) {
    // Not a monorepo — provide basic analysis from the package.json alone
    return {
      targetPackage: targetName,
      totalDeclaredDeps: pkg ? countDeclaredDeps(pkg) : 0,
      directDependents: [],
      transitiveDependents: [],
      totalWorkspacePackages: 0,
      isRoot: true,
    };
  }

  const isRoot = targetPath === join(root, 'package.json');

  const graph = buildWorkspaceGraph(root);
  const { direct, transitive } = findTransitiveDependents(graph, targetName);

  return {
    targetPackage: targetName,
    totalDeclaredDeps: pkg ? countDeclaredDeps(pkg) : 0,
    directDependents: direct.sort(),
    transitiveDependents: transitive.sort(),
    totalWorkspacePackages: graph.length,
    isRoot,
  };
}

export function createDependencyGraphSimulator(): ActionSimulator {
  return {
    id: 'dependency-graph-simulator',

    supports(intent: NormalizedIntent): boolean {
      return isPackageJsonWrite(intent);
    },

    async simulate(
      intent: NormalizedIntent,
      _context: Record<string, unknown>
    ): Promise<SimulationResult> {
      const start = Date.now();
      const target = intent.target || '';
      const predictedChanges: string[] = [];
      const details: Record<string, unknown> = {};
      let blastRadius = 0;
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      predictedChanges.push(`Write: ${target}`);

      const root = findMonorepoRoot(target);
      const analysis = analyzeDependencyGraph(target, root);

      if (analysis) {
        // Run vulnerability/deprecation checks if network is available
        const pkg = readJsonSafe<PackageManifest>(target);
        if (pkg) {
          const health = await checkDependencyHealth(pkg);
          if (health) {
            analysis.vulnerablePackages = health.vulnerablePackages;
            analysis.deprecatedPackages = health.deprecatedPackages;

            if (health.vulnerablePackages.length > 0) {
              const criticalCount = health.vulnerablePackages.filter(
                (v) => v.severity === 'critical' || v.severity === 'high'
              ).length;
              predictedChanges.push(
                `${health.vulnerablePackages.length} vulnerable package(s) detected` +
                  (criticalCount > 0 ? ` (${criticalCount} critical/high)` : '')
              );
            }

            if (health.deprecatedPackages.length > 0) {
              predictedChanges.push(
                `${health.deprecatedPackages.length} deprecated package(s): ${health.deprecatedPackages.join(', ')}`
              );
            }
          }
        }

        details.dependencyGraph = analysis;

        // Root package.json changes affect everything
        if (analysis.isRoot && analysis.totalWorkspacePackages > 0) {
          blastRadius = analysis.totalWorkspacePackages;
          predictedChanges.push(
            `Root package.json — all ${analysis.totalWorkspacePackages} workspace packages potentially affected`
          );
          riskLevel = 'high';
        } else {
          // Blast radius = direct + transitive dependents + the package itself
          blastRadius = 1 + analysis.transitiveDependents.length;

          if (analysis.directDependents.length > 0) {
            predictedChanges.push(
              `${analysis.directDependents.length} direct dependent(s): ${analysis.directDependents.join(', ')}`
            );
          }

          if (analysis.transitiveDependents.length > analysis.directDependents.length) {
            const transitiveOnly = analysis.transitiveDependents.filter(
              (t) => !analysis.directDependents.includes(t)
            );
            if (transitiveOnly.length > 0) {
              predictedChanges.push(
                `${transitiveOnly.length} transitive dependent(s): ${transitiveOnly.join(', ')}`
              );
            }
          }

          if (analysis.totalDeclaredDeps > 0) {
            predictedChanges.push(`${analysis.totalDeclaredDeps} declared dependencies in package`);
          }
        }

        // Risk escalation for vulnerable/deprecated dependencies
        const hasVulnerabilities = (analysis.vulnerablePackages?.length ?? 0) > 0;
        const hasDeprecations = (analysis.deprecatedPackages?.length ?? 0) > 0;
        const hasCritical = (analysis.vulnerablePackages ?? []).some(
          (v) => v.severity === 'critical' || v.severity === 'high'
        );

        if (hasCritical) {
          riskLevel = 'high';
        } else if (hasVulnerabilities && riskLevel === 'low') {
          riskLevel = 'medium';
        } else if (hasDeprecations && riskLevel === 'low') {
          riskLevel = 'medium';
        }

        // Risk assessment based on downstream impact
        if (blastRadius > 10) {
          riskLevel = 'high';
        } else if (blastRadius > 3 && riskLevel === 'low') {
          riskLevel = 'medium';
        }
      }

      return {
        predictedChanges,
        blastRadius,
        riskLevel,
        details,
        simulatorId: 'dependency-graph-simulator',
        durationMs: Date.now() - start,
      };
    },
  };
}
