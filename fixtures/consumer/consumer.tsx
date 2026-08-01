/**
 * Compiled against the packed tarball, not against src, so the emitted
 * declarations are what gets type checked. No path mapping applies here.
 */
import { createRef, useRef } from "react";
import {
  Banner,
  Button,
  Checkbox,
  FieldGroup,
  NumberInput,
  PanelRoot,
  RangeInput,
  Select,
  Textarea,
  TextInput,
} from "signalk-nearlcrews-ui";

export function ObjectRefs(): React.JSX.Element {
  const buttonRef = createRef<HTMLButtonElement>();
  const bannerRef = createRef<HTMLDivElement>();
  const fieldsetRef = createRef<HTMLFieldSetElement>();
  const inputRef = createRef<HTMLInputElement>();
  const selectRef = createRef<HTMLSelectElement>();
  const textareaRef = createRef<HTMLTextAreaElement>();
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <PanelRoot ref={rootRef}>
      <Button ref={buttonRef}>Save</Button>
      <Banner ref={bannerRef}>Provider unavailable</Banner>
      <FieldGroup ref={fieldsetRef} legend="Connection" />
      <TextInput ref={inputRef} aria-label="Host" />
      <NumberInput ref={inputRef} aria-label="Port" />
      <RangeInput ref={inputRef} aria-label="Depth" />
      <Select ref={selectRef} aria-label="Source" />
      <Textarea ref={textareaRef} aria-label="Notes" />
      <Checkbox ref={inputRef} label="Enable provider" />
    </PanelRoot>
  );
}

export function CallbackRefs(): React.JSX.Element {
  return (
    <PanelRoot ref={(node) => node?.focus()}>
      <Button ref={(node) => node?.focus()}>Save</Button>
      {/*
        React 19 callback-ref cleanup must type check through the emitted
        declarations. The parameter stays nullable because that is the shape
        RefCallback declares, even though React only passes a node when the
        callback returns a cleanup.
      */}
      <TextInput
        aria-label="Host"
        ref={(node) => {
          node?.setAttribute("data-attached", "true");
          return () => node?.removeAttribute("data-attached");
        }}
      />
    </PanelRoot>
  );
}

/** Optional props must accept a computed undefined under exactOptionalPropertyTypes. */
export function ComputedOptionalProps({
  label,
  nonce,
}: {
  readonly label: string | undefined;
  readonly nonce: string | undefined;
}): React.JSX.Element {
  return (
    <PanelRoot styleNonce={nonce}>
      <Button loadingLabel={label} loading>
        Save
      </Button>
    </PanelRoot>
  );
}

/** Native attributes must still pass through the public prop contracts. */
export function NativeAttributes(): React.JSX.Element {
  return (
    <PanelRoot id="panel" lang="en">
      <Button type="submit" form="settings" name="action" value="save">
        Save
      </Button>
      <TextInput autoComplete="off" maxLength={64} placeholder="host" />
    </PanelRoot>
  );
}
