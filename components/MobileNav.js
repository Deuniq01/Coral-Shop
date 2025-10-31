function MobileNav({ show, onClose, user, onAuthClick }) {
  try {
    if (!show) return null;

    return (
      <div className="lg:hidden fixed inset-0 z-50" data-name="mobile-nav" data-file="components/MobileNav.js">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-dark)]">Menu</h2>
            <button onClick={onClose}>
              <div className="icon-x text-xl text-[var(--text-dark)]"></div>
            </button>
          </div>
          
          <div className="p-4">
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
            />
          </div>

          <nav className="px-4 space-y-2">
            <a href="index.html" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--secondary-color)] transition-colors">
              <div className="icon-home text-lg text-[var(--primary-color)]"></div>
              <span className="text-[var(--text-dark)]">Home</span>
            </a>
            <button onClick={() => user ? window.location.href = 'dashboard.html' : onAuthClick()} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--secondary-color)] transition-colors">
              <div className="icon-user text-lg text-[var(--primary-color)]"></div>
              <span className="text-[var(--text-dark)]">{user ? 'My Account' : 'Login / Sign Up'}</span>
            </button>
            {user && user.isAdmin && (
              <a href="admin.html" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--secondary-color)] transition-colors">
                <div className="icon-shield text-lg text-[var(--primary-color)]"></div>
                <span className="text-[var(--text-dark)]">Admin Dashboard</span>
              </a>
            )}
          </nav>
        </div>
      </div>
    );
  } catch (error) {
    console.error('MobileNav component error:', error);
    return null;
  }
}