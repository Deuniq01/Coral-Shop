async function getAIRecommendation(userQuery, chatHistory) {
  try {
    const fetchResp = await fetch('/.netlify/functions/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', resource: 'products', limit: 50 })
    });

    if (!fetchResp.ok) {
      throw new Error(`Failed to fetch products: ${fetchResp.status}`);
    }

    const data = await fetchResp.json();
    if (!data.items || data.items.length === 0) {
      return "I apologize, but I'm unable to load our product catalog at the moment. Please try again or contact us via WhatsApp at 09061965441.";
    }
    
    const productList = data.items.map(p => `${p.name} (₦${p.price}) - ${p.description || 'No description'}`).join('\n');
    
    const systemPrompt = `You are a helpful shopping assistant for Coral Shopping, specializing in foodstuffs, gifts, and household items. Help customers find the best products based on their needs and budget. Here are the available products:\n\n${productList}\n\nProvide personalized recommendations and answer questions about products. Chat history: ${JSON.stringify(chatHistory)}`;
    
  const aiResponse = await invokeAIAgent(systemPrompt, userQuery);
  return aiResponse || "I'm here to help! Could you please rephrase your question?";
  } catch (error) {
    console.error('AI agent error:', error);
    return "I'm sorry, I'm having trouble connecting right now. Please contact our support team via WhatsApp at 09061965441 for immediate assistance.";
  }
}

async function getAIRecommendationWithProducts(userQuery, chatHistory) {
  try {
    const fetchResp = await fetch('/.netlify/functions/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', resource: 'products', limit: 50 })
    });
    if (!fetchResp.ok) {
      throw new Error(`Failed to fetch products: ${fetchResp.status}`);
    }

    const data = await fetchResp.json();
    if (!data.items || data.items.length === 0) {
      return {
        text: "I apologize, but I'm unable to load our product catalog at the moment. Please try again or contact us via WhatsApp at 09061965441.",
        products: []
      };
    }
    
    const productList = data.items.map(p => `${p.name} (₦${p.price}) - ${p.description || 'No description'} - ID:${p.id}`).join('\n');
    
    const systemPrompt = `You are a helpful shopping assistant for Coral Shopping. When users ask for product recommendations, provide helpful advice and mention specific product names from the list below. Here are the available products:\n\n${productList}\n\nIn your response, mention product names naturally. Chat history: ${JSON.stringify(chatHistory)}`;
    
    const aiResponse = await invokeAIAgent(systemPrompt, userQuery);

    if (!aiResponse) {
      return {
        text: "I'm here to help! Could you please rephrase your question?",
        products: []
      };
    }
    
    const matchedProducts = [];
    data.items.forEach(item => {
      if (aiResponse.toLowerCase().includes(item.name.toLowerCase())) {
        matchedProducts.push(item);
      }
    });
    
    return {
      text: aiResponse,
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
