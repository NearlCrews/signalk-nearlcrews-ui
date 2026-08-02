/**
 * Announces a resolved tone label to assistive technology as one sentence.
 * Shared by every tone-badged component so the announcement wording cannot
 * drift per component. Render nothing when there is no label to announce.
 */
export function ToneAnnouncement({
  label,
}: {
  readonly label: string | undefined;
}): React.JSX.Element | null {
  if (label === undefined) return null;
  return <span className="snui-visually-hidden">{label}. </span>;
}
