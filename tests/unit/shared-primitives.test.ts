import { createElement, type KeyboardEvent, type MouseEvent } from "react";
import { describe, expect, it, type Mock, vi } from "vitest";
import {
  bodyEdgeMarginRules,
  CONTROL_LABEL_DECLARATIONS,
  CONTROL_ROW_DECLARATIONS,
  FIELD_DESCRIPTION_DECLARATIONS,
  FIELD_STACK_DECLARATIONS,
  FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS,
  FORCED_COLORS_INVALID_DECLARATIONS,
  SURFACE_DECLARATIONS,
} from "../../src/styles/fragments.js";
import { STYLE_MODULES } from "../../src/styles/modules.js";
import { PANEL_STYLES } from "../../src/styles/root-sheet.js";
import { toneDescendantColorRules } from "../../src/styles/tone-rules.js";
import {
  BUTTON_ACTIVATION_KEYS,
  blockedActivationProps,
  CHECKBOX_ACTIVATION_KEYS,
  resolveAriaDisabled,
} from "../../src/utils/activation.js";
import { resolveAnnouncingRegion } from "../../src/utils/announcement.js";
import { landmarkLabel, requireAccessibleName } from "../../src/utils/aria.js";
import { isRightToLeft } from "../../src/utils/direction.js";
import { once } from "../../src/utils/document-registry.js";
import { createEmitter } from "../../src/utils/emitter.js";
import { resolveFieldRegions } from "../../src/utils/field-error.js";
import {
  forwardsFieldControlProps,
  markForwardsFieldControlProps,
} from "../../src/utils/field-forwarding.js";
import {
  focusedElement,
  focusPanelRoot,
  revealAndFocus,
  revealElement,
} from "../../src/utils/focus.js";
import { observeFormReset } from "../../src/utils/form-reset.js";
import {
  formatRelativeAge,
  RELATIVE_AGE_EN,
} from "../../src/utils/format-relative-age.js";
import { resolveFreshness } from "../../src/utils/freshness.js";
import {
  DEFAULT_HIDE_LABEL,
  DEFAULT_SHOW_LABEL,
  hasText,
  trimmedText,
} from "../../src/utils/labels.js";
import { requireNonEmptyUniqueOptions } from "../../src/utils/options.js";
import { definedProps } from "../../src/utils/props.js";
import {
  REACHABILITY_STATUS,
  resolveReachability,
} from "../../src/utils/reachability.js";
import { racDomProps } from "../../src/utils/react-aria.js";
import {
  plainReactNodeText,
  reactNodeText,
  resolveLabelContent,
} from "../../src/utils/react-node.js";
import {
  REACT_FLOOR_LABEL,
  reactBelowFloor,
  reactFloorMessage,
} from "../../src/utils/react-version.js";
import { nextRovingIndex } from "../../src/utils/roving.js";
import {
  resolveSelectAllState,
  selectAllTarget,
} from "../../src/utils/select-all.js";
import { formatCount, joinList } from "../../src/utils/text.js";
import { SPACE_SCALE } from "../../src/utils/variants.js";
import { windowGlobal } from "../../src/utils/window-global.js";

/** The rules of one installed style module, by its id. */
function moduleStyles(id: string): string {
  const module = STYLE_MODULES.find((candidate) => candidate.id === id);
  if (module === undefined) throw new Error(`No style module named ${id}.`);
  return module.styles;
}

/** A pointer event with only the two methods a guard touches. */
/**
 * A stub event beside the two spies it carries, so a spec asserts on the
 * spies rather than on the event's own methods, which read as unbound.
 */
interface EventStub<E> {
  readonly asEvent: E;
  readonly preventDefault: Mock<() => void>;
  readonly stopPropagation: Mock<() => void>;
}

function clickEvent(): EventStub<MouseEvent<HTMLButtonElement>> {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();
  return {
    asEvent: {
      preventDefault,
      stopPropagation,
    } as unknown as MouseEvent<HTMLButtonElement>,
    preventDefault,
    stopPropagation,
  };
}

