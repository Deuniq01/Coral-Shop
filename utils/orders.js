async function createOrder(userId, items, status = 'pending') {
  try {
    // New server-side placement: call place-order function which writes to normalized tables
    if (!items || items.length === 0) {
      throw new Error('Invalid order data');
    }

    const payload = {
      userId: userId || null,
      items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
      shipping_address: null,
      payment_method: null
    };

    const resp = await fetch('/.netlify/functions/place-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Order API error: ${resp.status} ${errText}`);
    }
    const data = await resp.json();
    return { id: data.orderId };
  } catch (error) {
    console.error('Failed to create order:', error);
    throw error;
  }
}

async function getUserOrders(userId) {
  try {
    if (!userId) {
      console.warn('No userId provided to getUserOrders');
      return [];
    }
    const result = await trickleListObjects(`order:${userId}`, 100, true);
    if (!result || !result.items) {
      return [];
    }
    return result.items.map(item => ({...item.objectData, id: item.objectId}));
  } catch (error) {
    console.error('Failed to get user orders:', error);
    return [];
  }
}

async function updateOrderStatus(userId, orderId, status) {
  try {
    if (!userId || !orderId || !status) {
      throw new Error('Invalid update parameters');
    }
    const order = await trickleUpdateObject(`order:${userId}`, orderId, { status });
    return {...order.objectData, id: order.objectId};
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw error;
  }
}
