import { ethers } from "ethers";
import { encrypt } from "eciesjs";
import {
  SERVER,
  EXTERNAL_API,
  CRE_PUBKEY,
  EXTERNAL_DOMAIN,
  PRIVATE_TRANSFER_TYPES,
} from "./constants";

export const ts = () => Math.floor(Date.now() / 1000);
export const toWei = (n: number) => ethers.parseEther(n.toString()).toString();

export function encryptRate(rate: string): string {
  const buf = encrypt(CRE_PUBKEY, Buffer.from(rate));
  return "0x" + Buffer.from(buf).toString("hex");
}

export async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${SERVER}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      `${path} failed (${res.status}): ${JSON.stringify(data)}`
    );
  return data;
}

export async function get(path: string) {
  const res = await fetch(`${SERVER}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

export async function privateTransfer(
  signer: ethers.Signer,
  to: string,
  token: string,
  amount: string
) {
  const address = await signer.getAddress();
  const timestamp = ts();
  const message = {
    sender: address,
    recipient: to,
    token,
    amount,
    flags: [] as string[],
    timestamp,
  };
  const auth = await (signer as ethers.Wallet & { signTypedData: Function }).signTypedData(
    EXTERNAL_DOMAIN,
    PRIVATE_TRANSFER_TYPES,
    message
  );
  const res = await fetch(`/external/private-transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account: address,
      recipient: to,
      token,
      amount,
      flags: [],
      timestamp,
      auth,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Transfer failed: ${JSON.stringify(data)}`);
  return data;
}
