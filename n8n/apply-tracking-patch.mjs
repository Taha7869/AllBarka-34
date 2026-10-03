import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const directory = path.dirname(fileURLToPath(import.meta.url));
const patch = JSON.parse(fs.readFileSync(path.join(directory, 'allbarka-tracking.patch.json'), 'utf8'));

/** Applies narrowly in place to a private owner export, preserving IDs/resources. */
export function applyTrackingPatch(input) {
  const output = structuredClone(input);
  if (!Array.isArray(output.nodes) || !output.connections || !output.nodes.some(
    node => node.type === 'n8n-nodes-base.executeWorkflowTrigger')) throw new Error('EXPECTED_OWNER_CHILD_EXPORT');
  const nodes = new Map(output.nodes.map(node => [node.name, node]));
  for (const changed of patch.modifiedNodes) {
    const original = nodes.get(changed.name);
    if (!original || original.type !== changed.type) throw new Error('PATCH_BASELINE_MISMATCH');
    const currentHash = crypto.createHash('sha256').update(JSON.stringify(original.parameters)).digest('hex');
    const patchedHash = crypto.createHash('sha256').update(JSON.stringify(changed.parameters)).digest('hex');
    const acceptedHashes = changed.acceptedParametersSha256 || [changed.expectedParametersSha256];
    if (!acceptedHashes.includes(currentHash) && currentHash !== patchedHash) throw new Error('PATCH_PARAMETERS_CHANGED_REVIEW_REQUIRED');
    original.parameters = structuredClone(changed.parameters);
  }
  for (const runtime of patch.runtimePatches || []) {
    const original = nodes.get(runtime.name);
    if (!original || original.type !== runtime.type) throw new Error('PATCH_RUNTIME_BASELINE_MISMATCH');
    original.alwaysOutputData = runtime.alwaysOutputData;
    original.onError = runtime.onError;
  }
  for (const added of patch.addedNodes) {
    const existing = nodes.get(added.name);
    if (existing) {
      if (existing.id !== added.id || existing.type !== added.type) throw new Error('PATCH_NODE_NAME_COLLISION');
      // Reapply fixed parameters while retaining privately selected credentials.
      existing.parameters = structuredClone(added.parameters);
      if (added.type === 'n8n-nodes-base.httpRequest') {
        existing.retryOnFail = false;
        existing.maxTries = 1;
      }
    } else {
      output.nodes.push(structuredClone(added));
      nodes.set(added.name, output.nodes.at(-1));
    }
  }
  // Replace only the tracking destination in the owner's actual router. Keep
  // unrelated branches added since the supplied export rather than pasting it.
  const router = output.connections['Intent Router'];
  let linked = false;
  for (const branch of router?.main || []) for (const edge of branch) {
    if (edge.node === 'Has Tracking ID?)' || edge.node === 'Read Verified Canonical Receipt') {
      edge.node = 'Read Verified Canonical Receipt'; linked = true;
    }
  }
  if (!linked) throw new Error('PATCH_TRACKING_ROUTE_MISMATCH');
  for (const [name, connections] of Object.entries(patch.connections)) {
    if (name !== 'Intent Router') output.connections[name] = structuredClone(connections);
  }
  const websiteBrain = nodes.get('Website AI Brain');
  if (websiteBrain) {
    websiteBrain.retryOnFail = false;
    websiteBrain.maxTries = 1;
    delete websiteBrain.waitBetweenTries;
  }
  for (const [source, connections] of Object.entries(output.connections)) {
    if (!nodes.has(source)) throw new Error('INVALID_SOURCE_CONNECTION');
    for (const branch of connections.main || []) for (const edge of branch) {
      if (!nodes.has(edge.node)) throw new Error('INVALID_TARGET_CONNECTION');
    }
  }
  output.active = false;
  output.pinData = {};
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inputIndex = process.argv.indexOf('--input');
  const outputIndex = process.argv.indexOf('--output');
  if (inputIndex < 0 || outputIndex < 0 || !process.argv[inputIndex + 1] || !process.argv[outputIndex + 1]) {
    console.error('Usage: node n8n/apply-tracking-patch.mjs --input PRIVATE_OWNER_EXPORT --output .local-setup/review-child.json');
    process.exitCode = 1;
  } else {
    try {
      const target = path.resolve(process.argv[outputIndex + 1]);
      const ignoredRoot = path.resolve(directory, '..', '.local-setup');
      if (!target.startsWith(ignoredRoot + path.sep) || path.extname(target) !== '.json') throw new Error('OUTPUT_MUST_BE_IGNORED_LOCAL_JSON');
      if (fs.existsSync(target)) throw new Error('OUTPUT_ALREADY_EXISTS');
      const result = applyTrackingPatch(JSON.parse(fs.readFileSync(path.resolve(process.argv[inputIndex + 1]), 'utf8')));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
      console.log('Inactive private review written; original child ID and resource selections retained. Not imported or published.');
    } catch (error) {
      const code = String(error?.message || 'PATCH_FAILED');
      console.error(/^[A-Z_]+$/.test(code) ? code : 'PATCH_FAILED');
      process.exitCode = 1;
    }
  }
}
