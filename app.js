class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

  function App() {
  try {
    const [cartItems, setCartItems] = React.useState([]);
    const [showCart, setShowCart] = React.useState(false);
    const [showAIChat, setShowAIChat] = React.useState(false);
    const [showAuth, setShowAuth] = React.useState(false);
    const [user, setUser] = React.useState(null);
    const [showMobileNav, setShowMobileNav] = React.useState(false);

    React.useEffect(() => {
      const currentUser = getCurrentUser();
      if (currentUser) setUser(currentUser);
      
      const savedCart = loadCartFromStorage();
      if (savedCart && savedCart.length > 0) {
        setCartItems(savedCart);
      }
      
      const handleAddToCart = (event) => {
        addToCart(event.detail);
      };
      window.addEventListener('addToCart', handleAddToCart);
      return () => window.removeEventListener('addToCart', handleAddToCart);
    }, []);

    React.useEffect(() => {
      saveCartToStorage(cartItems);
    }, [cartItems]);

    const addToCart = (product) => {
      setCartItems(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => 
            item.id === product.id ? {...item, quantity: item.quantity + 1} : item
          );
        }
        return [...prev, {...product, quantity: 1}];
      });
    };

    return (
      <div className="min-h-screen bg-white" data-name="app" data-file="app.js">
        <Header 
          user={user}
          cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          onCartClick={() => setShowCart(true)}
          onAIChatClick={() => setShowAIChat(true)}
          onAuthClick={() => setShowAuth(true)}
          onMenuClick={() => setShowMobileNav(true)}
        />
        <MobileNav 
          show={showMobileNav}
          onClose={() => setShowMobileNav(false)}
          user={user}
          onAuthClick={() => setShowAuth(true)}
        />
        <Hero />
        <ProductList onAddToCart={addToCart} />
        <CustomShopForm />
        <WhatsAppCTA />
        <Footer />
        <CartSidebar 
          show={showCart}
          onClose={() => setShowCart(false)}
          items={cartItems}
          onUpdateQuantity={(id, qty) => {
            setCartItems(prev => prev.map(item => 
              item.id === id ? {...item, quantity: qty} : item
            ));
          }}
          onRemove={(id) => setCartItems(prev => prev.filter(item => item.id !== id))}
        />
        <AIChatSidebar show={showAIChat} onClose={() => setShowAIChat(false)} />
        <AuthModal 
          show={showAuth}
          onClose={() => setShowAuth(false)}
          onSuccess={(userData) => setUser(userData)}
        />
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><App /></ErrorBoundary>);