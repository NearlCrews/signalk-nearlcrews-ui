import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInThisContext } from "node:vm";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as ReactDOM from "react-dom";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

import {
  DOC_EXAMPLE_FILES,
  type DocExample,
  exampleLocation,
  extractTsxExamples,
  isModuleExample,
} from "../../scripts/lib/doc-examples.mjs";
import * as composites from "../../src/composites.js";
import * as dataGrid from "../../src/data-grid.js";
import * as format from "../../src/format.js";
import * as forms from "../../src/forms.js";
import type { HostConfigurationPanelProps } from "../../src/host-harness.js";
import * as root from "../../src/index.js";
import * as overlays from "../../src/overlays.js";
import { SAVE_ACTION_BAR_LABEL_DEFAULTS } from "../../src/utils/panel-label-defaults.js";

/*
 * Renders every tsx example in the consumer documentation and fails on any
 * console warning or error, the way a consumer who copied it would see it.
 * A panel example renders with `configuration` undefined, which is what
 * Signal K Admin passes a plugin that has never been saved.
 * scripts/lib/doc-example-compile.mjs compiles the same examples against the
 * packed declarations; this is the render half.
 */

/** What an example may import, by specifier. */
const MODULES: Readonly<Record<string, unknown>> = {
  react: React,
  "react-dom": ReactDOM,
  "react/jsx-runtime": jsxRuntime,
  "signalk-nearlcrews-ui": root,
  "signalk-nearlcrews-ui/composites": composites,
  "signalk-nearlcrews-ui/data-grid": dataGrid,
  "signalk-nearlcrews-ui/format": format,
  "signalk-nearlcrews-ui/forms": forms,
  "signalk-nearlcrews-ui/overlays": overlays,
};

/** Every value the package exports, by name, for a snippet's free names. */
const PACKAGE_EXPORTS: Readonly<Record<string, unknown>> = {
  ...root,
  ...composites,
  ...dataGrid,
  ...format,
  ...forms,
  ...overlays,
};

/**
 * Examples the documentation is known to get wrong today, each found by a
 * fragment of its code, with the defect it shows. Each is expected to fail.
 * The documentation fix removes the fragment, the first test below then
 * reports the entry as matching nothing, and the entry comes out.
 */
const KNOWN_BROKEN: readonly {
  readonly defect: string;
  readonly file: string;
  readonly fragment: string;
}[] = [];

// jsdom rewrites import.meta.url to an http URL, so the documents are read
// from the repository root the suite runs in.
const examples = DOC_EXAMPLE_FILES.flatMap((file) =>
  extractTsxExamples(readFileSync(join(process.cwd(), file), "utf8"), file),
);

/** The examples in `file` whose code contains `fragment`. */
function examplesContaining(file: string, fragment: string): DocExample[] {
  return examples.filter(
    (example) => example.file === file && example.source.includes(fragment),
  );
}

/** The known defect an example shows, if it is one of those above. */
function knownDefect(example: DocExample): string | undefined {
  return KNOWN_BROKEN.find(({ file, fragment }) =>
    examplesContaining(file, fragment).includes(example),
  )?.defect;
}

/** Resolves an example's import, and refuses one the package does not offer. */
function requireModule(specifier: string): unknown {
  if (!Object.hasOwn(MODULES, specifier)) {
    throw new Error(
      `The example imports ${specifier}, which the package does not offer.`,
    );
  }
  return MODULES[specifier];
}

/** Runs a module example and returns its exports. */
function evaluateModule(source: string): Record<string, unknown> {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} as Record<string, unknown> };
  // Compiled in the global context the jsdom globals live in. The code is the
  // repository's own documentation, and running it is the point of the suite.
  const run = runInThisContext(
    `(function (require, module, exports) {\n${outputText}\n})`,
  ) as (
    require: typeof requireModule,
    module: { exports: Record<string, unknown> },
    exports: Record<string, unknown>,
  ) => void;
  run(requireModule, module, module.exports);
  return module.exports;
}

/**
 * Builds a snippet's element. The prose around a snippet implies its free
 * names, such as `saving` or `serverError`, so each one the package exports
 * resolves to that export and any other reads as undefined, which is what an
 * unset prop is. A name the page itself defines, `window` for one, is left to
 * the page.
 */
