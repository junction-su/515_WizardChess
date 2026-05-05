import { PieceType, PieceColor } from '@/app/components/ChessPiece'

export interface Piece {
  type: PieceType
  color: PieceColor
}

export type BoardState = (Piece | null)[][]

export interface GameState {
  board: BoardState
  currentTurn: PieceColor
  lastMove: { from: string; to: string; piece: Piece } | null
  capturedByWhite: Piece[]
  capturedByBlack: Piece[]
  connectionStatus: 'connected' | 'disconnected' | 'syncing'
}

export function squareLabel(col: number, row: number): string {
  return `${'abcdefgh'[col]}${row + 1}`
}

export function pieceLabel(piece: Piece): string {
  const names: Record<PieceType, string> = {
    K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn',
  }
  const colors: Record<PieceColor, string> = { w: 'White', b: 'Black' }
  return `${colors[piece.color]} ${names[piece.type]}`
}

function row(pieces: (Piece | null)[]): (Piece | null)[] {
  return pieces
}

export const INITIAL_BOARD: BoardState = [
  // rank 1 (row index 0, displayed as rank 1 at bottom)
  row([
    { type: 'R', color: 'w' }, { type: 'N', color: 'w' }, { type: 'B', color: 'w' },
    { type: 'Q', color: 'w' }, { type: 'K', color: 'w' }, { type: 'B', color: 'w' },
    { type: 'N', color: 'w' }, { type: 'R', color: 'w' },
  ]),
  // rank 2
  row(Array(8).fill(null).map(() => ({ type: 'P' as PieceType, color: 'w' as PieceColor }))),
  // ranks 3-6 empty
  row(Array(8).fill(null)),
  row(Array(8).fill(null)),
  row(Array(8).fill(null)),
  row(Array(8).fill(null)),
  // rank 7
  row(Array(8).fill(null).map(() => ({ type: 'P' as PieceType, color: 'b' as PieceColor }))),
  // rank 8
  row([
    { type: 'R', color: 'b' }, { type: 'N', color: 'b' }, { type: 'B', color: 'b' },
    { type: 'Q', color: 'b' }, { type: 'K', color: 'b' }, { type: 'B', color: 'b' },
    { type: 'N', color: 'b' }, { type: 'R', color: 'b' },
  ]),
]

export const MOCK_GAME_STATE: GameState = {
  board: INITIAL_BOARD,
  currentTurn: 'w',
  lastMove: null,
  capturedByWhite: [],
  capturedByBlack: [],
  connectionStatus: 'connected',
}
