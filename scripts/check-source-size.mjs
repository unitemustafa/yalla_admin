import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const maxLines = 800;
const sourceDirectories = [
  "app",
  "components",
  "features",
  "lib",
  "tests",
  "scripts",
];
const sourceExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function countLines(content) {
  if (content.length === 0) return 0;

  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").length;
  return normalized.endsWith("\n") ? lines - 1 : lines;
}

const sourceFiles = (
  await Promise.all(
    sourceDirectories.map((directory) =>
      collectSourceFiles(path.join(projectRoot, directory)),
    ),
  )
).flat();

const results = await Promise.all(
  sourceFiles.map(async (filePath) => ({
    filePath,
    lines: countLines(await readFile(filePath, "utf8")),
  })),
);
const oversizedFiles = results
  .filter(({ lines }) => lines > maxLines)
  .sort((left, right) => right.lines - left.lines);

if (oversizedFiles.length > 0) {
  console.error(`Source-size check failed; limit is ${maxLines} lines:`);
  for (const { filePath, lines } of oversizedFiles) {
    console.error(`- ${path.relative(projectRoot, filePath)}: ${lines} lines`);
  }
  process.exitCode = 1;
} else {
  const largestFile = results.reduce((largest, current) =>
    current.lines > largest.lines ? current : largest,
  );
  console.log(
    `Source-size check passed: ${results.length} files, largest is ${path.relative(projectRoot, largestFile.filePath)} at ${largestFile.lines} lines.`,
  );
}
