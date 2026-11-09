import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { ProbeScreen } from './src/dev/ProbeScreen';

// Phase 0 shell. Real screens arrive in Phase 4. "TARA" is the product wordmark, not translated copy.
export default function App() {
  return (
    <View style={styles.container}>
      {__DEV__ ? <ProbeScreen /> : <Text style={styles.wordmark}>TARA</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'stretch', justifyContent: 'center' },
  wordmark: { fontSize: 40, fontWeight: '700', textAlign: 'center' },
});
