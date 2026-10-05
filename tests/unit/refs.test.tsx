import { render } from "@testing-library/react";
import { createRef, type ReactElement, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";
import { SecretInput } from "../../src/forms.js";
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Cluster,
  FieldGroup,
  InlineConfirm,
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  Metric,
  MetricGrid,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  SegmentedControl,
  Select,
  Stack,
  StatusIndicator,
  Textarea,
  TextInput,
} from "../../src/index.js";
import { panel } from "../helpers.js";
import { boatGrid } from "./lib/data-grid-fixture.js";

/**
 * The components whose ref forwarding is exercised here, with the element type
 * each must resolve to. Other components pin their refs in their own specs. A
 * case may tag its root with `data-testid="target"`, and the object-ref case
 * then pins the element itself as well as its type.
 * `PanelRoot` installs styles, so it is rendered standalone; the rest render
 * inside a panel so scoped styles and theme context are available.
 */
const REF_CASES: readonly {
  readonly name: string;
  readonly tagName: string;
  readonly standalone?: boolean;
  readonly render: (ref: Ref<never>) => ReactElement;
}[] = [
  {
    name: "Button",
    tagName: "BUTTON",
    render: (ref) => <Button ref={ref}>Save</Button>,
  },
  {
    name: "Banner",
    tagName: "DIV",
    render: (ref) => <Banner ref={ref}>Provider unavailable</Banner>,
  },
  {
    name: "FieldGroup",
    tagName: "FIELDSET",
    render: (ref) => <FieldGroup ref={ref} legend="Connection" />,
  },
  {
    name: "TextInput",
    tagName: "INPUT",
    render: (ref) => <TextInput ref={ref} aria-label="Host" />,
  },
  {
    name: "NumberInput",
    tagName: "INPUT",
    render: (ref) => <NumberInput ref={ref} aria-label="Port" />,
  },
  {
    name: "RangeInput",
    tagName: "INPUT",
    render: (ref) => <RangeInput ref={ref} aria-label="Depth" />,
  },
  {
    name: "Select",
    tagName: "SELECT",
    render: (ref) => (
      <Select ref={ref} aria-label="Source">
        <option value="a">A</option>
      </Select>
    ),
  },
  {
    name: "Textarea",
    tagName: "TEXTAREA",
    render: (ref) => <Textarea ref={ref} aria-label="Notes" />,
  },
  {
    name: "Checkbox",
    tagName: "INPUT",
    render: (ref) => <Checkbox ref={ref} label="Enable provider" />,
  },
  {
    name: "SecretInput",
    tagName: "INPUT",
    render: (ref) => <SecretInput ref={ref} aria-label="API token" />,
  },
  {
    name: "SegmentedControl",
    tagName: "DIV",
    render: (ref) => (
      <SegmentedControl
        ref={ref}
        label="Units"
        value="metric"
        onValueChange={() => undefined}
        options={[
          { label: "Metric", value: "metric" },
          { label: "Imperial", value: "imperial" },
        ]}
      />
    ),
  },
  {
    name: "InlineConfirm",
    tagName: "SECTION",
    render: (ref) => (
      <InlineConfirm
        ref={ref}
        open
        message="Delete this source?"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    ),
  },
  {
    name: "DataGrid",
    tagName: "DIV",
    render: (ref) => boatGrid({ ref }),
  },
  {
    name: "Stack",
    tagName: "DIV",
    render: (ref) => <Stack ref={ref} data-testid="target" />,
  },
  {
    name: "Stack as form",
    tagName: "FORM",
    render: (ref) => (
      <Stack as="form" ref={ref} action="/save" data-testid="target" />
    ),
  },
  {
    name: "Cluster",
    tagName: "UL",
    render: (ref) => <Cluster as="ul" ref={ref} data-testid="target" />,
  },
  {
    name: "Card",
    tagName: "SECTION",
    render: (ref) => (
      <Card as="section" ref={ref} data-testid="target">
        Body
      </Card>
    ),
  },
  {
    name: "MetricGrid",
    tagName: "DIV",
    render: (ref) => <MetricGrid ref={ref} data-testid="target" />,
  },
  {
    name: "Metric",
    tagName: "DIV",
    render: (ref) => (
      <Metric ref={ref} data-testid="target" label="Depth" value="12" />
    ),
  },
  {
    name: "Badge",
    tagName: "SPAN",
    render: (ref) => (
      <Badge ref={ref} data-testid="target">
        Beta
      </Badge>
    ),
  },
  {
    name: "StatusIndicator",
    tagName: "SPAN",
    render: (ref) => (
      <StatusIndicator ref={ref} data-testid="target">
        Idle
      </StatusIndicator>
    ),
  },
  {
    name: "Section",
    tagName: "SECTION",
    render: (ref) => (
      <Section ref={ref} data-testid="target" title="Connection">
        Body
      </Section>
    ),
  },
  {
    name: "InputGroup",
    tagName: "DIV",
    render: (ref) => <InputGroup ref={ref} data-testid="target" />,
  },
  {
    name: "InputGroupControl",
    tagName: "DIV",
    render: (ref) => <InputGroupControl ref={ref} data-testid="target" />,
  },
  {
    name: "InputGroupAddon",
    tagName: "SPAN",
    render: (ref) => <InputGroupAddon ref={ref} data-testid="target" />,
  },
  {
    name: "PanelRoot",
    tagName: "DIV",
    standalone: true,
    render: (ref) => <PanelRoot ref={ref}>Panel</PanelRoot>,
  },
];