/** A key event with only the members a guard touches. */
function keyEvent(key: string): EventStub<KeyboardEvent<HTMLButtonElement>> {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();
  return {
    asEvent: {
      key,
      preventDefault,
      stopPropagation,
    } as unknown as KeyboardEvent<HTMLButtonElement>,
    preventDefault,
    stopPropagation,
  };
}

describe("definedProps", () => {
  it("drops the undefined entries and keeps every other value", () => {
    expect(
      definedProps({
        checked: false,
        count: 0,
        id: undefined,
        name: "depth",
        parent: null,
      }),
    ).toEqual({ checked: false, count: 0, name: "depth", parent: null });
  });

  it("returns an empty object when nothing is set", () => {
    expect(definedProps({ id: undefined })).toEqual({});
  });
});

describe("requireNonEmptyUniqueOptions", () => {
  it("accepts a non-empty array of distinct values", () => {
    expect(() =>
      requireNonEmptyUniqueOptions(
        [{ value: "port" }, { value: "starboard" }],
        "SegmentedControl",
      ),
    ).not.toThrow();
  });

  it("refuses an empty array, naming the component", () => {
    expect(() => requireNonEmptyUniqueOptions([], "CheckboxGroup")).toThrow(
      "CheckboxGroup requires at least one option.",
    );
  });

  it("refuses a repeated value, naming the duplicate", () => {
    expect(() =>
      requireNonEmptyUniqueOptions(
        [{ value: "port" }, { value: "port" }],
        "CheckboxGroup",
      ),
    ).toThrow(
      'CheckboxGroup option values must be unique; received duplicate value "port".',
    );
  });
});

describe("formatCount", () => {
  it("counts a regular noun", () => {
    expect(formatCount(0, "error")).toBe("0 errors");
    expect(formatCount(1, "error")).toBe("1 error");
    expect(formatCount(3, "error")).toBe("3 errors");
  });

  it("takes an explicit plural for a noun the suffix does not cover", () => {
    expect(formatCount(2, "match", "matches")).toBe("2 matches");
    expect(formatCount(1, "match", "matches")).toBe("1 match");
  });
});

describe("joinList", () => {
  it("joins with a serial comma", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["depth"])).toBe("depth");
    expect(joinList(["depth", "speed"])).toBe("depth and speed");
    expect(joinList(["depth", "speed", "wind"])).toBe("depth, speed, and wind");
  });

  it("takes another conjunction", () => {
    expect(joinList(["caption", "aria-label"], "or")).toBe(
      "caption or aria-label",
    );
  });
});

describe("requireAccessibleName", () => {
  it("accepts either naming attribute and rejects blank ones", () => {
    expect(() =>
      requireAccessibleName("TabList", "Views", undefined),
    ).not.toThrow();
    expect(() =>
      requireAccessibleName("TabList", "   ", "views-title"),
    ).not.toThrow();
    expect(() => requireAccessibleName("TabList", "  ", "  ")).toThrow(
      "TabList requires an accessible name: pass a non-empty aria-label or aria-labelledby.",
    );
  });

  it("lists a component's own naming slot first", () => {
    expect(() =>
      requireAccessibleName("Table", undefined, undefined, ["caption"]),
    ).toThrow(
      "Table requires an accessible name: pass a non-empty caption, aria-label, or aria-labelledby.",
    );
  });
});

describe("landmarkLabel", () => {
  it("names a landmark by its title and whatever the consumer referenced", () => {
    expect(landmarkLabel(true, "outer", "title")).toBe("outer title");
    expect(landmarkLabel(true, undefined, "title")).toBe("title");
  });

  it("names nothing when the surface is not a landmark", () => {
    expect(landmarkLabel(false, "outer", "title")).toBeUndefined();
  });
});

