import { Card as CardType } from "@/lib/poker/deck";
import { cn } from "@/lib/utils";

const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLORS: Record<string, string> = { s: "text-zinc-900", h: "text-red-600", d: "text-red-600", c: "text-zinc-900" };
const RANK_DISPLAY: Record<string, string> = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PlayingCard({ card, faceDown, size = "md", className }: CardProps) {
  const sizes = { sm: "w-9 h-13 text-xs", md: "w-14 h-20 text-base", lg: "w-20 h-28 text-xl" };
  const base = `${sizes[size]} rounded-lg border select-none font-bold flex flex-col justify-between p-1 shadow-md`;

  if (faceDown || !card) {
    return (
      <div className={cn(base, "bg-blue-900 border-blue-700 items-center justify-center", className)}>
        <div className="text-blue-500 text-2xl">✦</div>
      </div>
    );
  }

  const rank = card[0];
  const suit = card[1];
  const rankDisplay = RANK_DISPLAY[rank] ?? rank;
  const suitSymbol = SUIT_SYMBOLS[suit] ?? suit;
  const color = SUIT_COLORS[suit] ?? "text-zinc-900";

  return (
    <div className={cn(base, "bg-white border-zinc-200", className)}>
      <div className={cn("leading-none", color)}>
        <div>{rankDisplay}</div>
        <div className="text-[0.7em]">{suitSymbol}</div>
      </div>
      <div className={cn("self-end rotate-180 leading-none", color)}>
        <div>{rankDisplay}</div>
        <div className="text-[0.7em]">{suitSymbol}</div>
      </div>
    </div>
  );
}
