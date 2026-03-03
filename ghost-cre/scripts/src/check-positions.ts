/**
 * Check Positions — query active lending/borrowing positions from GHOST API
 *
 * Usage:
 *   PRIVATE_KEY=0x... bun run src/check-positions.ts
 *
 * Environment:
 *   PRIVATE_KEY, GHOST_API_URL, CHAIN_ID, EXTERNAL_VAULT_ADDRESS
 */

import {
  getSignerWallet,
  currentTimestamp,
  signGhostTypedData,
  postGhostApi,
  setUsage,
} from "./common.js";

setUsage("PRIVATE_KEY=0x... bun run src/check-positions.ts");

const EIP712_TYPES = {
  "Retrieve Positions": [
    { name: "account", type: "address" },
    { name: "timestamp", type: "uint256" },
  ],
};

async function main() {
  const wallet = getSignerWallet();
  const account = wallet.address;
  const timestamp = currentTimestamp();

  console.log("=== Check Positions ===");
  console.log(`Account:   ${account}`);
  console.log(`Timestamp: ${timestamp}`);

  const message = { account, timestamp };
  const auth = await signGhostTypedData(wallet, EIP712_TYPES, message);

  await postGhostApi("/positions", { account, timestamp, auth });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
