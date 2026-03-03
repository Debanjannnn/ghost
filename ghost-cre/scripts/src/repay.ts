/**
 * Repay Loan — private-transfer to pool via external API → GHOST /repay
 *
 * Usage:
 *   PRIVATE_KEY=0x... bun run src/repay.ts <token> <amount> <loanHash>
 *
 * Environment:
 *   PRIVATE_KEY, POOL_ADDRESS, GHOST_API_URL, CHAIN_ID, EXTERNAL_VAULT_ADDRESS
 */

import {
  getSignerWallet,
  getPoolAddress,
  currentTimestamp,
  signGhostTypedData,
  signExternalTypedData,
  postGhostApi,
  postExternalApi,
  requiredArg,
  setUsage,
} from "./common.js";

setUsage("PRIVATE_KEY=0x... bun run src/repay.ts <token> <amount> <loanHash>");

async function main() {
  const signer = getSignerWallet();
  const account = signer.address;
  const poolAddr = getPoolAddress();

  const token = requiredArg(0, "token");
  const amount = requiredArg(1, "amount");
  const loanHash = requiredArg(2, "loanHash");

  console.log("=== Repay Loan ===");
  console.log(`Account:  ${account}`);
  console.log(`Token:    ${token}`);
  console.log(`Amount:   ${amount}`);
  console.log(`Loan:     ${loanHash}`);
  console.log(`Pool:     ${poolAddr}`);

  // 1. External API: private-transfer repayment to pool
  console.log("\nTransferring repayment to pool via external API...");
  const timestamp1 = currentTimestamp();
  const transferMsg = {
    sender: account,
    recipient: poolAddr,
    token,
    amount,
    flags: [] as string[],
    timestamp: timestamp1,
  };
  const transferTypes = {
    "Private Token Transfer": [
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "flags", type: "string[]" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  const transferAuth = await signExternalTypedData(signer, transferTypes, transferMsg);
  const transferResult = await postExternalApi("/private-transfer", {
    account,
    recipient: poolAddr,
    token,
    amount,
    flags: [],
    timestamp: timestamp1,
    auth: transferAuth,
  }) as any;

  const transactionId = transferResult.transaction_id || transferResult.transactionId || crypto.randomUUID();

  // 2. GHOST API: /repay
  console.log("\nSubmitting repayment to GHOST...");
  const timestamp2 = currentTimestamp();
  const repayMsg = { account, loanHash, transactionId, timestamp: timestamp2 };
  const repayTypes = {
    "Repay Loan": [
      { name: "account", type: "address" },
      { name: "loanHash", type: "bytes32" },
      { name: "transactionId", type: "string" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  const repayAuth = await signGhostTypedData(signer, repayTypes, repayMsg);
  await postGhostApi("/repay", { ...repayMsg, auth: repayAuth });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
