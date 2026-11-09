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
  test.each(['signal', 'engine', 'patterns'])('%s/ has source files and imports no framework code', (dir) => {
    const files = sources(path.join(SRC, dir));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => FRAMEWORK_IMPORT.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  test('the pattern catches a framework import', () => {
    expect(FRAMEWORK_IMPORT.test("import { View } from 'react-native';")).toBe(true);
    expect(FRAMEWORK_IMPORT.test("import { x } from '../engine/constants';")).toBe(false);
  });
});
