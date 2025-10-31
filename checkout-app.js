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

function CheckoutApp() {
  try {
    const [cartItems, setCartItems] = React.useState([]);
    const [user, setUser] = React.useState(null);
    const [currentStep, setCurrentStep] = React.useState('shipping');
    const [shippingData, setShippingData] = React.useState(null);

    React.useEffect(() => {
      const items = loadCartFromStorage();
      if (items && items.length > 0) {
        setCartItems(items);
      }
      const currentUser = getCurrentUser();
      setUser(currentUser);
    }, []);

    const handleShippingSubmit = (data) => {
      setShippingData(data);
      setCurrentStep('payment');
    };

    const handlePlaceOrder = async (paymentMethod) => {
      try {
        if (!user) {
          alert('Please login to place order');
          window.location.href = 'index.html';
          return;
        }
        if (!cartItems || cartItems.length === 0) {
          alert('Your cart is empty');
          return;
        }
        await createOrder(user.id, cartItems, 'pending');
        clearCart();
        window.location.href = 'order-success.html';
      } catch (error) {
        console.error('Order placement error:', error);
        alert('Failed to place order. Please try again or contact support.');
      }
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 2000;
    const total = subtotal + shipping;

    return (
      <div className="min-h-screen bg-gray-50" data-name="checkout-app" data-file="checkout-app.js">
        <CheckoutHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {currentStep === 'shipping' && (
                <ShippingForm onSubmit={handleShippingSubmit} user={user} />
              )}
              {currentStep === 'payment' && (
                <PaymentOptions onPlaceOrder={handlePlaceOrder} total={total} />
              )}
            </div>
            <div className="lg:col-span-1">
              <OrderSummary items={cartItems} />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('CheckoutApp error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><CheckoutApp /></ErrorBoundary>);