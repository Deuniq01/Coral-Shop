function saveCartToStorage(items) {
  localStorage.setItem('cart', JSON.stringify(items));
}

function loadCartFromStorage() {
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
}

function clearCart() {
  localStorage.removeItem('cart');
}