import { screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Code, Text } from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

describe("Text and Code", () => {
  it("applies tone and size classes on the requested element", () => {
    const ref = createRef<HTMLParagraphElement>();
    renderInPanel(
      <>
        <Text data-testid="hint" tone="muted" size="sm">
          Stored in seconds
        </Text>
        <Text as="p" ref={ref} data-testid="paragraph" tone="danger">
          Connection lost
        </Text>
      </>,
    );

    const hint = screen.getByTestId("hint");
    expect(hint.tagName).toBe("SPAN");
    expect(hint).toHaveClass(
      "snui-text",
      "snui-text--muted",
      "snui-text--size-sm",
    );
    const paragraph = screen.getByTestId("paragraph");
    expect(paragraph.tagName).toBe("P");
    expect(paragraph).toHaveClass("snui-text--danger", "snui-text--size-base");
    expect(ref.current).toBe(paragraph);
  });

  it("names only the wrapping behavior that changes something", () => {
    renderInPanel(
      <>
        <Text data-testid="stamp" wrap="nowrap">
          4 minutes ago
        </Text>
        <Text data-testid="report" wrap="preserve">
          {"line one\nline two"}
        </Text>
        <Text data-testid="plain">Ordinary copy</Text>
      </>,
    );

    expect(screen.getByTestId("stamp")).toHaveClass("snui-text--wrap-nowrap");
    expect(screen.getByTestId("report")).toHaveClass(
      "snui-text--wrap-preserve",
    );
    expect(screen.getByTestId("plain").className).not.toMatch(/wrap-/);
  });

  it("renders inline code by default and a pre block when asked", () => {
    renderInPanel(
      <>
        <Code data-testid="inline">navigation.position</Code>
        <Code block data-testid="block">
          {"line one\nline two"}
        </Code>
        <Code as="kbd" data-testid="key">
          Escape
        </Code>
      </>,
    );

    const inline = screen.getByTestId("inline");
    expect(inline.tagName).toBe("CODE");
    expect(inline).toHaveClass("snui-code", "snui-code--inline");
    const block = screen.getByTestId("block");
    expect(block.tagName).toBe("PRE");
    expect(block).toHaveClass("snui-code--block");
    expect(screen.getByTestId("key").tagName).toBe("KBD");
  });

  it("puts a scrollable block in the tab order and leaves inline code out", () => {
    // A block scrolls horizontally past the panel edge, so a keyboard user
    // needs to reach it. jsdom has no layout, so the axe rule that caught
    // this cannot fire here; the attribute is what the browser pass checks.
    renderInPanel(
      <>
        <Code data-testid="inline">navigation.position</Code>
        <Code block data-testid="block">
          {"line one\nline two"}
        </Code>
        <Code block tabIndex={-1} data-testid="opted-out">
          {"line one\nline two"}
        </Code>
      </>,
    );

    expect(screen.getByTestId("block")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("inline")).not.toHaveAttribute("tabindex");
    // A consumer that manages focus itself still wins.
    expect(screen.getByTestId("opted-out")).toHaveAttribute("tabindex", "-1");
  });

  it("treats an explicit pre as the block it renders", () => {
    // The element decides: a pre scrolls and keeps its line breaks whether the
    // caller asked for it through `block` or through `as`.
    renderInPanel(
      <Code as="pre" data-testid="pre">
        {"line one\nline two"}
      </Code>,
    );

    const block = screen.getByTestId("pre");
    expect(block).toHaveClass("snui-code--block");
    expect(block).toHaveAttribute("tabindex", "0");
  });

  it("names a code block as a group so its tab stop announces something", () => {
    renderInPanel(
      <>
        <Code block data-testid="first">
          {"line one"}
        </Code>
        <Code as="pre" data-testid="second">
          {"line two"}
        </Code>
      </>,
    );

    // Three sample payloads in one panel would otherwise be three identical
    // "Code" landmarks; a named group is a focus stop that says what it is
    // without joining the landmark list.
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getAllByRole("group", { name: "Code" })).toEqual([
      screen.getByTestId("first"),
      screen.getByTestId("second"),
    ]);
  });

  it("makes a code block the consumer names a landmark", () => {
    renderInPanel(
      <>
        <span id="payload-name">Last delta</span>
        <Code block aria-label="Delta payload">
          {"line one"}
        </Code>
        <Code block aria-labelledby="payload-name">
          {"line two"}
        </Code>
        <Code block role="figure" aria-label="Sample">
          {"line three"}
        </Code>
      </>,
    );

    expect(
      screen.getByRole("region", { name: "Delta payload" }),
    ).toHaveTextContent("line one");
    const labelled = screen.getByRole("region", { name: "Last delta" });
    expect(labelled).toHaveTextContent("line two");
    expect(labelled).not.toHaveAttribute("aria-label");
    // A role the consumer chose is theirs to keep.
    expect(screen.getByRole("figure", { name: "Sample" })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("names a code block from the panel's labels and ignores a blank name", () => {
    renderInPanel(
      <Code block aria-label="  " data-testid="block">
        {"line one"}
      </Code>,
      { labels: { codeBlock: { label: "Codeblok" } } },
    );

    expect(screen.getByRole("group", { name: "Codeblok" })).toBe(
      screen.getByTestId("block"),
    );
  });

  it("breaks a path at its segments when asked", () => {
    const { container } = renderInPanel(
      <Code break="segments" data-testid="path">
        navigation.speedOverGround
      </Code>,
    );

    const path = screen.getByTestId("path");
    expect(path).toHaveTextContent("navigation.speedOverGround");
    // One opportunity after the dot, none inside either segment.
    expect(container.querySelectorAll("wbr")).toHaveLength(1);
    expect(path.firstElementChild?.tagName).toBe("WBR");
  });
});
