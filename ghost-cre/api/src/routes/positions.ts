import { Hono } from "hono";
import { authenticate } from "../auth.js";
import { state } from "../state.js";

const app = new Hono();

function serializeBigInts(obj: any): any {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeBigInts(v);
    }
    return out;
  }
  return obj;
}

app.post("/positions", async (c) => {
  try {
    const body = await c.req.json();
    const { account, timestamp, auth } = body;

    if (!account || !timestamp || !auth) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    authenticate(
      "Retrieve Positions",
      { account, timestamp },
      auth,
      account
    );

    const acctLower = account.toLowerCase();

    // Filter active loans for this user
    const loans = [];
    for (const [, loan] of state.activeLoans) {
      if (
        loan.borrower.toLowerCase() === acctLower ||
        loan.lender.toLowerCase() === acctLower
      ) {
        loans.push(loan);
      }
    }

    // Pending intents for current epoch
    const pendingLends = state.intents.lends.filter(
      (i) => i.lender.toLowerCase() === acctLower
    );
    const pendingBorrows = state.intents.borrows.filter(
      (i) => i.borrower.toLowerCase() === acctLower
    );

    return c.json(
      serializeBigInts({
        loans,
        pendingIntents: {
          lends: pendingLends,
          borrows: pendingBorrows,
        },
      })
    );
  } catch (err: any) {
    return c.json({ error: err.message }, 401);
  }
});

export default app;
