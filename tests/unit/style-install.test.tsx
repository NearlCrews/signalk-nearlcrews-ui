import { render } from "@testing-library/react";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { afterEach, describe, expect, it } from "vitest";

import { Progress } from "../../src/composites.js";
import { Switch } from "../../src/forms.js";
import { PanelRoot, RangeInput } from "../../src/index.js";
import { DIALOG_STYLES } from "../../src/styles/dialog.js";
import {
  installedRootStyleNonces,
  installPanelStyles,
  installStyleModule,
  type StyleModule,
} from "../../src/styles/install.js";
import { STYLE_MODULES } from "../../src/styles/modules.js";
import { TABLE_STYLES } from "../../src/styles/table.js";
import { useModuleStyles } from "../../src/styles/use-module-styles.js";
import { PACKAGE_VERSION } from "../../src/version.js";

const ROOT_SHEET = "style[data-snui-styles]";
const MODULE_SHEET = "style[data-snui-module-styles]";

function headSheets(selector: string): HTMLStyleElement[] {
  return [...document.head.querySelectorAll<HTMLStyleElement>(selector)];
}

function ModuleConsumer({
  module,
  name,
}: {
  readonly module: StyleModule;
  readonly name: string;
}): React.JSX.Element {
  useModuleStyles(module, name);
  return <p>{name}</p>;
}

afterEach(() => {
  for (const sheet of headSheets(`${ROOT_SHEET}, ${MODULE_SHEET}`)) {
    sheet.remove();
  }
});

/**
 * Every class a stylesheet writes a rule for. The `@scope` prelude names the
 * panel root in every module, so it is dropped before the scan.
 */
function classesIn(styles: string): Set<string> {
  const rules = styles.replaceAll(/@scope \([^)]*\) to \([^)]*\)/g, "");
  return new Set(
    [...rules.matchAll(/\.(snui-[a-z0-9_-]+)/g)].map((match) => match[1] ?? ""),
  );
}

