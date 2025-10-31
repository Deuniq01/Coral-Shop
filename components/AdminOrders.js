function AdminOrders() {
  try {
    const [orders, setOrders] = React.useState([]);
    const [filter, setFilter] = React.useState('all');

    React.useEffect(() => {
      loadOrders();
    }, []);

    const loadOrders = async () => {
      try {
        const allOrders = await getAllOrders();
        setOrders(allOrders);
      } catch (error) {
        console.error('Failed to load orders:', error);
      }
    };

    const updateStatus = async (userId, orderId, status) => {
      try {
        await updateOrderStatus(userId, orderId, status);
        loadOrders();
      } catch (error) {
        alert('Failed to update order status');
      }
    };

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    return (
      <div data-name="admin-orders" data-file="components/AdminOrders.js">
        <h1 className="text-3xl font-bold text-[var(--text-dark)] mb-8">Orders</h1>
        
        <div className="flex gap-3 mb-6">
          {['all', 'pending', 'processing', 'delivered'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                filter === status ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-100 text-[var(--text-dark)]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow">
          {filtered.length === 0 ? (
            <p className="text-center text-[var(--text-light)] py-8">No orders found</p>
          ) : (
            <div className="divide-y">
              {filtered.map(order => (
                <div key={order.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-[var(--text-light)]">{new Date(order.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-[var(--text-light)]">Customer: {order.customerName}</p>
                    </div>
                    <select 
                      value={order.status} 
                      onChange={(e) => updateStatus(order.userId, order.id, e.target.value)}
                      className="px-3 py-1 border rounded-lg text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                  <div className="space-y-2 mb-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <span>₦{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold pt-3 border-t">
                    <span>Total</span>
                    <span>₦{order.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('AdminOrders error:', error);
    return null;
  }
}