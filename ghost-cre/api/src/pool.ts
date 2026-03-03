import { ethers } from "ethers";
import { config } from "./config.js";
import * as externalApi from "./external-api.js";

const poolWallet = new ethers.Wallet(config.POOL_PRIVATE_KEY);

export function getPoolAddress(): string {
  return poolWallet.address;
}

export async function getPoolBalance(token: string): Promise<string> {
  const result = await externalApi.getBalance(poolWallet, token);
  return result.balances?.[token.toLowerCase()] ?? "0";
}

export async function transferFromPool(
  recipient: string,
  token: string,
  amount: string
): Promise<any> {
  return externalApi.privateTransfer(poolWallet, recipient, token, amount);
}

export async function verifyIncomingTransfer(
  senderAddress: string,
  amount: string,
  token: string
): Promise<boolean> {
  // Fetch recent transactions for pool wallet and confirm matching tx exists
  const result = await externalApi.getTransactions(poolWallet, 50);
  const txs = result.transactions ?? [];
  for (const tx of txs) {
    if (
      tx.sender?.toLowerCase() === senderAddress.toLowerCase() &&
      tx.token?.toLowerCase() === token.toLowerCase() &&
      tx.amount === amount
    ) {
      return true;
    }
  }
  return false;
}
