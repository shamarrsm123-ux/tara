// 13 Phase 2 acceptance and 06 §4: signal/, engine/ and patterns/ are pure TypeScript — no React,
// React Native or Expo imports, so the safety-critical logic is testable with a fake clock.
const { describe, expect, test } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

const SRC = path.join(process.cwd(), 'src'); // Jest runs from the repo root
const FRAMEWORK_IMPORT = /from ['"](react|react-native|expo[\w-]*|@expo\/[\w-]+)['"/]/;

function sources(dir) {
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) return name === '__tests__' ? [] : sources(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe('pure logic modules', () => {
  test.each(['signal', 'engine', 'patterns', 'demo'])('%s/ has source files and imports no framework code', (dir) => {
    const files = sources(path.join(SRC, dir));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => FRAMEWORK_IMPORT.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  // Demo data is never persisted (11 §8.2, 10 P13): the demo and the monitoring session cannot reach storage.
  const STORAGE_IMPORT = /from ['"](expo-sqlite|expo-secure-store|expo-file-system|@react-native-async-storage[\w/-]*|[./]+\/store(\/[\w-]+)?)['"]/;

  test.each(['demo', 'engine'])('%s/ imports no storage module', (dir) => {
    const offenders = sources(path.join(SRC, dir)).filter((f) => STORAGE_IMPORT.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  test('the storage pattern catches store and SQLite imports', () => {
    expect(STORAGE_IMPORT.test("import { x } from '../store';")).toBe(true);
    expect(STORAGE_IMPORT.test("import * as SQLite from 'expo-sqlite';")).toBe(true);
    expect(STORAGE_IMPORT.test("import { y } from './scenarios';")).toBe(false);
  });

  test('the pattern catches a framework import', () => {
    expect(FRAMEWORK_IMPORT.test("import { View } from 'react-native';")).toBe(true);
    expect(FRAMEWORK_IMPORT.test("import { x } from '../engine/constants';")).toBe(false);
  });
});
