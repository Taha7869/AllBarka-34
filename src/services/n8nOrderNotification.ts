import crypto from 'crypto';

export interface N8nNotificationResult {
  sent: boolean;
  status: 'DISABLED' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  reason?: string;
  statusCode?: number;
}

/**
 * Sends a server-side order event notification to n8n webhook if configured.
 * This function is timeout-protected and isolated from order transaction processing.
 * An n8n notification failure will NEVER cause an order transaction rollback or error state.
 */
export async function sendOrderToN8n(orderData: {
  orderId: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    deliverySlot?: string;
  };
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
  };
  items: Array<{
    id: string;
    name: string;
    selectedWeight: string;
    quantity: number;
    price: number;
  }>;
  paymentMethod: string;
  createdAt: string;
  whatsappMessage?: string;
}): Promise<N8nNotificationResult> {
  const webhookUrl = process.env.N8N_ORDER_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      sent: false,
      status: 'DISABLED',
      reason: 'N8N_ORDER_WEBHOOK_URL environment variable is not configured.',
    };
  }

  const payload = JSON.stringify({
    event: 'ORDER_CREATED',
    timestamp: new Date().toISOString(),
    order: orderData,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'AllBarka-OrderService/1.0',
  };

  if (webhookSecret && webhookSecret.trim()) {
    const signature = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(payload)
      .digest('hex');
    headers['X-N8n-Signature'] = signature;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s strict timeout

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return {
        sent: true,
        status: 'SUCCESS',
        statusCode: response.status,
      };
    } else {
      return {
        sent: false,
        status: 'FAILED',
        statusCode: response.status,
        reason: `n8n webhook responded with HTTP status ${response.status}`,
      };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return {
        sent: false,
        status: 'TIMEOUT',
        reason: 'n8n webhook dispatch timed out after 5000ms',
      };
    }
    return {
      sent: false,
      status: 'FAILED',
      reason: error.message || 'n8n webhook network error',
    };
  }
}
