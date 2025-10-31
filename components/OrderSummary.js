function OrderSummary({ items }) {
  try {
    if (!items || items.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-6 sticky top-8" data-name="order-summary" data-file="components/OrderSummary.js">
          <h2 className="text-xl font-bold text-[var(--text-dark)] mb-4">Order Summary</h2>
          <p className="text-center text-[var(--text-light)] py-8">Your cart is empty</p>
        </div>
      );
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 500;
    const total = subtotal + shipping;


    return (
      <div className="bg-white rounded-lg shadow p-6 sticky top-8" data-name="order-summary" data-file="components/OrderSummary.js">
        <h2 className="text-xl font-bold text-[var(--text-dark)] mb-4">Order Summary</h2>
        
        <div className="space-y-4 mb-6">
          {items.map(item => (
            <div key={item.id} className="flex gap-3">
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-sm text-[var(--text-light)]">Qty: {item.quantity}</p>
              </div>
              <span className="font-semibold">₦{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>₦{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>₦{shipping.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-[var(--primary-color)]">₦{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('OrderSummary error:', error);
    return null;
  }
}