import { Hono } from "hono";
import { config } from "./config.js";
import { getPoolAddress } from "./pool.js";

import balancesRoute from "./routes/balances.js";
import lendIntentRoute from "./routes/lend-intent.js";
import borrowIntentRoute from "./routes/borrow-intent.js";
import withdrawRoute from "./routes/withdraw.js";
import depositRoute from "./routes/deposit.js";
import repayRoute from "./routes/repay.js";
import shieldedAddressRoute from "./routes/shielded-address.js";
import positionsRoute from "./routes/positions.js";
import transactionsRoute from "./routes/transactions.js";
import epochRoute from "./routes/epoch.js";
import internalRoute from "./routes/internal.js";

const app = new Hono();

// Mount routes
app.route("/", balancesRoute);
app.route("/", lendIntentRoute);
app.route("/", borrowIntentRoute);
app.route("/", withdrawRoute);
app.route("/", depositRoute);
app.route("/", repayRoute);
app.route("/", shieldedAddressRoute);
app.route("/", positionsRoute);
app.route("/", transactionsRoute);
app.route("/", epochRoute);
app.route("/", internalRoute);

// Health check
app.get("/", (c) =>
  c.json({
    status: "ok",
    name: "GHOST Protocol API",
    pool: getPoolAddress(),
  })
);

console.log(`GHOST Protocol API running on port ${config.PORT}`);

export default {
  port: config.PORT,
  fetch: app.fetch,
};