function evaluateSnippet(source: string): React.ReactElement {
  const { outputText } = ts.transpileModule(`(<>\n${source}\n</>)`, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      jsxFactory: "__createElement",
      jsxFragmentFactory: "__Fragment",
      target: ts.ScriptTarget.ES2022,
    },
  });
  const expression = outputText
    .replace(/^"use strict";\s*/, "")
    .replace(/;\s*$/, "");
  const bindings: Readonly<Record<string, unknown>> = {
    ...PACKAGE_EXPORTS,
    __createElement: React.createElement,
    __Fragment: React.Fragment,
  };
  const scope = new Proxy(bindings, {
    get: (target, name) =>
      typeof name === "string" && Object.hasOwn(target, name)
        ? target[name]
        : undefined,
    has: (target, name) =>
      typeof name === "string" &&
      (Object.hasOwn(target, name) || !(name in globalThis)),
  });
  // A snippet runs as sloppy-mode script so `with` can hand it the scope
  // above; strict code, which every module is, cannot read names this way.
  const build = runInThisContext(
    `(function (names) { with (names) { return (\n${expression}\n); } })`,
  ) as (names: object) => React.ReactElement;
  return build(scope);
}

/** Whether the example mounts its own panel root. */
function mountsOwnRoot(source: string): boolean {
  return /<Panel(?:Root|Shell)\b/.test(source);
}

/** Every element an example renders, ready to mount. */
function renderedElements(example: DocExample): React.ReactElement[] {
  const inPanel = (node: React.ReactElement): React.ReactElement =>
    mountsOwnRoot(example.source) ? (
      node
    ) : (
      <root.PanelRoot>{node}</root.PanelRoot>
    );

  if (!isModuleExample(example.source)) {
    return [inPanel(evaluateSnippet(example.source))];
  }
  const exported = evaluateModule(example.source);
  const elements: React.ReactElement[] = [];
  for (const [name, value] of Object.entries(exported)) {
    if (typeof value !== "function") continue;
    if (name === "default") {
      // The shape Signal K Admin renders a plugin configuration panel in.
      const Panel = value as React.ComponentType<HostConfigurationPanelProps>;
      elements.push(<Panel configuration={undefined} save={vi.fn()} />);
    } else if (/^[A-Z]/.test(name)) {
      const Component = value as React.ComponentType;
      elements.push(inPanel(<Component />));
    }
  }
  return elements;
}

/** Renders an example and returns every console warning and error it caused. */
function consoleReportsOf(example: DocExample): string[] {
  const reports: string[] = [];
  const record = (...parts: unknown[]): void => {
    reports.push(parts.map(String).join(" "));
  };
  vi.spyOn(console, "error").mockImplementation(record);
  vi.spyOn(console, "warn").mockImplementation(record);
  for (const element of renderedElements(example)) {
    const view = render(element);
    act(() => {
      // Effects and the frame after mount run here, where a late warning,
      // such as one an effect raises, is still attributed to this example.
    });
    view.unmount();
  }
  return reports;
}

describe("documentation examples", () => {
  it("finds the examples it is meant to render", () => {
    expect(examples.length).toBeGreaterThan(0);
    for (const file of DOC_EXAMPLE_FILES) {
      expect(examples.some((example) => example.file === file)).toBe(true);
    }
    // An entry for an example that no longer exists would never fail.
    for (const { file, fragment } of KNOWN_BROKEN) {
      expect(
        examplesContaining(file, fragment),
        `${file} no longer has an example containing ${fragment}`,
      ).toHaveLength(1);
    }
  });

  for (const example of examples) {
    const known = knownDefect(example);
    const name = `renders ${exampleLocation(example)} (${example.heading}) without a console warning`;
    const run = (): void => {
      expect(consoleReportsOf(example)).toEqual([]);
    };
    if (known === undefined) it(name, run);
    else it.fails(`${name}; known broken: ${known}`, run);
  }
});

describe("the render check", () => {
  /** An example as the extraction would hand it over. */
  function example(source: string): DocExample {
    return { file: "check.md", heading: "Check", line: 1, source };
  }

  it("reports a warning a snippet raises, with the snippet's free names unset", () => {
    // `onClose` is free, reads as undefined, and leaves the dialog with no
    // exit but Escape, which the package reports.
    const reports = consoleReportsOf(
      example(
        '<Dialog title="Escape only" defaultOpen dismissable={false} onCancel={onClose}>\n  Body\n</Dialog>',
      ),
    );
    expect(reports).toEqual([
      expect.stringContaining("Escape is its only way out"),
    ]);
  });

  it("renders a module's default export as a panel with no configuration", () => {
    expect(() =>
      consoleReportsOf(
        example(
          [
            "export default function Panel({ configuration }: { configuration: { name: string } }) {",
            "  return <p>{configuration.name}</p>;",
            "}",
          ].join("\n"),
        ),
      ),
    ).toThrow(TypeError);
  });

  it("refuses an import the package does not offer", () => {
    expect(() =>
      consoleReportsOf(
        // An import nothing uses is dropped in transpiling, so it is used.
        example(
          'import { Gauge } from "signalk-nearlcrews-ui/gauges";\nexport const gauge = Gauge;',
        ),
      ),
    ).toThrow(
      "The example imports signalk-nearlcrews-ui/gauges, which the package does not offer.",
    );
  });
});

