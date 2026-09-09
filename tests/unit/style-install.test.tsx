import { render } from "@testing-library/react";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";
import { afterEach, describe, expect, it } from "vitest";

import { PanelRoot } from "../../src/index.js";
import {
  OVERLAY_STYLES,
  STYLE_MODULES,
  TABLE_STYLES,
} from "../../src/styles/index.js";
import {
  installedRootStyleNonces,
  installPanelStyles,
  installStyleModule,
  type StyleModule,
} from "../../src/styles/install.js";
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

describe("style module manifest", () => {
  it("keeps overlay and table selectors out of the root sheet", () => {
    const [root] = STYLE_MODULES;
    expect(root?.id).toBe("root");
    for (const selector of [
      ".snui-dialog",
      ".snui-menu",
      ".snui-popover",
      ".snui-toast",
      ".snui-data-grid",
    ]) {
      expect(root?.styles, `root sheet styles ${selector}`).not.toContain(
        selector,
      );
    }
    expect(OVERLAY_STYLES.styles).toContain(".snui-dialog");
    expect(OVERLAY_STYLES.styles).toContain(".snui-toast");
    expect(TABLE_STYLES.styles).toContain(".snui-data-grid");
  });

  it("gives every module a distinct id", () => {
    const ids = STYLE_MODULES.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
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
      { id: "overlays", styles: ".fixture { color: red; }" },
      undefined,
    );

    expect(() =>
      installStyleModule(
        document,
        "module-conflict",
        { id: "overlays", styles: ".fixture { color: blue; }" },
        "another-nonce",
      ),
    ).toThrow(/Conflicting signalk-nearlcrews-ui styles .* module "overlays"/);

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
      { id: "overlays", styles: ".overlay {}" },
      "sheet-nonce",
    );

    const [root] = headSheets(ROOT_SHEET);
    const [module] = headSheets(MODULE_SHEET);
    expect(root?.dataset.snuiStyles).toBe("marked-version");
    expect(root?.dataset.snuiStyleModule).toBeUndefined();
    expect(module?.dataset.snuiModuleStyles).toBe("marked-version");
    expect(module?.dataset.snuiStyleModule).toBe("overlays");
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
      { id: "overlays", styles: ".overlay {}" },
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
        <ModuleConsumer module={OVERLAY_STYLES} name="Dialog" />
        <ModuleConsumer module={OVERLAY_STYLES} name="Menu" />
      </PanelRoot>,
    );

    const sheets = headSheets(MODULE_SHEET);
    expect(sheets).toHaveLength(1);
    expect(sheets[0]?.dataset.snuiModuleStyles).toBe(PACKAGE_VERSION);
    expect(sheets[0]?.dataset.snuiStyleModule).toBe("overlays");
    expect(sheets[0]?.nonce).toBe("panel-nonce");
    expect(sheets[0]?.textContent).toBe(OVERLAY_STYLES.styles);
    expect(headSheets(ROOT_SHEET)[0]?.nextElementSibling).toBe(sheets[0]);

    unmount();
    expect(headSheets(MODULE_SHEET)).toHaveLength(0);
    expect(headSheets(ROOT_SHEET)).toHaveLength(0);
  });

  it("keeps the sheet while any consumer remains and installs each module once", () => {
    const { rerender, unmount } = render(
      <PanelRoot>
        <ModuleConsumer module={OVERLAY_STYLES} name="Dialog" />
        <ModuleConsumer module={TABLE_STYLES} name="DataGrid" />
        <ModuleConsumer module={TABLE_STYLES} name="SecondGrid" />
      </PanelRoot>,
    );

    expect(
      headSheets(MODULE_SHEET).map((sheet) => sheet.dataset.snuiStyleModule),
    ).toEqual(["overlays", "table"]);

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
          <ModuleConsumer module={OVERLAY_STYLES} name="Dialog" />
        </PanelRoot>
        <PanelRoot styleNonce="beta">
          <ModuleConsumer module={OVERLAY_STYLES} name="Popover" />
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
      render(<ModuleConsumer module={OVERLAY_STYLES} name="Dialog" />),
    ).toThrow("Dialog must be rendered inside PanelRoot.");
  });

  it("rejects a nested provider that resolves no portal container", () => {
    // A host that installs its own portal provider inside the panel would
    // otherwise install the module sheet against a root it does not own.
    expect(() =>
      render(
        <PanelRoot>
          <UNSAFE_PortalProvider getContainer={() => null}>
            <ModuleConsumer module={OVERLAY_STYLES} name="Dialog" />
          </UNSAFE_PortalProvider>
        </PanelRoot>,
      ),
    ).toThrow("Dialog portal container must be its owning PanelRoot.");
  });
});
