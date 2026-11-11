import test from 'node:test';
import assert from 'node:assert/strict';
import { recordFunnelEvent, type FunnelPayload } from '../src/lib/funnelTelemetry';

test('M24: Privacy-preserving funnel telemetry dispatches sanitized milestones without PII', () => {
  const origWindow = (globalThis as any).window;
  const origCustomEvent = (globalThis as any).CustomEvent;
  const events: FunnelPayload[] = [];
  const target = new EventTarget();
  (globalThis as any).window = target;
  (globalThis as any).CustomEvent = class CustomEvent extends Event {
    detail: any;
    constructor(type: string, options?: any) {
      super(type);
      this.detail = options?.detail;
    }
  };

  const listener = (e: any) => {
    events.push(e.detail);
  };

  target.addEventListener('allbarka-funnel-event', listener);

  try {
    recordFunnelEvent('view_item', { productId: 'pista', category: 'nuts' });
    recordFunnelEvent('add_to_cart', { productId: 'pista', quantity: 2 });
    recordFunnelEvent('begin_checkout', { itemCount: 1 });
    recordFunnelEvent('order_placed', { itemCount: 1 });

    assert.equal(events.length, 4);
    assert.equal(events[0].milestone, 'view_item');
    assert.equal(events[0].productId, 'pista');
    assert.ok(events[0].timestamp);

    // Verify STRICTLY zero PII in telemetry payload
    for (const evt of events) {
      assert.equal('email' in evt, false);
      assert.equal('phone' in evt, false);
      assert.equal('customerName' in evt, false);
      assert.equal('address' in evt, false);
      assert.equal('cardNumber' in evt, false);
    }
  } finally {
    target.removeEventListener('allbarka-funnel-event', listener);
    if (origWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = origWindow;
    }
    if (origCustomEvent === undefined) {
      delete (globalThis as any).CustomEvent;
    } else {
      (globalThis as any).CustomEvent = origCustomEvent;
    }
  }
});

test('M25 & M21: Brand token fidelity and reduced motion styling', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile('src/index.css', 'utf8');

  // Verify reduced-motion rule exists and resets durations
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(css.includes('animation-duration: 0.01ms !important'));

  // Verify luxury palette tokens
  assert.ok(css.includes('#FAF9F5') || css.includes('#FDFBF7'), 'Ivory canvas token exists');
  assert.ok(css.includes('#C7982F') || css.includes('#D4AF37'), 'Gold accent token exists');
  assert.ok(css.includes('#1E3A2B') || css.includes('#042821') || css.includes('#043327'), 'Emerald green token exists');
});
