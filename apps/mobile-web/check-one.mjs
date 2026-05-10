import { transformSync } from 'esbuild';
import fs from 'fs';
const f = process.argv[2];
try {
  const code = fs.readFileSync(f, 'utf-8');
  transformSync(code, { loader: f.endsWith('tsx') ? 'tsx' : 'ts' });
  console.log('OK');
} catch (e) {
  console.log(JSON.stringify(e, null, 2));
  console.log('---');
  console.log(e.message);
}
