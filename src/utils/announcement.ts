export type AnnouncementMode = "off" | "polite" | "assertive";

export function announcementRole(
  mode: AnnouncementMode,
): "alert" | "status" | undefined {
  if (mode === "assertive") return "alert";
  if (mode === "polite") return "status";
  return undefined;
}

/**
 * The attribute pair an announcing element carries. Named for the attributes
 * rather than for the props, because `LiveRegionProps` is the public prop type
 * of the `LiveRegion` component and the two are not the same shape.
 */
export interface LiveRegionAttributes {
  readonly "aria-live": AnnouncementMode | undefined;
  readonly role: string | undefined;
}

/**
 * Roles that make an element a live region on their own, so a caller-supplied
 * role counts the same as the `live` prop.
 */
const LIVE_REGION_ROLES = new Set(["alert", "log", "status"]);

/**
 * Pairs a role with aria-live for a region that announces its own updates.
 *
 * `alert`, `log`, and `status` already announce, so `aria-live` is left off
 * beside them: the pairing double speaks on some screen readers, and an
 * explicit "off" would silence a role the caller asked for. Every other role
 * announces nothing on its own, a landmark or a grouping among them, so the
 * requested mode still reaches the element rather than being dropped for a
 * role that cannot carry it. Neither is set when no mode and no role is given.
 */
export function liveRegionProps(
  mode: AnnouncementMode | undefined,
  suppliedRole?: string,
): LiveRegionAttributes {
  const role = suppliedRole ?? announcementRole(mode ?? "off");
  const roleAnnounces = role !== undefined && LIVE_REGION_ROLES.has(role);
  return { "aria-live": roleAnnounces ? undefined : mode, role };
}

/**
 * Reports whether a resolved region announces its own updates.
 *
 * A live region has to be in the DOM before its first message, because a
 * region created together with its text is not announced reliably. A component
 * that owns one reads this to mount an empty shell instead of appearing with
 * its first message. A region states its mode through either half of the
 * pair, so both spellings are read here.
 */
export function announcesUpdates(region: LiveRegionAttributes): boolean {
  const mode = region["aria-live"];
  if (mode !== undefined) return mode !== "off";
  return region.role !== undefined && LIVE_REGION_ROLES.has(region.role);
}

/** A resolved region together with what its owner should render right now. */
export interface AnnouncingRegion {
  /** Whether the region announces its own updates. */
  readonly announcing: boolean;
  /** The role and aria-live pair the element carries. */
  readonly attributes: LiveRegionAttributes;
  /** Whether the element must render as an empty shell for now. */
  readonly silent: boolean;
}

/**
 * Resolves a region and decides whether its owner renders an empty shell.
 *
 * An announcing element mounts its region before its content, because a live
 * region created together with its message is not announced reliably, and it
 * renders nothing inside until there is something to say: no tone glyph, no
 * dot, no unit standing where there is no message yet. The stylesheet takes an
 * empty region out of the flow rather than out of the accessibility tree.
 */
export function resolveAnnouncingRegion(
  mode: AnnouncementMode | undefined,
  suppliedRole: string | undefined,
  hasContent: boolean,
): AnnouncingRegion {
  const attributes = liveRegionProps(mode, suppliedRole);
  const announcing = announcesUpdates(attributes);
  return { announcing, attributes, silent: announcing && !hasContent };
}
