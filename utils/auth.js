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