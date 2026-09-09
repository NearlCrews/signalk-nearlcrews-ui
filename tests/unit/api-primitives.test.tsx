import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, type SyntheticEvent, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SecretInput } from "../../src/forms.js";
import { UnsupportedBrowserNotice } from "../../src/index.js";

describe("UnsupportedBrowserNotice", () => {
  it("renders a named region with useful defaults and no live role", () => {
    render(<UnsupportedBrowserNotice />);

    const notice = screen.getByRole("region", {
      name: "Browser update required",
    });
    expect(notice).toHaveAttribute("data-browser-compatibility-message");
    // Static page content present at first render has nothing to interrupt.
    expect(notice).not.toHaveAttribute("role");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Browser update required",
      }),
    ).toBeVisible();
    expect(notice).toHaveTextContent(
      "This panel needs a newer browser or a newer app to embed it. Update the browser or the app that opens Signal K Admin, then reopen this panel.",
    );
  });

  it("accepts a body override, a heading level, section attributes, and a ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <UnsupportedBrowserNotice
        ref={ref}
        className="compatibility"
        headingLevel={3}
      >
        Contact the vessel administrator.
      </UnsupportedBrowserNotice>,
    );

    const notice = screen.getByRole("region", {
      name: "Browser update required",
    });
    expect(ref.current).toBe(notice);
    expect(ref.current).toHaveClass("compatibility");
    expect(ref.current).toHaveTextContent("Contact the vessel administrator.");
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Browser update required",
      }),
    ).toBeVisible();
  });

  it("drops the region naming when the title is removed", () => {
    render(<UnsupportedBrowserNotice title={null} />);

    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
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
