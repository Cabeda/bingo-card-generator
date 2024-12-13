export interface Card {
  cardTitle: string;
  cardNumber: number;
  numbers: (number | null)[];
}

export interface Game {
  filename: string;
  cards: Card[];
}