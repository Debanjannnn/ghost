/**
 * Setup Pool — deploy token + policy via foundry, register on external vault, fund pool
 *
 * Usage:
 *   PRIVATE_KEY=0x... POOL_PRIVATE_KEY=0x... bun run src/setup-pool.ts <token>
 *
 * If <token> is provided, skips deployment and uses existing token.
 * Otherwise, expects TOKEN_ADDRESS from foundry deploy output.
 *
 * Environment:
 *   PRIVATE_KEY, POOL_PRIVATE_KEY, EXTERNAL_VAULT_ADDRESS, RPC_URL, CHAIN_ID
 */

import { ethers } from "ethers";
import {
  getWallet,
  getExternalVaultAddress,
  currentTimestamp,
  signExternalTypedData,
  postExternalApi,
  optionalArg,
  setUsage,
  EXTERNAL_VAULT_ABI,
  ERC20_ABI,
} from "./common.js";

setUsage("PRIVATE_KEY=0x... POOL_PRIVATE_KEY=0x... bun run src/setup-pool.ts [token]");

async function main() {
  const wallet = getWallet();
  const account = wallet.address;
  const vaultAddr = getExternalVaultAddress();

  const poolPk = process.env.POOL_PRIVATE_KEY;
  if (!poolPk) {
    console.error("Error: POOL_PRIVATE_KEY env var required");
    process.exit(1);
  }
  const poolWallet = new ethers.Wallet(poolPk);
  const poolAddr = poolWallet.address;

  const token = optionalArg(0);
  if (!token) {
    console.error("Error: provide token address as first argument");
    console.error("Deploy token first: cd ghost/contracts && forge script script/01_DeployToken.s.sol --broadcast");
    process.exit(1);
  }

  console.log("=== Setup Pool ===");
  console.log(`Deployer:    ${account}`);
  console.log(`Pool:        ${poolAddr}`);
  console.log(`Token:       ${token}`);
  console.log(`Ext Vault:   ${vaultAddr}`);

  const erc20 = new ethers.Contract(token, ERC20_ABI, wallet);
  const vault = new ethers.Contract(vaultAddr, EXTERNAL_VAULT_ABI, wallet);

  // 1. Mint tokens to deployer (assumes deployer is owner)
  const MINT_ABI = ["function mint(address to, uint256 amount) external"];
  const mintable = new ethers.Contract(token, MINT_ABI, wallet);
  const mintAmount = ethers.parseEther("100000");

  console.log("\nMinting tokens to deployer...");
  const mintTx = await mintable.mint(account, mintAmount);
  await mintTx.wait();
  console.log(`Minted ${ethers.formatEther(mintAmount)} tokens`);

  // 2. Approve + deposit to external vault
  console.log("\nApproving external vault...");
  const approveTx = await erc20.approve(vaultAddr, mintAmount);
  await approveTx.wait();

  console.log("Depositing to external vault...");
  const depositTx = await vault.deposit(token, mintAmount);
  await depositTx.wait();
  console.log(`Deposited to external vault: ${depositTx.hash}`);

  // 3. Private-transfer some tokens to pool address
  const poolFundAmount = ethers.parseEther("50000").toString();
  console.log(`\nTransferring ${ethers.formatEther(BigInt(poolFundAmount))} to pool via external API...`);

  const timestamp = currentTimestamp();
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!);
  const transferMsg = {
    sender: account,
    recipient: poolAddr,
    token,
    amount: poolFundAmount,
    flags: [] as string[],
    timestamp,
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
  await postExternalApi("/private-transfer", {
    account,
    recipient: poolAddr,
    token,
    amount: poolFundAmount,
    flags: [],
    timestamp,
    auth: transferAuth,
  });

  console.log("\n============================================");
  console.log("  POOL SETUP COMPLETE");
  console.log("============================================");
  console.log(`Pool Address:  ${poolAddr}`);
  console.log(`Token:         ${token}`);
  console.log("============================================");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