/** The tree a case renders, inside a panel unless it is the panel itself. */
function caseTree(
  testCase: (typeof REF_CASES)[number],
  ref: Ref<never>,
): ReactElement {
  const element = testCase.render(ref);
  return testCase.standalone === true ? element : panel(element);
}

function renderCase(
  testCase: (typeof REF_CASES)[number],
  ref: Ref<never>,
): ReturnType<typeof render> {
  return render(caseTree(testCase, ref));
}

/** A callback ref that records every node it receives and every cleanup run. */
function trackingRef<T>(): {
  readonly calls: (T | null)[];
  readonly cleanupCalls: () => number;
  readonly ref: (node: T | null) => () => void;
} {
  const calls: (T | null)[] = [];
  let cleanups = 0;
  return {
    calls,
    cleanupCalls: () => cleanups,
    ref: (node) => {
      calls.push(node);
      return () => {
        cleanups += 1;
      };
    },
  };
}

describe("ref forwarding", () => {
  for (const testCase of REF_CASES) {
    it(`${testCase.name} attaches an object ref to its ${testCase.tagName} element`, () => {
      const ref = createRef<HTMLElement>();
      const view = renderCase(testCase, ref as Ref<never>);

      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe(testCase.tagName);
      // A case that tags its root with a test id pins the element itself, not
      // only its type; an untagged case compares the ref with itself.
      expect(ref.current).toBe(view.queryByTestId("target") ?? ref.current);
    });

    it(`${testCase.name} attaches and releases a callback ref`, () => {
      const seen: (HTMLElement | null)[] = [];
      const view = renderCase(testCase, (node: HTMLElement | null) => {
        seen.push(node);
      });

      expect(seen[0]).not.toBeNull();
      expect(seen[0]?.tagName).toBe(testCase.tagName);

      view.unmount();
      expect(seen.at(-1)).toBeNull();
    });

    it(`${testCase.name} runs a callback-ref cleanup on unmount`, () => {
      const { calls, cleanupCalls, ref } = trackingRef<HTMLElement>();
      const view = renderCase(testCase, ref);

      expect(calls).toHaveLength(1);
      expect(calls[0]).not.toBeNull();
      expect(cleanupCalls()).toBe(0);

      view.unmount();
      expect(cleanupCalls()).toBe(1);
    });

    it(`${testCase.name} moves the node when the callback ref is replaced`, () => {
      // React's development build pads detach calls with trailing undefined
      // arguments, so assert on the node argument rather than the argument list.
      const first = vi.fn();
      const second = vi.fn();
      const view = renderCase(testCase, first as Ref<never>);

      expect(first.mock.lastCall?.[0]).toMatchObject({
        tagName: testCase.tagName,
      });

      view.rerender(caseTree(testCase, second as Ref<never>));

      expect(first.mock.lastCall?.[0]).toBeNull();
      expect(second.mock.lastCall?.[0]).toMatchObject({
        tagName: testCase.tagName,
      });
    });
  }
});

describe("named root refs", () => {
  it("InlineConfirm attaches a stable ref once per mount, not once per commit", () => {
    const calls: (HTMLElement | null)[] = [];
    const ref = (node: HTMLElement | null): void => {
      calls.push(node);
    };
    const tree = (message: string): ReactElement =>
      panel(
        <InlineConfirm
          ref={ref}
          open
          message={message}
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />,
      );
    const view = render(tree("Delete this source?"));

    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toBeNull();

    // Re-rendering must not detach and reattach a ref whose identity is stable.
    view.rerender(tree("Delete this source permanently?"));

    expect(calls).toHaveLength(1);
    expect(calls.filter((node) => node === null)).toHaveLength(0);
  });

  it("InlineConfirm releases its ref when it closes", () => {
    const ref = createRef<HTMLElement>();
    const tree = (open: boolean): ReactElement =>
      panel(
        <InlineConfirm
          ref={ref}
          open={open}
          message="Delete this source?"
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />,
      );
    const view = render(tree(true));

    expect(ref.current).not.toBeNull();

    view.rerender(tree(false));

    expect(ref.current).toBeNull();
  });
});

describe("stateful input refs", () => {
  it("keeps the Checkbox ref attached while checked state changes", () => {
    const { calls, cleanupCalls, ref } = trackingRef<HTMLInputElement>();
    const tree = (checked: boolean, indeterminate: boolean): ReactElement =>
      panel(
        <Checkbox
          ref={ref}
          checked={checked}
          indeterminate={indeterminate}
          label="Enable provider"
          readOnly
        />,
      );
    const view = render(tree(false, true));

    view.rerender(tree(true, false));

    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toBeNull();
    expect(cleanupCalls()).toBe(0);
    view.unmount();
    expect(cleanupCalls()).toBe(1);
  });

  it("keeps the SecretInput ref attached while reveal state changes", () => {
    const { calls, cleanupCalls, ref } = trackingRef<HTMLInputElement>();
    const tree = (revealed: boolean): ReactElement =>
      panel(
        <SecretInput ref={ref} aria-label="API token" revealed={revealed} />,
      );
    const view = render(tree(false));

    view.rerender(tree(true));

    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toBeNull();
    expect(cleanupCalls()).toBe(0);
    view.unmount();
    expect(cleanupCalls()).toBe(1);
  });
});
