// Plan-level simulation — evaluates a sequence of actions as a coordinated batch.
// Composes existing per-action simulators, carries forward simulated state,
// detects interactions between steps, and produces a composite impact forecast.

import { buildImpactForecast } from './forecast.js';
import type {
  CompositeImpactForecast,
  PlanSimulationResult,
  PlanStep,
  PlanStepInteraction,
  PlanStepResult,
  SimulatorRegistry,
} from './types.js';

/**
 * Simulate an ordered sequence of actions (a "plan") using registered simulators.
 *
 * Each step is simulated in order using the registry's per-action simulators.
 * After all steps, the engine detects interactions between steps and builds
 * a composite impact forecast aggregating all individual results.
 *
 * @param steps  Ordered list of plan steps to simulate
 * @param registry  Simulator registry with registered per-action simulators
 * @param context  Shared context passed to each simulator
 * @param threshold  Blast radius threshold for forecast computation (default: 50)
 */
export async function simulatePlan(
  steps: PlanStep[],
  registry: SimulatorRegistry,
  context: Record<string, unknown> = {},
  threshold = 50
): Promise<PlanSimulationResult> {
  const startTime = Date.now();
  const stepResults: PlanStepResult[] = [];

  // Phase 1: Simulate each step in sequence
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const simulator = registry.find(step.intent);

    if (!simulator) {
      stepResults.push({
        index: i,
        label: step.label,
        intent: step.intent,
        result: null,
        forecast: null,
      });
      continue;
    }

    try {
      const result = await simulator.simulate(step.intent, context);
      const forecast = buildImpactForecast(step.intent, result, threshold);
      result.forecast = forecast;

      stepResults.push({
        index: i,
        label: step.label,
        intent: step.intent,
        result,
        forecast,
      });
    } catch {
      // Non-fatal: simulator crash doesn't block the plan
      stepResults.push({
        index: i,
        label: step.label,
        intent: step.intent,
        result: null,
        forecast: null,
      });
    }
  }

  // Phase 2: Detect interactions between steps
  const interactions = detectInteractions(stepResults);

  // Phase 3: Build composite forecast
  const compositeForecast = buildCompositeForecast(stepResults, interactions);

  return {
    steps: stepResults,
    interactions,
    compositeForecast,
    durationMs: Date.now() - startTime,
  };
}

/** Detect interactions between plan steps based on overlapping files, dependencies, and risk */
function detectInteractions(steps: PlanStepResult[]): PlanStepInteraction[] {
  const interactions: PlanStepInteraction[] = [];
  const simulatedSteps = steps.filter((s) => s.forecast !== null);

  for (let i = 0; i < simulatedSteps.length; i++) {
    const source = simulatedSteps[i];
    const sourceFiles = new Set(source.forecast!.predictedFiles);
    const sourceDeps = new Set(source.forecast!.dependenciesAffected);

    for (let j = i + 1; j < simulatedSteps.length; j++) {
      const target = simulatedSteps[j];

      // File overlap: later step touches a file that an earlier step also touches
      const overlappingFiles = target.forecast!.predictedFiles.filter((f) => sourceFiles.has(f));
      if (overlappingFiles.length > 0) {
        interactions.push({
          sourceStep: source.index,
          targetStep: target.index,
          type: 'file-overlap',
          description: `Steps ${source.index} and ${target.index} both affect: ${overlappingFiles.join(', ')}`,
        });
      }

      // Dependency chain: later step affects a module that depends on source's module
      const chainDeps = target.forecast!.dependenciesAffected.filter((d) => sourceDeps.has(d));
      if (chainDeps.length > 0 && overlappingFiles.length === 0) {
        interactions.push({
          sourceStep: source.index,
          targetStep: target.index,
          type: 'dependency-chain',
          description: `Step ${target.index} affects modules downstream of step ${source.index}: ${chainDeps.join(', ')}`,
        });
      }

      // Cumulative risk: both steps are high risk
      if (source.forecast!.riskLevel === 'high' && target.forecast!.riskLevel === 'high') {
        interactions.push({
          sourceStep: source.index,
          targetStep: target.index,
          type: 'cumulative-risk',
          description: `Steps ${source.index} and ${target.index} are both high-risk, compounding overall plan risk`,
        });
      }
    }
  }

  return interactions;
}

/** Build a composite forecast aggregating all step forecasts */
function buildCompositeForecast(
  steps: PlanStepResult[],
  interactions: PlanStepInteraction[]
): CompositeImpactForecast {
  const simulatedSteps = steps.filter((s) => s.forecast !== null);

  if (simulatedSteps.length === 0) {
    return {
      predictedFiles: [],
      dependenciesAffected: [],
      testRiskScore: 0,
      blastRadiusScore: 0,
      riskLevel: 'low',
      blastRadiusFactors: [],
      totalSteps: steps.length,
      simulatedSteps: 0,
    };
  }

  // Union predicted files and dependencies
  const allFiles = new Set<string>();
  const allDeps = new Set<string>();
  const allFactors: Array<{ name: string; multiplier: number; reason: string }> = [];
  const factorKeys = new Set<string>();

  let maxRisk: 'low' | 'medium' | 'high' = 'low';
  let totalBlastRadius = 0;
  let totalTestRisk = 0;

  for (const step of simulatedSteps) {
    const forecast = step.forecast!;
    for (const f of forecast.predictedFiles) allFiles.add(f);
    for (const d of forecast.dependenciesAffected) allDeps.add(d);

    // Deduplicate factors by name
    for (const factor of forecast.blastRadiusFactors) {
      const key = `${factor.name}:${factor.reason}`;
      if (!factorKeys.has(key)) {
        factorKeys.add(key);
        allFactors.push(factor);
      }
    }

    totalBlastRadius += forecast.blastRadiusScore;
    totalTestRisk += forecast.testRiskScore;

    if (forecast.riskLevel === 'high') maxRisk = 'high';
    else if (forecast.riskLevel === 'medium' && maxRisk !== 'high') maxRisk = 'medium';
  }

  // Interaction penalty: file overlaps and cumulative risk increase scores
  const interactionPenalty = interactions.length * 5;

  return {
    predictedFiles: [...allFiles].sort(),
    dependenciesAffected: [...allDeps].sort(),
    testRiskScore: Math.min(
      100,
      Math.round(totalTestRisk / simulatedSteps.length) + interactionPenalty
    ),
    blastRadiusScore: totalBlastRadius,
    riskLevel: maxRisk,
    blastRadiusFactors: allFactors,
    totalSteps: steps.length,
    simulatedSteps: simulatedSteps.length,
  };
}
