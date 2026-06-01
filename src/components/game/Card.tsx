import { Card as CardType } from "@/lib/poker/deck";
import { cn } from "@/lib/utils";

const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLORS: Record<string, string> = { s: "text-zinc-800", h: "text-red-500", d: "text-red-500", c: "text-zinc-800" };
const RANK_DISPLAY: Record<string, string> = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_STYLES = {
  xs: { width: "4.5vh", height: "6.5vh", fontSize: "1.2vh" },
  sm: { width: "7vh",   height: "10vh",  fontSize: "1.8vh" },
  md: { width: "8.5vh", height: "12vh",  fontSize: "2.2vh" },
  lg: { width: "9vh",   height: "13vh",  fontSize: "2.4vh" },
};

export function PlayingCard({ card, faceDown, size = "md", className }: CardProps) {
  const style = SIZE_STYLES[size];
  const base = "rounded select-none font-bold flex flex-col justify-between p-1";

  if (faceDown || !card) {
    return (
      <div className={cn(base, "bg-neutral-800 border border-neutral-700", className)} style={style} />
    );
  }

  const rank = card[0];
  const suit = card[1];
  const rankDisplay = RANK_DISPLAY[rank] ?? rank;
  const suitSymbol = SUIT_SYMBOLS[suit] ?? suit;
  const color = SUIT_COLORS[suit] ?? "text-zinc-800";

  return (
    <div className={cn(base, "bg-white border border-zinc-100", className)} style={style}>
      <div className={cn("leading-none", color)}>
        <div>{rankDisplay}</div>
        <div className="text-[1.2em]">{suitSymbol}</div>
      </div>
      <div className={cn("self-end rotate-180 leading-none", color)}>
        <div>{rankDisplay}</div>
        <div className="text-[1.2em]">{suitSymbol}</div>
      </div>
    </div>
  );
}
