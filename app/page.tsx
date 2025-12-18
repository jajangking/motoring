'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi');
      return;
    }

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Pengguna tidak ditemukan. Silakan registrasi terlebih dahulu.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Kata sandi salah. Silakan coba lagi.');
      } else {
        setError('Email atau kata sandi tidak valid. Silakan coba lagi.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-redbull-dark to-redbull-darker p-4 pb-20">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block bg-redbull-red p-4 rounded-full mb-4">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-redbull-dark font-bold text-xl">M</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Motoring</h1>
          <p className="text-redbull-light mt-2">Sistem Manajemen Kendaraan</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-redbull-red/30">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Selamat Datang Kembali</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-200 rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-redbull-light mb-2">Alamat Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-2 focus:ring-redbull-red focus:border-transparent"
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-redbull-light mb-2">Kata Sandi</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-2 focus:ring-redbull-red focus:border-transparent"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-redbull-red bg-redbull-darker border-redbull-light/30 rounded focus:ring-redbull-red focus:ring-2"
                />
                <label htmlFor="remember" className="ml-2 text-redbull-light text-sm">Ingat saya</label>
              </div>

              <Link href="/forgot-password" className="text-redbull-red hover:text-redbull-lighter text-sm transition duration-200">
                Lupa Kata Sandi?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Masuk
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-redbull-light">
              Belum punya akun?{' '}
              <Link href="/landing" className="text-redbull-red hover:text-redbull-lighter font-medium transition duration-200">
                Pelajari lebih lanjut tentang tim kami
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-redbull-light/70 text-sm">
            © {new Date().getFullYear()} Motoring. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
