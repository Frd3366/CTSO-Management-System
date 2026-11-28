import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowLeft, ArrowRight, UserPlus, LogIn, User as UserIcon, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import cmsLogo from '../assets/cms-logo.jpeg';
import cloudBg from '../assets/cloud-bg.jpg';

export const Login: React.FC = () => {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Enforce pure Light Mode on the login page
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');

    return () => {
      const saved = localStorage.getItem('cms_theme');
      if (saved === 'dark' || (!saved && hadDark)) {
        root.classList.add('dark');
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!username.trim() || !password) {
      setLoginError('Silakan masukkan email/username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setLoginError(result.error || 'Username / Email atau Kata Sandi salah. Silakan periksa kembali.');
      }
    } catch {
      setLoginError('Terjadi kesalahan saat memproses login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegisterError('Mohon lengkapi seluruh kolom.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegisterError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (regPassword.length < 8) {
      setRegisterError('Kata sandi minimal 8 karakter.');
      return;
    }

    setIsRegistering(true);
    try {
      const result = await register(regName, regEmail, regPassword, 'Employee');
      if (result.success) {
        setUsername(regEmail.trim().toLowerCase());
        setPassword(regPassword);
        setLoginError(null);
        setActiveTab('login');
      } else {
        setRegisterError(result.error || 'Pendaftaran gagal.');
      }
    } catch {
      setRegisterError('Terjadi kesalahan saat mendaftarkan akun.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative flex flex-col justify-center items-center p-4 selection:bg-[#F9C900]/30 selection:text-[#111111] font-sans antialiased"
      style={{ backgroundImage: `url(${cloudBg})` }}
    >
      {/* Soft backdrop overlay */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Brand Header */}
        <div className="w-full text-center mb-6 space-y-2.5">
          <img
            src={cmsLogo}
            alt="CMS Logo"
            className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-lg border border-white/30 ring-4 ring-black/10"
          />
          <div>
            <h1 className="text-xl font-black text-white drop-shadow-md tracking-tight">
              CTSO MANAGEMENT SYSTEM
            </h1>
            <p className="text-xs text-slate-100 drop-shadow-sm mt-0.5 font-medium">
              Operational Portal
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 shadow-2xl p-6 sm:p-7 space-y-5">
          
          {/* Simple Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegisterError(null);
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Daftar Akun</span>
            </button>
          </div>

          {activeTab === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 font-semibold leading-relaxed">
                    {loginError}
                  </div>
                  <button
                    type="button"
                    aria-label="Tutup pesan error"
                    onClick={() => setLoginError(null)}
                    className="p-0.5 text-rose-500 hover:text-rose-800 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email atau User ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Masukkan email atau User ID Anda"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white ${
                      loginError
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-[#F9C900]'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 border text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white ${
                      loginError
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-[#F9C900]'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                    title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-2xs border border-[#E5B800] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Memproses...</span>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-slate-500 pt-1">
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Daftar sekarang
                </button>
              </div>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {registerError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 font-semibold leading-relaxed">
                    {registerError}
                  </div>
                  <button
                    type="button"
                    aria-label="Tutup pesan error"
                    onClick={() => setRegisterError(null)}
                    className="p-0.5 text-rose-500 hover:text-rose-800 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="Nama Lengkap"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#F9C900] focus:ring-1 focus:ring-[#F9C900]"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="email@ctso.net"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#F9C900] focus:ring-1 focus:ring-[#F9C900]"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="Minimal 4 karakter"
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#F9C900] focus:ring-1 focus:ring-[#F9C900]"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showRegPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                    title={showRegPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="reg-confirm-password"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    placeholder="Ulangi kata sandi"
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#F9C900] focus:ring-1 focus:ring-[#F9C900]"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showRegConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md"
                    title={showRegConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full mt-2 py-2.5 rounded-xl bg-[#F9C900] hover:bg-[#E5B800] text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-2xs border border-[#E5B800] disabled:opacity-50 cursor-pointer"
              >
                {isRegistering ? (
                  <span>Mendaftarkan...</span>
                ) : (
                  <span>Daftar Akun</span>
                )}
              </button>

              <div className="text-center text-[11px] text-slate-500 pt-1">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setRegisterError(null);
                  }}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Masuk di sini
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Back to Live Workspace button below Login Form */}
        <Link
          to="/"
          className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-900 text-xs font-bold shadow-lg border border-white/60 backdrop-blur-md transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Kembali ke Live Workspace</span>
        </Link>
      </div>
    </div>
  );
};
