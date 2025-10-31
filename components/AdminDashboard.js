function AdminDashboard() {
  try {
    const [stats, setStats] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
      loadStats();
    }, []);

    React.useEffect(() => {
      if (stats && chartRef.current) {
        const ctx = chartRef.current.getContext('2d');
        new ChartJS(ctx, {
          type: 'line',
          data: {
            labels: stats.salesData.labels,
            datasets: [{
              label: 'Sales',
              data: stats.salesData.values,
              borderColor: '#FF6B6B',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              tension: 0.4
            }]
          },
          options: { responsive: true, plugins: { legend: { display: false } } }
        });
      }
    }, [stats]);

    const loadStats = async () => {
      try {
        const data = await getAnalytics();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
      setLoading(false);
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    return (
      <div data-name="admin-dashboard" data-file="components/AdminDashboard.js">
        <h1 className="text-3xl font-bold text-[var(--text-dark)] mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="icon-dollar-sign text-2xl text-blue-600"></div>
              </div>
            </div>
            <p className="text-sm text-[var(--text-light)] mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-[var(--text-dark)]">₦{stats?.totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <div className="icon-shopping-bag text-2xl text-green-600"></div>
            </div>
            <p className="text-sm text-[var(--text-light)] mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-[var(--text-dark)]">{stats?.totalOrders}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <div className="icon-users text-2xl text-purple-600"></div>
            </div>
            <p className="text-sm text-[var(--text-light)] mb-1">Customers</p>
            <p className="text-2xl font-bold text-[var(--text-dark)]">{stats?.totalCustomers}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <div className="icon-package text-2xl text-orange-600"></div>
            </div>
            <p className="text-sm text-[var(--text-light)] mb-1">Products</p>
            <p className="text-2xl font-bold text-[var(--text-dark)]">{stats?.totalProducts}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">Sales Overview</h2>
          <canvas ref={chartRef}></canvas>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Pending Orders</h2>
          {stats?.pendingOrders.length === 0 ? (
            <p className="text-center text-[var(--text-light)] py-4">No pending orders</p>
          ) : (
            <div className="space-y-3">
              {stats?.pendingOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                  <span>Order #{order.id.slice(0, 8)}</span>
                  <span className="font-bold">₦{order.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('AdminDashboard error:', error);
    return null;
  }
}