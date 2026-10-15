import { readFileSync } from 'node:fs';
import path from 'node:path';

export function readBuildInfo() {
  try {
    const data = JSON.parse(readFileSync(path.join(process.cwd(), 'build/build-info.json'), 'utf8'));
    return {
      sourceHash: typeof data.sourceHash === 'string' && /^[a-f0-9]{64}$/.test(data.sourceHash) ? data.sourceHash : null,
      commit: typeof data.commit === 'string' && /^[a-f0-9]{40}$/i.test(data.commit) ? data.commit : null,
      builtAt: typeof data.builtAt === 'string' && Number.isFinite(Date.parse(data.builtAt)) ? data.builtAt : null,
    };
  } catch { return { sourceHash: null, commit: null, builtAt: null }; }
}
