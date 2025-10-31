function Recommendations({ userId }) {
  try {
    const [suggestions, setSuggestions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      loadRecommendations();
    }, [userId]);

    const loadRecommendations = async () => {
      try {
        if (!userId) {
          setSuggestions([]);
          setLoading(false);
          return;
        }
        const orders = await getUserOrders(userId);
        if (orders && orders.length > 0) {
          const orderedItems = orders.flatMap(o => o.items.map(i => i.name)).join(', ');
          const prompt = `Based on previous purchases: ${orderedItems}, suggest 3 complementary products from our catalog.`;
          const response = await getAIRecommendation(prompt, []);
          if (response) {
            setSuggestions([response]);
          }
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    if (loading) return <div className="text-center py-8">Loading recommendations...</div>;

    return (
      <div className="bg-white rounded-lg shadow p-6" data-name="recommendations" data-file="components/Recommendations.js">
        <h2 className="text-2xl font-bold text-[var(--text-dark)] mb-6">Recommended For You</h2>
        
        {suggestions.length === 0 ? (
          <p className="text-center text-[var(--text-light)] py-8">Make your first purchase to get personalized recommendations!</p>
        ) : (
          <div className="bg-[var(--secondary-color)] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <div className="icon-sparkles text-2xl text-[var(--primary-color)]"></div>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-dark)] mb-2">AI-Powered Suggestions</h3>
                <p className="text-[var(--text-dark)]">{suggestions[0]}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Recommendations component error:', error);
    return null;
  }
}