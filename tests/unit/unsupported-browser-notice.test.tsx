import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { UnsupportedBrowserNotice } from "../../src/index.js";
import { expectNoAxeViolations } from "../helpers.js";

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
      "This panel needs a newer browser. Update the browser, or the app that opens Signal K Admin, then open this panel again.",
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

  it("passes an accessibility audit with its defaults and with overrides", async () => {
    const { container } = render(
      <main>
        <UnsupportedBrowserNotice />
        <UnsupportedBrowserNotice
          headingLevel={3}
          title="Update the vessel browser"
        >
          Open Signal K Admin in a newer browser.
        </UnsupportedBrowserNotice>
      </main>,
    );

    await expectNoAxeViolations(container);
  });

  it("keeps its own heading beside a consumer's label reference", () => {
    render(
      <>
        <span id="host-name">Chart locker</span>
        <UnsupportedBrowserNotice aria-labelledby="host-name" />
      </>,
    );

    // Every other titled surface joins the two references, so a consumer
    // adding context does not silently drop the words on screen.
    expect(
      screen.getByRole("region", {
        name: "Chart locker Browser update required",
      }),
    ).toBeVisible();
  });

  it("renders the heading alone when the body is suppressed", () => {
    const { container } = render(
      <UnsupportedBrowserNotice>{null}</UnsupportedBrowserNotice>,
    );

    const notice = screen.getByRole("region", {
      name: "Browser update required",
    });
    expect(notice).toHaveAttribute("data-snui-unsupported");
    expect(notice).toHaveAttribute("data-browser-compatibility-message");
    expect(container.querySelector("section > div")).toBeNull();
  });
});
