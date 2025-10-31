function AdminProducts() {
  try {
    const [products, setProducts] = React.useState([]);
    const [showForm, setShowForm] = React.useState(false);
    const [editProduct, setEditProduct] = React.useState(null);
    const [formData, setFormData] = React.useState({ name: '', price: '', category: 'foodstuffs', description: '', image: '' });

    React.useEffect(() => {
      loadProducts();
    }, []);

    const loadProducts = async () => {
      try {
        const result = await trickleListObjects('product', 100, true);
        setProducts(result.items.map(item => ({...item.objectData, id: item.objectId})));
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (editProduct) {
          await trickleUpdateObject('product', editProduct.id, {...formData, price: parseFloat(formData.price)});
        } else {
          await trickleCreateObject('product', {...formData, price: parseFloat(formData.price)});
        }
        setShowForm(false);
        setEditProduct(null);
        setFormData({ name: '', price: '', category: 'foodstuffs', description: '', image: '' });
        loadProducts();
      } catch (error) {
        alert('Failed to save product');
      }
    };

    const handleEdit = (product) => {
      setEditProduct(product);
      setFormData({ name: product.name, price: product.price.toString(), category: product.category, description: product.description, image: product.image });
      setShowForm(true);
    };

    const handleDelete = async (id) => {
      if (confirm('Delete this product?')) {
        try {
          await trickleDeleteObject('product', id);
          loadProducts();
        } catch (error) {
          alert('Failed to delete product');
        }
      }
    };

    return (
      <div data-name="admin-products" data-file="components/AdminProducts.js">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-dark)]">Products</h1>
          <button onClick={() => { setShowForm(true); setEditProduct(null); setFormData({ name: '', price: '', category: 'foodstuffs', description: '', image: '' }); }} className="btn-primary">
            <div className="flex items-center gap-2"><div className="icon-plus text-xl"></div>Add Product</div>
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-4">{editProduct ? 'Edit' : 'Add'} Product</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="px-4 py-2 border rounded-lg" />
              <input type="number" placeholder="Price" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required className="px-4 py-2 border rounded-lg" />
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="px-4 py-2 border rounded-lg">
                <option value="foodstuffs">Foodstuffs</option>
                <option value="gifts">Gifts</option>
                <option value="household">Household</option>
              </select>
              <input type="url" placeholder="Image URL" value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} required className="px-4 py-2 border rounded-lg" />
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required className="col-span-2 px-4 py-2 border rounded-lg" rows="3"></textarea>
              <div className="col-span-2 flex gap-4">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.name} className="w-12 h-12 rounded object-cover" />
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize">{product.category}</td>
                  <td className="px-6 py-4 font-bold">₦{product.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(product)} className="text-blue-600 mr-3"><div className="icon-edit text-lg"></div></button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600"><div className="icon-trash-2 text-lg"></div></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (error) {
    console.error('AdminProducts error:', error);
    return null;
  }
}