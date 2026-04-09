import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Zap, Shield, User, Eye, EyeOff, Mail, Lock, Crown } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  
  const { login, signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Check if email is admin domain
  const isAdminEmail = formData.email.toLowerCase().endsWith('@elektronre.com');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!isLogin && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    let success;
    if (isLogin) {
      success = await login(formData.email, formData.password);
    } else {
      success = await signup({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name || undefined
      });
    }

    if (success) {
      navigate('/');
    }
  };

  // Modern gradient backgrounds
  const gradientBg = 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
  const cardBg = 'bg-slate-800/60 backdrop-blur-xl';
  const inputBg = 'bg-slate-900/60';

  return (
    <div className={`min-h-screen ${gradientBg} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4 ring-4 ring-emerald-500/20">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">BESS ROI Tool</h1>
          <p className="text-slate-400 text-lg">Battery Energy Storage System Calculator</p>
        </div>

        {/* Auth Card */}
        <div className={`${cardBg} border border-slate-700/60 rounded-3xl p-8 shadow-2xl`}>
          
          {/* Role Indicator Badges */}
          <div className="flex gap-3 mb-6">
            <div className={`flex-1 py-3 px-4 rounded-xl text-center text-sm font-semibold transition-all duration-300 ${
              isAdminEmail 
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/20' 
                : 'bg-slate-700/50 text-slate-500 border border-slate-600/50'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <Crown className="w-4 h-4" />
                <span>Admin</span>
              </div>
              {isAdminEmail && <span className="text-xs block mt-1 opacity-80">@elektronre.com</span>}
            </div>
            <div className={`flex-1 py-3 px-4 rounded-xl text-center text-sm font-semibold transition-all duration-300 ${
              !isAdminEmail 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-700/50 text-slate-500 border border-slate-600/50'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                <span>User</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-3.5 ${inputBg} border-2 ${
                    isAdminEmail ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-600 focus:border-emerald-500'
                  } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 ${
                    isAdminEmail ? 'focus:ring-amber-500/20' : 'focus:ring-emerald-500/20'
                  } transition-all duration-300`}
                  placeholder="you@example.com"
                  required
                />
                {isAdminEmail && (
                  <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                )}
              </div>
              {formData.email && (
                <p className={`text-xs ${isAdminEmail ? 'text-amber-400' : 'text-cyan-400'} flex items-center gap-1`}>
                  {isAdminEmail ? (
                    <><Crown className="w-3 h-3" /> Admin privileges will be granted</>
                  ) : (
                    <><User className="w-3 h-3" /> Standard user account</>
                  )}
                </p>
              )}
            </div>

            {/* Username (signup only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-4 py-3.5 ${inputBg} border-2 border-slate-600 focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300`}
                  placeholder="johndoe"
                  required
                />
              </div>
            )}

            {/* Full Name (signup only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name (Optional)</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-4 py-3.5 ${inputBg} border-2 border-slate-600 focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300`}
                  placeholder="John Doe"
                />
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full pl-4 pr-12 py-3.5 ${inputBg} border-2 border-slate-600 focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-3.5 ${inputBg} border-2 border-slate-600 focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300`}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  clearError();
                }}
                className="ml-2 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure Login</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>JWT Token</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span>Role Based</span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Admin access exclusively for <span className="text-amber-500 font-medium">@elektronre.com</span> domain emails
          </p>
        </div>
      </div>
    </div>
  );
}
