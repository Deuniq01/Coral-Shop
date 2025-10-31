function UserProfile({ user }) {
  try {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8" data-name="user-profile" data-file="components/UserProfile.js">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[var(--secondary-color)] rounded-full flex items-center justify-center">
            <div className="icon-user text-3xl text-[var(--primary-color)]"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-dark)]">{user.name}</h1>
            <p className="text-[var(--text-light)]">{user.email}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[var(--secondary-color)] rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="icon-calendar text-xl text-[var(--primary-color)]"></div>
              <span className="text-sm text-[var(--text-light)]">Member Since</span>
            </div>
            <p className="font-semibold text-[var(--text-dark)]">
              {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="p-4 bg-[var(--secondary-color)] rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="icon-package text-xl text-[var(--primary-color)]"></div>
              <span className="text-sm text-[var(--text-light)]">Account Type</span>
            </div>
            <p className="font-semibold text-[var(--text-dark)]">
              {user.isAdmin ? 'Administrator' : 'Customer'}
            </p>
          </div>
          
          <div className="p-4 bg-[var(--secondary-color)] rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="icon-shield-check text-xl text-[var(--primary-color)]"></div>
              <span className="text-sm text-[var(--text-light)]">Status</span>
            </div>
            <p className="font-semibold text-green-600">Active</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('UserProfile component error:', error);
    return null;
  }
}