describe("documented recipes do what their prose says", () => {
  /** The source of the one example in `file` whose code contains `fragment`. */
  function sourceOfExample(file: string, fragment: string): string {
    const matching = examplesContaining(file, fragment);
    expect(matching, `examples containing ${fragment}`).toHaveLength(1);
    const [example] = matching;
    if (example === undefined) throw new Error(`no example has ${fragment}`);
    return example.source;
  }

  /** The one example in `file` whose code contains `fragment`, evaluated. */
  function exportsOfExample(
    file: string,
    fragment: string,
  ): Record<string, unknown> {
    return evaluateModule(sourceOfExample(file, fragment));
  }

  /** The recipe's commit of the reveal, which the control case removes. */
  const FLUSHED_REVEAL = "flushSync(() => setOpen(true));";

  /** Renders ProviderSettings from `source` and presses Save with no key. */
  async function saveWithoutKey(source: string): Promise<HTMLElement> {
    const user = userEvent.setup();
    const { ProviderSettings } = evaluateModule(source) as {
      ProviderSettings: React.ComponentType;
    };
    render(
      <root.PanelRoot>
        <ProviderSettings />
      </root.PanelRoot>,
    );
    const toggle = screen.getByRole("button", { name: "Weather provider" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Save" }));
    return toggle;
  }

  it("reveals a closed section and focuses the refused field on Save", async () => {
    // docs/migration.md, "Sending focus to a control in a closed section":
    // the section opens inside flushSync and the bar focuses the returned
    // field once the handler has run.
    const source = sourceOfExample(
      "docs/migration.md",
      "export function ProviderSettings()",
    );
    expect(source).toContain(FLUSHED_REVEAL);
    const toggle = await saveWithoutKey(source);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "API key" })).toHaveFocus();
  });

  it("misses the refused field without flushSync, which is why the recipe uses it", async () => {
    // The control case: the same recipe with the reveal left to the next
    // commit. The field's ref is still detached when the bar looks at it, so
    // focus falls back to the bar's status line and the field is not focused.
    const source = sourceOfExample(
      "docs/migration.md",
      "export function ProviderSettings()",
    ).replace(FLUSHED_REVEAL, "setOpen(true);");
    const toggle = await saveWithoutKey(source);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "API key" })).not.toHaveFocus();
    expect(document.activeElement).toHaveTextContent(
      SAVE_ACTION_BAR_LABEL_DEFAULTS.unconfigured,
    );
  });

  it("drops an invalid draft on Discard and restores the saved value", async () => {
    // docs/migration.md, "Host configuration and saving": Discard restores
    // the buffer and calls useResetDrafts, which clears a draft that never
    // committed.
    const user = userEvent.setup();
    const { default: Panel } = exportsOfExample(
      "docs/migration.md",
      "function PollingSettings(",
    ) as { default: React.ComponentType<HostConfigurationPanelProps> };
    render(<Panel configuration={{ intervalSeconds: 60 }} save={vi.fn()} />);
    const interval = screen.getByRole("spinbutton", { name: /Interval/ });

    await user.clear(interval);
    await user.type(interval, "2");
    await user.tab();
    expect(screen.getByText("Fix the interval to save.")).toBeInTheDocument();
    expect(interval).toHaveAttribute("aria-invalid", "true");

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByText("Fix the interval to save.")).toBeNull();
    // A number input reports its value as a number.
    expect(interval).toHaveValue(60);
    expect(interval).not.toHaveAttribute("aria-invalid", "true");
  });

  it("reports the save as sent once the host echoes the saved configuration", async () => {
    // README "Basic use": the host passes the saved object back, which
    // clears the dirty state, and the bar reports the request it sent.
    const user = userEvent.setup();
    const { default: Panel } = exportsOfExample(
      "README.md",
      "export default function PluginConfigurationPanel",
    ) as { default: React.ComponentType<HostConfigurationPanelProps> };
    const save = vi.fn<(configuration: unknown) => void>();
    const view = render(<Panel configuration={undefined} save={save} />);

    await user.type(
      screen.getByRole("textbox", { name: /Server URL/ }),
      "https://signalk.local",
    );
    expect(
      screen.getByText(SAVE_ACTION_BAR_LABEL_DEFAULTS.unsaved),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(save).toHaveBeenCalledWith({ serverUrl: "https://signalk.local" });

    view.rerender(
      <Panel configuration={save.mock.calls[0]?.[0]} save={save} />,
    );
    expect(
      screen.getByText(SAVE_ACTION_BAR_LABEL_DEFAULTS.saved),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(SAVE_ACTION_BAR_LABEL_DEFAULTS.unsaved),
    ).toBeNull();
  });
});
