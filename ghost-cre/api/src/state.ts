import type { LendIntent, BorrowIntent, Loan, Transaction } from "./types.js";

class State {
  // user (lowercase) -> token (lowercase) -> balance
  balances: Map<string, Map<string, bigint>> = new Map();

  // current epoch buffer
  intents: { lends: LendIntent[]; borrows: BorrowIntent[] } = {
    lends: [],
    borrows: [],
  };

  // previous epoch (double buffer)
  previousIntents: { lends: LendIntent[]; borrows: BorrowIntent[] } = {
    lends: [],
    borrows: [],
  };

  activeLoans: Map<string, Loan> = new Map();
  creditScores: Map<string, number> = new Map();
  shieldedAddresses: Map<string, string> = new Map(); // shielded -> real
  usedTickets: Set<string> = new Set();
  transactions: Transaction[] = [];
  currentEpoch: number = 1;
  epochStatus: "collecting" | "settling" = "collecting";

  // external API tx IDs already credited (prevent double-credit)
  verifiedTransfers: Set<string> = new Set();

  creditBalance(user: string, token: string, amount: bigint): void {
    const u = user.toLowerCase();
    const t = token.toLowerCase();
    if (!this.balances.has(u)) this.balances.set(u, new Map());
    const userMap = this.balances.get(u)!;
    userMap.set(t, (userMap.get(t) ?? 0n) + amount);
  }

  debitBalance(user: string, token: string, amount: bigint): boolean {
    const bal = this.getBalance(user, token);
    if (bal < amount) return false;
    const u = user.toLowerCase();
    const t = token.toLowerCase();
    this.balances.get(u)!.set(t, bal - amount);
    return true;
  }

  getBalance(user: string, token: string): bigint {
    const u = user.toLowerCase();
    const t = token.toLowerCase();
    return this.balances.get(u)?.get(t) ?? 0n;
  }

  getUserBalances(user: string): Map<string, bigint> {
    return this.balances.get(user.toLowerCase()) ?? new Map();
  }

  addLendIntent(intent: LendIntent): void {
    this.intents.lends.push(intent);
  }

  addBorrowIntent(intent: BorrowIntent): void {
    this.intents.borrows.push(intent);
  }

  swapBuffers(): void {
    this.previousIntents = {
      lends: [...this.intents.lends],
      borrows: [...this.intents.borrows],
    };
    this.intents = { lends: [], borrows: [] };
  }

  advanceEpoch(): void {
    this.currentEpoch++;
    this.epochStatus = "collecting";
  }

  addTransaction(tx: Transaction): void {
    this.transactions.push(tx);
  }

  recordPoolDeposit(user: string, token: string, amount: bigint, txId: string): boolean {
    if (this.verifiedTransfers.has(txId)) return false;
    this.verifiedTransfers.add(txId);
    this.creditBalance(user, token, amount);
    return true;
  }
}

export const state = new State();
