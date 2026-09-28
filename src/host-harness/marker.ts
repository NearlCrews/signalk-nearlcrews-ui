/**
 * The attribute the host harness sets on the frame it renders and the script
 * it injects, and the brand it gives the share scope it builds. Each harness
 * export therefore carries the string, which is how `snui-check-consumer`
 * finds the harness in a panel remote: it belongs in a consumer's browser test
 * fixture and never in the panel the Signal K Admin loads.
 */
export const HOST_HARNESS_MARKER = "data-snui-host-harness";
