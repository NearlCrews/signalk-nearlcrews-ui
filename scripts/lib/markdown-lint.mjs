/**
 * Lints Markdown with markdownlint, the library, called directly.
 *
 * The command line wrapper around it exists to find files by glob, and its
 * glob stack is the part that carried advisories. The repository already
 * walks its own Markdown for the link check, so the wrapper adds nothing here
 * but that stack.
 */
import { relative } from "node:path";

import { lint } from "markdownlint/promise";

/**
 * One line per finding in `files`, in the order the files were given:
 * `path:line: rule description [detail]`, with the path relative to `root`.
 * `config` is a markdownlint configuration object.
 */
export async function markdownLintFailures(files, config, root) {
  const results = await lint({ config, files });
  return files.flatMap((file) =>
    results[file].map((issue) => {
      const detail = issue.errorDetail ?? issue.errorContext;
      const suffix = detail ? ` [${detail}]` : "";
      return `${relative(root, file)}:${String(issue.lineNumber)}: ${issue.ruleNames.join("/")} ${issue.ruleDescription}${suffix}`;
    }),
  );
}
