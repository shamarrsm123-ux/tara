import { registerRootComponent } from 'expo';

import App from './App';
import { registerMonitoringService } from './src/notify/createNotifier';

// The Android foreground service runner must be registered before the app starts (03 Flow 7).
registerMonitoringService();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
