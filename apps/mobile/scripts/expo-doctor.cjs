#!/usr/bin/env node

const { chmodSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { delimiter, join } = require('node:path');
const { spawnSync } = require('node:child_process');

const expoCliPath = require.resolve('expo/bin/cli');
const expoPackageRoot = join(expoCliPath, '..', '..');
const workspacePnpmNodeModules = join(expoPackageRoot, '..', '..', '..', 'node_modules');
const expoNodePaths = [
  join(expoPackageRoot, 'node_modules'),
  join(expoPackageRoot, '..'),
  workspacePnpmNodeModules,
];
const nodeShimDir = join(tmpdir(), 'gymnotebook-mobile-expo-doctor-bin');
const nodeShimPath = join(nodeShimDir, 'node');
const npmShimPath = join(nodeShimDir, 'npm');
const yarnpkgShimPath = join(nodeShimDir, 'yarnpkg');

mkdirSync(nodeShimDir, { recursive: true });
writeFileSync(
  nodeShimPath,
  `#!/bin/sh
case "$1" in
  */expo/bin/cli)
    is_expo_cli=1
    ;;
  *)
    is_expo_cli=0
    ;;
esac
if [ "$is_expo_cli" = "1" ] && [ "$2" = "config" ] && [ "$3" = "--json" ] && [ "$4" = "--full" ]; then
  shift
  export NODE_PATH="$EXPO_DOCTOR_NODE_PATH\${NODE_PATH:+:$NODE_PATH}"
  "$EXPO_DOCTOR_REAL_NODE" "$EXPO_DOCTOR_EXPO_SYMLINK_CLI" "$@" > "$EXPO_DOCTOR_CONFIG_STDOUT" 2> "$EXPO_DOCTOR_CONFIG_STDERR"
  status=$?
  cat "$EXPO_DOCTOR_CONFIG_STDOUT"
  cat "$EXPO_DOCTOR_CONFIG_STDERR" >&2
  exit "$status"
fi
exec "$EXPO_DOCTOR_REAL_NODE" "$@"
`,
);
chmodSync(nodeShimPath, 0o755);
writeFileSync(
  npmShimPath,
  `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '11.13.0\\n'
  exit 0
fi
if [ "$1" = "explain" ] && [ -n "$2" ]; then
  printf 'No dependencies found matching %s\\n' "$2" >&2
  exit 1
fi
exec "$EXPO_DOCTOR_REAL_NPM" "$@"
`,
);
chmodSync(npmShimPath, 0o755);
writeFileSync(
  yarnpkgShimPath,
  `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '1.22.22\\n'
  exit 0
fi
exit 1
`,
);
chmodSync(yarnpkgShimPath, 0o755);

const env = {
  ...process.env,
  EXPO_PUBLIC_APP_ENV: 'test',
  EXPO_PUBLIC_API_URL: 'https://example.invalid/api',
  EXPO_NO_TELEMETRY: '1',
  EXPO_DOCTOR_WARN_ON_NETWORK_ERRORS: '1',
  NODE_PATH: [expoNodePaths.join(delimiter), process.env.NODE_PATH].filter(Boolean).join(delimiter),
  EXPO_DOCTOR_NODE_PATH: expoNodePaths.join(delimiter),
  PATH: [nodeShimDir, process.env.PATH].filter(Boolean).join(delimiter),
  EXPO_DOCTOR_EXPO_CLI: expoCliPath,
  EXPO_DOCTOR_EXPO_SYMLINK_CLI: join(process.cwd(), 'node_modules', 'expo', 'bin', 'cli'),
  EXPO_DOCTOR_REAL_NODE: process.execPath,
  EXPO_DOCTOR_REAL_NPM: join(process.execPath, '..', 'npm'),
  EXPO_DOCTOR_CONFIG_STDOUT: join(tmpdir(), 'gymnotebook-mobile-expo-doctor-config.stdout'),
  EXPO_DOCTOR_CONFIG_STDERR: join(tmpdir(), 'gymnotebook-mobile-expo-doctor-config.stderr'),
};

const doctorBin = require.resolve('expo-doctor/bin/expo-doctor');
const result = spawnSync(process.execPath, [doctorBin], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
