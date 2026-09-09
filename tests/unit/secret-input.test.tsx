import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SecretInput } from "../../src/forms.js";
import { renderInPanel } from "../helpers.js";

describe("SecretInput reveal focus", () => {
  it("leaves focus on the toggle when a keyboard press follows an abandoned pointer press", async () => {
    const user = userEvent.setup();
    renderInPanel(<SecretInput aria-label="API token" defaultValue="abcdef" />);

    const input = screen.getByLabelText<HTMLInputElement>("API token");
    const toggle = screen.getByRole("button", { name: "Show" });
    input.focus();
    input.setSelectionRange(1, 4);

    // A press that is released somewhere else never becomes a click, so the
    // toggle sees a pointerdown and nothing after it.
    fireEvent.pointerDown(toggle);
    fireEvent.pointerUp(document.body);

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(input).toHaveAttribute("type", "text");
    // The keyboard user pressed Show from the button and must stay there,
    // rather than being thrown into the field and having to tab back to Hide.
    expect(toggle).toHaveFocus();
    expect(input).not.toHaveFocus();
  });

  it("restores the caret when the same press does become a click", async () => {
    const user = userEvent.setup();
    renderInPanel(<SecretInput aria-label="API token" defaultValue="abcdef" />);

    const input = screen.getByLabelText<HTMLInputElement>("API token");
    input.focus();
    input.setSelectionRange(2, 5);
    await user.click(screen.getByRole("button", { name: "Show" }));

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(5);
  });

  it("leaves focus on the toggle for a keyboard press with no pointer history", async () => {
    const user = userEvent.setup();
    renderInPanel(<SecretInput aria-label="API token" defaultValue="abcdef" />);

    const input = screen.getByLabelText<HTMLInputElement>("API token");
    const toggle = screen.getByRole("button", { name: "Show" });
    input.focus();
    await user.tab();
    await user.keyboard(" ");

    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveFocus();
  });
});
