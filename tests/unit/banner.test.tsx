import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useEffect, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Banner, Button, TextInput } from "../../src/index.js";
import { FEEDBACK_STYLES } from "../../src/styles/feedback.js";
import { NARROW_PANEL_QUERY } from "../../src/styles/fragments.js";
import { ruleBody } from "../css-helpers.js";
import { renderInPanel } from "../helpers.js";

describe("Banner tone, dismissal, and title", () => {
  it("renders a neutral banner without a tone glyph or label", () => {
    const { container } = renderInPanel(
      <Banner tone="neutral">Stored values stay in SI units.</Banner>,
    );

    const banner = container.querySelector(".snui-banner--neutral");
    expect(banner).not.toBeNull();
    expect(banner?.querySelector(".snui-banner__tone-icon")).toBeNull();
    expect(banner?.querySelector(".snui-visually-hidden")).toBeNull();
    expect(banner).toHaveTextContent("Stored values stay in SI units.");
  });

  it("ignores a tone label on a neutral banner", () => {
    const { container } = renderInPanel(
      <Banner tone="neutral" toneLabel="Notice">
        Plain note.
      </Banner>,
    );

    const banner = container.querySelector(".snui-banner--neutral");
    expect(banner?.querySelector(".snui-visually-hidden")).toBeNull();
    expect(banner).toHaveTextContent("Plain note.");
  });

  it("drives banner dismissal through the ghost compact button contract", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const { container } = renderInPanel(
      <Banner onDismiss={onDismiss}>Provider notice</Banner>,
    );

    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    expect(dismiss).toHaveClass(
      "snui-button",
      "snui-button--ghost",
      "snui-button--size-compact",
    );
    expect(container.querySelector(".snui-banner__dismiss")).toBeNull();

    await user.click(dismiss);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("renders the banner title as a heading only when asked", () => {
    const { container } = renderInPanel(
      <>
        <Banner title="Provider unavailable">Retry in a moment.</Banner>
        <Banner headingLevel={3} title="Chart cache full">
          Free some space.
        </Banner>
      </>,
    );

    // A banner beside content that still carries its own headings must not add
    // an entry to the outline, so a heading is opt-in.
    expect(
      screen.queryByRole("heading", { name: "Provider unavailable" }),
    ).toBeNull();
    expect(container.querySelector(".snui-banner__title")?.tagName).toBe("DIV");
    expect(
      screen.getByRole("heading", { level: 3, name: "Chart cache full" }),
    ).toHaveClass("snui-banner__title");
  });
});

/** Waits for a banner to hand focus on to the destination the fixture names. */
async function expectFocusHandedOn(): Promise<void> {
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Provider settings" }),
    ).toHaveFocus();
  });
}

