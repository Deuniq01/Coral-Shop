function AdminSidebar({ currentView, onViewChange }) {
  try {
    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'products', label: 'Products', icon: 'package' },
      { id: 'orders', label: 'Orders', icon: 'shopping-bag' },
      { id: 'customers', label: 'Customers', icon: 'users' }
    ];

    return (
      <aside className="w-64 bg-white border-r border-[var(--border-color)] min-h-screen" data-name="admin-sidebar" data-file="components/AdminSidebar.js">
        <nav className="p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id 
                  ? 'bg-[var(--primary-color)] text-white' 
                  : 'text-[var(--text-dark)] hover:bg-[var(--secondary-color)]'
              }`}
            >
              <div className={`icon-${item.icon} text-xl`}></div>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    );
  } catch (error) {
    console.error('AdminSidebar error:', error);
    return null;
  }
}