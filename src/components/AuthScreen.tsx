import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Building2, Sparkles, Loader2, BookOpen } from 'lucide-react';

interface AuthScreenProps {
  onAuthError: (error: string) => void;
}

export default function AuthScreen({ onAuthError }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
  };

  const switchMode = (newMode: 'signin' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setFormError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      const message = err.message || 'Google authentication failed. Please try again.';
      setFormError(message);
      onAuthError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFormError(null);

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      setLoading(false);
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setFormError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      const message = err.message || 'Authentication failed. Please try again.';
      setFormError(message);
      onAuthError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="bg-emerald-600 px-6 py-10 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm">
            <BookOpen className="w-8 h-8 text-emerald-200" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Rojmel Ledger</h1>
          <p className="text-emerald-100 text-sm mt-2 font-medium">
            डिजिटल रोजमेळ • Daily Cashbook Accounts
          </p>
        </div>

        <div className="p-8">
          <div className="space-y-4 text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Sign in or register with your email</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Create your account first, then sign in securely with your email and password.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`rounded-2xl py-3 text-sm font-semibold transition ${mode === 'signin' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded-2xl py-3 text-sm font-semibold transition ${mode === 'register' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-gray-700">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="name@example.com"
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="Enter a password"
                required
                minLength={6}
              />
            </label>
            {mode === 'register' && (
              <label className="block text-sm font-medium text-gray-700">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  placeholder="Re-enter your password"
                  required
                  minLength={6}
                />
              </label>
            )}

            {formError && (
              <p className="text-xs text-red-600 font-medium">{formError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-semibold transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mx-auto animate-spin text-white" />
              ) : mode === 'register' ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="border-t border-gray-200 pt-6">
            <div className="text-center text-sm text-gray-500 mb-4">Or continue with</div>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              id="google-signin-btn"
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-semibold transition duration-150 shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              )}
              <span>Sign in with Google</span>
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-6">
            By using email or Google sign in, your ledger data stays secure and accessible across your devices.
          </p>
        </div>
      </div>
    </div>
  );
}
