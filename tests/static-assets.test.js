const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Kontroller transitive HTML/CSS-avhengigheter, også filer som mangler fra en ren klone.
test('all three entry points include their local scripts and styles', () => {
  const root = path.resolve(__dirname, '..');
  const seen = new Set();
  function check(file) {
    assert.ok(fs.existsSync(file), `Missing static asset: ${path.relative(root, file)}`);
    if (seen.has(file)) return;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    // Dynamisk import() i et script løses mot scriptets egen URL, ikke sidens.
    const pattern = file.endsWith('.html')
      ? /(?:src|href)=["']([^"']+)["']/g
      : file.endsWith('.js')
        ? /import\(\s*["']([^"']+)["']\s*\)/g
        : /(?:url\(\s*["']?([^\s"')]+)["']?\s*\)|@import\s+["']([^"']+)["'])/g;
    if (!/\.(html|css|js)$/.test(file)) return;
    for (const match of source.matchAll(pattern)) {
      const ref = match[1] || match[2];
      if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
      const target = ref.split(/[?#]/)[0];
      if (target) check(path.resolve(path.dirname(file), target));
    }
  }
  for (const file of ['sitter.html', 'family-game.html', 'family-practice.html']) check(path.join(root, file));
});
