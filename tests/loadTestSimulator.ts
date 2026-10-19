// =====================================================================
// HIGH-VOLUME PRODUCTION LOAD TEST SIMULATOR
// Tests multi-concurrency USSD session spikes & response latencies
// =====================================================================

export interface SimulationMetrics {
  totalConcurrentUsers: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTimeMs: number;
}

export class ProductionLoadSimulator {
  /**
   * Triggers massive programmatic mock requests against deployment gateway layers
   */
  public async executeStressTest(targetUrl: string, targetConcurrency: number): Promise<SimulationMetrics> {
    console.log(`🏋️ [Load Simulator] Launching massive request concurrency trial on: ${targetUrl}`);
    console.log(`[Load Simulator] Running execution profile at: ${targetConcurrency} concurrent connections.`);

    const startTime = Date.now();
    let successfulRequests = 0;
    let failedRequests = 0;

    // Package parallel connection requests array
    const requestPool = Array.from({ length: targetConcurrency }).map(async (_, idx) => {
      // Simulate unique international mobile network identifiers
      const mockPhoneNumber = `+2782${Math.floor(1000000 + Math.random() * 9000000)}`;

      try {
        const payload = new URLSearchParams();
        payload.append('sessionId', `SES_TEST_${Date.now()}_${idx}`);
        payload.append('phoneNumber', mockPhoneNumber);
        payload.append('text', '1*2'); // Mock USSD path navigating menu screens

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload
        });

        if (res.ok) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      } catch {
        failedRequests++;
      }
    });

    // Fire entire network pool simultaneously in parallel
    await Promise.all(requestPool);

    const totalDurationMs = Date.now() - startTime;
    const averageResponseTimeMs = Math.round(totalDurationMs / Math.max(1, targetConcurrency));

    const metricsReport: SimulationMetrics = {
      totalConcurrentUsers: targetConcurrency,
      successfulRequests,
      failedRequests,
      averageResponseTimeMs
    };

    console.log("📊 [Stress Test Complete] Performance Metrics Logged:");
    console.table(metricsReport);

    return metricsReport;
  }
}

// Execute standalone runner when invoked directly from command line
if (process.argv[1]?.includes('loadTestSimulator')) {
  const simulator = new ProductionLoadSimulator();
  const TARGET_SERVER_ENDPOINT = process.env.TEST_TARGET_URL || 'http://localhost:3000/api/ussd';
  const concurrency = parseInt(process.env.TEST_CONCURRENCY || '250', 10);

  console.log(`Starting load test against ${TARGET_SERVER_ENDPOINT} with ${concurrency} connections...`);
  simulator.executeStressTest(TARGET_SERVER_ENDPOINT, concurrency)
    .then(() => console.log("🚀 Server load test completed successfully."))
    .catch(err => console.error("Testing run stopped due to failure:", err));
}
