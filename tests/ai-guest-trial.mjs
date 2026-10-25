import assert from 'node:assert/strict';
import { reserveGuestAiMessage, GuestTrialLimitError } from '../src/lib/aiGuestTrial.ts';

const records = new Map();
const db = {
  collection(name) {
    assert.equal(name, 'aiGuestTrials');
    return { doc: key => ({ key }) };
  },
  async runTransaction(fn) {
    return fn({
      async get(ref) {
        const data = records.get(ref.key);
        return { exists: Boolean(data), data: () => data };
      },
      set(ref, data) { records.set(ref.key, data); }
    });
  }
};
const secret = 'a-real-test-secret-that-is-long-enough';
const now = Date.UTC(2026, 8, 23);
for (let i = 0; i < 5; i++) {
  assert.equal(await reserveGuestAiMessage(db, '203.0.113.1', 'browser-a', secret, now), 4 - i);
}
await assert.rejects(
  () => reserveGuestAiMessage(db, '203.0.113.1', 'browser-a', secret, now),
  GuestTrialLimitError
);
assert.equal(await reserveGuestAiMessage(db, '203.0.113.2', 'browser-a', secret, now), 4);
assert.equal(await reserveGuestAiMessage(db, '203.0.113.1', 'browser-a', secret, now + 24 * 60 * 60 * 1000), 4);
await assert.rejects(
  () => reserveGuestAiMessage(db, '203.0.113.3', 'browser-a', '', now),
  /AI_GUEST_TRIAL_UNAVAILABLE/
);
console.log('AI guest trial: 5-message limit, isolation, reset, missing-secret gate passed');
