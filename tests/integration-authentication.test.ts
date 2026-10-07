import assert from 'node:assert/strict';
import test from 'node:test';
import { requireN8nIntegration, verifyN8nIntegrationSecret } from '../src/lib/integrationAuthentication';
import { buildOrderTrackingWhatsAppUrl, CONTACT_CONFIG } from '../src/config/contacts';

const secret = 'test-only-n8n-inbound-secret-32-characters';
test('private integration guard rejects missing, forged, truncated and duplicate headers', () => {
  assert.equal(verifyN8nIntegrationSecret(secret, secret), true);
  for (const candidate of [undefined, '', secret.slice(0, -1), `${secret}, ${secret}`, [secret], 'x'.repeat(513)]) {
    assert.equal(verifyN8nIntegrationSecret(candidate, secret), false);
  }
  assert.equal(verifyN8nIntegrationSecret(secret, 'short'), false);
});
test('unconfigured integration stays unavailable and never calls its mutation handler', () => {
  let next = 0;
  let status = 0;
  let body: any;
  const response: any = { status: (value: number) => { status = value; return response; }, json: (value: any) => { body = value; } };
  const invoke = (configured: string | undefined, header: unknown) => requireN8nIntegration(() => configured)(
    { headers: { 'x-allbarka-integration-secret': header } } as any, response, () => { next++; });
  invoke(undefined, secret);
  assert.equal(status, 503); assert.equal(body.code, 'INTEGRATION_UNAVAILABLE');
  invoke(secret, 'forged');
  assert.equal(status, 401); assert.equal(body.code, 'INTEGRATION_AUTH_REQUIRED');
  assert.equal(JSON.stringify(body).includes(secret), false); assert.equal(next, 0);
  invoke(secret, secret); assert.equal(next, 1);
});
test('saved receipt action targets automated tracking without receipt/customer data', () => {
  const id = 'AB-20261003-A1B2C300';
  const url = new URL(buildOrderTrackingWhatsAppUrl(id));
  assert.equal(url.pathname, `/${CONTACT_CONFIG.automatedOrdersWhatsApp.raw}`);
  assert.equal(url.searchParams.get('text'), `Track my order ${id}`);
  assert.throws(() => buildOrderTrackingWhatsAppUrl('AB-NEW\nAddress: private'));
});
