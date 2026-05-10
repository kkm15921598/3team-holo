import ts from 'typescript';
import fs from 'fs';
import { execSync } from 'child_process';
const files = execSync('find src -name "*.tsx" -o -name "*.ts"', { encoding: 'utf-8' }).split('\n').filter(Boolean);
const failures = [];
for (const f of files) {
  const code = fs.readFileSync(f, 'utf-8');
  const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, f.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const diags = sf.parseDiagnostics || [];
  if (diags.length > 0) {
    failures.push(f);
    console.log('FAIL:', f);
    for (const d of diags.slice(0, 2)) {
      const { line } = sf.getLineAndCharacterOfPosition(d.start);
      console.log('  line', line + 1, ':', d.messageText);
    }
  }
}
console.log('---', failures.length, 'parse failures');
