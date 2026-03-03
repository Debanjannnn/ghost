function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

export const config = {
  RPC_URL: process.env.RPC_URL ?? "http://127.0.0.1:8545",
  CHAIN_ID: Number(process.env.CHAIN_ID ?? "11155111"),
  API_KEY: process.env.API_KEY ?? "",
  PORT: Number(process.env.PORT ?? "3000"),
  POOL_PRIVATE_KEY: required("POOL_PRIVATE_KEY"),
  EXTERNAL_API_URL: process.env.EXTERNAL_API_URL ?? "https://convergence2026-token-api.cldev.cloud",
  EXTERNAL_VAULT_ADDRESS: process.env.EXTERNAL_VAULT_ADDRESS ?? "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13",
  TOKEN_ADDRESS: required("TOKEN_ADDRESS"),
};
