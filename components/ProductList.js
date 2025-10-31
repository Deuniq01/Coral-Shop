function ProductList({ onAddToCart }) {
  try {
    const [products, setProducts] = React.useState([]);
    const [selectedCategory, setSelectedCategory] = React.useState('all');
    const categories = ['all', 'foodstuffs', 'gifts', 'household'];

    React.useEffect(() => {
      loadProducts();
    }, []);

    const loadProducts = async () => {
      try {
        const result = await trickleListObjects('product', 50, true);
        if (result && result.items) {
          setProducts(result.items.map(item => ({...item.objectData, id: item.objectId})));
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        setProducts([]);
      }
    };

    const filtered = selectedCategory === 'all' 
      ? products 
      : products.filter(p => p.category === selectedCategory);

    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-name="product-list" data-file="components/ProductList.js">
        <h2 className="text-3xl font-bold text-[var(--text-dark)] mb-8">All Products</h2>
        
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-[var(--primary-color)] text-white' 
                  : 'bg-[var(--secondary-color)] text-[var(--primary-color)] hover:bg-[var(--accent-color)] hover:text-white'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error('ProductList component error:', error);
    return null;
  }
}