/**
 * Compatibility facade for the retired in-process code execution engine.
 *
 * The former implementation invoked LLM-produced JavaScript through
 * child_process.execSync in the application container. A timeout does not
 * isolate filesystem, network, environment or service-account privileges.
 * Executing model output this way is prohibited.
 *
 * New requests use agentReview.ts: real AI review proposals are persisted,
 * remain inert, and must pass independent CI and human approval.
 */
export interface TelemetryRecord {
  id: string;
  taskHash: string;
  taskName: string;
  executionTimeMs: number;
  attemptsBeforeSuccess: number;
  rootCauseAnalysis: string;
  optimizedPromptDelta: string;
  status: "SUCCESS" | "CRITICAL_FAILURE" | "PENDING_REVIEW";
  timestamp: string;
  activeModel: string;
  codeSnippet?: string;
}

export interface TelemetrySummary {
  totalExecutions: number;
  averageLatencyMs: number;
  averageAttempts: number;
  failedCycles: number;
  successRatePercent: number;
}

export class SuperIntelligenceCore {
  // These compatibility methods never load fabricated telemetry fixtures.
  getRecords(_limit = 30): TelemetryRecord[] {
    return [];
  }

  getSummary(): TelemetrySummary {
    return {
      totalExecutions: 0, averageLatencyMs: 0, averageAttempts: 0,
      failedCycles: 0, successRatePercent: 0,
    };
  }

  getHistoricalContext(_taskDescription: string): string {
    return "";
  }

  evaluateSandbox(_codeBlock: string, _testAssertions: string): { ok: false; message: string } {
    return {
      ok: false,
      message: "Untrusted code cannot execute inside the LUQI application runtime. Submit a reviewable proposal and use isolated CI.",
    };
  }

  async executeAutonomousLoop(
    _taskName: string, _taskDescription: string, _assertions: string, _maxCycles = 3,
  ): Promise<never> {
    throw new Error(
      "Unsafe in-process agent execution has been retired. Use proposeAgentImprovement for reviewed, durable changes.",
    );
  }
}

export const superIntelligenceCore = new SuperIntelligenceCore();
