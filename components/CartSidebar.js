function CartSidebar({ show, onClose, items, onUpdateQuantity, onRemove }) {
  try {
    if (!show) return null;

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
      <div className="fixed inset-0 z-50" data-name="cart-sidebar" data-file="components/CartSidebar.js">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-dark)]">Shopping Cart</h2>
            <button onClick={onClose}><div className="icon-x text-xl text-[var(--text-dark)]"></div></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <p className="text-center text-[var(--text-light)] mt-8">Your cart is empty</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex gap-4 mb-4 pb-4 border-b border-[var(--border-color)]">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-dark)]">{item.name}</h3>
                    <p className="text-[var(--primary-color)] font-bold">₦{item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))} className="w-6 h-6 border rounded flex items-center justify-center">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 border rounded flex items-center justify-center">+</button>
                      <button onClick={() => onRemove(item.id)} className="ml-auto text-red-500"><div className="icon-trash-2 text-lg"></div></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {items.length > 0 && (
            <div className="p-4 border-t border-[var(--border-color)]">
              <div className="flex justify-between mb-4"><span className="font-semibold">Total:</span><span className="text-xl font-bold text-[var(--primary-color)]">₦{total.toLocaleString()}</span></div>
              <button onClick={() => window.location.href = 'checkout.html'} className="w-full btn-primary">Proceed to Checkout</button>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('CartSidebar component error:', error);
    return null;
  }
}
