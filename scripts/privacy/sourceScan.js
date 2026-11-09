// Static scan of app source for network and location API usage (10 P1/P7, 12 §4).
// Phase 1 adds ESLint rules for the same; this grep is the CI backstop.
const fs = require('fs');
const path = require('path');

const SCAN_ROOTS = ['src', 'App.tsx', 'index.ts'];
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const IGNORED_DIRS = new Set(['node_modules', '__tests__', '__mocks__']);

const BANNED = [
  { pattern: /\bfetch\s*\(/, reason: 'network: fetch()' },
  { pattern: /\bXMLHttpRequest\b/, reason: 'network: XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, reason: 'network: WebSocket' },
  { pattern: /\bEventSource\b/, reason: 'network: EventSource' },
  { pattern: /\bsendBeacon\b/, reason: 'network: sendBeacon' },
  { pattern: /\bgeolocation\b/i, reason: 'location API' },
  { pattern: /['"]expo-location['"]/, reason: 'location module import' },
  { pattern: /['"]react-native-maps['"]/, reason: 'maps module import' },
];

function scanText(text) {
  return text.split('\n').flatMap((line, index) =>
    BANNED.filter(({ pattern }) => pattern.test(line)).map(({ reason }) => ({
      line: index + 1,
      reason,
    })),
  );
}

function listSourceFiles(root, entry) {
  const full = path.join(root, entry);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return SOURCE_EXT.test(full) ? [full] : [];
  return fs
    .readdirSync(full)
    .filter((child) => !IGNORED_DIRS.has(child))
    .flatMap((child) => listSourceFiles(root, path.join(entry, child)));
}

function scanProject(root) {
  return SCAN_ROOTS.flatMap((entry) => listSourceFiles(root, entry)).flatMap((file) =>
    scanText(fs.readFileSync(file, 'utf8')).map((hit) => ({
      file: path.relative(root, file),
      ...hit,
    })),
  );
}

function main() {
  const root = process.argv[2] || process.cwd();
  const hits = scanProject(root);
  if (hits.length > 0) {
    hits.forEach((h) => console.error(`BANNED ${h.file}:${h.line} — ${h.reason}`));
    process.exit(1);
  }
  console.log('OK: no network or location API usage in app source.');
}

if (require.main === module) main();

module.exports = { main, scanText, scanProject, BANNED };