describe("resolveAriaDisabled", () => {
  it("lets the documented prop decide whenever it is set", () => {
    expect(resolveAriaDisabled(false, true)).toBe(false);
    expect(resolveAriaDisabled(true, undefined)).toBe(true);
  });

  it("reads both spellings of the native attribute", () => {
    expect(resolveAriaDisabled(undefined, true)).toBe(true);
    expect(resolveAriaDisabled(undefined, "true")).toBe(true);
    expect(resolveAriaDisabled(undefined, "false")).toBe(false);
    expect(resolveAriaDisabled(undefined, undefined)).toBe(false);
  });
});

describe("blockedActivationProps", () => {
  it("exposes the blocked state and refuses every activation route", () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const props = blockedActivationProps<HTMLButtonElement>({
      blocked: true,
      onClick,
      onKeyDown,
    });

    expect(props["aria-disabled"]).toBe(true);

    const click = clickEvent();
    props.onClick(click.asEvent);
    expect(click.preventDefault).toHaveBeenCalledOnce();
    expect(click.stopPropagation).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();

    const enter = keyEvent("Enter");
    props.onKeyDown(enter.asEvent);
    expect(enter.preventDefault).toHaveBeenCalledOnce();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("lets keys that do not activate this control through", () => {
    const onKeyDown = vi.fn();
    const props = blockedActivationProps<HTMLButtonElement>({
      activationKeys: CHECKBOX_ACTIVATION_KEYS,
      blocked: true,
      onKeyDown,
    });

    const enter = keyEvent("Enter");
    props.onKeyDown(enter.asEvent);
    expect(onKeyDown).toHaveBeenCalledOnce();

    const space = keyEvent(" ");
    props.onKeyDown(space.asEvent);
    expect(space.preventDefault).toHaveBeenCalledOnce();
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it("leaves a live control alone", () => {
    const onClick = vi.fn();
    const props = blockedActivationProps<HTMLButtonElement>({
      blocked: false,
      onClick,
    });

    expect(props["aria-disabled"]).toBeUndefined();
    props.onClick(clickEvent().asEvent);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("leaves the state to the native attribute when both are set", () => {
    const props = blockedActivationProps<HTMLButtonElement>({
      blocked: true,
      disabled: true,
    });
    expect(props["aria-disabled"]).toBeUndefined();
  });

  it("blocks Enter and both spellings of Space on a button", () => {
    expect([...BUTTON_ACTIVATION_KEYS]).toEqual(["Enter", " ", "Spacebar"]);
    expect([...CHECKBOX_ACTIVATION_KEYS]).toEqual([" ", "Spacebar"]);
  });
});

describe("resolveAnnouncingRegion", () => {
  it("announces nothing and hides nothing while live is off", () => {
    expect(resolveAnnouncingRegion("off", undefined, false)).toEqual({
      announcing: false,
      attributes: { "aria-live": "off", role: undefined },
      silent: false,
    });
  });

  it("mounts an empty shell while an announcing region has nothing to say", () => {
    const region = resolveAnnouncingRegion("polite", undefined, false);
    expect(region.announcing).toBe(true);
    expect(region.attributes.role).toBe("status");
    expect(region.silent).toBe(true);
  });

  it("fills the region once there is content", () => {
    expect(resolveAnnouncingRegion("polite", undefined, true).silent).toBe(
      false,
    );
  });

  it("counts a caller-supplied live role as announcing", () => {
    const region = resolveAnnouncingRegion(undefined, "log", false);
    expect(region.announcing).toBe(true);
    expect(region.silent).toBe(true);
  });

  it("leaves a caller-supplied static role silent-free", () => {
    const region = resolveAnnouncingRegion(undefined, "note", false);
    expect(region.announcing).toBe(false);
    expect(region.silent).toBe(false);
  });
});

describe("resolveFieldRegions", () => {
  it("names only the regions the field renders", () => {
    expect(resolveFieldRegions("field", false, false, "off")).toEqual({
      descriptionId: undefined,
      errorId: undefined,
      referencedErrorId: undefined,
      rendersError: false,
    });
  });

  it("names the description and the error it is showing", () => {
    expect(resolveFieldRegions("field", true, true, "off")).toEqual({
      descriptionId: "field-description",
      errorId: "field-error",
      referencedErrorId: "field-error",
      rendersError: true,
    });
  });

  it("mounts an announcing error region before there is an error", () => {
    expect(resolveFieldRegions("field", false, false, "polite")).toEqual({
      descriptionId: undefined,
      errorId: "field-error",
      referencedErrorId: undefined,
      rendersError: true,
    });
  });
});

describe("label text", () => {
  it("ships the built-in reveal labels", () => {
    expect(DEFAULT_SHOW_LABEL).toBe("Show");
    expect(DEFAULT_HIDE_LABEL).toBe("Hide");
  });

  it("reads blank text as absent", () => {
    expect(hasText(undefined)).toBe(false);
    expect(hasText("   ")).toBe(false);
    expect(hasText(" Save ")).toBe(true);
    expect(trimmedText(" Save ")).toBe("Save");
    expect(trimmedText(undefined)).toBe("");
  });
});

describe("resolveLabelContent", () => {
  it("prefers the label prop and falls back to the older one", () => {
    expect(
      resolveLabelContent("Depth", "Legacy", "Switch needs a label."),
    ).toBe("Depth");
    expect(resolveLabelContent("  ", "Legacy", "Switch needs a label.")).toBe(
      "Legacy",
    );
  });

  it("refuses to render an unnamed control", () => {
    expect(() =>
      resolveLabelContent(null, "  ", "Switch needs a label."),
    ).toThrow("Switch needs a label.");
  });
});

describe("reactNodeText", () => {
  it("concatenates the text a node renders", () => {
    expect(
      reactNodeText(["Depth ", 12, createElement("span", null, " metres")]),
    ).toBe("Depth 12 metres");
  });

  it("skips hidden and aria-hidden elements, as a name would", () => {
    expect(
      reactNodeText([
        createElement("span", { "aria-hidden": "true" }, "×"),
        createElement("span", { hidden: true }, "gone"),
        "Dismiss",
      ]),
    ).toBe("Dismiss");
  });
});

describe("plainReactNodeText", () => {
  it("reads a lone string or number without walking the children", () => {
    expect(plainReactNodeText("Depth")).toBe("Depth");
    expect(plainReactNodeText(12)).toBe("12");
  });

  it("treats blank and non-text content as no text at all", () => {
    expect(plainReactNodeText("   ")).toBeUndefined();
    expect(plainReactNodeText(null)).toBeUndefined();
    expect(
      plainReactNodeText(createElement("span", null, "x")),
    ).toBeUndefined();
    expect(
      plainReactNodeText(["Depth ", createElement("span", null, "x")]),
    ).toBeUndefined();
  });

  it("joins an array that is only strings and numbers", () => {
    expect(plainReactNodeText(["Depth ", 12])).toBe("Depth 12");
  });
});

describe("nextRovingIndex", () => {
  const group = { count: 3, orientation: "horizontal", rtl: false } as const;

  it("walks and wraps along a horizontal group", () => {
    expect(
      nextRovingIndex({ ...group, currentIndex: 0, key: "ArrowRight" }),
    ).toBe(1);
    expect(
      nextRovingIndex({ ...group, currentIndex: 2, key: "ArrowRight" }),
    ).toBe(0);
    expect(
      nextRovingIndex({ ...group, currentIndex: 0, key: "ArrowLeft" }),
    ).toBe(2);
  });

  it("mirrors horizontal arrows in a right-to-left panel", () => {
    expect(
      nextRovingIndex({
        ...group,
        currentIndex: 1,
        key: "ArrowRight",
        rtl: true,
      }),
    ).toBe(0);
    expect(
      nextRovingIndex({
        ...group,
        currentIndex: 1,
        key: "ArrowLeft",
        rtl: true,
      }),
    ).toBe(2);
  });

  it("never mirrors a vertical group and ignores the other axis", () => {
    const vertical = { count: 3, orientation: "vertical", rtl: true } as const;
    expect(
      nextRovingIndex({ ...vertical, currentIndex: 0, key: "ArrowDown" }),
    ).toBe(1);
    expect(
      nextRovingIndex({ ...vertical, currentIndex: 0, key: "ArrowUp" }),
    ).toBe(2);
    expect(
      nextRovingIndex({ ...vertical, currentIndex: 0, key: "ArrowRight" }),
    ).toBeNull();
  });

  it("jumps to the ends whatever the axis", () => {
    expect(nextRovingIndex({ ...group, currentIndex: 1, key: "Home" })).toBe(0);
    expect(nextRovingIndex({ ...group, currentIndex: 1, key: "End" })).toBe(2);
  });

  it("enters at the near end when nothing is current yet", () => {
    expect(
      nextRovingIndex({ ...group, currentIndex: -1, key: "ArrowRight" }),
    ).toBe(0);
    expect(
      nextRovingIndex({ ...group, currentIndex: -1, key: "ArrowLeft" }),
    ).toBe(2);
  });

  it("leaves every other key to the consumer", () => {
    expect(
      nextRovingIndex({ ...group, currentIndex: 0, key: "Tab" }),
    ).toBeNull();
    expect(
      nextRovingIndex({ ...group, count: 0, currentIndex: -1, key: "Home" }),
    ).toBeNull();
  });
});

describe("isRightToLeft", () => {
  it("reads the computed direction rather than a :dir() selector", () => {
    const element = document.createElement("div");
    document.body.append(element);
    expect(isRightToLeft(element)).toBe(false);

    element.style.direction = "rtl";
    expect(isRightToLeft(element)).toBe(true);
    element.remove();
  });

  it("reads left to right for an element in a document with no view", () => {
    const detached = document.implementation.createHTMLDocument("detached");
    expect(isRightToLeft(detached.createElement("div"))).toBe(false);
  });
});

describe("focusedElement", () => {
  it("reports the focused element", () => {
    const button = document.createElement("button");
    document.body.append(button);
    button.focus();
    expect(focusedElement(document)).toBe(button);
    button.remove();
  });

  it("reports nothing for a document with no view", () => {
    const detached = document.implementation.createHTMLDocument("detached");
    expect(focusedElement(detached)).toBeNull();
  });
});

describe("forwardsFieldControlProps", () => {
  it("reads the mark a package control carries", () => {
    const control = markForwardsFieldControlProps(() => null);
    expect(forwardsFieldControlProps(control)).toBe(true);
  });

  it("reads nothing from an unmarked or non-component type", () => {
    expect(forwardsFieldControlProps(() => null)).toBe(false);
    expect(forwardsFieldControlProps("input")).toBe(false);
    expect(forwardsFieldControlProps(Symbol.for("react.fragment"))).toBe(false);
    expect(forwardsFieldControlProps(null)).toBe(false);
    expect(forwardsFieldControlProps(undefined)).toBe(false);
  });
});

describe("focusPanelRoot", () => {
  it("borrows a tabindex and gives it back on blur", () => {
    const root = document.createElement("div");
    document.body.append(root);

    focusPanelRoot(root);
    expect(document.activeElement).toBe(root);
    expect(root).toHaveAttribute("tabindex", "-1");

    root.blur();
    expect(root).not.toHaveAttribute("tabindex");
    root.remove();
  });

  it("hands the tabindex back at once when the root refuses focus", () => {
    const root = document.createElement("div");
    document.body.append(root);
    // A root that never takes focus gets no blur, so the attribute would stay
    // and make the root a click-focus target for the rest of the panel's life.
    Object.defineProperty(root, "focus", { value: () => undefined });
    const removeEventListener = vi.spyOn(root, "removeEventListener");

    focusPanelRoot(root);

    expect(root).not.toHaveAttribute("tabindex");
    expect(removeEventListener).toHaveBeenCalledWith(
      "blur",
      expect.any(Function),
    );
    removeEventListener.mockRestore();
    root.remove();
  });

  it("leaves a tabindex the panel already carries alone", () => {
    const root = document.createElement("div");
    root.setAttribute("tabindex", "0");
    document.body.append(root);

    focusPanelRoot(root);
    root.blur();

    expect(root).toHaveAttribute("tabindex", "0");
    root.remove();
  });
});

describe("revealElement", () => {
  it("scrolls smoothly and then focuses", () => {
    const element = document.createElement("button");
    document.body.append(element);
    const scrollIntoView = vi.fn();
    Object.assign(element, { scrollIntoView });

    revealAndFocus(element);

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
    expect(document.activeElement).toBe(element);
    element.remove();
  });

  it("jumps instead of scrolling when motion is reduced", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const scrollIntoView = vi.fn();
    Object.assign(element, { scrollIntoView });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );

    revealElement(element, { block: "center" });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
    vi.unstubAllGlobals();
    element.remove();
  });

  it("does nothing where the engine implements no scrolling", () => {
    const element = document.createElement("div");
    expect(() => {
      revealElement(element);
    }).not.toThrow();
  });
});

describe("observeFormReset", () => {
  it("resyncs the control once the reset has landed", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    form.append(input);
    document.body.append(form);
    const onReset = vi.fn();

    const release = observeFormReset(input, onReset);
    form.dispatchEvent(new Event("reset"));
    expect(onReset).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(onReset).toHaveBeenCalledWith(input);

    release();
    form.dispatchEvent(new Event("reset"));
    await Promise.resolve();
    expect(onReset).toHaveBeenCalledOnce();
    form.remove();
  });

  it("skips a control that left the document before the reset landed", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    form.append(input);
    document.body.append(form);
    const onReset = vi.fn();

    observeFormReset(input, onReset);
    form.dispatchEvent(new Event("reset"));
    input.remove();

    await Promise.resolve();
    expect(onReset).not.toHaveBeenCalled();
    form.remove();
  });

  it("registers nothing for a control with no form", () => {
    const input = document.createElement("input");
    const release = observeFormReset(input, vi.fn());
    expect(() => {
      release();
    }).not.toThrow();
  });
});

describe("resolveFreshness", () => {
  const nowMs = 1_700_000_000_000;

  it("reports no age and no staleness before the first sample", () => {
    expect(resolveFreshness(undefined, nowMs, 1_000)).toEqual({
      ageMs: undefined,
      stale: false,
    });
    expect(resolveFreshness("not a date", nowMs, 1_000).stale).toBe(false);
  });

  it("measures the age of the last sample", () => {
    expect(resolveFreshness(nowMs - 2_500, nowMs, 10_000)).toEqual({
      ageMs: 2_500,
      stale: false,
    });
  });

  it("goes stale past the threshold", () => {
    expect(resolveFreshness(nowMs - 10_001, nowMs, 10_000).stale).toBe(true);
  });

  it("reads clock skew as fresh rather than as an age", () => {
    expect(resolveFreshness(nowMs + 5_000, nowMs, 10_000)).toEqual({
      ageMs: 0,
      stale: false,
    });
  });

  it("never goes stale without a threshold", () => {
    expect(resolveFreshness(nowMs - 60_000, nowMs, 0).stale).toBe(false);
  });

  it("accepts the timestamp forms a Signal K delta carries", () => {
    const iso = new Date(nowMs - 1_000).toISOString();
    expect(resolveFreshness(iso, nowMs, 10_000).ageMs).toBe(1_000);
  });
});

describe("resolveReachability", () => {
  it("maps the tri-state onto one tone and wording", () => {
    expect(resolveReachability(true)).toBe(REACHABILITY_STATUS.reachable);
    expect(resolveReachability(false)).toBe(REACHABILITY_STATUS.unreachable);
    expect(resolveReachability(null)).toBe(REACHABILITY_STATUS.unknown);
  });

  it("keeps the not-yet-contacted state neutral rather than a warning", () => {
    expect(REACHABILITY_STATUS.unknown.tone).toBe("neutral");
    expect(REACHABILITY_STATUS.reachable.tone).toBe("success");
    expect(REACHABILITY_STATUS.unreachable.tone).toBe("danger");
  });
});

describe("select-all state", () => {
  it("derives the tri-state from the counts", () => {
    expect(resolveSelectAllState(0, 3)).toBe("none");
    expect(resolveSelectAllState(2, 3)).toBe("some");
    expect(resolveSelectAllState(3, 3)).toBe("all");
  });

  it("treats an empty set as nothing selected", () => {
    expect(resolveSelectAllState(0, 0)).toBe("none");
  });

  it("completes a partial selection and clears a full one", () => {
    expect(selectAllTarget(0, 3)).toBe(true);
    expect(selectAllTarget(2, 3)).toBe(true);
    expect(selectAllTarget(3, 3)).toBe(false);
  });
});

describe("once", () => {
  it("releases at most once however often it is called", () => {
    const release = vi.fn();
    const guarded = once(release);
    guarded();
    guarded();
    expect(release).toHaveBeenCalledOnce();
  });
});

describe("createEmitter", () => {
  it("notifies every listener and counts them", () => {
    const emitter = createEmitter<[number]>();
    const first = vi.fn();
    const second = vi.fn();

    const stopFirst = emitter.subscribe(first);
    emitter.subscribe(second);
    expect(emitter.size()).toBe(2);

    emitter.emit(7);
    expect(first).toHaveBeenCalledWith(7);
    expect(second).toHaveBeenCalledWith(7);

    stopFirst();
    emitter.emit(8);
    expect(emitter.size()).toBe(1);
    expect(first).toHaveBeenCalledOnce();
  });

  it("tolerates a listener unsubscribing while it is being notified", () => {
    const emitter = createEmitter();
    const second = vi.fn();
    const stopFirst = emitter.subscribe(() => {
      stopFirst();
    });
    emitter.subscribe(second);

    expect(() => {
      emitter.emit();
    }).not.toThrow();
    expect(second).toHaveBeenCalledOnce();
    expect(emitter.size()).toBe(1);
  });
});

describe("windowGlobal", () => {
  it("reads a global off the window that owns the node", () => {
    // A stand-in for the constructor the lookup reports, named so the stub
    // reads as the API it models rather than as an empty class.
    const ownerWindow = {
      CSSScopeRule: function CSSScopeRule() {
        return undefined;
      },
    } as unknown as Window;
    expect(windowGlobal(ownerWindow, "CSSScopeRule")).toBeTypeOf("function");
    expect(windowGlobal(ownerWindow, "ResizeObserver")).toBeUndefined();
  });
});

describe("SPACE_SCALE", () => {
  it("states the gap steps once for the styles and the props", () => {
    expect([...SPACE_SCALE]).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("RELATIVE_AGE_EN", () => {
  it("pins the wording to English for a panel that does not localize", () => {
    expect(RELATIVE_AGE_EN).toEqual({ locale: "en" });
    expect(formatRelativeAge(120_000, RELATIVE_AGE_EN)).toBe("2 minutes ago");
  });
});

describe("style fragments", () => {
  it("states the field stack exactly as the shipped rules do", () => {
    expect(PANEL_STYLES).toContain(FIELD_STACK_DECLARATIONS);
    expect(moduleStyles("radio")).toContain(FIELD_STACK_DECLARATIONS);
    expect(moduleStyles("progress")).toContain(FIELD_STACK_DECLARATIONS);
  });

  it("states the control label exactly as the shipped rules do", () => {
    expect(PANEL_STYLES).toContain(CONTROL_LABEL_DECLARATIONS);
    expect(moduleStyles("radio")).toContain(CONTROL_LABEL_DECLARATIONS);
    expect(moduleStyles("switch")).toContain(CONTROL_LABEL_DECLARATIONS);
    expect(moduleStyles("progress")).toContain(CONTROL_LABEL_DECLARATIONS);
  });

  it("states the muted description exactly as the shipped rules do", () => {
    expect(PANEL_STYLES).toContain(FIELD_DESCRIPTION_DECLARATIONS);
    expect(moduleStyles("radio")).toContain(FIELD_DESCRIPTION_DECLARATIONS);
  });

  it("states the bordered surface exactly as the shipped rules do", () => {
    expect(PANEL_STYLES).toContain(SURFACE_DECLARATIONS);
    expect(moduleStyles("table")).toContain(SURFACE_DECLARATIONS);
  });

  it("states the checkbox and radio row exactly as the shipped rules do", () => {
    expect(PANEL_STYLES).toContain(CONTROL_ROW_DECLARATIONS);
    expect(moduleStyles("radio")).toContain(CONTROL_ROW_DECLARATIONS);
  });

  it("states the forced-colors blocks exactly as the shipped rules do", () => {
    expect(PANEL_STYLES).toContain(FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS);
    expect(moduleStyles("radio")).toContain(
      FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS,
    );
    expect(moduleStyles("switch")).toContain(
      FORCED_COLORS_FOCUS_VISIBLE_DECLARATIONS,
    );

    expect(PANEL_STYLES).toContain(FORCED_COLORS_INVALID_DECLARATIONS);
    expect(moduleStyles("range")).toContain(FORCED_COLORS_INVALID_DECLARATIONS);
  });

  it("writes the body margin reset for whichever block asks for it", () => {
    expect(PANEL_STYLES).toContain(bodyEdgeMarginRules("snui-banner__body"));
    expect(moduleStyles("dialog")).toContain(
      bodyEdgeMarginRules("snui-dialog__body"),
    );
  });
});

describe("toneDescendantColorRules", () => {
  it("generates the tone rules a toned block already ships", () => {
    expect(PANEL_STYLES).toContain(
      toneDescendantColorRules("snui-banner", ".snui-banner__tone-icon"),
    );
  });

  it("covers every tone the toast paints by hand today", () => {
    const rules = toneDescendantColorRules(
      "snui-toast",
      ":is(.snui-toast__tone, .snui-toast__tone-glyph)",
    );
    const toast = moduleStyles("toast");
    for (const tone of ["success", "warning", "danger"]) {
      expect(rules).toContain(`.snui-toast--${tone} `);
      expect(toast).toContain(
        `.snui-toast--${tone} :is(.snui-toast__tone, .snui-toast__tone-glyph) { color: var(--snui-color-${tone}); }`,
      );
    }
    expect(rules).toContain(".snui-toast--info ");
  });
});

describe("racDomProps", () => {
  it("hands the same object across the boundary", () => {
    const props = { className: "snui-radio-group", id: "modes" };
    expect(racDomProps<{ id: string }>(props)).toBe(props);
  });
});

describe("reactBelowFloor", () => {
  it("refuses only a version genuinely older than the floor", () => {
    expect(reactBelowFloor("19.1.0")).toBe(true);
    expect(reactBelowFloor("18.3.1")).toBe(true);
    expect(reactBelowFloor("19.2.0")).toBe(false);
    expect(reactBelowFloor("19.3.0")).toBe(false);
    expect(reactBelowFloor("20.0.0")).toBe(false);
  });

  it("compares the minor as a number rather than as text", () => {
    expect(reactBelowFloor("19.10.0")).toBe(false);
  });

  it("accepts a version it cannot read rather than blocking the panel", () => {
    expect(reactBelowFloor("canary")).toBe(false);
    expect(reactBelowFloor("")).toBe(false);
  });

  it("names both the floor and what the host supplied", () => {
    const message = reactFloorMessage("19.1.0");
    expect(message).toContain(REACT_FLOOR_LABEL);
    expect(message).toContain("19.1.0");
  });
});
