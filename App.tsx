import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { initialStateFor } from './src/app/launch';
import { TryFlow } from './src/app/TryFlow';
import type { TryState } from './src/app/tryNavigation';
import { GalleryScreen } from './src/dev/GalleryScreen';
import { createPlatformStore } from './src/store/platformStore';
import { FONT_ASSETS } from './src/ui/theme/fonts';

// Composition root: creates the platform store (encrypted on the phone, memory-only in the web preview) and
// hands its port to the app, which never imports store/ itself (06 §4). Launch: fresh → Choose Language;
// set up → Daily mode (11 §1). Debug builds add a small "dev" button; release builds never include it.
export default function App() {
  const [isFontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [store] = useState(createPlatformStore);
  const [initial, setInitial] = useState<TryState | null>(null);
  useEffect(() => {
    void initialStateFor(store).then(setInitial);
  }, [store]);
  // Fonts are bundled, so this resolves almost instantly. On error, render with system fonts rather than block.
  if ((!isFontsLoaded && fontError === null) || initial === null) return null;
  return (
    <View style={styles.container}>
      {__DEV__ && isDevOpen ? <GalleryScreen /> : <TryFlow store={store} initial={initial} />}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  dev: { position: 'absolute', right: 8, bottom: 96, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
  devText: { color: '#FFFFFF', fontSize: 12 },
});
