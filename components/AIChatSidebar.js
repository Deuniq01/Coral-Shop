function AIChatSidebar({ show, onClose }) {
  try {
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSend = async () => {
      if (!input.trim()) return;
      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setLoading(true);
      try {
        const response = await getAIRecommendationWithProducts(userMsg, messages);
        if (response && response.text) {
          setMessages(prev => [...prev, { role: 'ai', content: response.text, products: response.products || [] }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', content: 'I apologize for the inconvenience. Please try again or contact us via WhatsApp at 09061965441.' }]);
        }
      } catch (error) {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please contact us via WhatsApp at 09061965441 for immediate assistance.' }]);
      } finally {
        setLoading(false);
      }
    };

    const handleAddToCart = (product) => {
      const event = new CustomEvent('addToCart', { detail: product });
      window.dispatchEvent(event);
      alert('Product added to cart!');
    };

    if (!show) return null;

    return (
      <div className="fixed inset-0 z-50" data-name="ai-chat-sidebar" data-file="components/AIChatSidebar.js">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-dark)]">AI Shopping Assistant</h2>
            <button onClick={onClose}><div className="icon-x text-xl text-[var(--text-dark)]"></div></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-[var(--text-light)] mt-8">
                <p className="mb-4">Ask me anything about products or recommendations!</p>
                <div className="text-xs space-y-1">
                  <p>Try: "Show me gifts under ₦5000"</p>
                  <p>Try: "I need kitchen items"</p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-100 text-[var(--text-dark)]'}`}>
                    {msg.content}
                  </div>
                </div>
                {msg.products && msg.products.length > 0 && (
                  <div className="space-y-2 ml-2">
                    {msg.products.map((product, pIdx) => (
                      <div key={pIdx} className="bg-white border border-[var(--border-color)] rounded-lg p-3 flex gap-3">
                        <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{product.name}</p>
                          <p className="text-[var(--primary-color)] font-bold text-sm">₦{product.price.toLocaleString()}</p>
                          <button onClick={() => handleAddToCart(product)} className="mt-1 text-xs bg-[var(--primary-color)] text-white px-3 py-1 rounded">
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-center text-[var(--text-light)]">Thinking...</div>}
          </div>
          <div className="p-4 border-t border-[var(--border-color)]">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about products..." className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
              <button onClick={handleSend} className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-lg"><div className="icon-send text-lg"></div></button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('AIChatSidebar component error:', error);
    return null;
  }
}
