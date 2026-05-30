export type Suit = "s" | "h" | "d" | "c";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
export type Card = `${Rank}${Suit}`;

const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
const SUITS: Suit[] = ["s","h","d","c"];

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) for (const suit of SUITS) deck.push(`${rank}${suit}`);
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function rankValue(card: Card): number {
  return RANKS.indexOf(card[0] as Rank);
}
