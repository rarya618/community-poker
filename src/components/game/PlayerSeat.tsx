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
        "flex flex-col items-center gap-1.5",
        folded && "opacity-40",
        isActive && "drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]",
      )}
    >
      {/* Hole cards */}
      <div className="flex gap-1">
        {Array.from({ length: holeCardCount }).map((_, i) => (
          isCurrentUser && holeCards?.[i]
            ? <PlayingCard key={i} card={holeCards[i]} size="sm" />
            : <PlayingCard key={i} faceDown size="sm" />
        ))}
      </div>

      {/* Player info chip */}
      <div
        className={cn(
          "flex flex-col items-center rounded-xl px-3 py-2 min-w-[90px] border transition-colors",
          isCurrentUser
            ? "bg-green-900/60 border-green-600"
            : "bg-zinc-900/80 border-white/10",
          isActive && "border-green-400",
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white truncate max-w-[80px]">{player.name}</span>
          {isDealer && <span className="text-[10px] bg-white text-black rounded-full px-1 font-bold">D</span>}
          {isSmallBlind && <span className="text-[10px] bg-blue-500 text-white rounded-full px-1 font-bold">SB</span>}
          {isBigBlind && <span className="text-[10px] bg-purple-500 text-white rounded-full px-1 font-bold">BB</span>}
        </div>
        <div className="text-sm font-mono text-yellow-400">{player.chips.toLocaleString()}</div>
        {allIn && <div className="text-[10px] text-orange-400 font-bold">ALL IN</div>}
        {handState?.bet && handState.bet > 0 && (
          <div className="text-[10px] text-zinc-400">bet: {handState.bet}</div>
        )}
      </div>
    </div>
  );
}
