import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.bazimazi.gravityborn',
  appName: 'Gravityborn',
  webDir: 'dist',
  backgroundColor: '#080d18',
  android: { backgroundColor: '#080d18', allowMixedContent: false },
  ios: { backgroundColor: '#080d18', contentInset: 'never' },
};
export default config;
