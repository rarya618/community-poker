import { Card, Rank, rankValue } from "./deck";

export type HandRank =
  | "Royal Flush"
  | "Straight Flush"
  | "Four of a Kind"
  | "Full House"
  | "Flush"
  | "Straight"
  | "Three of a Kind"
  | "Two Pair"
  | "Pair"
  | "High Card";

export interface HandResult {
  rank: HandRank;
  score: number; // higher = better
  cards: Card[];  // best 5-card hand
  description: string;
}

const RANK_ORDER: Record<string, number> = {
  "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14,
};

function cardRank(c: Card): number {
  return RANK_ORDER[c[0]];
}

function cardSuit(c: Card): string {
  return c[1];
}

// Evaluate best 5-card hand from an array of 5+ cards
export function evaluateBest(cards: Card[]): HandResult {
  if (cards.length === 5) return evaluate5(cards);
  // Generate all combinations of 5 from cards
  let best: HandResult | null = null;
  const combos = combinations(cards, 5);
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || result.score > best.score) best = result;
  }
  return best!;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => cardRank(b) - cardRank(a));
  const ranks = sorted.map(cardRank);
  const suits = sorted.map(cardSuit);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(ranks);

  const groups = groupByRank(ranks);
  const counts = Object.values(groups).sort((a, b) => b - a);

  if (isFlush && isStraight) {
    const score = ranks[0] === 14 && ranks[1] === 13
      ? 9000000 + scoreCards(ranks)
      : 8000000 + scoreCards(ranks);
    return {
      rank: ranks[0] === 14 && ranks[1] === 13 ? "Royal Flush" : "Straight Flush",
      score,
      cards: sorted,
      description: ranks[0] === 14 && ranks[1] === 13 ? "Royal Flush" : `Straight Flush, ${rankName(ranks[0])} high`,
    };
  }
  if (counts[0] === 4) {
    return { rank: "Four of a Kind", score: 7000000 + scoreCards(ranks), cards: sorted, description: `Four of a Kind, ${rankName(groupKey(groups, 4))}s` };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: "Full House", score: 6000000 + scoreCards(ranks), cards: sorted, description: `Full House, ${rankName(groupKey(groups, 3))}s full of ${rankName(groupKey(groups, 2))}s` };
  }
  if (isFlush) {
    return { rank: "Flush", score: 5000000 + scoreCards(ranks), cards: sorted, description: `Flush, ${rankName(ranks[0])} high` };
  }
  if (isStraight) {
    return { rank: "Straight", score: 4000000 + scoreCards(ranks), cards: sorted, description: `Straight, ${rankName(ranks[0])} high` };
  }
  if (counts[0] === 3) {
    return { rank: "Three of a Kind", score: 3000000 + scoreCards(ranks), cards: sorted, description: `Three of a Kind, ${rankName(groupKey(groups, 3))}s` };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.entries(groups).filter(([, v]) => v === 2).map(([k]) => Number(k)).sort((a, b) => b - a);
    return { rank: "Two Pair", score: 2000000 + scoreCards(ranks), cards: sorted, description: `Two Pair, ${rankName(pairs[0])}s and ${rankName(pairs[1])}s` };
  }
  if (counts[0] === 2) {
    return { rank: "Pair", score: 1000000 + scoreCards(ranks), cards: sorted, description: `Pair of ${rankName(groupKey(groups, 2))}s` };
  }
  return { rank: "High Card", score: scoreCards(ranks), cards: sorted, description: `${rankName(ranks[0])} high` };
}

function checkStraight(ranks: number[]): boolean {
  const sorted = [...new Set(ranks)].sort((a, b) => b - a);
  if (sorted.length < 5) return false;
  // Wheel: A-2-3-4-5
  if (sorted[0] === 14 && sorted[1] === 5 && sorted[2] === 4 && sorted[3] === 3 && sorted[4] === 2) return true;
  for (let i = 0; i < sorted.length - 4; i++) {
    if (sorted[i] - sorted[i + 4] === 4) return true;
  }
  return false;
}

function groupByRank(ranks: number[]): Record<number, number> {
  const groups: Record<number, number> = {};
  for (const r of ranks) groups[r] = (groups[r] || 0) + 1;
  return groups;
}

function groupKey(groups: Record<number, number>, count: number): number {
  return Number(Object.entries(groups).find(([, v]) => v === count)?.[0] ?? 0);
}

function scoreCards(ranks: number[]): number {
  return ranks.reduce((acc, r, i) => acc + r * Math.pow(15, 4 - i), 0);
}

const RANK_NAMES: Record<number, string> = {
  2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"Ten",11:"Jack",12:"Queen",13:"King",14:"Ace",
};

function rankName(r: number): string {
  return RANK_NAMES[r] ?? String(r);
}

// Omaha: player must use exactly 2 hole cards + 3 community cards
export function evaluateOmaha(holeCards: Card[], communityCards: Card[]): HandResult {
  const holeCombos = combinations(holeCards, 2);
  const boardCombos = combinations(communityCards, 3);
  let best: HandResult | null = null;
  for (const h of holeCombos) {
    for (const b of boardCombos) {
      const result = evaluate5([...h, ...b]);
      if (!best || result.score > best.score) best = result;
    }
  }
  return best!;
}
