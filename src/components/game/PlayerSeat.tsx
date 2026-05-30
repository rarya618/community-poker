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
        !folded && player.isConnected === false && "opacity-50 grayscale",
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
            : player.isConnected === false
            ? "bg-zinc-900/60 border-red-900/60"
            : "bg-zinc-900/80 border-white/10",
          isActive && "border-green-400",
        )}
      >
        <div className="flex items-center gap-1.5">
          {player.isConnected === false && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Disconnected" />
          )}
          <span className={cn("text-xs font-semibold truncate max-w-[80px]", player.isConnected === false ? "text-zinc-500" : "text-white")}>
            {player.name}
          </span>
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
