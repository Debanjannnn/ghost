/**
 * GHOST Protocol -- Liquidation Monitor Workflow
 *
 * Runs every 60 seconds via CRE CronTrigger.
 * Pure HTTP trigger: calls GHOST API /internal/check-loans
 * Liquidation happens in-state on the API side — no on-chain writes.
 */

import config from "./config.json" with { type: "json" };

interface CheckLoansResponse {
  loans: any[];
  unhealthy: any[];
}

interface Runtime {
  report(request: { data: `0x${string}` }): Promise<{ data: `0x${string}` }>;
}

interface ConfidentialHTTPClient {
  sendRequest(
    runtime: Runtime,
    options: {
      request: {
        url: string;
        method: string;
        multiHeaders?: Record<string, { values: string[] }>;
      };
      vaultDonSecrets?: Array<{ key: string; owner: string }>;
    }
  ): Promise<{ body: string }>;
}

export async function handler(
  runtime: Runtime,
  confHTTP: ConfidentialHTTPClient
) {
  const response = await confHTTP.sendRequest(runtime, {
    request: {
      url: `${config.ghostApiUrl}/internal/check-loans`,
      method: "POST",
      multiHeaders: {
        "x-api-key": { values: ["{{.GHOST_API_KEY}}"] },
      },
    },
    vaultDonSecrets: [{ key: "GHOST_API_KEY", owner: config.owner }],
  });

  const result: CheckLoansResponse = JSON.parse(response.body);

  if (result.unhealthy.length === 0) {
    return;
  }

  console.log(
    `Liquidated ${result.unhealthy.length} unhealthy loan(s)`
  );
}
