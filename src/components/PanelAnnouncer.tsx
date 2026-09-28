import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { messageLogAttributes } from "../utils/announcement.js";
import {
  type PanelAnnounce,
  PanelAnnouncerProvider,
} from "../utils/announcer.js";
import { trimmedText } from "../utils/labels.js";
import { useFirstMessageHold } from "../utils/repeat-announcement.js";

/**
 * How long a message stays in its region. Long enough for every reader to
 * have queued it, short enough that browse mode does not meet an old status
 * as the panel's first line; it is the figure React Aria's own announcer
 * retires its messages at.
 */
const MESSAGE_LIFETIME_MS = 7_000;

interface QueuedMessage {
  readonly assertive: boolean;
  /** Epoch milliseconds at which the message leaves its region. */
  readonly expiresAt: number;
  readonly id: number;
  readonly text: string;
}

const NO_MESSAGES: readonly QueuedMessage[] = [];

/**
 * One of the shell's two regions. It carries the marker React Aria spares
 * when a modal overlay hides the rest of the page, as React Aria's own
 * announcer does, so a message spoken while a dialog, menu, or popover is open
 * is still heard. The exact value matters: a node added after the overlay
 * opened is spared only when the marker reads "true". The toast host is
 * spared through a different marker, `data-react-aria-top-layer`.
 *
 * The region is a message log, as the toast host's are: not atomic, so of the
 * messages still in it for their seven seconds, only the one just added is
 * read.
 */
function AnnouncerRegion({
  live,
  messages,
}: {
  readonly live: "assertive" | "polite";
  readonly messages: readonly QueuedMessage[];
}): React.JSX.Element {
  return (
    <div {...messageLogAttributes(live)} data-live-announcer="true">
      {/*
       * One node per message: an added node is announced even when its words
       * repeat the last message, and two messages from one handler are both
       * added rather than the second replacing the first.
       */}
      {messages.map((message) => (
        <div key={message.id}>{message.text}</div>
      ))}
    </div>
  );
}

/**
 * The panel's two live regions, mounted with the shell and empty until there
 * is something to say, because a region created together with its first
 * message is not announced reliably. A panel reaches them through
 * `usePanelAnnouncer` instead of mounting a region of its own beside each
 * message.
 */
export function PanelAnnouncer({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const [messages, setMessages] =
    useState<readonly QueuedMessage[]>(NO_MESSAGES);
  // The regions exist empty for one beat before anything is shown in them, so
  // a message spoken from a mount effect does not arrive inside the commit
  // that created them.
  const holding = useFirstMessageHold(true);
  const lastId = useRef(0);

  const announce = useCallback<PanelAnnounce>((message, options) => {
    const text = trimmedText(message);
    if (text === "") return;
    lastId.current += 1;
    const queued: QueuedMessage = {
      assertive: options?.assertive === true,
      expiresAt: Date.now() + MESSAGE_LIFETIME_MS,
      id: lastId.current,
      text,
    };
    setMessages((current) => [...current, queued]);
  }, []);

  // Every message lives equally long, so they leave in the order they came
  // and one timer, armed for the oldest, retires the whole queue in turn.
  const oldest = messages[0];
  useEffect(() => {
    if (oldest === undefined) return undefined;
    const timer = setTimeout(
      () => {
        setMessages((current) =>
          current.filter((message) => message !== oldest),
        );
      },
      Math.max(0, oldest.expiresAt - Date.now()),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [oldest]);

  const shown = holding ? NO_MESSAGES : messages;
  return (
    <PanelAnnouncerProvider value={announce}>
      <AnnouncerRegion
        live="polite"
        messages={shown.filter((message) => !message.assertive)}
      />
      <AnnouncerRegion
        live="assertive"
        messages={shown.filter((message) => message.assertive)}
      />
      {children}
    </PanelAnnouncerProvider>
  );
}
