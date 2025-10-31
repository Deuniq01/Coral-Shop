const ChartJS = window.Chart;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <button onClick={() => window.location.reload()} className="btn-primary">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminApp() {
  try {
    const [user, setUser] = React.useState(null);
    const [currentView, setCurrentView] = React.useState('dashboard');
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      const currentUser = getCurrentUser();
      if (!currentUser || !currentUser.isAdmin) {
        window.location.href = 'index.html';
        return;
      }
      setUser(currentUser);
      setLoading(false);
    }, []);

    if (loading) {
      return <div className="min-h-screen flex items-center justify-center"><div className="text-[var(--text-light)]">Loading...</div></div>;
    }

    return (
      <div className="min-h-screen bg-gray-50" data-name="admin-app" data-file="admin-app.js">
        <AdminHeader user={user} />
        <div className="flex">
          <AdminSidebar currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1 p-8">
            {currentView === 'dashboard' && <AdminDashboard />}
            {currentView === 'products' && <AdminProducts />}
            {currentView === 'orders' && <AdminOrders />}
            {currentView === 'customers' && <AdminCustomers />}
          </main>
        </div>
      </div>
    );
  } catch (error) {
    console.error('AdminApp error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><AdminApp /></ErrorBoundary>);