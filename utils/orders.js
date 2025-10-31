async function createOrder(userId, items, status = 'pending') {
  try {
    if (!userId || !items || items.length === 0) {
      throw new Error('Invalid order data');
    }
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const order = await trickleCreateObject(`order:${userId}`, {
      userId,
      items,
      total,
      status,
      createdAt: new Date().toISOString()
    });
    return {...order.objectData, id: order.objectId};
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
