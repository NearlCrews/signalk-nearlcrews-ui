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
  /** Every value currently registered on the document, for conflict checks. */
  values(ownerDocument: Document): readonly V[];
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
      let record = records.get(key);
      if (record === undefined) {
        record = { ...create(), references: 0 };
        records.set(key, record);
      }
      if (!record.element.isConnected) record.attach();
      record.references += 1;
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

    values(ownerDocument) {
      const records = read(ownerDocument);
      return records === undefined
        ? []
        : [...records.values()].map((record) => record.value);
    },
  };
}