describe("Banner announcements, actions, and focus", () => {
  it("announces only banners explicitly marked as live", () => {
    renderInPanel(
      <Banner tone="danger" live="assertive" title="Connection failed">
        Check the server address.
      </Banner>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Error. Connection failed. Check the server address.",
    );
  });

  it("does not interrupt users for persistent danger content", () => {
    const { container } = renderInPanel(
      <Banner tone="danger">The provider is unavailable.</Banner>,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.querySelector(".snui-banner")).not.toHaveAttribute(
      "aria-live",
    );
  });

  it("does not silence a caller-supplied alert role with aria-live", () => {
    renderInPanel(
      <Banner role="alert" live="off">
        Connection failed.
      </Banner>,
    );

    // `alert` already implies an assertive live region. Emitting aria-live="off"
    // beside it would silence the role the caller asked for.
    expect(screen.getByRole("alert")).not.toHaveAttribute("aria-live");
  });

  it("does not pair an implied live role with a redundant aria-live", () => {
    renderInPanel(<Banner live="assertive">Connection failed.</Banner>);

    expect(screen.getByRole("alert")).not.toHaveAttribute("aria-live");
  });

  it("supports polite banner announcements without requiring a title", () => {
    renderInPanel(
      <Banner live="polite" deferFirstMessage={false}>
        Catalog refresh completed.
      </Banner>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Information. Catalog refresh completed.",
    );
  });

  it("supports banner actions, dismissal, and persistent-note semantics", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderInPanel(
      <Banner
        role="note"
        title="Provider unavailable"
        actions={<Button>Retry</Button>}
        onDismiss={onDismiss}
        dismissLabel="Hide notice"
      >
        Check the optional provider.
      </Banner>,
    );

    expect(screen.getByRole("note")).toHaveTextContent("Provider unavailable");
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Hide notice" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("moves focus to the requested destination after dismissal", async () => {
    const user = userEvent.setup();
    const destinationRef = createRef<HTMLButtonElement>();

    function Fixture(): React.JSX.Element {
      const [visible, setVisible] = useState(true);

      return (
        <>
          {visible ? (
            <Banner
              dismissFocusRef={destinationRef}
              onDismiss={() => setVisible(false)}
            >
              Provider notice
            </Banner>
          ) : null}
          <Button ref={destinationRef}>Provider settings</Button>
        </>
      );
    }

    renderInPanel(<Fixture />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await expectFocusHandedOn();
  });

  it("hands focus on when a consumer action takes the banner away", async () => {
    const user = userEvent.setup();
    const destinationRef = createRef<HTMLButtonElement>();

    function Fixture(): React.JSX.Element {
      const [failed, setFailed] = useState(true);

      return (
        <>
          {failed ? (
            <Banner
              tone="danger"
              title="Provider unavailable"
              dismissFocusRef={destinationRef}
              actions={<Button onClick={() => setFailed(false)}>Retry</Button>}
            >
              Check the optional provider.
            </Banner>
          ) : null}
          <Button ref={destinationRef}>Provider settings</Button>
        </>
      );
    }

    renderInPanel(<Fixture />);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await expectFocusHandedOn();
  });

  it("hands focus on when an announcing banner's actions go with its message", async () => {
    const user = userEvent.setup();
    const destinationRef = createRef<HTMLButtonElement>();

    function Fixture(): React.JSX.Element {
      const [failure, setFailure] = useState("The provider stopped answering.");

      return (
        <>
          <Banner
            live="polite"
            tone="danger"
            dismissFocusRef={destinationRef}
            actions={
              failure === "" ? undefined : (
                <Button onClick={() => setFailure("")}>Retry</Button>
              )
            }
          >
            {failure}
          </Banner>
          <Button ref={destinationRef}>Provider settings</Button>
        </>
      );
    }

    renderInPanel(<Fixture />);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await expectFocusHandedOn();
  });

  it("leaves focus where a panel puts it in the banner's place", async () => {
    const user = userEvent.setup();
    const destinationRef = createRef<HTMLButtonElement>();

    function Replacement(): React.JSX.Element {
      const fieldRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        fieldRef.current?.focus();
      }, []);

      return <TextInput ref={fieldRef} aria-label="Server URL" />;
    }

    function Fixture(): React.JSX.Element {
      const [failed, setFailed] = useState(true);

      return (
        <>
          {failed ? (
            <Banner
              tone="danger"
              dismissFocusRef={destinationRef}
              actions={<Button onClick={() => setFailed(false)}>Retry</Button>}
            >
              The provider stopped answering.
            </Banner>
          ) : (
            <Replacement />
          )}
          <Button ref={destinationRef}>Provider settings</Button>
        </>
      );
    }

    renderInPanel(<Fixture />);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    // The banner hands focus on before the replacement mounts, so the panel's
    // own placement is the one the user is left with.
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Server URL" })).toHaveFocus();
    });
  });

  it("names a consumer landmark by the banner's own title", () => {
    renderInPanel(
      <Banner role="region" title="Provider unavailable">
        Check the optional provider.
      </Banner>,
    );

    expect(
      screen.getByRole("region", { name: "Provider unavailable" }),
    ).toBeVisible();
  });

  it("leaves naming alone where the consumer or the role already owns it", () => {
    renderInPanel(
      <>
        <Banner
          role="region"
          aria-label="Provider health"
          title="Provider unavailable"
        >
          Check the optional provider.
        </Banner>
        <Banner role="status" title="Provider restored">
          The provider answered.
        </Banner>
        <Banner data-testid="untitled-banner" role="region">
          Values are stored in SI.
        </Banner>
        <Banner data-testid="roleless-banner" title="Provider notice">
          Values are stored in SI.
        </Banner>
      </>,
    );

    expect(
      screen.getByRole("region", { name: "Provider health" }),
    ).toBeVisible();
    // A live role announces its own contents, so naming it by the title it
    // already reads would only say the words twice.
    expect(screen.getByRole("status")).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByTestId("untitled-banner")).not.toHaveAttribute(
      "aria-labelledby",
    );
    expect(screen.getByTestId("roleless-banner")).not.toHaveAttribute(
      "aria-labelledby",
    );
  });

  it("falls back to a named banner dismissal for blank labels", () => {
    renderInPanel(
      <Banner onDismiss={() => undefined} dismissLabel={" \t "}>
        Provider notice
      </Banner>,
    );

    expect(screen.getByRole("button", { name: "Dismiss" })).toBeVisible();
  });
});

