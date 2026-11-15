export const PROCES_JUSTICE_TAG = "procès / justice";

export function isProcesJustice(work) {
  return (work.tags || []).includes(PROCES_JUSTICE_TAG);
}
