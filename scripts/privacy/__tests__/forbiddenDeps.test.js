const { describe, expect, test } = require('@jest/globals');
const { findForbiddenDeps, lockfilePackageNames } = require('../forbiddenDeps');

const lockfileWith = (...names) => ({
  packages: Object.fromEntries([['', {}], ...names.map((n) => [`node_modules/${n}`, {}])]),
});

describe('lockfilePackageNames', () => {
  test('extracts nested and scoped package names', () => {
    const lock = {
      packages: { '': {}, 'node_modules/a': {}, 'node_modules/a/node_modules/@s/b': {} },
    };
    expect(lockfilePackageNames(lock).sort()).toEqual(['@s/b', 'a']);
  });

  test('returns empty list for a lockfile without packages', () => {
    expect(lockfilePackageNames({})).toEqual([]);
  });
});

describe('findForbiddenDeps', () => {
  test('passes a clean dependency tree', () => {
    const result = findForbiddenDeps(lockfileWith('expo', 'expo-sqlite', 'react'), {
      dependencies: { expo: '1', 'expo-sqlite': '1' },
    });
    expect(result).toEqual([]);
  });

  test.each([
    ['@react-native-firebase/app', 'Firebase'],
    ['firebase', 'Firebase'],
    ['@sentry/react-native', 'crash reporting'],
    ['expo-updates', 'OTA updates'],
    ['expo-location', 'location'],
    ['@react-native-community/geolocation', 'location'],
    ['react-native-maps', 'maps'],
    ['@amplitude/analytics-react-native', 'analytics'],
    ['react-native-google-mobile-ads', 'ads'],
  ])('flags %s anywhere in the tree as %s', (name, reason) => {
    const result = findForbiddenDeps(lockfileWith(`some-lib/node_modules/${name}`), {});
    expect(result).toEqual([{ name, reason, tier: 'never-anywhere' }]);
  });

  test('flags HTTP clients that are direct runtime dependencies', () => {
    const result = findForbiddenDeps(lockfileWith('axios'), { dependencies: { axios: '1' } });
    expect(result).toEqual([{ name: 'axios', reason: 'runtime network client', tier: 'no-runtime-http' }]);
  });

  test('allows HTTP clients used only by build tooling', () => {
    const result = findForbiddenDeps(lockfileWith('@expo/cli/node_modules/undici'), {
      dependencies: { expo: '1' },
    });
    expect(result).toEqual([]);
  });
});
