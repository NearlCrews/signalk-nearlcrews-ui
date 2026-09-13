import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SecretInput } from "../../src/forms.js";
import { flushAnimationFrames, renderInPanel } from "../helpers.js";

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

  it("restores the caret again in the frame after the type change", async () => {
    const user = userEvent.setup();
    renderInPanel(<SecretInput aria-label="API token" defaultValue="abcdef" />);

    const input = screen.getByLabelText<HTMLInputElement>("API token");
    input.focus();
    input.setSelectionRange(2, 5);
    await user.click(screen.getByRole("button", { name: "Show" }));

    // Stand in for the engine's own final selection reset after the type
    // change, which is what the second restoration is there for.
    input.setSelectionRange(0, 0);
    await flushAnimationFrames();

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(5);
  });

  it("drops the pending frame when the field leaves before it runs", async () => {
    const user = userEvent.setup();
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    const view = renderInPanel(
      <SecretInput aria-label="API token" defaultValue="abcdef" />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("API token");
    input.focus();
    input.setSelectionRange(2, 5);
    await user.click(screen.getByRole("button", { name: "Show" }));

    view.unmount();
    // Nothing is left to focus a field that is no longer on screen.
    expect(cancelFrame).toHaveBeenCalled();
    await flushAnimationFrames();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("SecretInput arrangement", () => {
  it("opens revealed on request", () => {
    renderInPanel(
      <SecretInput
        aria-label="API token"
        defaultValue="abcdef"
        defaultRevealed
      />,
    );

    expect(screen.getByLabelText("API token")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide" })).toBeVisible();
  });

  it("renders trailing content between the field and the toggle", () => {
    const { container } = renderInPanel(
      <SecretInput
        aria-label="API token"
        trailingContent={<span data-testid="rotated">Rotated today</span>}
      />,
    );

    const group = container.querySelector(".snui-input-group");
    expect([...(group?.children ?? [])][1]).toBe(screen.getByTestId("rotated"));
    // The toggle keeps its tie to the field it governs.
    expect(screen.getByRole("button", { name: "Show" })).toHaveAttribute(
      "aria-controls",
      screen.getByLabelText("API token").id,
    );
  });

  it("rejects an id that cannot be an ARIA reference", () => {
    expect(() =>
      renderInPanel(<SecretInput aria-label="API token" id="api token" />),
    ).toThrow(
      'SecretInput id must be a non-empty string holding no whitespace; received "api token".',
    );
  });
});
