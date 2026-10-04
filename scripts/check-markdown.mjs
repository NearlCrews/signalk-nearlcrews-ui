/**
 * Lints every Markdown file in the repository.
 *
 * The rules live in .markdownlint.json, which an editor extension reads too,
 * and the lint itself in ./lib/markdown-lint.mjs; this file is the runner
 * `npm run lint:docs` invokes.
 */
import { markdownLintFailures } from "./lib/markdown-lint.mjs";
import {
  collectMarkdownFiles,
  readJson,
  repositoryPath,
} from "./lib/paths.mjs";

const repositoryRoot = repositoryPath();
const [files, config] = await Promise.all([
  collectMarkdownFiles(repositoryRoot),
  readJson(repositoryPath(".markdownlint.json")),
]);

const failures = await markdownLintFailures(files, config, repositoryRoot);
if (failures.length > 0) {
  throw new Error(`Markdown lint failed:\n${failures.join("\n")}`);
}

process.stdout.write(
  `Markdown lint passed for ${String(files.length)} Markdown files.\n`,
);
