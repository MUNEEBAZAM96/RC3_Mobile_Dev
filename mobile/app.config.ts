import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    name: 'Hackathon Starter',
    slug: 'hackathon-starter',
    scheme: 'hackathon',
    version: '0.1.0',
    orientation: 'default',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: 'com.hackathon.starter',
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: 'The camera lab takes photos and scans QR codes.',
        NSMicrophoneUsageDescription: 'The audio lab records a short clip.',
        NSPhotoLibraryUsageDescription: 'The camera lab lets you pick a photo.',
        NSLocationWhenInUseUsageDescription: 'The location lab shows where you are.',
      },
      ...(mapsKey ? { config: { googleMapsApiKey: mapsKey } } : {}),
    },
    android: {
      package: 'com.hackathon.starter',
      ...(mapsKey ? { config: { googleMaps: { apiKey: mapsKey } } } : {}),
    },
    plugins: [
      'expo-font',
      'expo-router',
      'expo-secure-store',
      'expo-sqlite',
      'expo-status-bar',
      'expo-audio',
      [
        'expo-camera',
        {
          cameraPermission: 'The camera lab takes photos and scans QR codes.',
          microphonePermission: 'The audio lab records a short clip.',
          recordAudioAndroid: true,
        },
      ],
      ['expo-image-picker', { photosPermission: 'The camera lab lets you pick a photo.' }],
      ['expo-location', { locationWhenInUsePermission: 'The location lab shows where you are.' }],
      'expo-notifications',
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
    ],
    experiments: { typedRoutes: false },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
      authProvider: process.env.EXPO_PUBLIC_AUTH_PROVIDER ?? 'clerk',
    },
  };
};
