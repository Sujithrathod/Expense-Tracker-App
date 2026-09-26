import type { ConfigContext, ExpoConfig } from 'expo/config';

// Everything lives in app.json; this only lets CI stamp the release version.
//   APP_VERSION          → "1.2.0"  (shown to users; taken from the git tag v1.2.0)
//   ANDROID_VERSION_CODE → 7        (must increase every release so Android treats it as an update)
export default ({ config }: ConfigContext): ExpoConfig => {
  const versionCode = Number(process.env.ANDROID_VERSION_CODE);
  return {
    ...config,
    name: config.name ?? 'Expense Tracker',
    slug: config.slug ?? 'expense-tracker',
    version: process.env.APP_VERSION || config.version,
    android: {
      ...config.android,
      ...(Number.isInteger(versionCode) && versionCode > 0 ? { versionCode } : {}),
    },
  };
};
