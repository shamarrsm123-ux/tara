const { describe, expect, test } = require('@jest/globals');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanText, scanProject } = require('../sourceScan');

describe('scanText', () => {
  test.each([
    ['await fetch("https://x")', 'network: fetch()'],
    ['new XMLHttpRequest()', 'network: XMLHttpRequest'],
    ['const s = new WebSocket(url)', 'network: WebSocket'],
    ['new EventSource(u)', 'network: EventSource'],
    ['navigator.sendBeacon(u, d)', 'network: sendBeacon'],
    ['navigator.geolocation.getCurrentPosition()', 'location API'],
    ["import * as Location from 'expo-location';", 'location module import'],
    ["import MapView from 'react-native-maps';", 'maps module import'],
  ])('flags %s', (line, reason) => {
    expect(scanText(line)).toEqual([{ line: 1, reason }]);
  });

  test('passes ordinary code and reports correct line numbers', () => {
    const text = "const prefetchCount = 1;\nconst a = 2;\nfetch('x');";
    expect(scanText(text)).toEqual([{ line: 3, reason: 'network: fetch()' }]);
  });
});

describe('scanProject', () => {
  test('scans src/ but ignores __tests__ directories', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tara-scan-'));
    fs.mkdirSync(path.join(root, 'src', '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'bad.ts'), 'fetch("x")\n');
    fs.writeFileSync(path.join(root, 'src', '__tests__', 'ok.ts'), 'fetch("x")\n');
    fs.writeFileSync(path.join(root, 'App.tsx'), 'export default 1;\n');

    const hits = scanProject(root);

    expect(hits).toEqual([{ file: path.join('src', 'bad.ts'), line: 1, reason: 'network: fetch()' }]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
