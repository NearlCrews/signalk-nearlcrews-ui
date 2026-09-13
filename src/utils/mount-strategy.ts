/**
 * What a surface does with content it is hiding.
 *
 * Under `"retain"` the children stay mounted and hidden, so their state, their
 * refs, and their effects survive; under `"unmount"` they leave the tree and
 * their state goes with them. `CollapsibleSection` names a third strategy of
 * its own and gives `"retain"` a stronger meaning, because it retains the
 * subtree inside React `Activity`, which also runs every effect's cleanup
 * while the section is shut.
 */
export type MountStrategy = "retain" | "unmount";
