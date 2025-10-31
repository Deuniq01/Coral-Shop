async function getAIRecommendation(userQuery, chatHistory) {
  try {
    const products = await trickleListObjects('product', 50, true);
    if (!products || !products.items || products.items.length === 0) {
      return "I apologize, but I'm unable to load our product catalog at the moment. Please try again or contact us via WhatsApp at 09061965441.";
    }
    
    const productList = products.items.map(p => `${p.objectData.name} (₦${p.objectData.price}) - ${p.objectData.category}`).join('\n');
    
    const systemPrompt = `You are a helpful shopping assistant for Coral Shopping, specializing in foodstuffs, gifts, and household items. Help customers find the best products based on their needs and budget. Here are the available products:\n\n${productList}\n\nProvide personalized recommendations and answer questions about products. Chat history: ${JSON.stringify(chatHistory)}`;
    
    const response = await invokeAIAgent(systemPrompt, userQuery);
    return response || "I'm here to help! Could you please rephrase your question?";
  } catch (error) {
    console.error('AI agent error:', error);
    return "I'm sorry, I'm having trouble connecting right now. Please contact our support team via WhatsApp at 09061965441 for immediate assistance.";
  }
}

async function getAIRecommendationWithProducts(userQuery, chatHistory) {
  try {
    const allProducts = await trickleListObjects('product', 50, true);
    if (!allProducts || !allProducts.items || allProducts.items.length === 0) {
      return {
        text: "I apologize, but I'm unable to load our product catalog at the moment. Please try again or contact us via WhatsApp at 09061965441.",
        products: []
      };
    }
    
    const productList = allProducts.items.map(p => `${p.objectData.name} (₦${p.objectData.price}) - ${p.objectData.category} - ID:${p.objectId}`).join('\n');
    
    const systemPrompt = `You are a helpful shopping assistant for Coral Shopping. When users ask for product recommendations, provide helpful advice and mention specific product names from the list below. Here are the available products:\n\n${productList}\n\nIn your response, mention product names naturally. Chat history: ${JSON.stringify(chatHistory)}`;
    
    const response = await invokeAIAgent(systemPrompt, userQuery);
    
    if (!response) {
      return {
        text: "I'm here to help! Could you please rephrase your question?",
        products: []
      };
    }
    
    const matchedProducts = [];
    allProducts.items.forEach(item => {
      if (response.toLowerCase().includes(item.objectData.name.toLowerCase())) {
        matchedProducts.push({...item.objectData, id: item.objectId});
      }
    });
    
    return {
      text: response,
      products: matchedProducts.slice(0, 3)
    };
  } catch (error) {
    console.error('AI agent error:', error);
    return {
      text: "I'm sorry, I'm having trouble connecting right now. Please contact our support team via WhatsApp at 09061965441 for immediate assistance.",
      products: []
    };
  }
}
