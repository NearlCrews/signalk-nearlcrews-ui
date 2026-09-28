import type { ReactNode } from "react";

import type { AnnouncementMode } from "../utils/announcement.js";
import { hasReactContent } from "../utils/react-node.js";
import type { StatusTone } from "../utils/tone.js";
import { LiveRegion } from "./LiveRegion.js";
import { ToneSpeech } from "./ToneMark.js";

export interface ToneEchoRegionProps {
  readonly announceKey?: string | number | undefined;
  /** What the region speaks after the tone, or nothing while there is none. */
  readonly children: ReactNode;
  /** The owning block's region class, which its empty-shell rule reads. */
  readonly className: string;
  /** Whether the content the owner mounts with is held for a beat. */
  readonly defers: boolean;
  readonly live: AnnouncementMode | undefined;
  readonly role?: string | undefined;
  readonly settleMs: number | undefined;
  readonly tone: StatusTone;
  readonly toneLabel: string | undefined;
}

/**
 * The visually hidden region a settling StatusIndicator or Metric speaks
 * through, while its visible copy changes at once. It carries the tone's
 * sentence ahead of the content, so the tone is spoken once, here, and the
 * visible glyph stays decorative. The region owns the first-message hold, the
 * settle wait, and the repeat beat.
 */
export function ToneEchoRegion({
  announceKey,
  children,
  className,
  defers,
  live,
  role,
  settleMs,
  tone,
  toneLabel,
}: ToneEchoRegionProps): React.JSX.Element {
  const hasContent = hasReactContent(children);
  return (
    <LiveRegion
      as="span"
      className={className}
      announceKey={announceKey}
      deferFirstMessage={defers && hasContent}
      live={live}
      role={role}
      settleMs={settleMs}
      message={
        hasContent ? (
          <>
            <ToneSpeech tone={tone} toneLabel={toneLabel} />
            {children}
          </>
        ) : null
      }
    />
  );
}
