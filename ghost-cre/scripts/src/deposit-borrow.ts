/**
 * Deposit Collateral & Borrow — deposit to external vault → private-transfer to pool → GHOST deposit → borrow intent
 *
 * Usage:
 *   PRIVATE_KEY=0x... bun run src/deposit-borrow.ts <collateralToken> <collateralAmount> <borrowToken> <borrowAmount> <maxRate>
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
  "PRIVATE_KEY=0x... bun run src/deposit-borrow.ts <collateralToken> <collateralAmount> <borrowToken> <borrowAmount> <maxRate>"
);

async function main() {
  const wallet = getWallet();
  const signer = getSignerWallet();
  const account = wallet.address;
  const vaultAddr = getExternalVaultAddress();
  const poolAddr = getPoolAddress();

  const collateralToken = requiredArg(0, "collateralToken");
  const collateralAmount = requiredArg(1, "collateralAmount");
  const borrowToken = requiredArg(2, "borrowToken");
  const borrowAmount = requiredArg(3, "borrowAmount");
  const maxRate = requiredArg(4, "maxRate");

  console.log("=== Deposit Collateral & Borrow ===");
  console.log(`Account:           ${account}`);
  console.log(`Collateral Token:  ${collateralToken}`);
  console.log(`Collateral Amount: ${collateralAmount}`);
  console.log(`Borrow Token:      ${borrowToken}`);
  console.log(`Borrow Amount:     ${borrowAmount}`);
  console.log(`Max Rate:          ${maxRate} bps`);
  console.log(`Pool:              ${poolAddr}`);

  // 1. On-chain: approve + deposit collateral to external vault
  const vault = new ethers.Contract(vaultAddr, EXTERNAL_VAULT_ABI, wallet);
  const erc20 = new ethers.Contract(collateralToken, ERC20_ABI, wallet);

  const allowance: bigint = await erc20.allowance(account, vaultAddr);
  if (allowance < BigInt(collateralAmount)) {
    console.log("\nApproving external vault for collateral...");
    const approveTx = await erc20.approve(vaultAddr, collateralAmount);
    await approveTx.wait();
    console.log(`Approved: ${approveTx.hash}`);
  }

  console.log("\nDepositing collateral to external vault...");
  const depositTx = await vault.deposit(collateralToken, collateralAmount);
  const receipt = await depositTx.wait();
  console.log(`Deposit tx: ${depositTx.hash} (block ${receipt.blockNumber})`);

  // 2. External API: private-transfer collateral to pool
  console.log("\nTransferring collateral to GHOST pool via external API...");
  const timestamp1 = currentTimestamp();
  const transferMsg = {
    sender: account,
    recipient: poolAddr,
    token: collateralToken,
    amount: collateralAmount,
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
    token: collateralToken,
    amount: collateralAmount,
    flags: [],
    timestamp: timestamp1,
    auth: transferAuth,
  }) as any;

  const transactionId = transferResult.transaction_id || transferResult.transactionId || crypto.randomUUID();

  // 3. GHOST API: /deposit (collateral)
  console.log("\nRegistering collateral deposit with GHOST...");
  const timestamp2 = currentTimestamp();
  const depositMsg = { account, token: collateralToken, amount: collateralAmount, transactionId, timestamp: timestamp2 };
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

  // 4. GHOST API: /borrow-intent
  console.log("\nSubmitting borrow intent...");
  const timestamp3 = currentTimestamp();
  const borrowMsg = {
    account,
    borrowToken,
    amount: borrowAmount,
    maxRate,
    collateralToken,
    collateralAmount,
    duration: 1,
    timestamp: timestamp3,
  };
  const borrowTypes = {
    "Submit Borrow Intent": [
      { name: "account", type: "address" },
      { name: "borrowToken", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "maxRate", type: "uint256" },
      { name: "collateralToken", type: "address" },
      { name: "collateralAmount", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  const borrowAuth = await signGhostTypedData(signer, borrowTypes, borrowMsg);
  await postGhostApi("/borrow-intent", { ...borrowMsg, auth: borrowAuth });

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
