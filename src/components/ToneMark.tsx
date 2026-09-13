import { classNames } from "../utils/class-names.js";
import { resolveBundledLabel } from "../utils/labels.js";
import { usePanelLabels } from "../utils/panel-labels.js";
import {
  isSemanticTone,
  type StatusTone,
  TONE_GLYPHS,
  TONE_LABELS,
} from "../utils/tone.js";

/**
 * Sentence punctuation a resolved tone label may already end with. The mark is
 * read straight into whatever text follows it, so the label needs a stop, but a
 * consumer whose own label ends in one must not be announced as "Caution!.".
 */
const SENTENCE_ENDINGS = new Set([".", "!", "?", "…"]);

function toneSentence(label: string): string {
  return SENTENCE_ENDINGS.has(label.slice(-1)) ? label : `${label}.`;
}

export interface ToneMarkProps {
  /** Class for the decorative glyph element, normally the block's own glyph class. */
  readonly className?: string | undefined;
  readonly tone: StatusTone;
  /** Accessible name announced for the tone. Blank falls back to the default name. */
  readonly toneLabel?: string | undefined;
}

/**
 * The tone glyph and its announcement, rendered as one pair so every
 * tone-badged component shows and speaks a tone the same way. The glyph is
 * decorative and the visually hidden sentence carries the meaning, so place
 * the mark inside whatever live region or text the component announces. The
 * announcement wording lives here alone so it cannot drift per component.
 * Neutral carries no meaning and renders nothing, including any `toneLabel`.
 */
export function ToneMark({
  className,
  tone,
  toneLabel,
}: ToneMarkProps): React.JSX.Element | null {
  const bundledToneLabels = usePanelLabels()?.tone;
  if (!isSemanticTone(tone)) return null;

  const label = resolveBundledLabel(
    toneLabel,
    bundledToneLabels?.[tone],
    TONE_LABELS[tone],
  );

  return (
    <>
      <span
        className={classNames("snui-tone-glyph", className)}
        aria-hidden="true"
      >
        {TONE_GLYPHS[tone]}
      </span>
      <span className="snui-visually-hidden">{toneSentence(label)} </span>
    </>
  );
}
