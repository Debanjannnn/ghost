import { ethers } from "ethers";
import { config } from "./config.js";

const EXTERNAL_DOMAIN = {
  name: "CompliantPrivateTokenDemo",
  version: "0.0.1",
  chainId: config.CHAIN_ID,
  verifyingContract: config.EXTERNAL_VAULT_ADDRESS as `0x${string}`,
};

function currentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

async function signAndPost(
  wallet: ethers.Wallet,
  types: Record<string, ethers.TypedDataField[]>,
  message: Record<string, unknown>,
  endpoint: string,
  body: Record<string, unknown>
): Promise<any> {
  const auth = await wallet.signTypedData(EXTERNAL_DOMAIN, types, message);
  const url = `${config.EXTERNAL_API_URL}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, auth }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`External API ${endpoint} failed: ${JSON.stringify(data)}`);
  return data;
}

export async function getBalance(
  wallet: ethers.Wallet,
  token: string
): Promise<{ balances: Record<string, string> }> {
  const account = wallet.address;
  const timestamp = currentTimestamp();
  const message = { account, timestamp };
  const types = {
    "Retrieve Balances": [
      { name: "account", type: "address" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  return signAndPost(wallet, types, message, "/balances", { account, timestamp });
}

export async function privateTransfer(
  wallet: ethers.Wallet,
  recipient: string,
  token: string,
  amount: string,
  flags: string[] = []
): Promise<any> {
  const sender = wallet.address;
  const timestamp = currentTimestamp();
  const message = { sender, recipient, token, amount, flags, timestamp };
  const types = {
    "Private Token Transfer": [
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "flags", type: "string[]" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  return signAndPost(wallet, types, message, "/private-transfer", {
    account: sender,
    recipient,
    token,
    amount,
    flags,
    timestamp,
  });
}

export async function getTransactions(
  wallet: ethers.Wallet,
  limit: number = 10,
  cursor: string = ""
): Promise<any> {
  const account = wallet.address;
  const timestamp = currentTimestamp();
  const message = { account, timestamp, cursor, limit };
  const types = {
    "List Transactions": [
      { name: "account", type: "address" },
      { name: "timestamp", type: "uint256" },
      { name: "cursor", type: "string" },
      { name: "limit", type: "uint256" },
    ],
  };
  const body: Record<string, unknown> = { account, timestamp, limit };
  if (cursor) body.cursor = cursor;
  return signAndPost(wallet, types, message, "/transactions", body);
}

export async function requestWithdrawTicket(
  wallet: ethers.Wallet,
  token: string,
  amount: string
): Promise<any> {
  const account = wallet.address;
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
  return signAndPost(wallet, types, message, "/withdraw", { account, token, amount, timestamp });
}

export async function generateShieldedAddress(wallet: ethers.Wallet): Promise<any> {
  const account = wallet.address;
  const timestamp = currentTimestamp();
  const message = { account, timestamp };
  const types = {
    "Generate Shielded Address": [
      { name: "account", type: "address" },
      { name: "timestamp", type: "uint256" },
    ],
  };
  return signAndPost(wallet, types, message, "/shielded-address", { account, timestamp });
}
