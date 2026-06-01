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
  betOnTop: boolean;
  playerCount: number;
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
  betOnTop,
  playerCount,
}: PlayerSeatProps) {
  const folded = handState?.folded ?? false;
  const allIn = handState?.allIn ?? false;
  const cardSize = playerCount <= 4 ? "sm" : "xs";

  const bet = handState?.bet && handState.bet > 0 && (
    <span className="text-base font-mono text-zinc-300">{handState.bet.toLocaleString()}</span>
  );

  const badges = (isDealer || isSmallBlind || isBigBlind) && (
    <div className="flex items-center gap-1.5">
      {isDealer && <span className="text-xs text-zinc-500 font-mono">D</span>}
      {isSmallBlind && <span className="text-xs text-zinc-500 font-mono">SB</span>}
      {isBigBlind && <span className="text-xs text-zinc-500 font-mono">BB</span>}
    </div>
  );

  const card = (
    <div className="flex items-center gap-3 bg-neutral-900 border border-white/[0.06] rounded-full px-4 py-1.5">
      {isActive && <span className="w-2 h-2 rounded-full bg-white shrink-0" />}
      <span className={cn(
        "text-sm truncate max-w-[100px] tracking-wide",
        isCurrentUser ? "text-zinc-400 font-medium" : "text-zinc-500 font-normal",
      )}>
        {player.name}
      </span>
      <span className="text-sm font-mono font-bold text-zinc-300">{player.chips.toLocaleString()}</span>
      {allIn && <span className="text-[9px] text-zinc-600">all in</span>}
    </div>
  );

  const nameChips = card;

  const cards = (
    <div className="flex gap-0.5">
      {Array.from({ length: holeCardCount }).map((_, i) => (
        isCurrentUser && holeCards?.[i]
          ? <PlayingCard key={i} card={holeCards[i]} size={cardSize} />
          : <PlayingCard key={i} faceDown size={cardSize} />
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3",
        folded && "opacity-20",
      )}
    >
      {betOnTop ? (
        <>
          {bet}
          {badges}
          {cards}
          {nameChips}
        </>
      ) : (
        <>
          {nameChips}
          {cards}
          {badges}
          {bet}
        </>
      )}
    </div>
  );
}
