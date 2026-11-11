import assert from 'node:assert/strict';
import test from 'node:test';

// Explicit local demo emulator only. Never run destructive fixtures against a live project.
const origin = process.env.ALLBARKA_RULES_TEST_ORIGIN;
const project = 'demo-allbarka-security';
function token(uid, extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ aud: project, iss: `https://securetoken.google.com/${project}`,
    sub: uid, user_id: uid, iat: now, exp: now + 3600, auth_time: now,
    firebase: { sign_in_provider: 'custom', identities: {} }, ...extra })}.`;
}
test('Firestore emulator: cached admin claims cannot bypass backend; own contact profile remains usable', { skip: !origin }, async () => {
  assert.equal(new URL(origin).hostname, '127.0.0.1');
  const base = `${origin}/v1/projects/${project}/databases/(default)/documents`;
  const request = (path, method = 'GET', bearer, fields) => fetch(`${base}/${path}`, {
    method, headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(fields ? { 'Content-Type': 'application/json' } : {}) },
    body: fields ? JSON.stringify({ fields }) : undefined,
  });
  const owner = token('owner'), stranger = token('stranger'), staleAdmin = token('demoted-admin', { admin: true, role: 'admin' });
  const seed = { privateValue: { stringValue: 'PRIVATE_FIXTURE' } };
  for (const path of ['products/private-product', 'inquiries/private-inquiry', 'quotes/private-quote', 'orders/private-order', 'staffAccess/owner', 'storefrontContent/main']) {
    assert.equal((await request(path, 'PATCH', 'owner', seed)).status, 200);
    for (const bearer of [undefined, owner, stranger, staleAdmin]) {
      assert.equal((await request(path, 'GET', bearer)).status, 403, `Private read denied: ${path}`);
      assert.equal((await request(path, 'PATCH', bearer, seed)).status, 403, `Private write denied: ${path}`);
      assert.equal((await request(path, 'DELETE', bearer)).status, 403, `Private delete denied: ${path}`);
    }
  }
  for (const collection of ['products', 'inquiries', 'quotes', 'orders', 'staffAccess', 'storefrontContent']) {
    assert.equal((await request(collection, 'GET', staleAdmin)).status, 403, `Private collection list denied: ${collection}`);
  }
  await request('users/owner', 'DELETE', 'owner');
  const contact = { name: { stringValue: 'Owner' }, phone: { stringValue: '' }, createdAt: { integerValue: '1000' }, updatedAt: { integerValue: '1000' } };
  assert.equal((await request('users/owner', 'PATCH', owner, contact)).status, 200);
  assert.equal((await request('users/owner', 'GET', owner)).status, 200);
  assert.equal((await request('users/owner', 'GET', stranger)).status, 403);
  assert.equal((await request('users/owner', 'PATCH', stranger, contact)).status, 403);
  for (const patch of [
    { ...contact, admin: { booleanValue: true } }, { ...contact, role: { stringValue: 'admin' } },
    { ...contact, name: { stringValue: 'x'.repeat(121) } }, { ...contact, name: { integerValue: '7' } },
    { ...contact, createdAt: { integerValue: '2000' } },
  ]) assert.equal((await request('users/owner', 'PATCH', owner, patch)).status, 403);
  assert.equal((await request('users/owner', 'PATCH', owner, { ...contact, name: { stringValue: 'Updated' } })).status, 200);
  assert.equal((await request('users/stranger', 'PATCH', stranger, { ...contact, role: { stringValue: 'admin' } })).status, 403);
  await request('users/owner/favorites/legacy', 'PATCH', 'owner', seed);
  assert.equal((await request('users/owner/favorites/legacy', 'GET', owner)).status, 200);
  assert.equal((await request('users/owner/favorites/legacy', 'GET', stranger)).status, 403);
  assert.equal((await request('users/owner/favorites/legacy', 'PATCH', owner, seed)).status, 403);
  assert.equal((await request('users/owner/favorites/new', 'PATCH', owner, seed)).status, 403);
  assert.equal((await request('users/owner/favorites/legacy', 'DELETE', owner)).status, 200);
  // Existing public read-only content and reviews remain compatible.
  for (const path of ['reviews/public-review', 'content/public-info']) {
    await request(path, 'PATCH', 'owner', { title: { stringValue: 'Public fixture' } });
    assert.equal((await request(path)).status, 200);
    assert.equal((await request(path, 'PATCH', staleAdmin, seed)).status, 403);
  }
});
