/**
 * Withdraw — GHOST API withdraw (pool transfers to user) → optionally redeem from external vault
 *
 * Usage:
 *   PRIVATE_KEY=0x... bun run src/withdraw.ts <token> <amount>
 *
 * Environment:
 *   PRIVATE_KEY, GHOST_API_URL, CHAIN_ID, EXTERNAL_VAULT_ADDRESS
 */

import {
  getSignerWallet,
  currentTimestamp,
  signGhostTypedData,
  postGhostApi,
  requiredArg,
  setUsage,
} from "./common.js";

setUsage("PRIVATE_KEY=0x... bun run src/withdraw.ts <token> <amount>");

async function main() {
  const signer = getSignerWallet();
  const account = signer.address;

  const token = requiredArg(0, "token");
  const amount = requiredArg(1, "amount");

  console.log("=== Withdraw ===");
  console.log(`Account: ${account}`);
  console.log(`Token:   ${token}`);
  console.log(`Amount:  ${amount}`);

  // 1. GHOST API: /withdraw — pool transfers to user on external API
  const timestamp = currentTimestamp();
  const message = { account, token, amount, timestamp };
  const types = {
    "Withdraw Tokens": [
      { name: "account", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  const auth = await signGhostTypedData(signer, types, message);

  console.log("\nRequesting withdrawal from GHOST...");
  await postGhostApi("/withdraw", { account, token, amount, timestamp, auth });

  console.log("\nTokens returned to external API balance.");
  console.log("To redeem on-chain, use the external API /withdraw endpoint.");
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
