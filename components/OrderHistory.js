function OrderHistory({ userId }) {
  try {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedOrder, setSelectedOrder] = React.useState(null);

    React.useEffect(() => {
      loadOrders();
    }, [userId]);

    const loadOrders = async () => {
      try {
        if (!userId) {
          console.warn('No user ID available');
          setOrders([]);
          setLoading(false);
          return;
        }
        const userOrders = await getUserOrders(userId);
        setOrders(userOrders || []);
      } catch (error) {
        console.error('Failed to load orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    const handleReorder = async (order) => {
      try {
        await createOrder(userId, order.items, 'pending');
        alert('Order placed successfully!');
        loadOrders();
      } catch (error) {
        alert('Failed to reorder. Please try again.');
      }
    };

    const getStatusColor = (status) => {
      switch(status) {
        case 'delivered': return 'text-green-600 bg-green-100';
        case 'pending': return 'text-yellow-600 bg-yellow-100';
        case 'processing': return 'text-blue-600 bg-blue-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    if (loading) return <div className="text-center py-8">Loading orders...</div>;

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8" data-name="order-history" data-file="components/OrderHistory.js">
        <h2 className="text-2xl font-bold text-[var(--text-dark)] mb-6">Order History</h2>
        
        {orders.length === 0 ? (
          <p className="text-center text-[var(--text-light)] py-8">No orders yet. Start shopping!</p>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="border border-[var(--border-color)] rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-[var(--text-dark)]">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-[var(--text-light)]">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="font-medium">₦{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
                  <span className="font-bold text-[var(--text-dark)]">Total: ₦{order.total.toLocaleString()}</span>
                  <div className="icon-chevron-right text-[var(--text-light)]"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedOrder && (
          <OrderDetails 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)}
            onReorder={handleReorder}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error('OrderHistory component error:', error);
    return null;
  }
}
