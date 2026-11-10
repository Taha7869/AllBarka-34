import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

// Preview hosts pass an explicit port; forward it to the full-stack server.
const { values } = parseArgs({ options: {
  port: { type: 'string' }, host: { type: 'string' }, strictPort: { type: 'boolean' },
} });
const previewPort = values.port;
if (previewPort !== undefined && (!/^\d+$/.test(previewPort) || Number(previewPort) < 1 || Number(previewPort) > 65535)) {
  throw new Error('The development port must be an integer from 1 to 65535.');
}

// Compile only the server; Vite still transforms and hot-updates the client.
// Running dependencies under plain Node avoids tsx loader overhead on the SDK graph.
console.time('[dev] server compile');
await build({
  entryPoints: ['server.ts'], bundle: true, platform: 'node', format: 'cjs',
  packages: 'external', sourcemap: true, outfile: '.local-setup/server.cjs',
});
console.timeEnd('[dev] server compile');
const child = spawn(process.execPath, ['--enable-source-maps', '.local-setup/server.cjs'], {
  stdio: 'inherit', env: { ...process.env, ...(previewPort ? { PORT: previewPort } : {}), NODE_ENV: 'development' },
});
child.on('error', (error) => { console.error('[dev] launch failed:', error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
