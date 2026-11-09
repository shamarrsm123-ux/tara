// Forbidden-dependency check (06 §2, 10 P1/P7, 12 §4).
// Two tiers:
//  - NEVER_ANYWHERE: must not appear anywhere in the lockfile, even transitively
//    (Firebase, analytics/crash SDKs, OTA updates, location/maps, ads).
//  - NO_RUNTIME_HTTP: HTTP/socket client libraries must not be direct app dependencies.
//    Build tooling (Expo CLI, Metro) legitimately uses HTTP on the developer machine and
//    never ships in the APK, so this tier only checks package.json "dependencies".
const fs = require('fs');
const path = require('path');

const NEVER_ANYWHERE = [
  { pattern: /^firebase$/, reason: 'Firebase' },
  { pattern: /^@firebase\//, reason: 'Firebase' },
  { pattern: /^@react-native-firebase\//, reason: 'Firebase' },
  { pattern: /crashlytics/i, reason: 'crash reporting' },
  { pattern: /sentry/i, reason: 'crash reporting' },
  { pattern: /bugsnag/i, reason: 'crash reporting' },
  { pattern: /appcenter/i, reason: 'crash reporting / analytics' },
  { pattern: /^@datadog\//, reason: 'telemetry' },
  { pattern: /amplitude/i, reason: 'analytics' },
  { pattern: /mixpanel/i, reason: 'analytics' },
  { pattern: /posthog/i, reason: 'analytics' },
  { pattern: /^@segment\//, reason: 'analytics' },
  { pattern: /^expo-insights$/, reason: 'analytics' },
  { pattern: /^expo-updates$/, reason: 'OTA updates' },
  { pattern: /code-?push/i, reason: 'OTA updates' },
  { pattern: /^expo-location$/, reason: 'location' },
  { pattern: /geolocation/i, reason: 'location' },
  { pattern: /^react-native-maps/, reason: 'maps' },
  { pattern: /^expo-maps$/, reason: 'maps' },
  { pattern: /google-mobile-ads/i, reason: 'ads' },
  { pattern: /^expo-ads-/, reason: 'ads' },
];

const NO_RUNTIME_HTTP = [
  'axios', 'ky', 'got', 'node-fetch', 'cross-fetch', 'isomorphic-fetch', 'superagent',
  'apisauce', 'undici', 'ws', 'socket.io-client', '@apollo/client', 'graphql-request',
  'expo-network', '@react-native-community/netinfo',
];

/** Package names from an npm lockfile v2/v3 "packages" map. */
function lockfilePackageNames(lockfile) {
  const packages = lockfile && lockfile.packages ? Object.keys(lockfile.packages) : [];
  const names = packages
    .filter((key) => key.includes('node_modules/'))
    .map((key) => key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length));
  return [...new Set(names)];
}

function findForbiddenDeps(lockfile, packageJson) {
  const transitive = lockfilePackageNames(lockfile).flatMap((name) =>
    NEVER_ANYWHERE.filter(({ pattern }) => pattern.test(name)).map(({ reason }) => ({
      name,
      reason,
      tier: 'never-anywhere',
    })),
  );
  const runtimeDeps = Object.keys((packageJson && packageJson.dependencies) || {});
  const http = runtimeDeps
    .filter((name) => NO_RUNTIME_HTTP.includes(name))
    .map((name) => ({ name, reason: 'runtime network client', tier: 'no-runtime-http' }));
  return [...transitive, ...http];
}

function main() {
  const root = process.argv[2] || process.cwd();
  const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const violations = findForbiddenDeps(read('package-lock.json'), read('package.json'));
  if (violations.length > 0) {
    violations.forEach((v) => console.error(`FORBIDDEN ${v.name} — ${v.reason} [${v.tier}]`));
    process.exit(1);
  }
  console.log('OK: no forbidden dependencies (06 §2).');
}

if (require.main === module) main();

module.exports = { main, findForbiddenDeps, lockfilePackageNames, NEVER_ANYWHERE, NO_RUNTIME_HTTP };
