import {
  fireEvent,
  type RenderResult,
  render,
  screen,
} from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { type SyntheticEvent, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SecretInput } from "../../src/forms.js";
import {
  flushAnimationFrames,
  renderInPanel,
  stubAnimationFrames,
} from "../helpers.js";

describe("SecretInput reveal focus", () => {
  /** Renders a filled token field and hands back its input. */
  function renderToken(): { input: HTMLInputElement; view: RenderResult } {
    const view = renderInPanel(
      <SecretInput aria-label="API token" defaultValue="abcdef" />,
    );
    return {
      input: screen.getByLabelText<HTMLInputElement>("API token"),
      view,
    };
  }

  /** Selects part of the secret from the field, then presses Show. */
  async function revealWithSelection(
    user: UserEvent,
    input: HTMLInputElement,
  ): Promise<void> {
    input.focus();
    input.setSelectionRange(2, 5);
    await user.click(screen.getByRole("button", { name: "Show" }));
  }

  it("leaves focus on the toggle when a keyboard press follows an abandoned pointer press", async () => {
    const user = userEvent.setup();
    const { input } = renderToken();
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
    const { input } = renderToken();
    await revealWithSelection(user, input);

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(5);
  });

  it("leaves focus on the toggle for a keyboard press with no pointer history", async () => {
    const user = userEvent.setup();
    const { input } = renderToken();
    const toggle = screen.getByRole("button", { name: "Show" });
    input.focus();
    await user.tab();
    await user.keyboard(" ");

    expect(input).toHaveAttribute("type", "text");
    expect(toggle).toHaveFocus();
  });

  it("restores the caret again in the frame after the type change", async () => {
    const user = userEvent.setup();
    const { input } = renderToken();
    // Frames run on demand, so the reset below always lands before the
    // restoring frame. A real frame can fire during the click on a busy
    // runner, which would leave the reset last.
    const { runAll } = stubAnimationFrames();
    await revealWithSelection(user, input);

    // Stand in for the engine's own final selection reset after the type
    // change, which is what the second restoration is there for.
    input.setSelectionRange(0, 0);
    runAll();

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(5);
  });

  it("drops the pending frame when the field leaves before it runs", async () => {
    const user = userEvent.setup();
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    const { input, view } = renderToken();
    await revealWithSelection(user, input);

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
      'signalk-nearlcrews-ui: SecretInput id must be a non-empty string holding no whitespace; received "api token".',
    );
  });
});

describe("SecretInput reveal state", () => {
  it("toggles an uncontrolled secret without submitting its form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) =>
      event.preventDefault(),
    );
    render(
      <form onSubmit={onSubmit}>
        <SecretInput aria-label="API key" defaultValue="secret" />
      </form>,
    );

    const input = screen.getByLabelText("API key");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(input).toHaveAttribute("type", "text");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("supports controlled state and preserves focus and selection", async () => {
    function Harness(): React.JSX.Element {
      const [revealed, setRevealed] = useState(false);
      return (
        <SecretInput
          aria-label="Token"
          defaultValue="abcdef"
          revealed={revealed}
          onRevealedChange={setRevealed}
        />
      );
    }

    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText<HTMLInputElement>("Token");
    input.focus();
    input.setSelectionRange(1, 4);
    await user.click(screen.getByRole("button", { name: "Show" }));

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
  });

  it("supports localized toggle labels and reports state changes", () => {
    const onRevealedChange = vi.fn();
    render(
      <SecretInput
        aria-label="Secret"
        showLabel="Afficher"
        hideLabel="Masquer"
        onRevealedChange={onRevealedChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Afficher" }));
    expect(onRevealedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Masquer" })).not.toHaveAttribute(
      "aria-pressed",
    );
  });

  it("does not reveal a disabled secret", async () => {
    const user = userEvent.setup();
    render(
      <SecretInput
        aria-label="Disabled token"
        defaultValue="secret"
        disabled
      />,
    );

    const input = screen.getByLabelText<HTMLInputElement>("Disabled token");
    const toggle = screen.getByRole("button", { name: "Show" });
    expect(input).toBeDisabled();
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("SecretInput attributes", () => {
  it("ties the reveal button to the input through aria-controls", () => {
    renderInPanel(
      <>
        <SecretInput aria-label="API token" />
        <SecretInput aria-label="Webhook secret" id="webhook-secret" />
      </>,
    );

    const token = screen.getByLabelText("API token");
    const webhook = screen.getByLabelText("Webhook secret");
    expect(token.id).not.toBe("");
    expect(webhook).toHaveAttribute("id", "webhook-secret");
    const [showToken, showWebhook] = screen.getAllByRole("button", {
      name: "Show",
    });
    expect(showToken).toHaveAttribute("aria-controls", token.id);
    expect(showWebhook).toHaveAttribute("aria-controls", "webhook-secret");
  });

  it("keeps browser capture off in both states unless overridden", async () => {
    const user = userEvent.setup();
    renderInPanel(<SecretInput aria-label="API token" />);

    const input = screen.getByLabelText("API token");
    const expectDefaults = (): void => {
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).toHaveAttribute("spellcheck", "false");
      expect(input).toHaveAttribute("autocapitalize", "off");
      expect(input).toHaveAttribute("autocorrect", "off");
    };
    expect(input).toHaveAttribute("type", "password");
    expectDefaults();

    await user.click(screen.getByRole("button", { name: "Show" }));
    expect(input).toHaveAttribute("type", "text");
    expectDefaults();
  });

  it("lets the caller override the capture defaults", () => {
    renderInPanel(
      <SecretInput aria-label="Passphrase" autoComplete="current-password" />,
    );

    expect(screen.getByLabelText("Passphrase")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("applies the monospace modifier to the input", () => {
    renderInPanel(<SecretInput aria-label="API token" monospace />);

    expect(screen.getByLabelText("API token")).toHaveClass(
      "snui-input--monospace",
    );
  });
});
