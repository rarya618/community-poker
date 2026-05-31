import { Player, PlayerHandState } from "@/lib/poker/types";
import { Card as CardType } from "@/lib/poker/deck";
import { PlayingCard } from "./Card";
import { cn } from "@/lib/utils";

interface PlayerSeatProps {
  player: Player;
  handState?: PlayerHandState;
  holeCards?: CardType[];
  isActive: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isCurrentUser: boolean;
  holeCardCount: number;
}

export function PlayerSeat({
  player,
  handState,
  holeCards,
  isActive,
  isDealer,
  isSmallBlind,
  isBigBlind,
  isCurrentUser,
  holeCardCount,
}: PlayerSeatProps) {
  const folded = handState?.folded ?? false;
  const allIn = handState?.allIn ?? false;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1",
        folded && "opacity-20",
        !folded && player.isConnected === false && "opacity-35",
      )}
    >
      {handState?.bet && handState.bet > 0 && (
        <span className="text-sm font-mono text-zinc-300 mb-1">{handState.bet.toLocaleString()}</span>
      )}

      <div className="flex gap-0.5">
        {Array.from({ length: holeCardCount }).map((_, i) => (
          isCurrentUser && holeCards?.[i]
            ? <PlayingCard key={i} card={holeCards[i]} size="sm" />
            : <PlayingCard key={i} faceDown size="sm" />
        ))}
      </div>

      <div className="flex flex-col items-center gap-0.5 mt-2">
        <div className="flex items-center gap-1.5">
          {isActive && <span className="w-1 h-1 rounded-full bg-white shrink-0" />}
          <span className={cn(
            "text-xs truncate max-w-[80px] tracking-wide",
            isCurrentUser ? "text-white font-medium" : "text-zinc-300 font-normal",
            player.isConnected === false && "text-zinc-600",
          )}>
            {player.name}
          </span>
          <span className="text-[11px] font-mono text-zinc-500">{player.chips.toLocaleString()}</span>
          {isDealer && <span className="text-[9px] text-zinc-600 font-mono">D</span>}
          {isSmallBlind && <span className="text-[9px] text-zinc-600 font-mono">SB</span>}
          {isBigBlind && <span className="text-[9px] text-zinc-600 font-mono">BB</span>}
        </div>
        {allIn && <span className="text-[9px] text-zinc-600">all in</span>}
      </div>
    </div>
  );
}
