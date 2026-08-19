import { satisfies } from "semver";

function requiredObject(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${description} must be an object.`);
  }
  return value;
}

function singleInstalledPackage(packages, packageName) {
  const suffix = `/node_modules/${packageName}`;
  const matches = Object.entries(packages).filter(
    ([path]) => path === `node_modules/${packageName}` || path.endsWith(suffix),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one installed ${packageName} package, found ${matches.length}.`,
    );
  }
  return matches[0][1];
}

function requireCompatibleVersion(version, range, description) {
  if (
    typeof version !== "string" ||
    typeof range !== "string" ||
    !satisfies(version, range)
  ) {
    throw new Error(
      `${description} is incompatible (${version} versus ${range}).`,
    );
  }
}

export function assertReactAriaContract(manifest, packageLock) {
  const dependencies = requiredObject(
    manifest.dependencies,
    "package.json dependencies",
  );
  const peerDependencies = requiredObject(
    manifest.peerDependencies,
    "package.json peerDependencies",
  );
  const packages = requiredObject(
    packageLock.packages,
    "package-lock packages",
  );

  const reactAria = singleInstalledPackage(packages, "react-aria");
  const components = singleInstalledPackage(packages, "react-aria-components");
  const react = singleInstalledPackage(packages, "react");
  const reactDom = singleInstalledPackage(packages, "react-dom");

  requireCompatibleVersion(
    reactAria.version,
    dependencies["react-aria"],
    "The installed react-aria version and package dependency",
  );
  requireCompatibleVersion(
    components.version,
    dependencies["react-aria-components"],
    "The installed react-aria-components version and package dependency",
  );
  requireCompatibleVersion(
    reactAria.version,
    components.dependencies?.["react-aria"],
    "The single react-aria copy and react-aria-components dependency",
  );

  for (const [name, installed] of [
    ["react", react],
    ["react-dom", reactDom],
  ]) {
    requireCompatibleVersion(
      installed.version,
      peerDependencies[name],
      `The installed ${name} version and package peer dependency`,
    );
    requireCompatibleVersion(
      installed.version,
      reactAria.peerDependencies?.[name],
      `The installed ${name} version and react-aria peer dependency`,
    );
    requireCompatibleVersion(
      installed.version,
      components.peerDependencies?.[name],
      `The installed ${name} version and react-aria-components peer dependency`,
    );
  }

  return {
    reactAria: reactAria.version,
    reactAriaComponents: components.version,
  };
}
