import { describe, expect, it, vi } from "vitest";
import { overlayOpenProps } from "../../src/components/overlay-placement.js";

describe("overlayOpenProps", () => {
  it("maps the library open state onto the react-aria trigger props", () => {
    const onOpenChange = vi.fn();

    expect(
      overlayOpenProps({ defaultOpen: true, onOpenChange, open: false }),
    ).toEqual({ defaultOpen: true, isOpen: false, onOpenChange });
  });

  it("controls the trigger through isOpen and never through open", () => {
    const props = overlayOpenProps({ open: true });

    expect(props).toEqual({ isOpen: true });
    expect(props).not.toHaveProperty("open");
  });

  it("keeps a closed controlled state, which is not an unset one", () => {
    // False is a decision the caller made, so it must survive the mapping
    // that drops unset props, or a closed overlay would become uncontrolled.
    expect(overlayOpenProps({ open: false })).toEqual({ isOpen: false });
    expect(overlayOpenProps({ defaultOpen: false })).toEqual({
      defaultOpen: false,
    });
  });

  it("omits every prop the caller left unset, so the trigger stays uncontrolled", () => {
    // react-aria declares these props without undefined, and an isOpen key
    // that is present but undefined would read as controlled.
    const props = overlayOpenProps({
      defaultOpen: undefined,
      onOpenChange: undefined,
      open: undefined,
    });

    expect(props).toEqual({});
    expect(Object.keys(props)).toEqual([]);
    expect(Object.keys(overlayOpenProps({}))).toEqual([]);
  });
});
