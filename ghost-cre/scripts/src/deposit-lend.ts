/**
 * Deposit & Lend — deposit to external vault → private-transfer to pool → GHOST deposit → lend intent
 *
 * Usage:
 *   PRIVATE_KEY=0x... bun run src/deposit-lend.ts <token> <amount> <minRate> <tranche>
 *
 * Environment:
 *   PRIVATE_KEY, POOL_ADDRESS, EXTERNAL_VAULT_ADDRESS, RPC_URL, GHOST_API_URL, CHAIN_ID
 */

import { ethers } from "ethers";
import {
  getWallet,
  getSignerWallet,
  getExternalVaultAddress,
  getPoolAddress,
  currentTimestamp,
  signGhostTypedData,
  signExternalTypedData,
  postGhostApi,
  postExternalApi,
  requiredArg,
  setUsage,
  EXTERNAL_VAULT_ABI,
  ERC20_ABI,
} from "./common.js";

setUsage(
  "PRIVATE_KEY=0x... bun run src/deposit-lend.ts <token> <amount> <minRate> <tranche>"
);

async function main() {
  const wallet = getWallet();
  const signer = getSignerWallet();
  const account = wallet.address;
  const vaultAddr = getExternalVaultAddress();
  const poolAddr = getPoolAddress();

  const token = requiredArg(0, "token");
  const amount = requiredArg(1, "amount");
  const minRate = requiredArg(2, "minRate");
  const tranche = requiredArg(3, "tranche");

  if (tranche !== "senior" && tranche !== "junior") {
    console.error('Error: tranche must be "senior" or "junior"');
    process.exit(1);
  }

  console.log("=== Deposit & Lend ===");
  console.log(`Account:  ${account}`);
  console.log(`Token:    ${token}`);
  console.log(`Amount:   ${amount}`);
  console.log(`Min Rate: ${minRate} bps`);
  console.log(`Tranche:  ${tranche}`);
  console.log(`Pool:     ${poolAddr}`);

  // 1. On-chain: approve + deposit to external vault
  const vault = new ethers.Contract(vaultAddr, EXTERNAL_VAULT_ABI, wallet);
  const erc20 = new ethers.Contract(token, ERC20_ABI, wallet);

  const allowance: bigint = await erc20.allowance(account, vaultAddr);
  if (allowance < BigInt(amount)) {
    console.log("\nApproving external vault...");
    const approveTx = await erc20.approve(vaultAddr, amount);
    await approveTx.wait();
    console.log(`Approved: ${approveTx.hash}`);
  }

  console.log("\nDepositing to external vault...");
  const depositTx = await vault.deposit(token, amount);
  const receipt = await depositTx.wait();
  console.log(`Deposit tx: ${depositTx.hash} (block ${receipt.blockNumber})`);

  // 2. External API: private-transfer to pool
  console.log("\nTransferring to GHOST pool via external API...");
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

  // 3. GHOST API: /deposit
  console.log("\nRegistering deposit with GHOST...");
  const timestamp2 = currentTimestamp();
  const depositMsg = { account, token, amount, transactionId, timestamp: timestamp2 };
  const depositTypes = {
    "Deposit to Pool": [
      { name: "account", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "transactionId", type: "string" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  const depositAuth = await signGhostTypedData(signer, depositTypes, depositMsg);
  await postGhostApi("/deposit", { ...depositMsg, auth: depositAuth });

  // 4. GHOST API: /lend-intent
  console.log("\nSubmitting lend intent...");
  const timestamp3 = currentTimestamp();
  const lendMsg = { account, token, amount, minRate, tranche, duration: 1, timestamp: timestamp3 };
  const lendTypes = {
    "Submit Lend Intent": [
      { name: "account", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "minRate", type: "uint256" },
      { name: "tranche", type: "string" },
      { name: "duration", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  const lendAuth = await signGhostTypedData(signer, lendTypes, lendMsg);
  await postGhostApi("/lend-intent", { ...lendMsg, auth: lendAuth });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
