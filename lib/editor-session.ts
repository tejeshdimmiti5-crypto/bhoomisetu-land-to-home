
/** Check whether an async operation still belongs to the current editor session. */
export function isEditorSessionCurrent(
  capturedGeneration: number,
  currentGeneration: number,
): boolean {
  return capturedGeneration === currentGeneration;
}
