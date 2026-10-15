import type { Request, Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { sanitizeRewardApplication } from './rewardFulfillment';
import { commerceTranslations } from '../contexts/commerceTranslations';
import { adminTranslations } from '../contexts/adminTranslations';
import { createAdminCsv, adminPromoNotes } from './adminPresentation';
import { AdminOperationError, listAdminOrders, type AdminOrderFilters } from './adminOperations';

/** Backpressure-aware export: one 500-row database page at a time; no implicit newest-order cutoff. */
export async function streamAdminOrdersCsv(db: Firestore | null, filters: AdminOrderFilters, language: unknown, request: Request, response: Response) {
  const lang = language === 'ur' || language === 'ar' ? language : 'en';
  const t = (key: string) => commerceTranslations[lang][key] || adminTranslations[lang][key] || adminTranslations.en[key] || key;
  const headers = ['admin.table.order', 'admin.table.date', 'admin.status', 'admin.payment', 'admin.method', 'admin.table.customer', 'admin.csv.phone', 'admin.csv.address', 'admin.csv.city', 'admin.table.items', 'admin.detail.subtotal', 'admin.detail.discount', 'admin.detail.shipping', 'admin.detail.giftFee', 'admin.table.total'].map(t);
  let cursor: string | undefined; let page = 1; let closed = false;
  const onClose = () => { closed = true; };
  response.once('close', onClose); request.once('aborted', onClose);
  const write = async (chunk: string) => {
    if (closed) return;
    if (response.write(chunk)) return;
    await new Promise<void>(resolve => {
      const done = () => { response.off('drain', done); response.off('close', done); resolve(); };
      response.once('drain', done); response.once('close', done);
    });
  };
  try {
    do {
      if (closed) break;
      const data = await listAdminOrders(db, { ...filters, page, cursor, fresh: false }, true);
      if (closed) break;
      if (page === 1) {
        response.setHeader('Cache-Control', 'private, no-store');
        response.setHeader('Content-Type', 'text/csv; charset=utf-8');
        const day = new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);
        response.setHeader('Content-Disposition', `attachment; filename="allbarka-orders-${day}.csv"`);
        await write(createAdminCsv(headers, []));
      }
      const rows = data.orders.map(order => [order.orderId, order.createdAt, t(`admin.status.${order.status}`), t(`admin.payment.${order.paymentStatus}`), t(`admin.method.${order.paymentMethod}`), order.customer.name, order.customer.phone, order.customer.address, order.customer.city,
        [order.items.map(item => `${item.name} (${item.selectedWeight}) × ${item.quantity}`).join(' | '), ...adminPromoNotes(order, t), ...(sanitizeRewardApplication(order.rewardApplication) && ['APPLIED', 'FULFILLED'].includes(order.rewardApplication!.status) && order.status !== 'CANCELLED' ? [t('commerce.rewards.fulfillment') + ': ' + t(`commerce.rewards.${order.rewardApplication!.rewardId}`)] : [])].join(' | '),
        order.totals.subtotal, order.totals.discount, order.totals.shipping, order.totals.giftWrapFee, order.totals.total]);
      if (rows.length) await write(createAdminCsv([], rows).replace(/^\uFEFF(?:\r\n)?/, ''));
      cursor = data.nextCursor || undefined; page++;
    } while (cursor && !closed);
    if (!closed) response.end();
  } catch (error) {
    if (!response.headersSent) throw error;
    // A provider error cannot become a successful partial CSV download.
    response.destroy(error instanceof Error ? error : new AdminOperationError('Export unavailable.', 'EXPORT_UNAVAILABLE', 503));
  } finally { response.off('close', onClose); request.off('aborted', onClose); }
}
