import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type SyntheticEvent, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SecretInput } from "../../src/forms.js";
import {
  formatRelativeAge,
  UnsupportedBrowserNotice,
} from "../../src/index.js";

describe("UnsupportedBrowserNotice", () => {
  it("always renders a standalone alert with useful defaults", () => {
    render(<UnsupportedBrowserNotice />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Browser update required",
    );
    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-browser-compatibility-message",
    );
  });

  it("accepts a body override and forwards section attributes and ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <UnsupportedBrowserNotice ref={ref} className="compatibility">
        Contact the vessel administrator.
      </UnsupportedBrowserNotice>,
    );

    expect(ref.current).toBe(screen.getByRole("alert"));
    expect(ref.current).toHaveClass("compatibility");
    expect(ref.current).toHaveTextContent("Contact the vessel administrator.");
  });
});

describe("SecretInput", () => {
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

describe("formatRelativeAge", () => {
  it("uses deterministic thresholds and Intl formatting", () => {
    expect(formatRelativeAge(0, { locale: "en", style: "long" })).toBe(
      "0 seconds ago",
    );
    expect(formatRelativeAge(59_500, { locale: "en", style: "long" })).toBe(
      "1 minute ago",
    );
    expect(formatRelativeAge(3_599_000, { locale: "en", style: "long" })).toBe(
      "1 hour ago",
    );
    expect(formatRelativeAge(86_400_000, { locale: "en", style: "long" })).toBe(
      "1 day ago",
    );
  });

  it("supports numeric auto, locale selection, and invalid fallbacks", () => {
    expect(
      formatRelativeAge(0, {
        locale: "en",
        numeric: "auto",
        style: "long",
      }),
    ).toBe("now");
    expect(formatRelativeAge(null, { fallback: "never" })).toBe("never");
    expect(formatRelativeAge(Number.NaN)).toBe("unknown");
    expect(formatRelativeAge(-1)).toBe("unknown");
  });
});
