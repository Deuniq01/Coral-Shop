function CustomShopForm() {
  try {
    const [formData, setFormData] = React.useState({
      name: '',
      phone: '',
      items: '',
      budget: ''
    });
    const [submitted, setSubmitted] = React.useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const resp = await fetch('/.netlify/functions/place-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'custom',
            ...formData,
            createdAt: new Date().toISOString()
          })
        });
        
        if (!resp.ok) {
          throw new Error('Failed to submit custom order');
        }
        
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
        setFormData({name: '', phone: '', items: '', budget: ''});
      } catch (error) {
        console.error('Failed to submit form:', error);
        alert('Failed to submit order. Please try again.');
      }
    };

    return (
      <section className="bg-[var(--secondary-color)] py-16" data-name="custom-shop-form" data-file="components/CustomShopForm.js">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[var(--text-dark)] mb-4 text-center">Shop Your Way</h2>
          <p className="text-center text-[var(--text-light)] mb-8">Tell us what you need, and we'll help you find it</p>
          
          {submitted && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Request submitted successfully! We'll contact you soon.
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 md:p-8 space-y-4">
            <input 
              type="text" 
              placeholder="Your Name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
            />
            <input 
              type="tel" 
              placeholder="Phone Number" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              required
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
            />
            <textarea 
              placeholder="What items do you need?" 
              value={formData.items}
              onChange={(e) => setFormData({...formData, items: e.target.value})}
              required
              rows="4"
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
            ></textarea>
            <input 
              type="text" 
              placeholder="Your Budget (Optional)" 
              value={formData.budget}
              onChange={(e) => setFormData({...formData, budget: e.target.value})}
              className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
            />
            <button type="submit" className="w-full btn-primary">Submit Request</button>
          </form>
        </div>
      </section>
    );
  } catch (error) {
    console.error('CustomShopForm component error:', error);
    return null;
  }
}