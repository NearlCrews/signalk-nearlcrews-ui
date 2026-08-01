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
