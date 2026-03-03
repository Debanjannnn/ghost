import { ethers } from "ethers";

// --- Wallet & Environment ---

export function getWallet(): ethers.Wallet {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Error: PRIVATE_KEY env var required");
    process.exit(1);
  }
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(pk, provider);
}

export function getSignerWallet(): ethers.Wallet {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) {
    console.error("Error: PRIVATE_KEY env var required");
    process.exit(1);
  }
  return new ethers.Wallet(pk);
}

export function getApiUrl(): string {
  return process.env.GHOST_API_URL || "http://localhost:3000";
}

export function getExternalApiUrl(): string {
  return process.env.EXTERNAL_API_URL || "https://convergence2026-token-api.cldev.cloud";
}

export function getExternalVaultAddress(): string {
  return process.env.EXTERNAL_VAULT_ADDRESS || "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13";
}

export function getPoolAddress(): string {
  const addr = process.env.POOL_ADDRESS;
  if (!addr) {
    console.error("Error: POOL_ADDRESS env var required");
    process.exit(1);
  }
  return addr;
}

export function currentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// --- EIP-712 Domains ---

export function getGhostDomain() {
  return {
    name: "GhostProtocol",
    version: "0.0.1",
    chainId: parseInt(process.env.CHAIN_ID || "11155111"),
    verifyingContract: getExternalVaultAddress(),
  };
}

export function getExternalDomain() {
  return {
    name: "CompliantPrivateTokenDemo",
    version: "0.0.1",
    chainId: parseInt(process.env.CHAIN_ID || "11155111"),
    verifyingContract: getExternalVaultAddress(),
  };
}

export async function signGhostTypedData(
  wallet: ethers.Wallet,
  types: Record<string, ethers.TypedDataField[]>,
  message: Record<string, unknown>
): Promise<string> {
  return wallet.signTypedData(getGhostDomain(), types, message);
}

export async function signExternalTypedData(
  wallet: ethers.Wallet,
  types: Record<string, ethers.TypedDataField[]>,
  message: Record<string, unknown>
): Promise<string> {
  return wallet.signTypedData(getExternalDomain(), types, message);
}

// --- API Helpers ---

export async function postGhostApi(
  endpoint: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const url = `${getApiUrl()}${endpoint}`;
  console.log(`\nPOST ${url}`);
  console.log("Request body:", JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`\nError (${res.status}):`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("\nResponse:");
  console.log(JSON.stringify(data, null, 2));
  return data;
}

export async function postExternalApi(
  endpoint: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const url = `${getExternalApiUrl()}${endpoint}`;
  console.log(`\nPOST ${url}`);
  console.log("Request body:", JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`\nError (${res.status}):`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("\nResponse:");
  console.log(JSON.stringify(data, null, 2));
  return data;
}

// --- CLI Args ---

let usageMessage = "";

export function setUsage(msg: string): void {
  usageMessage = msg;
}

export function requiredArg(index: number, name: string): string {
  const val = process.argv[2 + index];
  if (!val) {
    console.error(`Error: Missing required argument <${name}>.`);
    if (usageMessage) console.error(`\nUsage: ${usageMessage}`);
    process.exit(1);
  }
  return val;
}

export function optionalArg(index: number): string | undefined {
  return process.argv[2 + index];
}

// --- Contract ABIs (minimal for on-chain deposit to external vault) ---

export const EXTERNAL_VAULT_ABI = [
  "function deposit(address token, uint256 amount) external",
  "function withdraw(address token, uint256 amount, uint256 deadline, bytes ticket) external",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
];
