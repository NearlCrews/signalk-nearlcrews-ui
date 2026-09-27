import { readJson, readPackageJson, repositoryPath } from "./lib/paths.mjs";
import { assertReactAriaContract } from "./lib/react-aria-contract.mjs";

const [manifest, packageLock] = await Promise.all([
  readPackageJson(),
  readJson(repositoryPath("package-lock.json")),
]);
const versions = assertReactAriaContract(manifest, packageLock);

process.stdout.write(
  `React Aria dependency contract satisfied with react-aria ${versions.reactAria} and react-aria-components ${versions.reactAriaComponents}.\n`,
);
