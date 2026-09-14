const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf-8');

const replacement = `app.post('/api/orders', async (req, res) => {
  try {
    const {
      name, phone, address, city, deliverySlot, instructions,
      giftWrapping, giftMessage, paymentMethod, items,
      shippingMethodId, discountCode, isWholesale, uid
    } = req.body;

    // Validate request
    if (!name || !phone || !address || !items || !items.length) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    // Recalculate prices from server-side source of truth
    let calculatedSubtotal = 0;
    let earnedPoints = 0;
    const validatedItems = items.map((clientItem: any) => {
      const product = PRODUCTS.find(p => p.id === clientItem.id);
      if (!product) throw new Error(\`Product not found: \${clientItem.id}\`);

      let price = 0;
      if (isWholesale) {
        price = product.wholesale || 0;
      } else {
        price = product.prices?.[clientItem.selectedWeight] || product.price || 0;
      }

      let pts = 0;
      if (!isWholesale && product.earnedPoints) {
        if (typeof product.earnedPoints === 'number') {
          pts = product.earnedPoints;
        } else if (product.earnedPoints[clientItem.selectedWeight]) {
          pts = product.earnedPoints[clientItem.selectedWeight];
        }
      }
      earnedPoints += pts * (clientItem.quantity || 1);
      calculatedSubtotal += price * (clientItem.quantity || 1);

      return {
        ...clientItem,
        price,
        name: product.name
      };
    });

    let discount = 0;
    if (discountCode && discountCode.toUpperCase() === 'ALLBARKA10') {
      discount = calculatedSubtotal * 0.10;
    }

    const discountedSubtotal = Math.max(0, calculatedSubtotal - discount);

    // Calculate shipping
    let shippingFee = STORE_CONFIG.shipping.standardRate;
    if (discountedSubtotal >= STORE_CONFIG.shipping.freeThreshold) {
      shippingFee = 0;
    }

    const giftWrapFee = giftWrapping ? 250 : 0;
    const finalTotal = discountedSubtotal + shippingFee + giftWrapFee;

    // Generate Order ID
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = String(ordersDb.length + 1).padStart(3, '0');
    const orderId = \`\${STORE_CONFIG.orderPrefix}-\${dateStr}-\${orderNumber}\`;
    const claimToken = uid ? null : crypto.randomUUID();

    const orderRecord = {
      orderId,
      timestamp: new Date().toISOString(),
      status: 'NEW',
      uid: uid || null,
      claimToken,
      name,
      phone,
      address: \`\${address}, \${city}\`,
      area: city,
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount,
      shipping: shippingFee,
      giftWrap: giftWrapFee,
      total: finalTotal,
      paymentMethod,
      source: 'website',
      earnedPoints
    };

    // Persist order locally
    ordersDb.push(orderRecord);

    // Append to Google Sheets if configured
    if (doc) {
      try {
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({
          'Order ID': orderRecord.orderId,
          'Date': orderRecord.timestamp,
          'Customer Name': orderRecord.name,
          'Phone': orderRecord.phone,
          'Address': orderRecord.address,
          'Area': orderRecord.area,
          'Items Summary': orderRecord.items.map((i: any) => \`\${i.name} (\${i.selectedWeight}) x\${i.quantity}\`).join(' | '),
          'Subtotal': orderRecord.subtotal,
          'Shipping': orderRecord.shipping,
          'Gift Wrap': orderRecord.giftWrap,
          'Discount': orderRecord.discount,
          'Total': orderRecord.total,
          'Payment Method': orderRecord.paymentMethod,
          'Status': orderRecord.status,
          'Points Earned': orderRecord.earnedPoints
        });
      } catch (sheetErr) {
        console.error(\`[Order API] Failed to sync order \${orderId} to Google Sheets:\`, sheetErr);
      }
    }

    // Generate WhatsApp Message
    const currencyFormat = (num: number) => \`Rs. \${num.toLocaleString()}\`;
    let itemsStr = '';
    validatedItems.forEach((item: any, index: number) => {
      itemsStr += \`\\n\${index + 1}. *\${item.name}* (\${item.selectedWeight}) x \${item.quantity} -> \${currencyFormat(item.price * item.quantity)}\`;
    });

    const receiptMessage = \`👑 *NEW ALLBARKA LUXURY ORDER* 👑\\n\\n*Order ID:* \${orderId}\\n*Customer:* \${name}\\n*Phone:* \${phone}\\n*Delivery Address:* \${address}, \${city}\\n*Delivery Slot:* \${deliverySlot || 'Fastest Dispatch'}\\n\\n*Selected Items:*\${itemsStr}\\n\\n*Subtotal:* \${currencyFormat(calculatedSubtotal)}\${discount > 0 ? \`\\n*Discount Applied:* -\${currencyFormat(discount)}\` : ''}\${giftWrapping ? \`\\n*Gift Wrapping:* +\${currencyFormat(giftWrapFee)}\` : ''}\\n*Shipping:* \${shippingFee === 0 ? 'FREE' : currencyFormat(shippingFee)}\\n*Total Due:* *\${currencyFormat(finalTotal)}*\\n*Payment Method:* \${paymentMethod === 'bank' ? 'Bank Transfer' : 'Cash on Delivery'}\`;

    res.json({
      success: true,
      orderId,
      whatsappMessage: receiptMessage,
      claimToken
    });
  } catch (error: any) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error during checkout.' });
  }
});`;

const startIdx = content.indexOf("app.post('/api/orders'");
const nextRouteIdx = content.indexOf("app.post('/api/orders/:orderId/status'");

if (startIdx !== -1 && nextRouteIdx !== -1) {
  const newContent = content.substring(0, startIdx) + replacement + "\n\n" + content.substring(nextRouteIdx);
  fs.writeFileSync('server.ts', newContent);
  console.log("Successfully replaced /api/orders route");
} else {
  console.log("Could not find indices:", startIdx, nextRouteIdx);
}
