async function registerUser(name, email, password) {
  try {
    const existingUsers = await trickleListObjects('user', 100, true);
    const userExists = existingUsers.items.find(u => u.objectData.email === email);
    if (userExists) throw new Error('Email already registered');
    
    const user = await trickleCreateObject('user', {
      name,
      email,
      password,
      isAdmin: false,
      createdAt: new Date().toISOString()
    });
    
    localStorage.setItem('currentUser', JSON.stringify({...user.objectData, id: user.objectId}));
    return {...user.objectData, id: user.objectId};
  } catch (error) {
    throw error;
  }
}

async function loginUser(email, password) {
  try {
    const users = await trickleListObjects('user', 100, true);
    const user = users.items.find(u => u.objectData.email === email && u.objectData.password === password);
    if (!user) throw new Error('Invalid email or password');
    
    localStorage.setItem('currentUser', JSON.stringify({...user.objectData, id: user.objectId}));
    return {...user.objectData, id: user.objectId};
  } catch (error) {
    throw error;
  }
}

function getCurrentUser() {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

function logoutUser() {
  localStorage.removeItem('currentUser');
}

// --- Google Sign-In support (client) -------------------------------------
// Requires the Google Identity Services script to be loaded on the page
// and a Google Client ID to be available at window.GOOGLE_CLIENT_ID.
async function handleGoogleCredentialResponse(response) {
  try {
    const idToken = response && response.credential;
    if (!idToken) throw new Error('Missing credential from Google');

    const resp = await fetch('/.netlify/functions/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Auth failed: ${err}`);
    }

    const data = await resp.json();
    if (data && data.user) {
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      // Optional: reload to let UI update or call a callback if provided
      if (typeof window.onAuthStateChanged === 'function') window.onAuthStateChanged(data.user);
      return data.user;
    }
    throw new Error('No user returned from auth function');
  } catch (err) {
    console.error('Google sign-in error:', err);
    throw err;
  }
}

function initGoogleSignIn() {
  try {
    if (!window.google || !google.accounts || !google.accounts.id) return;
    const clientId = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false
    });
    // Render the button into any element with id 'gsiButton' if present
    const container = document.getElementById('gsiButton');
    if (container) {
      google.accounts.id.renderButton(container, { theme: 'outline', size: 'large' });
    }
    // Expose helper globally
    window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;
    window.initGoogleSignIn = initGoogleSignIn;
  } catch (e) {
    console.warn('Unable to initialize Google Sign-In:', e);
  }
}

// Try to initialize on load (will be a no-op if library or element not present)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => setTimeout(initGoogleSignIn, 500));
}