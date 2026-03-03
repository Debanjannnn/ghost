import { state } from "./state.js";

export function getCreditScore(user: string): number {
  return state.creditScores.get(user.toLowerCase()) ?? 100;
}

export function recordRepayment(user: string): void {
  const u = user.toLowerCase();
  const current = state.creditScores.get(u) ?? 100;
  state.creditScores.set(u, Math.min(current + 10, 200));
}

export function recordDefault(user: string): void {
  const u = user.toLowerCase();
  const current = state.creditScores.get(u) ?? 100;
  state.creditScores.set(u, Math.max(current - 20, 0));
}
