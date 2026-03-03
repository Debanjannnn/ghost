/**
 * GHOST Protocol -- Epoch Settlement Workflow
 *
 * Runs every 5 minutes via CRE CronTrigger.
 * Pure HTTP trigger: calls GHOST API /internal/run-auction
 * No on-chain writes — GHOST API handles disbursal via external API.
 */

import config from "./config.json" with { type: "json" };

interface AuctionResult {
  epochId: number;
  clearingRate: number;
  totalMatched: string;
  seniorMatched: string;
  juniorMatched: string;
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
      url: `${config.ghostApiUrl}/internal/run-auction`,
      method: "POST",
      multiHeaders: {
        "x-api-key": { values: ["{{.GHOST_API_KEY}}"] },
      },
    },
    vaultDonSecrets: [{ key: "GHOST_API_KEY", owner: config.owner }],
  });

  const result: AuctionResult = JSON.parse(response.body);

  if (BigInt(result.totalMatched) === 0n) {
    console.log("No matches this epoch, skipping");
    return;
  }

  console.log(
    `Epoch ${result.epochId} settled: rate=${result.clearingRate} matched=${result.totalMatched}`
  );
}
