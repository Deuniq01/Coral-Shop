function AdminCustomers() {
  try {
    const [customers, setCustomers] = React.useState([]);
    const [customRequests, setCustomRequests] = React.useState([]);

    React.useEffect(() => {
      loadCustomers();
      loadCustomRequests();
    }, []);

    const loadCustomers = async () => {
      try {
        const result = await trickleListObjects('user', 100, true);
        setCustomers(result.items.map(item => ({...item.objectData, id: item.objectId})));
      } catch (error) {
        console.error('Failed to load customers:', error);
      }
    };

    const loadCustomRequests = async () => {
      try {
        const result = await trickleListObjects('custom_order', 100, true);
        setCustomRequests(result.items.map(item => ({...item.objectData, id: item.objectId})));
      } catch (error) {
        console.error('Failed to load requests:', error);
      }
    };

    return (
      <div data-name="admin-customers" data-file="components/AdminCustomers.js">
        <h1 className="text-3xl font-bold text-[var(--text-dark)] mb-8">Customers</h1>
        
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Customer List</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Joined</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id} className="border-b">
                  <td className="px-6 py-4">{customer.name}</td>
                  <td className="px-6 py-4">{customer.email}</td>
                  <td className="px-6 py-4">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{customer.isAdmin ? 'Admin' : 'Customer'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Custom Shopping Requests</h2>
          </div>
          {customRequests.length === 0 ? (
            <p className="text-center text-[var(--text-light)] py-8">No requests yet</p>
          ) : (
            <div className="divide-y">
              {customRequests.map(req => (
                <div key={req.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">{req.name}</p>
                      <p className="text-sm text-[var(--text-light)]">{req.phone}</p>
                    </div>
                    <span className="text-xs text-[var(--text-light)]">{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm mb-2"><strong>Items:</strong> {req.items}</p>
                  {req.budget && <p className="text-sm"><strong>Budget:</strong> {req.budget}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('AdminCustomers error:', error);
    return null;
  }
}