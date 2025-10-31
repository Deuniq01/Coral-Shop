function WhatsAppCTA() {
  try {
    return (
      <section className="bg-[var(--primary-color)] py-16" data-name="whatsapp-cta" data-file="components/WhatsAppCTA.js">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div className="icon-message-circle text-3xl text-[var(--primary-color)]"></div>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Need Help With Your Order?
          </h2>
          <p className="text-lg text-white mb-8 opacity-95">
            Speak with a representative regarding your order. We're here to help you make the best choices!
          </p>
          <a 
            href="https://wa.me/2349061965441" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-[var(--primary-color)] px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-xl transition-shadow"
          >
            <div className="icon-message-circle text-2xl"></div>
            Chat on WhatsApp
          </a>
        </div>
      </section>
    );
  } catch (error) {
    console.error('WhatsAppCTA component error:', error);
    return null;
  }
}