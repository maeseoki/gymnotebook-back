import { z } from 'zod';

export const MobileAppEnvSchema = z.enum(['development', 'preview', 'production', 'test']);
export type MobileAppEnv = z.infer<typeof MobileAppEnvSchema>;

const MobileApiUrlSchema = z.string().url().transform(normalizeBaseUrl);

const ExpoProjectIdSchema = z.string().trim().min(1).max(128).optional();

export const MobilePublicEnvSchema = z
  .strictObject({
    EXPO_PUBLIC_APP_ENV: MobileAppEnvSchema,
    EXPO_PUBLIC_API_URL: MobileApiUrlSchema,
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
  }));

export type MobilePublicEnv = z.infer<typeof MobilePublicEnvSchema>;

export type MobileExpoConfigEnv = MobilePublicEnv & { projectId?: string };

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export function readMobileEnv(raw: Record<string, string | undefined>): MobilePublicEnv {
  return MobilePublicEnvSchema.parse({
    EXPO_PUBLIC_APP_ENV: raw.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_API_URL: raw.EXPO_PUBLIC_API_URL,
  });
}

export function readMobileExpoConfigEnv(
  raw: Record<string, string | undefined>,
): MobileExpoConfigEnv {
  const publicEnv = readMobileEnv(raw);
  const projectEnv = z
    .strictObject({
      EXPO_PROJECT_ID: ExpoProjectIdSchema,
    })
    .parse({ EXPO_PROJECT_ID: raw.EXPO_PROJECT_ID });

  return projectEnv.EXPO_PROJECT_ID
    ? { ...publicEnv, projectId: projectEnv.EXPO_PROJECT_ID }
    : publicEnv;
}

export const mobileEnv = readMobileEnv({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
