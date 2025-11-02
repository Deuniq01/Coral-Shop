function AuthModal({ show, onClose, onSuccess }) {
  try {
    const [isLogin, setIsLogin] = React.useState(true);
    const [formData, setFormData] = React.useState({ email: '', password: '', name: '' });
    const [error, setError] = React.useState('');

    // Initialize Google Sign-In when modal shows
    React.useEffect(() => {
      if (show && window.google && window.initGoogleSignIn) {
        // Add callback to handle successful sign-in
        window.onAuthStateChanged = (user) => {
          if (user) {
            onSuccess(user);
            onClose();
          }
        };
        // Initialize Google Sign-In button
        window.initGoogleSignIn();
      }
    }, [show, onSuccess, onClose]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      try {
        let user;
        if (isLogin) {
          user = await loginUser(formData.email, formData.password);
        } else {
          user = await registerUser(formData.name, formData.email, formData.password);
        }
        onSuccess(user);
        onClose();
      } catch (err) {
        setError(err.message);
      }
    };

    if (!show) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" data-name="auth-modal" data-file="components/AuthModal.js">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <button onClick={onClose} className="absolute top-4 right-4"><div className="icon-x text-xl text-[var(--text-dark)]"></div></button>
          <h2 className="text-2xl font-bold text-[var(--text-dark)] mb-6">{isLogin ? 'Login' : 'Sign Up'}</h2>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && <input type="text" placeholder="Full Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />}
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
            <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required className="w-full px-4 py-3 border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
            <button type="submit" className="w-full btn-primary">{isLogin ? 'Login' : 'Sign Up'}</button>
          </form>
          <p className="text-center text-sm text-[var(--text-light)] mt-4">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-[var(--primary-color)] font-semibold">{isLogin ? 'Sign Up' : 'Login'}</button>
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-color)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-[var(--text-light)] bg-white">OR</span>
            </div>
          </div>

          <div id="gsiButton" className="w-full flex justify-center mb-4"></div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('AuthModal component error:', error);
    return null;
  }
}