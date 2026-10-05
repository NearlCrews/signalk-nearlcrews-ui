/**
 * Starts a timer and returns what cancels it, which is the shape an effect
 * returns, so an effect that only waits is one line.
 *
 * The ambient timer is deliberate: a wait of this kind belongs to no node, so
 * there is no owning window to read the timer from. A component that does
 * have one, such as the toast host, reads its own.
 */
export function startTimer(run: () => void, delayMs: number): () => void {
  const timer = setTimeout(run, delayMs);
  return () => {
    clearTimeout(timer);
  };
}
