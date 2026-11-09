import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GalleryScreen } from './src/dev/GalleryScreen';
import { FONT_ASSETS } from './src/ui/theme/fonts';

// Until Phase 4 there are no product screens: debug builds show the Phase 1 component gallery;
// release builds show the wordmark. "TARA" is the product name, not translated copy.
export default function App() {
  const [isFontsLoaded, fontError] = useFonts(FONT_ASSETS);
  // Fonts are bundled, so this resolves almost instantly. On error, render with system fonts rather than block.
  if (!isFontsLoaded && fontError === null) return null;
  return (
    <View style={styles.container}>
      {__DEV__ ? <GalleryScreen /> : <Text style={styles.wordmark}>TARA</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F0', justifyContent: 'center' },
  wordmark: { fontSize: 40, fontWeight: '700', textAlign: 'center' },
});
