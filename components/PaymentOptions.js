function PaymentOptions({ onPlaceOrder, total }) {
  try {
    const [selectedMethod, setSelectedMethod] = React.useState('transfer');
    const [copied, setCopied] = React.useState(false);

    const paymentMethods = [
      { id: 'transfer', name: 'Bank Transfer', icon: 'building-2' }
    ];

    const copyAccountNumber = () => {
      navigator.clipboard.writeText('9161965441').then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    };

    return (
      <div className="bg-white rounded-lg shadow p-6" data-name="payment-options" data-file="components/PaymentOptions.js">
        <h2 className="text-xl font-bold text-[var(--text-dark)] mb-6">Payment Method</h2>
        
        <div className="space-y-3 mb-6">
          {paymentMethods.map(method => (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`w-full flex items-center gap-4 p-4 border-2 rounded-lg transition-colors ${
                selectedMethod === method.id 
                  ? 'border-[var(--primary-color)] bg-[var(--secondary-color)]' 
                  : 'border-[var(--border-color)] hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                selectedMethod === method.id ? 'bg-white' : 'bg-gray-100'
              }`}>
                <div className={`icon-${method.icon} text-2xl ${
                  selectedMethod === method.id ? 'text-[var(--primary-color)]' : 'text-gray-600'
                }`}></div>
              </div>
              <span className="font-medium">{method.name}</span>
            </button>
          ))}
        </div>

        {selectedMethod === 'transfer' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-[var(--text-dark)] mb-3">Bank Account Details:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-light)]">Bank Name:</span>
                <span className="font-medium">Palmpay</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-light)]">Account Number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">9161965441</span>
                  <button 
                    onClick={copyAccountNumber}
                    className="p-1 hover:bg-blue-100 rounded transition-colors"
                    title="Copy account number"
                  >
                    {copied ? (
                      <div className="icon-check text-green-600 text-sm"></div>
                    ) : (
                      <div className="icon-copy text-blue-600 text-sm"></div>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-light)]">Account Name:</span>
                <span className="font-medium">Bolatito Roqeebat Kehinde</span>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">

                <span className="text-[var(--text-light)]">Amount to Transfer:</span>
                <span className="font-bold text-[var(--primary-color)] text-lg">₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => onPlaceOrder(selectedMethod)} className="w-full btn-primary">
          I've Sent It
        </button>
      </div>
    );
  } catch (error) {
    console.error('PaymentOptions error:', error);
    return null;
  }
}
