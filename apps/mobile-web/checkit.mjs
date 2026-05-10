import ts from 'typescript';
import fs from 'fs';
const f = 'src/features/profile/profile-detail-screen.tsx';
const code = fs.readFileSync(f, 'utf-8');
const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diags = sf.parseDiagnostics || [];
console.log('Parse diagnostics:', diags.length);
for (const d of diags) {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start);
  console.log('  line', line + 1, ':', ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}
// Check for export statements
ts.forEachChild(sf, (node) => {
  if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
    console.log('Found export:', node.name?.text || '<anon>');
  }
});
