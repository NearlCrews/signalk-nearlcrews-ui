export type AnnouncementMode = "off" | "polite" | "assertive";

export function announcementRole(
  mode: AnnouncementMode,
): "alert" | "status" | undefined {
  if (mode === "assertive") return "alert";
  if (mode === "polite") return "status";
  return undefined;
}
