'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Silakan masukkan alamat email Anda');
      return;
    }

    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Pengguna tidak ditemukan. Silakan registrasi terlebih dahulu.');
      } else {
        setError('Gagal mengirim email reset. Silakan coba lagi.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-redbull-dark to-redbull-darker p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block bg-redbull-red p-4 rounded-full mb-4">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center">
              <span className="text-redbull-dark font-bold text-xl">M</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Motoring</h1>
          <p className="text-redbull-light mt-2">Reset Kata Sandi</p>
        </div>

        {!submitted ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-redbull-red/30">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Lupa Kata Sandi?</h2>
            <p className="text-redbull-light mb-6 text-center">
              Masukkan alamat email Anda dan kami akan kirimkan tautan untuk mereset kata sandi Anda.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 text-red-200 rounded-lg text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
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

              <button
                type="submit"
                className="w-full bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Kirim Tautan Reset
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-redbull-red hover:text-redbull-lighter text-sm transition duration-200">
                ← Kembali ke Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-redbull-red/30 text-center">
            <div className="w-16 h-16 bg-redbull-red rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Periksa Email Anda</h2>
            <p className="text-redbull-light mb-6">
              Kami telah mengirimkan tautan reset kata sandi ke <span className="text-redbull-red font-medium">{email}</span>.
              Silakan periksa kotak masuk Anda dan klik tautan untuk mereset kata sandi Anda.
            </p>
            <Link
              href="/login"
              className="inline-block bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Kembali ke Login
            </Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-redbull-light/70 text-sm">
            © {new Date().getFullYear()} Motoring. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}