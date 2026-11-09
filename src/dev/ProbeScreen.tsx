// Phase 0 developer diagnostics. Only mounted when __DEV__ (see App.tsx), stripped from release
// bundles by Metro's dead-code elimination. Developer-facing text, so it is not routed through i18n.
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isProbePassing, runSqlcipherProbe, type ProbeStep } from './sqlcipherProbe';

type ProbeState = { kind: 'idle' } | { kind: 'running' } | { kind: 'done'; steps: ProbeStep[] };

export function ProbeScreen() {
  const [state, setState] = useState<ProbeState>({ kind: 'idle' });

  const run = async () => {
    setState({ kind: 'running' });
    setState({ kind: 'done', steps: await runSqlcipherProbe() });
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>TARA · Phase 0 dev probe</Text>
        <Text style={styles.step} testID="sqlcipher-probe-web-notice">
          The SQLCipher probe runs on Android only. Browsers have no encrypted SQLite, so there is nothing
          to test here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>TARA · Phase 0 dev probe</Text>
      <Pressable
        accessibilityRole="button"
        disabled={state.kind === 'running'}
        onPress={run}
        style={styles.button}
        testID="run-sqlcipher-probe"
      >
        <Text style={styles.buttonText}>{state.kind === 'running' ? 'Running…' : 'Run SQLCipher probe'}</Text>
      </Pressable>
      {state.kind === 'done' && (
        <View testID="sqlcipher-probe-result">
          <Text style={styles.summary}>{isProbePassing(state.steps) ? 'PASS' : 'FAIL'}</Text>
          {state.steps.map((s) => (
            <Text key={s.name} style={styles.step}>
              {s.isPass ? '✔' : '✘'} {s.name}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 24 },
  button: { minHeight: 56, borderRadius: 12, backgroundColor: '#1f6feb', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18 },
  summary: { fontSize: 28, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  step: { fontSize: 16, marginVertical: 4 },
});
