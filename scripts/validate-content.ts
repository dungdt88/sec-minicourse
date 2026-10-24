// Usage: pnpm validate-content [path/to/course-content.json]
import { readFileSync } from 'node:fs';
import { validateContent } from '../src/content/validate';

const file = process.argv[2] ?? 'content/course-content.json';
const result = validateContent(JSON.parse(readFileSync(file, 'utf8')));
if (result.ok) {
  const c = result.content;
  console.log(`OK ${file}: content ${c.contentVersion}, ${c.levels.length} levels`);
} else {
  console.error(`${result.errors.length} error(s) in ${file}:`);
  for (const e of result.errors) console.error(`  [${e.id ?? '-'}] ${e.where}: ${e.message}`);
  process.exit(1);
}
