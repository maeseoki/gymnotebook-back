import type { ConfigContext, ExpoConfig } from 'expo/config';
import { z } from 'zod';

const AppConfigEnvSchema = z
  .strictObject({
    EXPO_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production', 'test']),
    EXPO_PUBLIC_API_URL: z.string().url().transform(normalizeBaseUrl),
    EXPO_PROJECT_ID: z.string().trim().min(1).max(128).optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.EXPO_PUBLIC_APP_ENV === 'preview' || value.EXPO_PUBLIC_APP_ENV === 'production') &&
      !value.EXPO_PUBLIC_API_URL.startsWith('https://')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['EXPO_PUBLIC_API_URL'],
        message: 'Preview and production API URLs must use HTTPS.',
      });
    }
  })
  .transform((value) => ({
    appEnv: value.EXPO_PUBLIC_APP_ENV,
    apiUrl: value.EXPO_PUBLIC_API_URL,
    projectId: value.EXPO_PROJECT_ID,
  }));

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = AppConfigEnvSchema.parse({
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID,
  });
  const name =
    environment.appEnv === 'production'
      ? 'The Gym Notebook'
      : `The Gym Notebook (${environment.appEnv})`;

  return {
    ...config,
    name,
    slug: 'the-gym-notebook',
    scheme: 'gymnotebook',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    icon: './assets/icon.png',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.victorc.gymnotebook',
    },
    android: {
      package: 'com.victorc.gymnotebook',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0B0F14',
      },
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-dev-client',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          resizeMode: 'contain',
          backgroundColor: '#0B0F14',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appEnv: environment.appEnv,
      apiUrl: environment.apiUrl,
      eas: {
        projectId: environment.projectId,
      },
    },
  };
};
