/**
 * Concurrency helpers for the release and tool scripts. check-release-ci.mjs
 * runs before the verify job installs dependencies, and the pinned-tools job
 * installs nothing, so this module imports nothing.
 */

/**
 * Awaits every promise together, then rejects with the first failure in input
 * order, as sequential awaits would, so the error a script reports does not
 * depend on which request happened to fail first.
 */
export async function settleInOrder(promises) {
  const settled = await Promise.allSettled(promises);
  const failed = settled.find((result) => result.status === "rejected");
  if (failed !== undefined) throw failed.reason;
  return settled.map((result) => result.value);
}
