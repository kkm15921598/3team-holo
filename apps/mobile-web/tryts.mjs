import ts from 'typescript';
import fs from 'fs';
const f = 'src/features/profile/profile-detail-screen.tsx';
const code = fs.readFileSync(f, 'utf-8');
try {
  const result = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, isolatedModules: true },
    fileName: f,
    reportDiagnostics: true,
  });
  if (result.diagnostics?.length) {
    console.log('Diagnostics:');
    for (const d of result.diagnostics) {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
      console.log(' -', msg);
    }
  } else {
    console.log('Transpile OK');
  }
  // Check if export ProfileDetailScreen is in output
  if (result.outputText.includes('export { ProfileDetailScreen }') || result.outputText.includes('ProfileDetailScreen };') || /export\s.*ProfileDetailScreen/.test(result.outputText)) {
    console.log('Output has ProfileDetailScreen export');
  } else {
    console.log('NO ProfileDetailScreen export in output');
    console.log(result.outputText.slice(-500));
  }
} catch (e) {
  console.log('Error:', e.message);
}
