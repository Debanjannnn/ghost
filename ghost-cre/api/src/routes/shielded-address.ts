import { Hono } from "hono";
import { ethers } from "ethers";
import { authenticate } from "../auth.js";
import { state } from "../state.js";

const app = new Hono();

// Track nonce per account for deterministic generation
const nonces: Map<string, number> = new Map();

app.post("/shielded-address", async (c) => {
  try {
    const body = await c.req.json();
    const { account, timestamp, auth } = body;

    if (!account || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "Generate Shielded Address",
      { account, timestamp },
      auth,
      account
    );

    const key = account.toLowerCase();
    const nonce = nonces.get(key) ?? 0;
    nonces.set(key, nonce + 1);

    // Derive deterministic shielded address
    const hash = ethers.solidityPackedKeccak256(
      ["address", "string", "uint256"],
      [account, "ghost-shielded", nonce]
    );
    // Take first 20 bytes as address
    const shieldedAddress = ethers.getAddress("0x" + hash.slice(26));

    // Store mapping
    state.shieldedAddresses.set(shieldedAddress.toLowerCase(), key);

    return c.json({ shieldedAddress });
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
