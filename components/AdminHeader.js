function AdminHeader({ user }) {
  try {
    return (
      <header className="bg-white border-b border-[var(--border-color)] sticky top-0 z-40" data-name="admin-header" data-file="components/AdminHeader.js">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img src="https://app.trickle.so/storage/public/images/anonymous/6e28483f-d0f7-43cc-b922-33b56d30e9b9.coral shopping_125319" alt="Coral Shopping" className="h-10" />
              <span className="text-sm font-medium text-[var(--text-light)]">Admin Panel</span>
            </div>
            
            <div className="flex items-center gap-4">
              <a href="index.html" className="text-[var(--text-dark)] hover:text-[var(--primary-color)]" title="Visit Store">
                <div className="icon-store text-xl"></div>
              </a>
              <a href="dashboard.html" className="text-[var(--text-dark)] hover:text-[var(--primary-color)]" title="My Account">
                <div className="icon-user text-xl"></div>
              </a>
              <button onClick={() => { logoutUser(); window.location.href = 'index.html'; }} className="text-[var(--text-dark)] hover:text-[var(--primary-color)]" title="Logout">
                <div className="icon-log-out text-xl"></div>
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  } catch (error) {
    console.error('AdminHeader error:', error);
    return null;
  }
}