describe("Banner layout", () => {
  it("centers the actions on the banner's first line", () => {
    // The action row starts at the top of the content and is taller than a
    // line of text, so without a lift its label sits half a line below the
    // title it belongs to. The narrow layout stacks the actions under the
    // text instead, where the lift would pull them into it.
    const actions = ruleBody(FEEDBACK_STYLES, ".snui-banner__actions");
    expect(actions).toContain(
      "margin-block-start: calc((1lh - var(--snui-control-min-height)) / 2);",
    );
    // The lift assumes a row one control tall. A consumer link or a raw
    // button is shorter, and without the minimum it rose above the first
    // line; the row keeps control height and centers a short action in it.
    expect(actions).toContain(
      "min-block-size: var(--snui-control-min-height);",
    );
    expect(actions).toContain("align-items: center;");
    // Stacked under the text, nothing is lifted, so a short action keeps its
    // own height rather than gaining space above and below it.
    const narrow = ruleBody(FEEDBACK_STYLES, NARROW_PANEL_QUERY);
    const stacked = ruleBody(narrow, ".snui-banner__actions");
    expect(stacked).toContain("margin-block-start: 0;");
    expect(stacked).toContain("min-block-size: auto;");
  });

  it("keeps a space-2 inset above lifted actions by lowering the content instead", () => {
    // The lift that centers the actions on the first line would otherwise
    // spend most of the top padding: a bordered Retry sat 3 px under the
    // border, and a focus ring landed on it. A banner with actions starts its
    // content low enough that the lifted row keeps at least space-2 of inset.
    expect(
      ruleBody(FEEDBACK_STYLES, ".snui-banner:has(> .snui-banner__actions)"),
    ).toContain(
      "padding-block-start: max(var(--snui-space-3), calc(var(--snui-space-2) + (var(--snui-control-min-height) - 1lh) / 2));",
    );
    // Stacked, the actions are not lifted, so the padding is the plain one.
    const narrow = ruleBody(FEEDBACK_STYLES, NARROW_PANEL_QUERY);
    expect(
      ruleBody(narrow, ".snui-banner:has(> .snui-banner__actions)"),
    ).toContain("padding-block-start: var(--snui-space-3);");
  });

  it("lets the message column take the row, so WebKit does not break a line that fits", () => {
    // A shrink-to-fit column gives text-wrap: pretty no slack, and WebKit
    // then breaks a sentence that would fit on one line.
    expect(ruleBody(FEEDBACK_STYLES, "\n.snui-banner__content")).toContain(
      "flex: 1 1 auto;",
    );
    expect(ruleBody(FEEDBACK_STYLES, "\n.snui-banner__text")).toContain(
      "flex: 1 1 auto;",
    );
  });
});
