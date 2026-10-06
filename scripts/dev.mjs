import { build } from 'esbuild';
import { spawn } from 'node:child_process';

// Compile only the server; Vite still transforms and hot-updates the client.
// Running dependencies under plain Node avoids tsx loader overhead on the SDK graph.
console.time('[dev] server compile');
await build({
  entryPoints: ['server.ts'], bundle: true, platform: 'node', format: 'cjs',
  packages: 'external', sourcemap: true, outfile: '.local-setup/server.cjs',
});
console.timeEnd('[dev] server compile');
const child = spawn(process.execPath, ['--enable-source-maps', '.local-setup/server.cjs'], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' },
});
child.on('error', (error) => { console.error('[dev] launch failed:', error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
