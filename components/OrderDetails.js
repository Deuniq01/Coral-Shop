function OrderDetails({ order, onClose, onReorder }) {
  try {
    if (!order) return null;

    const getStatusColor = (status) => {
      switch(status) {
        case 'delivered': return 'text-green-600 bg-green-100';
        case 'pending': return 'text-yellow-600 bg-yellow-100';
        case 'processing': return 'text-blue-600 bg-blue-100';
        default: return 'text-gray-600 bg-gray-100';
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" data-name="order-details" data-file="components/OrderDetails.js">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-[var(--border-color)] p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--text-dark)]">Order Details</h2>
            <button onClick={onClose}><div className="icon-x text-xl text-[var(--text-dark)]"></div></button>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-[var(--text-light)] mb-1">Order ID</p>
                <p className="font-semibold">#{order.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)] mb-1">Order Date</p>
                <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)] mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)] mb-1">Total Amount</p>
                <p className="font-bold text-[var(--primary-color)] text-xl">₦{order.total.toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t border-[var(--border-color)] pt-6">
              <h3 className="font-semibold text-lg mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <p className="font-semibold text-[var(--text-dark)]">{item.name}</p>
                      <p className="text-sm text-[var(--text-light)]">Quantity: {item.quantity}</p>
                      <p className="text-sm text-[var(--text-light)]">Price: ₦{item.price.toLocaleString()} each</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--primary-color)]">₦{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border-color)] mt-6 pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[var(--text-light)]">Subtotal</span>
                <span className="font-semibold">₦{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[var(--text-light)]">Shipping</span>
                <span className="font-semibold">₦2,000</span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total</span>
                <span className="text-[var(--primary-color)]">₦{order.total.toLocaleString()}</span>
              </div>
            </div>

            <button onClick={() => { onReorder(order); onClose(); }} className="w-full btn-primary mt-6">
              <div className="flex items-center justify-center gap-2">
                <div className="icon-refresh-cw text-lg"></div>
                Reorder Items
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('OrderDetails component error:', error);
    return null;
  }
}