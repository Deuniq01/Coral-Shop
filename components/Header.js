function Header({ user, cartCount, onCartClick, onAIChatClick, onAuthClick, onMenuClick }) {
  try {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--border-color)]" data-name="header" data-file="components/Header.js">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={onMenuClick} className="lg:hidden text-[var(--text-dark)]" title="Menu">
                <div className="icon-menu text-xl"></div>
              </button>
              <a href="index.html" className="flex items-center">
                <img src="https://app.trickle.so/storage/public/images/anonymous/6e28483f-d0f7-43cc-b922-33b56d30e9b9.coral shopping_125319" alt="Coral Shopping" className="h-10" />
              </a>
            </div>
            
            <div className="hidden md:flex items-center flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="Search for products..." 
                  className="w-full px-4 py-2 pr-10 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                />
                <div className="icon-search absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-light)] text-lg"></div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <button onClick={onAIChatClick} className="text-[var(--text-dark)] hover:text-[var(--primary-color)] transition-colors" title="AI Assistant">
                <div className="icon-bot text-xl"></div>
              </button>
              <button onClick={() => user ? window.location.href = 'dashboard.html' : onAuthClick()} className="text-[var(--text-dark)] hover:text-[var(--primary-color)] transition-colors" title={user ? "My Account" : "Login / Sign Up"}>
                <div className="icon-user text-xl"></div>
              </button>
              <button onClick={onCartClick} className="relative text-[var(--text-dark)] hover:text-[var(--primary-color)] transition-colors" title="Shopping Cart">
                <div className="icon-shopping-cart text-xl"></div>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--primary-color)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex lg:hidden items-center gap-4">
              <button onClick={onAIChatClick} title="AI Assistant">
                <div className="icon-bot text-xl text-[var(--text-dark)]"></div>
              </button>
              <button onClick={onCartClick} className="relative" title="Cart">
                <div className="icon-shopping-cart text-xl text-[var(--text-dark)]"></div>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--primary-color)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  } catch (error) {
    console.error('Header component error:', error);
    return null;
  }
}