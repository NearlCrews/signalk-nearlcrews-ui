import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldError } from "../../src/components/FieldError.js";
import type { FieldErrorState } from "../../src/utils/field-error.js";
import { VISUALLY_HIDDEN_CLASS } from "../../src/version.js";

/** A region that belongs in the DOM, holding an error or waiting for one. */
function region(hasError: boolean): FieldErrorState {
  return {
    errorId: "depth-error",
    referencedErrorId: hasError ? "depth-error" : undefined,
    rendersError: true,
  };
}

describe("FieldError", () => {
  it("renders nothing while the region does not belong in the DOM", () => {
    const { container } = render(
      <FieldError
        className="snui-field__error"
        error="Enter a depth."
        live="off"
        region={{
          errorId: undefined,
          referencedErrorId: undefined,
          rendersError: false,
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("mounts an empty announcing region before its message arrives", () => {
    const { container, rerender } = render(
      <FieldError
        className="snui-field__error"
        error={null}
        live="polite"
        region={region(false)}
      />,
    );

    // The region exists empty first, so a screen reader observes the
    // message that later fills it.
    const element = container.querySelector("#depth-error");
    expect(element).toHaveClass("snui-field-error", "snui-field__error");
    expect(element).toHaveAttribute("role", "status");
    expect(element).not.toHaveAttribute("aria-live");
    expect(element).toBeEmptyDOMElement();

    rerender(
      <FieldError
        className="snui-field__error"
        error="Enter a depth."
        live="polite"
        region={region(true)}
      />,
    );

    expect(container.querySelector("#depth-error")).toBe(element);
    expect(element).toHaveTextContent("Error. Enter a depth.");
  });

  it("draws the message only while the region is referenced", () => {
    // An error the field is not pointing at stays undrawn, so the region
    // never shows text that no control is described by.
    const { container } = render(
      <FieldError
        className="snui-field__error"
        error="Enter a depth."
        live="polite"
        region={region(false)}
      />,
    );

    expect(container.querySelector("#depth-error")).toBeEmptyDOMElement();
  });

  it("carries the danger mark ahead of the message, glyph hidden and tone spoken", () => {
    const { container } = render(
      <FieldError
        className="snui-field__error"
        error="Enter a depth."
        live="off"
        region={region(true)}
      />,
    );

    const row = container.querySelector(".snui-field-error__row");
    const glyph = row?.querySelector(".snui-field-error__tone-glyph");
    expect(glyph).toHaveClass("snui-tone-glyph--danger");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(row?.querySelector(`.${VISUALLY_HIDDEN_CLASS}`)).toHaveTextContent(
      "Error.",
    );
    // The message is an item of its own, so a wrapped line starts under the
    // text rather than under the glyph.
    expect(row?.lastElementChild).toHaveClass("snui-field-error__text");
    expect(row?.lastElementChild).toHaveTextContent("Enter a depth.");
  });

  it("states a silent region through aria-live alone", () => {
    const { container } = render(
      <FieldError
        className="snui-field__error"
        error="Enter a depth."
        live="off"
        region={region(true)}
      />,
    );

    const element = container.querySelector("#depth-error");
    expect(element).toHaveAttribute("aria-live", "off");
    expect(element).not.toHaveAttribute("role");
  });

  it("speaks an assertive region through the alert role alone", () => {
    const { container } = render(
      <FieldError
        className="snui-field__error"
        error="Enter a depth."
        live="assertive"
        region={region(true)}
      />,
    );

    const element = container.querySelector("#depth-error");
    expect(element).toHaveAttribute("role", "alert");
    expect(element).not.toHaveAttribute("aria-live");
  });

  it("renders as a div by default and as a span for an inline control", () => {
    const { container } = render(
      <>
        <FieldError
          className="snui-field__error"
          error="Enter a depth."
          live="off"
          region={region(true)}
        />
        <FieldError
          as="span"
          className="snui-checkbox__error"
          error="Accept the terms."
          live="off"
          region={{
            errorId: "terms-error",
            referencedErrorId: "terms-error",
            rendersError: true,
          }}
        />
      </>,
    );

    expect(container.querySelector("#depth-error")?.tagName).toBe("DIV");
    expect(container.querySelector("#terms-error")?.tagName).toBe("SPAN");
  });
});
