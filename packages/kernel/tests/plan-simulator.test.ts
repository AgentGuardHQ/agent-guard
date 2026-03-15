// Tests for Plan-level Simulation
import { describe, it, expect } from 'vitest';
import { createSimulatorRegistry, simulatePlan } from '@red-codes/kernel';
import type { ActionSimulator, SimulationResult, PlanStep } from '@red-codes/kernel';
import type { NormalizedIntent } from '@red-codes/policy';

function makeStubSimulator(
  id: string,
  supportedActions: string[],
  overrides: Partial<SimulationResult> = {}
): ActionSimulator {
  return {
    id,
    supports(intent: NormalizedIntent): boolean {
      return supportedActions.includes(intent.action);
    },
    async simulate(intent: NormalizedIntent): Promise<SimulationResult> {
      return {
        predictedChanges: [`${intent.action}: ${intent.target}`],
        blastRadius: overrides.blastRadius ?? 1,
        riskLevel: overrides.riskLevel ?? 'low',
        details: overrides.details ?? {},
        simulatorId: id,
        durationMs: 0,
      };
    },
  };
}

function makeIntent(action: string, target: string): NormalizedIntent {
  return { action, target, agent: 'test', destructive: false };
}

describe('simulatePlan', () => {
  it('simulates an empty plan', async () => {
    const registry = createSimulatorRegistry();
    const result = await simulatePlan([], registry);

    expect(result.steps).toHaveLength(0);
    expect(result.interactions).toHaveLength(0);
    expect(result.compositeForecast.totalSteps).toBe(0);
    expect(result.compositeForecast.simulatedSteps).toBe(0);
    expect(result.compositeForecast.riskLevel).toBe('low');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('simulates a single-step plan', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write']));

    const steps: PlanStep[] = [{ intent: makeIntent('file.write', 'src/index.ts') }];

    const result = await simulatePlan(steps, registry);

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].index).toBe(0);
    expect(result.steps[0].result).not.toBeNull();
    expect(result.steps[0].result!.simulatorId).toBe('fs');
    expect(result.steps[0].forecast).not.toBeNull();
    expect(result.compositeForecast.totalSteps).toBe(1);
    expect(result.compositeForecast.simulatedSteps).toBe(1);
  });

  it('simulates a multi-step plan', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write', 'file.delete']));
    registry.register(makeStubSimulator('git', ['git.push']));

    const steps: PlanStep[] = [
      { intent: makeIntent('file.write', 'src/config.ts'), label: 'Write config' },
      { intent: makeIntent('file.delete', 'src/old.ts'), label: 'Delete old file' },
      { intent: makeIntent('git.push', 'main'), label: 'Push to main' },
    ];

    const result = await simulatePlan(steps, registry);

    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].label).toBe('Write config');
    expect(result.steps[1].label).toBe('Delete old file');
    expect(result.steps[2].label).toBe('Push to main');
    expect(result.compositeForecast.totalSteps).toBe(3);
    expect(result.compositeForecast.simulatedSteps).toBe(3);
    expect(result.compositeForecast.predictedFiles.length).toBeGreaterThan(0);
  });

  it('handles steps with no matching simulator', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write']));

    const steps: PlanStep[] = [
      { intent: makeIntent('file.write', 'src/index.ts') },
      { intent: makeIntent('http.request', 'https://api.example.com') },
    ];

    const result = await simulatePlan(steps, registry);

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].result).not.toBeNull();
    expect(result.steps[1].result).toBeNull();
    expect(result.steps[1].forecast).toBeNull();
    expect(result.compositeForecast.totalSteps).toBe(2);
    expect(result.compositeForecast.simulatedSteps).toBe(1);
  });

  it('detects file overlap interactions', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write']));

    const steps: PlanStep[] = [
      { intent: makeIntent('file.write', 'src/config.ts'), label: 'Write config' },
      { intent: makeIntent('file.write', 'src/config.ts'), label: 'Update config' },
    ];

    const result = await simulatePlan(steps, registry);

    expect(result.interactions.length).toBeGreaterThan(0);
    const fileOverlap = result.interactions.find((i) => i.type === 'file-overlap');
    expect(fileOverlap).toBeDefined();
    expect(fileOverlap!.sourceStep).toBe(0);
    expect(fileOverlap!.targetStep).toBe(1);
    expect(fileOverlap!.description).toContain('src/config.ts');
  });

  it('detects cumulative risk interactions', async () => {
    const registry = createSimulatorRegistry();
    registry.register(
      makeStubSimulator('fs', ['file.write'], { riskLevel: 'high', blastRadius: 10 })
    );

    const steps: PlanStep[] = [
      { intent: makeIntent('file.write', 'src/core/types.ts') },
      { intent: makeIntent('file.write', 'src/kernel/kernel.ts') },
    ];

    const result = await simulatePlan(steps, registry);

    const cumulativeRisk = result.interactions.find((i) => i.type === 'cumulative-risk');
    expect(cumulativeRisk).toBeDefined();
  });

  it('builds composite forecast with aggregated values', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write'], { blastRadius: 5 }));

    const steps: PlanStep[] = [
      { intent: makeIntent('file.write', 'src/a.ts') },
      { intent: makeIntent('file.write', 'src/b.ts') },
      { intent: makeIntent('file.write', 'src/c.ts') },
    ];

    const result = await simulatePlan(steps, registry);

    const cf = result.compositeForecast;
    expect(cf.totalSteps).toBe(3);
    expect(cf.simulatedSteps).toBe(3);
    expect(cf.predictedFiles.length).toBeGreaterThanOrEqual(3);
    expect(cf.blastRadiusScore).toBeGreaterThan(0);
  });

  it('worst risk level propagates to composite forecast', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('low-risk', ['file.write'], { riskLevel: 'low' }));
    registry.register(makeStubSimulator('high-risk', ['git.push'], { riskLevel: 'high' }));

    const steps: PlanStep[] = [
      { intent: makeIntent('file.write', 'readme.md') },
      { intent: makeIntent('git.push', 'main') },
    ];

    const result = await simulatePlan(steps, registry);

    expect(result.compositeForecast.riskLevel).toBe('high');
  });

  it('handles simulator failures gracefully', async () => {
    const failingSimulator: ActionSimulator = {
      id: 'failing',
      supports: () => true,
      simulate: async () => {
        throw new Error('Simulator crash');
      },
    };

    const registry = createSimulatorRegistry();
    registry.register(failingSimulator);

    const steps: PlanStep[] = [{ intent: makeIntent('file.write', 'src/index.ts') }];

    const result = await simulatePlan(steps, registry);

    expect(result.steps[0].result).toBeNull();
    expect(result.steps[0].forecast).toBeNull();
    expect(result.compositeForecast.simulatedSteps).toBe(0);
  });

  it('preserves step indices correctly', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write']));

    const steps: PlanStep[] = [
      { intent: makeIntent('file.write', 'a.ts'), label: 'Step A' },
      { intent: makeIntent('http.request', 'url'), label: 'Step B (unsupported)' },
      { intent: makeIntent('file.write', 'c.ts'), label: 'Step C' },
    ];

    const result = await simulatePlan(steps, registry);

    expect(result.steps[0].index).toBe(0);
    expect(result.steps[1].index).toBe(1);
    expect(result.steps[2].index).toBe(2);
    expect(result.steps[1].result).toBeNull();
  });

  it('applies interaction penalty to test risk score', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write']));

    // Plan with overlapping files — should have interaction penalty
    const overlappingSteps: PlanStep[] = [
      { intent: makeIntent('file.write', 'src/config.ts') },
      { intent: makeIntent('file.write', 'src/config.ts') },
    ];

    // Plan with no overlaps
    const distinctSteps: PlanStep[] = [
      { intent: makeIntent('file.write', 'src/a.ts') },
      { intent: makeIntent('file.write', 'src/b.ts') },
    ];

    const overlapping = await simulatePlan(overlappingSteps, registry);
    const distinct = await simulatePlan(distinctSteps, registry);

    // Overlapping plan should have higher test risk due to interaction penalty
    expect(overlapping.compositeForecast.testRiskScore).toBeGreaterThanOrEqual(
      distinct.compositeForecast.testRiskScore
    );
  });

  it('records durationMs', async () => {
    const registry = createSimulatorRegistry();
    registry.register(makeStubSimulator('fs', ['file.write']));

    const steps: PlanStep[] = [{ intent: makeIntent('file.write', 'a.ts') }];

    const result = await simulatePlan(steps, registry);

    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