describe("style module manifest", () => {
  /** Class prefixes whose rules all moved into a per-component module. */
  const MOVED_BLOCKS = [
    "snui-data-grid",
    "snui-dialog",
    "snui-empty-state",
    "snui-menu",
    "snui-popover",
    "snui-progress",
    "snui-radio",
    "snui-range",
    "snui-scrim",
    "snui-switch",
    "snui-tablist",
    "snui-tabpanel",
    "snui-tabs",
    "snui-textarea",
    "snui-toast",
  ] as const;

  /*
   * The rules that may still open with a moved class. Each belongs to a
   * component that stayed in the root sheet: every field shares the rule that
   * takes an empty error region out of flow.
   */
  const SHARED_ROOT_RULES = new Set([".snui-radio-group__error:empty"]);

  it("keeps every per-component block out of the root sheet", () => {
    const [root] = STYLE_MODULES;
    expect(root?.id).toBe("root");

    let checked = 0;
    for (const line of (root?.styles ?? "").split("\n")) {
      const opener = /^\s*(\.snui-[^,{]*)[,{]/.exec(line);
      if (opener === null) continue;
      const selector = (opener[1] ?? "").trim();
      const block = /^\.(snui-[a-z0-9_-]+)/.exec(selector)?.[1] ?? "";
      if (!MOVED_BLOCKS.some((moved) => block.startsWith(moved))) continue;
      checked += 1;
      expect(
        SHARED_ROOT_RULES.has(selector),
        `the root sheet still opens a rule with ${selector}`,
      ).toBe(true);
    }
    // Guards the scan itself: the shared rules have to be found.
    expect(checked).toBe(SHARED_ROOT_RULES.size);
  });

  /*
   * InputGroup lays out a slider it never owns the look of, so its two sizing
   * rules stay with InputGroup in the root sheet. They outrank the module's
   * own width on specificity, which is what kept them working when the module
   * moved after the root sheet in the cascade.
   */
  it("keeps InputGroup's slider sizing in the root sheet", () => {
    const [root] = STYLE_MODULES;
    expect(root?.styles).toContain(".snui-input-group > .snui-range");
    expect(root?.styles).toContain(
      ".snui-input-group__control--grow > .snui-range",
    );
  });

  it("gives every module a distinct id", () => {
    const ids = STYLE_MODULES.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * Modules install in mount order, so two modules writing rules for one class
   * would leave that class styled differently depending on which component
   * mounted first. Only the root sheet has a fixed place in the cascade.
   */
  it("never styles one class from two modules", () => {
    const owner = new Map<string, string>();
    for (const module of STYLE_MODULES.slice(1)) {
      for (const name of classesIn(module.styles)) {
        const first = owner.get(name);
        expect(
          first,
          `.${name} is styled by both the ${String(first)} and ${module.id} modules, whose install order is not fixed`,
        ).toBeUndefined();
        owner.set(name, module.id);
      }
    }
    expect(owner.size).toBeGreaterThan(0);
  });

  it("styles every module's own block in that module", () => {
    const modules = new Map(
      STYLE_MODULES.map((module) => [module.id, module.styles]),
    );
    for (const [id, selector] of [
      ["dialog", ".snui-dialog"],
      ["empty-state", ".snui-empty-state"],
      ["menu", ".snui-menu"],
      ["popover", ".snui-popover"],
      ["progress", ".snui-progress"],
      ["radio", ".snui-radio-group"],
      ["range", ".snui-range"],
      ["switch", ".snui-switch__button"],
      ["table", ".snui-data-grid"],
      ["textarea", ".snui-textarea"],
      ["toast", ".snui-toast"],
    ] as const) {
      expect(modules.get(id), `no ${id} module`).toContain(selector);
    }
  });
});

describe("installStyleModule", () => {
  it("re-appends a root sheet the host removed instead of creating a second one", () => {
    const first = render(<PanelRoot>First</PanelRoot>);
    const [installed] = headSheets(ROOT_SHEET);
    expect(installed).toBeDefined();

    installed?.remove();
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);

    const second = render(<PanelRoot>Second</PanelRoot>);
    const connected = headSheets(ROOT_SHEET);
    expect(connected).toHaveLength(1);
    expect(connected[0]).toBe(installed);
    expect(installed?.isConnected).toBe(true);

    first.unmount();
    expect(headSheets(ROOT_SHEET)).toHaveLength(1);
    second.unmount();
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
  });

  it("rejects two versions of one module id and accepts different module ids", () => {
    const remove = installStyleModule(
      document,
      "module-conflict",
      { id: "dialog", styles: ".fixture { color: red; }" },
      undefined,
    );

    expect(() =>
      installStyleModule(
        document,
        "module-conflict",
        { id: "dialog", styles: ".fixture { color: blue; }" },
        "another-nonce",
      ),
    ).toThrow(/Conflicting signalk-nearlcrews-ui styles .* module "dialog"/);

    const removeTable = installStyleModule(
      document,
      "module-conflict",
      { id: "table", styles: ".fixture { color: blue; }" },
      undefined,
    );
    expect(headSheets(MODULE_SHEET)).toHaveLength(2);

    remove();
    removeTable();
    expect(headSheets(MODULE_SHEET)).toHaveLength(0);
  });

  it("marks module sheets with their version and id and root sheets as before", () => {
    const removeRoot = installPanelStyles(
      document,
      "marked-version",
      ".root {}",
      "sheet-nonce",
    );
    const removeModule = installStyleModule(
      document,
      "marked-version",
      { id: "dialog", styles: ".overlay {}" },
      "sheet-nonce",
    );

    const [root] = headSheets(ROOT_SHEET);
    const [module] = headSheets(MODULE_SHEET);
    expect(root?.dataset.snuiStyles).toBe("marked-version");
    expect(root?.dataset.snuiStyleModule).toBeUndefined();
    expect(module?.dataset.snuiModuleStyles).toBe("marked-version");
    expect(module?.dataset.snuiStyleModule).toBe("dialog");
    expect(module?.nonce).toBe("sheet-nonce");
    expect(root?.nextElementSibling).toBe(module);

    removeModule();
    removeRoot();
  });

  it("puts a re-appended root sheet back ahead of its module sheets", () => {
    const removeRoot = installPanelStyles(
      document,
      "ordered-version",
      ".root {}",
      undefined,
    );
    const removeModule = installStyleModule(
      document,
      "ordered-version",
      { id: "dialog", styles: ".overlay {}" },
      undefined,
    );
    const [root] = headSheets(ROOT_SHEET);
    const [module] = headSheets(MODULE_SHEET);

    root?.remove();
    const removeRootAgain = installPanelStyles(
      document,
      "ordered-version",
      ".root {}",
      undefined,
    );

    expect(headSheets(ROOT_SHEET)).toEqual([root]);
    expect(root?.nextElementSibling).toBe(module);

    removeRootAgain();
    removeRoot();
    removeModule();
  });

  it("ignores a second call to the same remover", () => {
    const remove = installPanelStyles(
      document,
      "double-release",
      ".root {}",
      undefined,
    );
    const removeAgain = installPanelStyles(
      document,
      "double-release",
      ".root {}",
      undefined,
    );

    remove();
    remove();
    expect(headSheets(ROOT_SHEET)).toHaveLength(1);
    removeAgain();
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
  });

  it("reports the nonces the root sheet is installed under", () => {
    expect(installedRootStyleNonces(document, "nonce-report")).toEqual([]);

    const removeFirst = installPanelStyles(
      document,
      "nonce-report",
      ".root {}",
      "first",
    );
    const removeSecond = installPanelStyles(
      document,
      "nonce-report",
      ".root {}",
      "second",
    );
    const removeModule = installStyleModule(
      document,
      "nonce-report",
      { id: "table", styles: ".table {}" },
      "first",
    );

    expect(installedRootStyleNonces(document, "nonce-report")).toEqual([
      "first",
      "second",
    ]);

    removeFirst();
    removeSecond();
    removeModule();
  });
});

describe("useModuleStyles", () => {
  it("installs one module sheet per panel document under the root nonce", () => {
    const { unmount } = render(
      <PanelRoot styleNonce="panel-nonce">
        <ModuleConsumer module={DIALOG_STYLES} name="Dialog" />
        <ModuleConsumer module={DIALOG_STYLES} name="Menu" />
      </PanelRoot>,
    );

    const sheets = headSheets(MODULE_SHEET);
    expect(sheets).toHaveLength(1);
    expect(sheets[0]?.dataset.snuiModuleStyles).toBe(PACKAGE_VERSION);
    expect(sheets[0]?.dataset.snuiStyleModule).toBe("dialog");
    expect(sheets[0]?.nonce).toBe("panel-nonce");
    expect(sheets[0]?.textContent).toBe(DIALOG_STYLES.styles);
    expect(headSheets(ROOT_SHEET)[0]?.nextElementSibling).toBe(sheets[0]);

    unmount();
    expect(headSheets(MODULE_SHEET)).toHaveLength(0);
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
  });

  it("keeps the sheet while any consumer remains and installs each module once", () => {
    const { rerender, unmount } = render(
      <PanelRoot>
        <ModuleConsumer module={DIALOG_STYLES} name="Dialog" />
        <ModuleConsumer module={TABLE_STYLES} name="DataGrid" />
        <ModuleConsumer module={TABLE_STYLES} name="SecondGrid" />
      </PanelRoot>,
    );

    expect(
      headSheets(MODULE_SHEET).map((sheet) => sheet.dataset.snuiStyleModule),
    ).toEqual(["dialog", "table"]);

    rerender(
      <PanelRoot>
        <ModuleConsumer module={TABLE_STYLES} name="SecondGrid" />
      </PanelRoot>,
    );
    expect(
      headSheets(MODULE_SHEET).map((sheet) => sheet.dataset.snuiStyleModule),
    ).toEqual(["table"]);

    unmount();
    expect(headSheets(MODULE_SHEET)).toHaveLength(0);
  });

  it("re-appends a module sheet the host removed", () => {
    const first = render(
      <PanelRoot>
        <ModuleConsumer module={TABLE_STYLES} name="DataGrid" />
      </PanelRoot>,
    );
    const [installed] = headSheets(MODULE_SHEET);
    installed?.remove();

    const second = render(
      <PanelRoot>
        <ModuleConsumer module={TABLE_STYLES} name="OtherGrid" />
      </PanelRoot>,
    );

    expect(headSheets(MODULE_SHEET)).toEqual([installed]);
    expect(installed?.isConnected).toBe(true);

    first.unmount();
    second.unmount();
  });

  it("shares one sheet across panel roots and installs under every root nonce", () => {
    const { unmount } = render(
      <>
        <PanelRoot styleNonce="alpha">
          <ModuleConsumer module={DIALOG_STYLES} name="Dialog" />
        </PanelRoot>
        <PanelRoot styleNonce="beta">
          <ModuleConsumer module={DIALOG_STYLES} name="Popover" />
        </PanelRoot>
      </>,
    );

    expect(headSheets(ROOT_SHEET).map((sheet) => sheet.nonce)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(
      headSheets(MODULE_SHEET)
        .map((sheet) => sheet.nonce)
        .sort(),
    ).toEqual(["alpha", "beta"]);

    unmount();
    expect(headSheets(MODULE_SHEET)).toHaveLength(0);
  });

  it("names the component in the error thrown outside PanelRoot", () => {
    expect(() =>
      render(<ModuleConsumer module={DIALOG_STYLES} name="Dialog" />),
    ).toThrow("Dialog must be rendered inside PanelRoot.");
  });

  it("rejects a nested provider that resolves no portal container", () => {
    // A host that installs its own portal provider inside the panel would
    // otherwise install the module sheet against a root it does not own.
    expect(() =>
      render(
        <PanelRoot>
          <UNSAFE_PortalProvider getContainer={() => null}>
            <ModuleConsumer module={DIALOG_STYLES} name="Dialog" />
          </UNSAFE_PortalProvider>
        </PanelRoot>,
      ),
    ).toThrow("Dialog portal container must be its owning PanelRoot.");
  });
});

/*
 * The in-flow controls that own a module install it the way the overlays do,
 * and differ in one place: outside PanelRoot they render unstyled rather than
 * throwing, which is what they did while their rules traveled in the root
 * sheet. Making them throw would be a breaking change dressed as packaging.
 */
describe("useOptionalModuleStyles", () => {
  it("installs a control's own module from inside PanelRoot", () => {
    const { unmount } = render(
      <PanelRoot>
        <Switch label="Autopilot" />
        <Progress label="Sync" value={40} />
        <RangeInput aria-label="Depth" />
      </PanelRoot>,
    );

    expect(
      headSheets(MODULE_SHEET)
        .map((sheet) => sheet.dataset.snuiStyleModule)
        .sort(),
    ).toEqual(["progress", "range", "switch"]);

    unmount();
    expect(headSheets(MODULE_SHEET)).toHaveLength(0);
  });

  it("renders an in-flow control outside PanelRoot without throwing", () => {
    expect(() => render(<Switch label="Autopilot" />)).not.toThrow();
    expect(headSheets(MODULE_SHEET)).toHaveLength(0);
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
  });
});
