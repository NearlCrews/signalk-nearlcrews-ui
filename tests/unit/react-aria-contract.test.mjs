import { describe, expect, it } from "vitest";

import { assertReactAriaContract } from "../../scripts/lib/react-aria-contract.mjs";

const manifest = {
  dependencies: {
    "react-aria": "^3.51.0",
    "react-aria-components": "^1.20.0",
  },
  peerDependencies: {
    react: ">=19.2.0 <20.0.0",
    "react-dom": ">=19.2.0 <20.0.0",
  },
};

const packageLock = {
  packages: {
    "node_modules/react": { version: "19.2.8" },
    "node_modules/react-dom": { version: "19.2.8" },
    "node_modules/react-aria": {
      version: "3.51.0",
      peerDependencies: {
        react: "^19.0.0-rc.1",
        "react-dom": "^19.0.0-rc.1",
      },
    },
    "node_modules/react-aria-components": {
      version: "1.20.0",
      dependencies: { "react-aria": "3.51.0" },
      peerDependencies: {
        react: "^19.0.0-rc.1",
        "react-dom": "^19.0.0-rc.1",
      },
    },
  },
};

describe("React Aria dependency contract", () => {
  it("accepts one compatible deduplicated dependency tree", () => {
    expect(assertReactAriaContract(manifest, packageLock)).toEqual({
      reactAria: "3.51.0",
      reactAriaComponents: "1.20.0",
    });
  });

  it("rejects a nested second react-aria copy", () => {
    const duplicated = globalThis.structuredClone(packageLock);
    duplicated.packages[
      "node_modules/react-aria-components/node_modules/react-aria"
    ] = { version: "3.50.0" };
    expect(() => assertReactAriaContract(manifest, duplicated)).toThrow(
      "Expected exactly one installed react-aria package, found 2.",
    );
  });

  it("rejects a react-aria-components dependency mismatch", () => {
    const incompatible = globalThis.structuredClone(packageLock);
    incompatible.packages["node_modules/react-aria-components"].dependencies[
      "react-aria"
    ] = "3.50.0";
    expect(() => assertReactAriaContract(manifest, incompatible)).toThrow(
      "The single react-aria copy and react-aria-components dependency is incompatible (3.51.0 versus 3.50.0).",
    );
  });
});
