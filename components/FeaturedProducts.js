function FeaturedProducts({ onAddToCart }) {
  try {
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      loadProducts();
    }, []);

    const loadProducts = async () => {
      try {
        const result = await trickleListObjects('product', 8, true);
        if (result && result.items) {
          setProducts(result.items.map(item => ({...item.objectData, id: item.objectId})));
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      }
      setLoading(false);
    };

    if (loading) {
      return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-name="featured-products" data-file="components/FeaturedProducts.js">
          <p className="text-center text-[var(--text-light)]">Loading products...</p>
        </section>
      );
    }

    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-name="featured-products" data-file="components/FeaturedProducts.js">
        <h2 className="text-3xl font-bold text-[var(--text-dark)] mb-8">Featured Products</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {products.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>

        <div className="text-center">
          <a href="products.html" className="inline-block btn-primary">
            View All Products
          </a>
        </div>
      </section>
    );
  } catch (error) {
    console.error('FeaturedProducts component error:', error);
    return null;
  }
}