export type AnnouncementMode = "off" | "polite" | "assertive";

export function announcementRole(
  mode: AnnouncementMode,
): "alert" | "status" | undefined {
  if (mode === "assertive") return "alert";
  if (mode === "polite") return "status";
  return undefined;
}

export interface LiveRegionProps {
  readonly "aria-live": AnnouncementMode | undefined;
  readonly role: string | undefined;
}

/**
 * Pairs a role with aria-live for a region that announces its own updates.
 *
 * `alert` and `status` already imply a live region. Emitting `aria-live`
 * beside them double speaks on some screen readers, and an explicit "off"
 * would silence a role the caller asked for, so exactly one of the two is set.
 */
export function liveRegionProps(
  mode: AnnouncementMode | undefined,
  suppliedRole?: string,
): LiveRegionProps {
  const role = suppliedRole ?? announcementRole(mode ?? "off");
  return { "aria-live": role === undefined ? mode : undefined, role };
}

/**
 * Roles that make an element a live region on their own, so a caller-supplied
 * role counts the same as the `live` prop.
 */
const LIVE_REGION_ROLES = new Set(["alert", "log", "status"]);

/**
 * Reports whether a resolved region announces its own updates.
 *
 * A live region has to be in the DOM before its first message, because a
 * region created together with its text is not announced reliably. A component
 * that owns one reads this to mount an empty shell instead of appearing with
 * its first message. `liveRegionProps` sets exactly one of the pair, so both
 * spellings are read here.
 */
export function announcesUpdates(region: LiveRegionProps): boolean {
  const mode = region["aria-live"];
  if (mode !== undefined) return mode !== "off";
  return region.role !== undefined && LIVE_REGION_ROLES.has(region.role);
}
