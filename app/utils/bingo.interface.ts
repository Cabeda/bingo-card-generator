export interface Card {
  cardNumber: string;
  numbers: (number | null)[];
}

export interface Game {
  filename: string;
  cards: Card[];
}