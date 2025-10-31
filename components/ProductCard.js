function ProductCard({ product, onAddToCart }) {
  try {
    return (
      <div className="bg-white border border-[var(--border-color)] rounded-lg overflow-hidden hover:shadow-lg transition-shadow" data-name="product-card" data-file="components/ProductCard.js">
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-[var(--text-dark)] mb-2">{product.name}</h3>
          <p className="text-sm text-[var(--text-light)] mb-3">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-[var(--primary-color)]">₦{product.price.toLocaleString()}</span>
            <button onClick={() => onAddToCart(product)} className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('ProductCard component error:', error);
    return null;
  }
}