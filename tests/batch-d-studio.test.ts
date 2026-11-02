import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { memoryFirestore } from './helpers/memoryFirestore';
import { DEFAULT_STOREFRONT_CONTENT, validateStorefrontContent } from '../src/lib/storefrontContent';
import { createStorefrontContentRouter } from '../src/lib/storefrontContentRouter';

test('M32: Studio Restore API restores live baseline into draft atomically with revision advance and audit trail', async () => {
  const { db, records } = memoryFirestore();
  const app = express();
  app.use(express.json({ limit: '128kb' }));
  app.use(createStorefrontContentRouter({
    getDb: () => db,
    requireAdmin: (req, res, next) => {
      if (req.get('Authorization') !== 'Bearer owner') return res.status(403).json({ code: 'FORBIDDEN_ADMIN' });
      (req as any).user = { uid: 'owner' };
      next();
    },
  }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;

  const request = (action: string, body: unknown, token = 'owner') =>
    fetch(`${origin}/api/admin/storefront-content/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    // 1. Initial draft save and publish
    const customContent = structuredClone(DEFAULT_STOREFRONT_CONTENT);
    customContent.banner = {
      enabled: true,
      text: { en: 'Live Announcement V1', ur: 'شائع شدہ اعلان', ar: '' },
      linkLabel: { en: 'Shop', ur: '', ar: '' },
      path: '/shop',
    };

    const draftRes = await request('draft', { expectedRevision: 0, content: customContent });
    assert.equal(draftRes.status, 200);

    const publishRes = await request('publish', { expectedRevision: 1 });
    assert.equal(publishRes.status, 200);
    const publishedBundle = await publishRes.json();
    assert.equal(publishedBundle.liveRevision, 2);
    assert.equal(publishedBundle.live.banner.text.en, 'Live Announcement V1');

    // 2. Draft gets modified with experimental changes
    const experimentalContent = structuredClone(customContent);
    experimentalContent.banner.text.en = 'Experimental Draft Not Yet Approved';
    const draft2Res = await request('draft', { expectedRevision: 2, content: experimentalContent });
    assert.equal(draft2Res.status, 200);
    const draft2Bundle = await draft2Res.json();
    assert.equal(draft2Bundle.revision, 3);
    assert.equal(draft2Bundle.draft.banner.text.en, 'Experimental Draft Not Yet Approved');
    assert.equal(draft2Bundle.live.banner.text.en, 'Live Announcement V1');

    // 3. Restore API: Unauthenticated or reader rejected
    const unauthRestore = await request('restore', { expectedRevision: 3, target: 'live' }, 'reader');
    assert.equal(unauthRestore.status, 403);

    // 4. Stale expected revision triggers 409
    const staleRestore = await request('restore', { expectedRevision: 1, target: 'live' });
    assert.equal(staleRestore.status, 409);

    // 5. Successful restore from live target
    const restoreRes = await request('restore', { expectedRevision: 3, target: 'live' });
    assert.equal(restoreRes.status, 200);
    const restoredBundle = await restoreRes.json();

    // Verify draft now matches live baseline
    assert.equal(restoredBundle.revision, 4);
    assert.equal(restoredBundle.liveRevision, 2);
    assert.equal(restoredBundle.draft.banner.text.en, 'Live Announcement V1');
    assert.equal(restoredBundle.live.banner.text.en, 'Live Announcement V1');

    // 6. Audit trail committed
    const auditEntries = [...records.keys()].filter(k => k.startsWith('storefrontContentAudits/'));
    assert.ok(auditEntries.length >= 4);
    const lastAuditKey = auditEntries[auditEntries.length - 1];
    const lastAudit = records.get(lastAuditKey) as any;
    assert.equal(lastAudit.action, 'CONTENT_DRAFT_RESTORED');
    assert.equal(lastAudit.revision, 4);
    assert.equal(lastAudit.actorUid, 'owner');

    // 7. Historical revision audit lookup & historical restore into a new draft
    const historyRes = await fetch(`${origin}/api/admin/storefront-content/history`, {
      headers: { Authorization: 'Bearer owner' },
    });
    assert.equal(historyRes.status, 200);
    const historyData = await historyRes.json();
    assert.ok(historyData.history.length >= 3);

    // Find the experimental draft audit (rev 3)
    const expAudit = historyData.history.find((h: any) => h.content?.banner?.text?.en === 'Experimental Draft Not Yet Approved');
    assert.ok(expAudit, 'Historical experimental draft must be found in audit log');

    // Restore that specific historical revision back into a new draft
    const histRestoreRes = await request('restore', { expectedRevision: 4, auditId: expAudit.id });
    assert.equal(histRestoreRes.status, 200);
    const histRestoredBundle = await histRestoreRes.json();
    assert.equal(histRestoredBundle.revision, 5);
    assert.equal(histRestoredBundle.liveRevision, 2); // live remains unchanged
    assert.equal(histRestoredBundle.draft.banner.text.en, 'Experimental Draft Not Yet Approved');
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
