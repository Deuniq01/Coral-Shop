async function createOrder(userId, items, status = 'pending') {
  try {
    // New server-side placement: call place-order function which writes to normalized tables
    if (!items || items.length === 0) {
      throw new Error('Invalid order data');
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Please login to place order');
    }

    const payload = {
      userId: userId || null,
      items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
      shipping_address: null,
      payment_method: null
    };

    const resp = await fetch('/.netlify/functions/place-order', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
    
    const token = localStorage.getItem('authToken');
    const resp = await fetch(`/.netlify/functions/get-orders?userId=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!resp.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    const orders = await resp.json();
    return orders;
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
    
    const token = localStorage.getItem('authToken');
    const resp = await fetch('/.netlify/functions/update-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        orderId,
        status
      })
    });

    if (!resp.ok) {
      throw new Error('Failed to update order status');
    }

    const order = await resp.json();
    return order;
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw error;
  }
}
