function DashboardHeader({ user, onLogout }) {
  try {
    return (
      <header className="bg-white border-b border-[var(--border-color)]" data-name="dashboard-header" data-file="components/DashboardHeader.js">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="index.html" className="flex items-center">
              <img src="https://app.trickle.so/storage/public/images/anonymous/6e28483f-d0f7-43cc-b922-33b56d30e9b9.coral shopping_125319" alt="Coral Shopping" className="h-10" />
            </a>
            
            <div className="flex items-center gap-4">
              <a href="index.html" className="text-[var(--text-dark)] hover:text-[var(--primary-color)] transition-colors">
                <div className="icon-home text-xl"></div>
              </a>
              {user && user.isAdmin && (
                <a href="admin.html" className="text-[var(--text-dark)] hover:text-[var(--primary-color)] transition-colors" title="Admin">
                  <div className="icon-shield text-xl"></div>
                </a>
              )}
              <button onClick={onLogout} className="btn-secondary" title="Logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  } catch (error) {
    console.error('DashboardHeader component error:', error);
    return null;
  }
}