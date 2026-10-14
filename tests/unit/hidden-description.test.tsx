import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HiddenDescription } from "../../src/components/HiddenDescription.js";
import { VISUALLY_HIDDEN_CLASS } from "../../src/version.js";

describe("HiddenDescription", () => {
  it("renders a visually hidden span that is also hidden from the tree", () => {
    const { container } = render(
      <HiddenDescription id="save-reason">Offline</HiddenDescription>,
    );

    const span = container.querySelector("#save-reason");
    expect(span?.tagName).toBe("SPAN");
    expect(span).toHaveClass(VISUALLY_HIDDEN_CLASS);
    expect(span).toHaveAttribute("aria-hidden", "true");
    expect(span).toHaveTextContent("Offline");
  });

  it("describes the control that references it without joining its name", () => {
    render(
      <button type="button" aria-describedby="save-reason">
        Save
        <HiddenDescription id="save-reason">
          The server is offline.
        </HiddenDescription>
      </button>,
    );

    // The name walks the button's own subtree and skips the hidden span, while
    // the description follows the reference straight to it.
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAccessibleDescription("The server is offline.");
  });

  it("keeps the control's name when the description comes and goes", () => {
    const control = (busy: boolean): React.JSX.Element => (
      <button type="button" aria-describedby={busy ? "save-busy" : undefined}>
        Save
        {busy ? (
          <HiddenDescription id="save-busy">Saving</HiddenDescription>
        ) : null}
      </button>
    );
    const { rerender } = render(control(false));
    const button = screen.getByRole("button", { name: "Save" });

    rerender(control(true));

    expect(button).toHaveAccessibleName("Save");
    expect(button).toHaveAccessibleDescription("Saving");
  });
});
