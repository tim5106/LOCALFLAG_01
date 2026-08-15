import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const source = readFileSync(new URL('../packages/contracts/openapi.yaml', import.meta.url), 'utf8');
const document = parse(source);

if (document.openapi !== '3.1.0') {
  throw new Error(`Expected OpenAPI 3.1.0, received ${document.openapi ?? 'nothing'}.`);
}

if (!document.info?.title || !document.info?.version) {
  throw new Error('OpenAPI info.title and info.version are required.');
}

const pathCount = Object.keys(document.paths ?? {}).length;
if (pathCount === 0) {
  throw new Error('OpenAPI must define at least one path.');
}

console.info(`OpenAPI contract parsed: ${document.info.title} (${pathCount} paths)`);
