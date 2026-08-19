import { readFile } from "node:fs/promises";
import { readPackageJson, repositoryPath } from "./lib/paths.mjs";
import { assertReactAriaContract } from "./lib/react-aria-contract.mjs";

const [manifest, packageLock] = await Promise.all([
  readPackageJson(),
  readFile(repositoryPath("package-lock.json"), "utf8").then(JSON.parse),
]);
const versions = assertReactAriaContract(manifest, packageLock);

process.stdout.write(
  `React Aria dependency contract satisfied with react-aria ${versions.reactAria} and react-aria-components ${versions.reactAriaComponents}.\n`,
);
