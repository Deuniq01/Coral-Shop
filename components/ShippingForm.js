function ShippingForm({ onSubmit, user }) {
  try {
    const [formData, setFormData] = React.useState({
      fullName: user?.name || '',
      email: user?.email || '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="bg-white rounded-lg shadow p-6" data-name="shipping-form" data-file="components/ShippingForm.js">
        <h2 className="text-xl font-bold text-[var(--text-dark)] mb-6">Shipping Information</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required rows="3" className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]"></textarea>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} required className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} required className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Postal Code</label>
              <input type="text" value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} required className="w-full px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
            </div>
          </div>

          <button type="submit" className="w-full btn-primary">Continue to Payment</button>
        </form>
      </div>
    );
  } catch (error) {
    console.error('ShippingForm error:', error);
    return null;
  }
}