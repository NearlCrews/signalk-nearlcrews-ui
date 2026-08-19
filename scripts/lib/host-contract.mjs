const DEFAULT_ATTEMPTS = 3;

function describeRegistryResult(value) {
  if (Array.isArray(value)) {
    return `array(length=${value.length})`;
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "object") {
    return `object(keys=${Object.keys(value).sort().join(",")})`;
  }
  return typeof value;
}

function safeCommandFailure(error) {
  if (error !== null && typeof error === "object") {
    if (typeof error.status === "number") {
      return `npm view exited with status ${error.status}`;
    }
    if (typeof error.signal === "string") {
      return `npm view was terminated by ${error.signal}`;
    }
  }
  return "npm view failed";
}

function normalizeRegistryResult(parsed, contractPackage) {
  let result = parsed;
  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      throw new Error(
        `The npm registry returned ${describeRegistryResult(parsed)} for ${contractPackage}; expected one contract object.`,
      );
    }
    [result] = parsed;
  }

  if (
    result === null ||
    typeof result !== "object" ||
    typeof result.version !== "string" ||
    result.peerDependencies === null ||
    typeof result.peerDependencies !== "object" ||
    Array.isArray(result.peerDependencies) ||
    Object.values(result.peerDependencies).some(
      (range) => typeof range !== "string",
    )
  ) {
    throw new Error(
      `The npm registry returned ${describeRegistryResult(parsed)} for ${contractPackage}; expected version and peerDependencies fields.`,
    );
  }

  return result;
}

export function parseRegistryContract(output, contractPackage) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error(
      `The npm registry returned invalid JSON for ${contractPackage} (${Buffer.byteLength(output)} bytes).`,
    );
  }

  const result = normalizeRegistryResult(parsed, contractPackage);
  return {
    package: contractPackage,
    peerDependencies: Object.fromEntries(
      Object.entries(result.peerDependencies).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    version: result.version,
  };
}

export function formatContractDiff(committed, published) {
  const lines = ["Host contract drift detected:"];
  if (committed.package !== published.package) {
    lines.push(
      `- package: ${committed.package}`,
      `+ package: ${published.package}`,
    );
  }
  if (committed.version !== published.version) {
    lines.push(
      `- version: ${committed.version}`,
      `+ version: ${published.version}`,
    );
  }

  const names = new Set([
    ...Object.keys(committed.peerDependencies),
    ...Object.keys(published.peerDependencies),
  ]);
  for (const name of [...names].sort()) {
    const committedRange = committed.peerDependencies[name] ?? "<missing>";
    const publishedRange = published.peerDependencies[name] ?? "<missing>";
    if (committedRange !== publishedRange) {
      lines.push(
        `- peerDependencies.${name}: ${committedRange}`,
        `+ peerDependencies.${name}: ${publishedRange}`,
      );
    }
  }

  return lines.join("\n");
}

export function contractsMatch(committed, published) {
  return (
    committed.package === published.package &&
    committed.version === published.version &&
    JSON.stringify(committed.peerDependencies) ===
      JSON.stringify(published.peerDependencies)
  );
}

export async function fetchRegistryContract({
  contractPackage,
  runNpm,
  attempts = DEFAULT_ATTEMPTS,
  wait = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  report = (message) => process.stderr.write(`${message}\n`),
}) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) {
    throw new Error("Registry attempts must be an integer from 1 through 5.");
  }

  let lastFailure = "npm view failed";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      let output;
      try {
        output = runNpm([
          "view",
          `${contractPackage}@latest`,
          "version",
          "peerDependencies",
          "--json",
        ]);
      } catch (error) {
        throw new Error(safeCommandFailure(error), { cause: error });
      }
      return parseRegistryContract(output, contractPackage);
    } catch (error) {
      lastFailure =
        error instanceof Error ? error.message : "Unknown registry failure";
      if (attempt < attempts) {
        report(
          `Host contract registry attempt ${attempt}/${attempts} failed: ${lastFailure}. Retrying.`,
        );
        await wait(attempt * 1_000);
      }
    }
  }

  throw new Error(
    `Unable to read ${contractPackage}@latest after ${attempts} attempts. Last failure: ${lastFailure}.`,
  );
}
