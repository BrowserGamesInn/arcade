/** Item colour — the two states items can be in; 'a' is raw, 'b' is processed. */
export type ItemColor = 'a' | 'b';

/** A machine cell transforms items of one colour to another as they pass through. */
export interface MachineCell {
  input: ItemColor;
  output: ItemColor;
}

/** A sink cell accepts items of a specific colour and counts them toward the win condition. */
export interface SinkCell {
  requiredColor: ItemColor;
  required: number;
}

/** Mutable runtime state for a sink. */
export interface SinkState {
  col: number;
  row: number;
  requiredColor: ItemColor;
  required: number;
  consumed: number;
}

/** Returns true when every sink has received at least its required item count. */
export function isWon(states: readonly SinkState[]): boolean {
  return states.length > 0 && states.every(s => s.consumed >= s.required);
}

export type MachineLookup = (col: number, row: number) => MachineCell | undefined;
export type SinkLookup = (col: number, row: number) => SinkCell | undefined;
