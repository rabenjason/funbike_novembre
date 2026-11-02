import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const graphqlEntry = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/graphql/index.graphql");

function flattenGraphqlFile(filePath: string, visited = new Set<string>()): string {
  const absolutePath = resolve(filePath);
  if (visited.has(absolutePath)) return "";
  visited.add(absolutePath);

  const source = readFileSync(absolutePath, "utf8");
  const importPattern = /^\s*#import\s+["']([^"']+)["']\s*$/gm;
  const imports = [...source.matchAll(importPattern)];
  const importedDefinitions = imports
    .map((match) => flattenGraphqlFile(resolve(dirname(absolutePath), match[1]), visited))
    .filter(Boolean)
    .join("\n");
  const localDefinitions = source.replace(/^\s*#import\s+["'][^"']+["']\s*$/gm, "").trim();

  return [importedDefinitions, localDefinitions].filter(Boolean).join("\n");
}

export function loadGraphqlTypeDefs(): string {
  return flattenGraphqlFile(graphqlEntry);
}
