"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatTokenAmount } from "@/lib/pool-utils";
import { COINS } from "@/lib/constants";

interface ProfilePositionsProps {
  lendSlots: any[];
  borrowIntents: any[];
  activeLoans: any[];
}

function tokenSymbol(address: string): string {
  const coin = COINS.find((c) => c.address.toLowerCase() === address?.toLowerCase());
  return coin?.symbol ?? "???";
}

const ProfilePositions = ({ lendSlots, borrowIntents, activeLoans }: ProfilePositionsProps) => {
  const hasAny = lendSlots.length > 0 || borrowIntents.length > 0 || activeLoans.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">
            No active positions. Start lending or borrowing to see them here.
          </p>
        ) : (
          <>
            {lendSlots.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  Lend Intents ({lendSlots.length})
                </p>
                {lendSlots.map((slot: any, i: number) => (
                  <div
                    key={slot.slotId ?? i}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {formatTokenAmount(slot.amount ?? "0")} {tokenSymbol(slot.token)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {slot.slotId?.slice(0, 8)}...
                      </p>
                    </div>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                      {slot.status ?? "pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {borrowIntents.length > 0 && (
              <>
                {lendSlots.length > 0 && <Separator />}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Borrow Intents ({borrowIntents.length})
                  </p>
                  {borrowIntents.map((intent: any, i: number) => (
                    <div
                      key={intent.intentId ?? i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {formatTokenAmount(intent.amount ?? "0")} {tokenSymbol(intent.token)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {intent.intentId?.slice(0, 8)}...
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                        {intent.status ?? "pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeLoans.length > 0 && (
              <>
                {(lendSlots.length > 0 || borrowIntents.length > 0) && <Separator />}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                    Active Loans ({activeLoans.length})
                  </p>
                  {activeLoans.map((loan: any, i: number) => (
                    <div
                      key={loan.loanId ?? i}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {formatTokenAmount(loan.amount ?? "0")} {tokenSymbol(loan.token)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rate: {loan.rate ? `${(Number(loan.rate) / 100).toFixed(2)}%` : "N/A"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[#e2a9f1] border-[#e2a9f1]/30">
                        {loan.status ?? "active"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfilePositions;
