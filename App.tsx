import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TryFlow } from './src/app/TryFlow';
import { GalleryScreen } from './src/dev/GalleryScreen';
import { FONT_ASSETS } from './src/ui/theme/fonts';

// The Try flow (03 Flows L → 2). Debug builds add a small "dev" button for the component gallery and
// demo playground; release builds never include it.
export default function App() {
  const [isFontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [isDevOpen, setIsDevOpen] = useState(false);
  // Fonts are bundled, so this resolves almost instantly. On error, render with system fonts rather than block.
  if (!isFontsLoaded && fontError === null) return null;
  return (
    <View style={styles.container}>
      {__DEV__ && isDevOpen ? <GalleryScreen /> : <TryFlow />}
      {__DEV__ && (
        <Pressable onPress={() => setIsDevOpen((v) => !v)} style={styles.dev} accessibilityRole="button" testID="dev-toggle">
          <Text style={styles.devText}>{isDevOpen ? 'app' : 'dev'}</Text>
        </Pressable>
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F0' },
  dev: { position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
  devText: { color: '#FFFFFF', fontSize: 12 },
});
