export interface Card {
    cardNumber: string;
    numbers: (number | null)[];
  }
  
export interface BingoGame {
    filename?: string;
    cards: Card[];
  }