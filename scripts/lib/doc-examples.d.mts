/*
 * Types for the part of doc-examples.mjs the TypeScript render test reads.
 * The compile script and its own test are plain JavaScript and need none.
 */

/** A `tsx` fence read from a consumer document. */
export interface DocExample {
  /** The document path, from the repository root. */
  readonly file: string;
  /** The nearest heading above the fence. */
  readonly heading: string;
  /** The one-based line of the opening fence. */
  readonly line: number;
  /** The code, with the fence's own indentation removed. */
  readonly source: string;
}

export declare const DOC_EXAMPLE_FILES: readonly string[];
export declare function extractTsxExamples(
  markdown: string,
  file: string,
): DocExample[];
export declare function isModuleExample(source: string): boolean;
export declare function exampleLocation(example: DocExample): string;
