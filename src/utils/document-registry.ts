/**
 * Reference-counted records shared through the owner document.
 *
 * Independently bundled copies of this package can mount in one Admin
 * document. Module state would give each copy its own style element or toast
 * host, so the records live on the document under a `Symbol.for` key, where
 * every copy finds the same map. The map is removed from the document again
 * once its last record is released.
 */

export interface DocumentRegistryRecord<V> {
  /**
   * The node the record owns. A host that removes it (an Admin re-render that
   * replaces the head, for example) gets it appended again on the next acquire.
   */
  readonly element: Element;
  /**
   * Appends `element` where it belongs. The registry calls it whenever an
   * acquire finds the element disconnected, including right after `create`
   * when the factory did not append the element itself.
   */
  readonly attach: () => void;
  /** Runs after the final release, once the record has been forgotten. */
  readonly dispose: () => void;
  /** What every acquirer receives. */
  readonly value: V;
}

interface CountedRecord<V> extends DocumentRegistryRecord<V> {
  references: number;
}

export interface DocumentRegistry<K, V> {
  /** Returns the shared value for `key`, creating its record on first use. */
  acquire(
    ownerDocument: Document,
    key: K,
    create: () => DocumentRegistryRecord<V>,
  ): V;
  /** Drops one reference. The last release disposes and forgets the record. */
  release(ownerDocument: Document, key: K): void;
  /**
   * Every value currently registered on the document, for conflict checks.
   * Yielded rather than collected: the style installer scans the records twice
   * per module it installs, and neither scan keeps the list.
   */
  values(ownerDocument: Document): Iterable<V>;
}

/**
 * Creates a registry whose records are stored on each document under
 * `Symbol.for(symbolKey)`. Change the key whenever the record shape changes, so
 * a package version that stores the old shape never reads the new one.
 */
export function createDocumentRegistry<K, V>(
  symbolKey: string,
): DocumentRegistry<K, V> {
  const registryKey = Symbol.for(symbolKey);

  function read(ownerDocument: Document): Map<K, CountedRecord<V>> | undefined {
    return Reflect.get(ownerDocument, registryKey) as
      | Map<K, CountedRecord<V>>
      | undefined;
  }

  function open(ownerDocument: Document): Map<K, CountedRecord<V>> {
    const existing = read(ownerDocument);
    if (existing !== undefined) return existing;

    const records = new Map<K, CountedRecord<V>>();
    Reflect.defineProperty(ownerDocument, registryKey, {
      configurable: true,
      value: records,
    });
    return records;
  }

  return {
    acquire(ownerDocument, key, create) {
      const records = open(ownerDocument);
      const existing = records.get(key);
      if (existing !== undefined) {
        if (!existing.element.isConnected) existing.attach();
        existing.references += 1;
        return existing.value;
      }

      const record: CountedRecord<V> = { ...create(), references: 1 };
      // Attached before the map hears about it. An attach that throws, against
      // a head the host has replaced for example, would otherwise leave a
      // record with no references that nothing can ever release and that the
      // conflict check goes on reporting as installed.
      if (!record.element.isConnected) record.attach();
      records.set(key, record);
      return record.value;
    },

    release(ownerDocument, key) {
      const records = read(ownerDocument);
      const record = records?.get(key);
      if (records === undefined || record === undefined) return;

      record.references -= 1;
      if (record.references > 0) return;

      records.delete(key);
      if (records.size === 0) {
        Reflect.deleteProperty(ownerDocument, registryKey);
      }
      record.dispose();
    },

    *values(ownerDocument) {
      const records = read(ownerDocument);
      if (records === undefined) return;

      for (const record of records.values()) yield record.value;
    },
  };
}

/**
 * Wraps a release so it runs at most once, however many times a caller hands
 * it back. React can run an effect cleanup and an explicit teardown for the
 * same subscription, and a second release would drop a reference the registry
 * never took.
 */
export function once(release: () => void): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    release();
  };
}
