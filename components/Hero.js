function Hero() {
  try {
    return (
      <section className="bg-gradient-to-r from-[var(--secondary-color)] to-white py-16 md:py-24" data-name="hero" data-file="components/Hero.js">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-dark)] mb-6 leading-tight">
                Your taste. Your style. Your vibe. Perfectly shopped.
              </h1>
              <p className="text-lg text-[var(--text-light)] mb-8">

                Discover quality foodstuffs, unique gifts, and essential household items - all in one place. Shop smart with AI-powered recommendations.
              </p>
              <div className="flex gap-4">
                <button className="btn-primary">Shop Now</button>
                <button className="btn-secondary">Explore Categories</button>
              </div>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=600&h=400&fit=crop" 
                alt="Shopping" 
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    console.error('Hero component error:', error);
    return null;
  }
}