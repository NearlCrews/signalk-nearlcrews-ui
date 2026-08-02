import { render } from "@testing-library/react";
import { createRef, type ReactElement, type Ref } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Banner,
  Button,
  Cell,
  Checkbox,
  Column,
  DataGrid,
  FieldGroup,
  InlineConfirm,
  NumberInput,
  PanelRoot,
  RangeInput,
  Row,
  SegmentedControl,
  Select,
  Textarea,
  TextInput,
} from "../../src/index.js";
import { renderInPanel } from "../helpers.js";

/**
 * Every component that exposes a ref, with the element type it must resolve to.
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
    name: "SegmentedControl",
    tagName: "DIV",
    render: (ref) => (
      <SegmentedControl
        ref={ref}
        legend="Units"
        value="metric"
        onChange={() => undefined}
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
    tagName: "TABLE",
    render: (ref) => (
      <DataGrid
        ref={ref}
        aria-label="Providers"
        items={[{ id: "alpha", name: "Alpha" }]}
        renderRow={(item) => (
          <Row>
            <Cell>{item.name}</Cell>
          </Row>
        )}
      >
        <Column>Name</Column>
      </DataGrid>
    ),
  },
  {
    name: "PanelRoot",
    tagName: "DIV",
    standalone: true,
    render: (ref) => <PanelRoot ref={ref}>Panel</PanelRoot>,
  },
];

function renderCase(
  testCase: (typeof REF_CASES)[number],
  ref: Ref<never>,
): ReturnType<typeof render> {
  const element = testCase.render(ref);
  if (testCase.standalone === true) return render(element);
  return renderInPanel(element);
}

describe("ref forwarding", () => {
  for (const testCase of REF_CASES) {
    it(`${testCase.name} attaches an object ref to its ${testCase.tagName} element`, () => {
      const ref = createRef<HTMLElement>();
      renderCase(testCase, ref as Ref<never>);

      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe(testCase.tagName);
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
      let cleanupCalls = 0;
      let attached: HTMLElement | null = null;
      const view = renderCase(testCase, (node: HTMLElement | null) => {
        attached = node;
        return () => {
          cleanupCalls += 1;
        };
      });

      expect(attached).not.toBeNull();
      expect(cleanupCalls).toBe(0);

      view.unmount();
      expect(cleanupCalls).toBe(1);
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

      view.rerender(
        testCase.standalone === true ? (
          testCase.render(second as Ref<never>)
        ) : (
          <PanelRoot>{testCase.render(second as Ref<never>)}</PanelRoot>
        ),
      );

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
    const tree = (message: string): ReactElement => (
      <PanelRoot>
        <InlineConfirm
          ref={ref}
          open
          message={message}
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />
      </PanelRoot>
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
    const view = renderInPanel(
      <InlineConfirm
        ref={ref}
        open
        message="Delete this source?"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(ref.current).not.toBeNull();

    view.rerender(
      <PanelRoot>
        <InlineConfirm
          ref={ref}
          open={false}
          message="Delete this source?"
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />
      </PanelRoot>,
    );

    expect(ref.current).toBeNull();
  });
});
