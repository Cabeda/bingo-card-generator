import { CardId, GameId } from './types';

export interface Card {
  cardTitle: CardId;
  cardNumber: number;
  numbers: (number | null)[];
}

export interface Game {
  filename: GameId;
  cards: Card[];
}