function CheckoutHeader() {
  try {
    return (
      <header className="bg-white border-b border-[var(--border-color)]" data-name="checkout-header" data-file="components/CheckoutHeader.js">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="index.html" className="flex items-center">
              <img src="https://app.trickle.so/storage/public/images/anonymous/6e28483f-d0f7-43cc-b922-33b56d30e9b9.coral shopping_125319" alt="Coral Shopping" className="h-10" />
            </a>
            <div className="flex items-center gap-2">
              <div className="icon-shield-check text-xl text-green-600"></div>
              <span className="text-sm text-[var(--text-light)]">Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>
    );
  } catch (error) {
    console.error('CheckoutHeader error:', error);
    return null;
  }
}