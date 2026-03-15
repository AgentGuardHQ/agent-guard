// Simulation types — pre-execution impact prediction interfaces.
// Pure type definitions. No DOM, no Node.js-specific APIs.

import type { NormalizedIntent } from '@red-codes/policy';

/** Structured impact forecast for predictive governance */
export interface ImpactForecast {
  /** File paths predicted to be changed by this action */
  predictedFiles: string[];
  /** Downstream modules or packages impacted by the change */
  dependenciesAffected: string[];
  /** Likelihood of test failure (0–100) based on scope and sensitivity of changes */
  testRiskScore: number;
  /** Weighted blast radius score from the blast-radius computation engine */
  blastRadiusScore: number;
  /** Risk level derived from the combined forecast assessment */
  riskLevel: 'low' | 'medium' | 'high';
  /** Factors that contributed to the blast radius score */
  blastRadiusFactors: Array<{ name: string; multiplier: number; reason: string }>;
  /** Packages with known vulnerabilities (populated for package.json changes) */
  vulnerablePackages?: Array<{ name: string; severity: string; advisory: string }>;
  /** Packages that are deprecated (populated for package.json changes) */
  deprecatedPackages?: string[];
}

/** Result of simulating an action before execution */
export interface SimulationResult {
  /** Human-readable list of predicted changes */
  predictedChanges: string[];
  /** Estimated number of files/entities affected */
  blastRadius: number;
  /** Overall risk assessment */
  riskLevel: 'low' | 'medium' | 'high';
  /** Simulator-specific details */
  details: Record<string, unknown>;
  /** Which simulator produced this result */
  simulatorId: string;
  /** How long the simulation took (ms) */
  durationMs: number;
  /** Structured impact forecast (populated by buildImpactForecast) */
  forecast?: ImpactForecast;
}

/** An action simulator predicts the impact of an action before execution */
export interface ActionSimulator {
  /** Unique simulator identifier */
  readonly id: string;
  /** Check if this simulator can handle the given intent */
  supports(intent: NormalizedIntent): boolean;
  /** Simulate the action and predict its impact */
  simulate(intent: NormalizedIntent, context: Record<string, unknown>): Promise<SimulationResult>;
}

/** Registry of action simulators, routes intents to the correct simulator */
export interface SimulatorRegistry {
  /** Register a simulator */
  register(simulator: ActionSimulator): void;
  /** Find a simulator that supports the given intent */
  find(intent: NormalizedIntent): ActionSimulator | null;
  /** Get all registered simulators */
  all(): ActionSimulator[];
}

/** A single step in a plan-level simulation */
export interface PlanStep {
  /** The normalized intent for this step */
  intent: NormalizedIntent;
  /** Optional label for this step (e.g., "Write config file") */
  label?: string;
}

/** Result from simulating a single step within a plan */
export interface PlanStepResult {
  /** Step index (0-based) */
  index: number;
  /** Optional label from the input step */
  label?: string;
  /** The intent that was simulated */
  intent: NormalizedIntent;
  /** Per-step simulation result (null if no simulator supports this intent) */
  result: SimulationResult | null;
  /** Per-step impact forecast (null if no simulation was run) */
  forecast: ImpactForecast | null;
}

/** Interaction detected between two plan steps */
export interface PlanStepInteraction {
  /** Index of the earlier step */
  sourceStep: number;
  /** Index of the later step */
  targetStep: number;
  /** Nature of the interaction */
  type: 'file-overlap' | 'dependency-chain' | 'cumulative-risk';
  /** Human-readable description */
  description: string;
}

/** Composite impact forecast aggregated across all plan steps */
export interface CompositeImpactForecast {
  /** Union of all predicted files across all steps */
  predictedFiles: string[];
  /** Union of all affected dependencies */
  dependenciesAffected: string[];
  /** Aggregate test risk score (0–100) */
  testRiskScore: number;
  /** Aggregate blast radius score */
  blastRadiusScore: number;
  /** Worst risk level across all steps */
  riskLevel: 'low' | 'medium' | 'high';
  /** Union of all blast radius factors */
  blastRadiusFactors: Array<{ name: string; multiplier: number; reason: string }>;
  /** Total number of steps in the plan */
  totalSteps: number;
  /** Number of steps that had a simulator available */
  simulatedSteps: number;
}

/** Result of simulating an entire action plan */
export interface PlanSimulationResult {
  /** Per-step results in order */
  steps: PlanStepResult[];
  /** Detected interactions between steps */
  interactions: PlanStepInteraction[];
  /** Composite forecast aggregating all step forecasts */
  compositeForecast: CompositeImpactForecast;
  /** Total simulation duration (ms) */
  durationMs: number;
}
