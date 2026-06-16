import * as esbuild from 'esbuild';

const shared = {
  entryPoints: ['server/src/instrumentation.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  packages: 'external',
  logLevel: 'info',
};

await esbuild.build({
  ...shared,
  outfile: 'dist/server/instrumentation.js',
  format: 'cjs',
});

await esbuild.build({
  ...shared,
  outfile: 'dist/server/instrumentation.mjs',
  format: 'esm',
});
