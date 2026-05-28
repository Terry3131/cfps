const fs = require('fs');
const path = require('path');

function getRequires(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const matches = [...content.matchAll(/require\(['"]([^'"]+)['"]\)/g)];
    return matches.map(m => m[1]).filter(r => r.startsWith('.'));
  } catch { return []; }
}

function resolve(from, to) {
  const base = path.resolve(path.dirname(from), to);
  for (const ext of ['', '.js', '/index.js']) {
    try { fs.accessSync(base + ext); return base + ext; } catch {}
  }
  return null;
}

function trace(file, chain = []) {
  const abs = path.resolve(file);
  if (chain.includes(abs)) {
    console.log('CIRCULAR:\n  ' + [...chain, abs].map(f => f.replace(process.cwd(), '')).join('\n  -> '));
    return;
  }
  for (const req of getRequires(abs)) {
    const resolved = resolve(abs, req);
    if (resolved && resolved.includes('src')) trace(resolved, [...chain, abs]);
  }
}

trace('./src/routes/notificationRoutes.js');