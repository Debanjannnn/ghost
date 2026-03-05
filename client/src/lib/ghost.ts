import { ethers } from "ethers";
import { encrypt } from "eciesjs";

const GHOST_API = process.env.NEXT_PUBLIC_GHOST_API_URL!;
const EXTERNAL_API = process.env.NEXT_PUBLIC_EXTERNAL_API_URL!;
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS!;
const GUSD_ADDRESS = process.env.NEXT_PUBLIC_GUSD_ADDRESS!;
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID!);

export { VAULT_ADDRESS, GUSD_ADDRESS, CHAIN_ID };

// EIP-712 domains
export const GHOST_DOMAIN = {
  name: "GhostProtocol",
  version: "0.0.1",
  chainId: CHAIN_ID,
  verifyingContract: VAULT_ADDRESS,
};

export const EXTERNAL_DOMAIN = {
  name: "CompliantPrivateTokenDemo",
  version: "0.0.1",
  chainId: CHAIN_ID,
  verifyingContract: VAULT_ADDRESS,
};

// ABIs
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

export const VAULT_ABI = [
  "function deposit(address token, uint256 amount)",
];

// Helpers
export const ts = () => Math.floor(Date.now() / 1000);

export function encryptRate(pubkey: string, rate: string): string {
  const buf = encrypt(pubkey, Buffer.from(rate));
  return "0x" + Buffer.from(buf).toString("hex");
}

export async function ghostGet(path: string) {
  const res = await fetch(`${GHOST_API}${path}`);
  return res.json();
}

export async function ghostPost(path: string, body: unknown) {
  const res = await fetch(`${GHOST_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error ?? `Request failed (${res.status})`);
  return data;
}

export async function fetchPoolAddress(): Promise<string> {
  const data = await ghostGet("/health");
  return (data as any).poolAddress;
}

export async function fetchCREPublicKey(): Promise<string> {
  const data = await ghostGet("/cre-public-key");
  return (data as any).publicKey;
}

export async function privateTransfer(
  signer: ethers.Signer,
  recipient: string,
  token: string,
  amount: string,
) {
  const sender = await signer.getAddress();
  const timestamp = ts();
  const message = { sender, recipient, token, amount, flags: [] as string[], timestamp };
  const auth = await (signer as ethers.Signer & { signTypedData: typeof ethers.Wallet.prototype.signTypedData }).signTypedData(
    EXTERNAL_DOMAIN,
    {
      "Private Token Transfer": [
        { name: "sender", type: "address" },
        { name: "recipient", type: "address" },
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "flags", type: "string[]" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    message,
  );
  const res = await fetch(`${EXTERNAL_API}/private-transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: sender, recipient, token, amount, flags: [], timestamp, auth }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Transfer failed: ${JSON.stringify(data)}`);
  return data;
}
