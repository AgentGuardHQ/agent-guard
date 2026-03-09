// Governed Action Kernel — the core orchestrator.
// Connects monitor (AAB + policy + invariants) with execution adapters.
// Emits full action lifecycle events: REQUESTED → ALLOWED/DENIED → EXECUTED/FAILED.

import type { DomainEvent, CanonicalAction } from '../core/types.js';
import { createMonitor } from './monitor.js';
import type { MonitorConfig, MonitorDecision } from './monitor.js';
import type { RawAgentAction } from './core/aab.js';
import { createAction, getActionClass } from '../domain/actions.js';
import { createAdapterRegistry } from '../domain/execution/adapters.js';
import type { AdapterRegistry, ExecutionResult, DecisionRecord } from '../core/types.js';
import {
  createEvent,
  ACTION_REQUESTED,
  ACTION_ALLOWED,
  ACTION_DENIED,
  ACTION_EXECUTED,
  ACTION_FAILED,
} from '../domain/events.js';
import { simpleHash } from '../domain/hash.js';

export interface KernelResult {
  allowed: boolean;
  executed: boolean;
  decision: MonitorDecision;
  execution: ExecutionResult | null;
  action: CanonicalAction | null;
  events: DomainEvent[];
  runId: string;
}

export interface EventSink {
  write(event: DomainEvent): void;
  flush?(): void;
}

export interface KernelConfig extends MonitorConfig {
  runId?: string;
  sinks?: EventSink[];
  adapters?: AdapterRegistry;
  dryRun?: boolean;
}

export interface Kernel {
  propose(
    rawAction: RawAgentAction,
    systemContext?: Record<string, unknown>
  ): Promise<KernelResult>;
  getRunId(): string;
  getActionLog(): KernelResult[];
  getEventCount(): number;
  shutdown(): void;
}

function generateRunId(): string {
  return `run_${Date.now()}_${simpleHash(Math.random().toString())}`;
}

export function createKernel(config: KernelConfig = {}): Kernel {
  const runId = config.runId || generateRunId();
  const sinks: EventSink[] = config.sinks || [];
  const adapters = config.adapters || createAdapterRegistry();
  const dryRun = config.dryRun ?? false;
  const actionLog: KernelResult[] = [];
  let eventCount = 0;

  const monitor = createMonitor({
    policyDefs: config.policyDefs,
    invariants: config.invariants,
    denialThreshold: config.denialThreshold,
    violationThreshold: config.violationThreshold,
    windowSize: config.windowSize,
  });

  function sinkEvent(event: DomainEvent): void {
    eventCount++;
    for (const sink of sinks) {
      sink.write(event);
    }
  }

  function sinkEvents(events: DomainEvent[]): void {
    for (const event of events) {
      sinkEvent(event);
    }
  }

  return {
    propose: async (rawAction, systemContext = {}) => {
      const allEvents: DomainEvent[] = [];

      // 1. Emit ACTION_REQUESTED
      const requestedEvent = createEvent(ACTION_REQUESTED, {
        actionType: rawAction.tool || 'unknown',
        target: rawAction.file || rawAction.target || '',
        justification: (rawAction.metadata?.justification as string) || 'agent action',
        actionId: undefined,
        agentId: rawAction.agent || 'unknown',
        metadata: { runId, command: rawAction.command },
      });
      allEvents.push(requestedEvent);

      // 2. Evaluate via monitor (AAB → policy → invariants → evidence)
      const decision = monitor.process(rawAction, systemContext);

      // 3. Create canonical action object for execution
      let action: CanonicalAction | null = null;
      try {
        const actionType = decision.intent.action;
        const target = decision.intent.target;
        if (actionType !== 'unknown') {
          action = createAction(actionType, target, 'kernel-proposed', {
            command: rawAction.command,
            agent: rawAction.agent,
            runId,
          });
        }
      } catch {
        // Action creation may fail for unknown types — continue with null
      }

      // 4. Emit decision events from monitor
      sinkEvents(decision.events);

      if (!decision.allowed) {
        // 5a. DENIED — emit denial event
        const deniedEvent = createEvent(ACTION_DENIED, {
          actionType: decision.intent.action,
          target: decision.intent.target,
          reason: decision.decision.reason,
          actionId: action?.id,
          policyHash: decision.decision.matchedPolicy?.id,
          metadata: {
            runId,
            intervention: decision.intervention,
            violations: decision.violations,
          },
        });
        allEvents.push(deniedEvent);
        sinkEvents(allEvents);

        const result: KernelResult = {
          allowed: false,
          executed: false,
          decision,
          execution: null,
          action,
          events: allEvents,
          runId,
        };
        actionLog.push(result);
        return result;
      }

      // 5b. ALLOWED — emit allowed event
      const allowedEvent = createEvent(ACTION_ALLOWED, {
        actionType: decision.intent.action,
        target: decision.intent.target,
        capability: decision.decision.matchedPolicy?.id || 'default-allow',
        actionId: action?.id,
        reason: decision.decision.reason,
        metadata: { runId },
      });
      allEvents.push(allowedEvent);

      // 6. Execute via adapter (unless dry-run)
      let execution: ExecutionResult | null = null;
      if (!dryRun && action) {
        const actionClass = getActionClass(action.type);
        if (actionClass && adapters.has(actionClass)) {
          const decisionRecord: DecisionRecord = {
            actionId: action.id,
            decision: 'allow',
            reason: decision.decision.reason,
            timestamp: Date.now(),
            policyHash: decision.decision.matchedPolicy?.id || 'none',
          };

          const startTime = Date.now();
          try {
            execution = await adapters.execute(action, decisionRecord);
            const duration = Date.now() - startTime;

            if (execution.success) {
              // 7a. Execution succeeded
              const executedEvent = createEvent(ACTION_EXECUTED, {
                actionType: action.type,
                target: action.target,
                result: 'success',
                actionId: action.id,
                duration,
                metadata: { runId },
              });
              allEvents.push(executedEvent);
            } else {
              // 7b. Execution failed
              const failedEvent = createEvent(ACTION_FAILED, {
                actionType: action.type,
                target: action.target,
                error: execution.error || 'Unknown execution error',
                actionId: action.id,
                duration,
                metadata: { runId },
              });
              allEvents.push(failedEvent);
            }
          } catch (err) {
            const duration = Date.now() - startTime;
            execution = { success: false, error: (err as Error).message };
            const failedEvent = createEvent(ACTION_FAILED, {
              actionType: action.type,
              target: action.target,
              error: (err as Error).message,
              actionId: action.id,
              duration,
              metadata: { runId },
            });
            allEvents.push(failedEvent);
          }
        }
      }

      sinkEvents(allEvents);

      const result: KernelResult = {
        allowed: true,
        executed: execution !== null,
        decision,
        execution,
        action,
        events: allEvents,
        runId,
      };
      actionLog.push(result);
      return result;
    },

    getRunId() {
      return runId;
    },

    getActionLog() {
      return [...actionLog];
    },

    getEventCount() {
      return eventCount;
    },

    shutdown() {
      for (const sink of sinks) {
        if (sink.flush) sink.flush();
      }
    },
  };
}
