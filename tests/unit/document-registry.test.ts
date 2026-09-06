import { describe, expect, it, vi } from "vitest";

import {
  createDocumentRegistry,
  type DocumentRegistryRecord,
} from "../../src/utils/document-registry.js";

interface FixtureValue {
  readonly label: string;
}

function fixtureRecord(
  label: string,
  parent: Element = document.body,
): DocumentRegistryRecord<FixtureValue> & {
  readonly attach: ReturnType<typeof vi.fn>;
  readonly dispose: ReturnType<typeof vi.fn>;
} {
  const element = document.createElement("div");
  element.dataset.fixture = label;
  return {
    attach: vi.fn(() => {
      parent.append(element);
    }),
    dispose: vi.fn(() => {
      element.remove();
    }),
    element,
    value: { label },
  };
}

describe("createDocumentRegistry", () => {
  it("creates a record once, attaches it, and hands every acquirer the same value", () => {
    const registry = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.once",
    );
    const record = fixtureRecord("shared");
    const create = vi.fn(() => record);

    const first = registry.acquire(document, "key", create);
    const second = registry.acquire(document, "key", create);

    expect(create).toHaveBeenCalledTimes(1);
    expect(record.attach).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first.label).toBe("shared");
    expect(record.element.isConnected).toBe(true);

    registry.release(document, "key");
    registry.release(document, "key");
  });

  it("disposes on the last release and forgets the document map", () => {
    const registry = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.dispose",
    );
    const record = fixtureRecord("counted");

    registry.acquire(document, "key", () => record);
    registry.acquire(document, "key", () => record);
    registry.release(document, "key");

    expect(record.dispose).not.toHaveBeenCalled();
    expect(record.element.isConnected).toBe(true);
    expect(registry.values(document)).toEqual([{ label: "counted" }]);

    registry.release(document, "key");

    expect(record.dispose).toHaveBeenCalledTimes(1);
    expect(record.element.isConnected).toBe(false);
    expect(registry.values(document)).toEqual([]);
    expect(
      Reflect.get(document, Symbol.for("fixture.registry.dispose")),
    ).toBeUndefined();
  });

  it("reattaches an element the host removed on the next acquire", () => {
    const registry = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.reattach",
    );
    const record = fixtureRecord("removed");

    registry.acquire(document, "key", () => record);
    record.element.remove();
    expect(record.element.isConnected).toBe(false);

    registry.acquire(document, "key", () => {
      throw new Error("the record must be reused, not recreated");
    });

    expect(record.attach).toHaveBeenCalledTimes(2);
    expect(record.element.isConnected).toBe(true);

    registry.release(document, "key");
    registry.release(document, "key");
  });

  it("does not attach twice when the factory already appended its element", () => {
    const registry = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.preattached",
    );
    const record = fixtureRecord("preattached");
    document.body.append(record.element);

    registry.acquire(document, "key", () => record);

    expect(record.attach).not.toHaveBeenCalled();
    registry.release(document, "key");
    expect(record.element.isConnected).toBe(false);
  });

  it("shares one map between two registries created for the same key", () => {
    const first = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.shared",
    );
    const second = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.shared",
    );
    const record = fixtureRecord("bundled twice");

    first.acquire(document, "key", () => record);
    const fromSecond = second.acquire(document, "key", () => {
      throw new Error("the second bundle must find the first bundle's record");
    });

    expect(fromSecond.label).toBe("bundled twice");
    expect(second.values(document)).toEqual([{ label: "bundled twice" }]);

    first.release(document, "key");
    expect(record.dispose).not.toHaveBeenCalled();
    second.release(document, "key");
    expect(record.dispose).toHaveBeenCalledTimes(1);
  });

  it("ignores a release for a key it never registered", () => {
    const registry = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.unknown",
    );

    expect(() => registry.release(document, "missing")).not.toThrow();
    expect(registry.values(document)).toEqual([]);
  });

  it("keeps records of different documents apart", () => {
    const registry = createDocumentRegistry<string, FixtureValue>(
      "fixture.registry.documents",
    );
    const otherDocument = document.implementation.createHTMLDocument("other");
    const record = fixtureRecord("here");
    const otherRecord = fixtureRecord("there", otherDocument.body);

    registry.acquire(document, "key", () => record);
    registry.acquire(otherDocument, "key", () => otherRecord);

    expect(registry.values(document)).toEqual([{ label: "here" }]);
    expect(registry.values(otherDocument)).toEqual([{ label: "there" }]);

    registry.release(document, "key");
    registry.release(otherDocument, "key");
  });
});
