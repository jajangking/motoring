'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const router = useRouter();
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Semua bidang wajib diisi');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Kata sandi tidak cocok');
      return;
    }

    try {
      await register(formData.email, formData.password, formData.firstName, formData.lastName);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar. Silakan gunakan email lain.');
      } else {
        setError('Pendaftaran gagal. Silakan coba lagi.');
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
          <p className="text-redbull-light mt-2">Buat akun baru</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-redbull-red/30">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Gabung ke Tim</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-200 rounded-lg text-center">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="firstName" className="block text-redbull-light mb-2">Nama Depan</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-2 focus:ring-redbull-red focus:border-transparent"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-redbull-light mb-2">Nama Belakang</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-2 focus:ring-redbull-red focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-redbull-light mb-2">Alamat Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-2 focus:ring-redbull-red focus:border-transparent"
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-redbull-light mb-2">Kata Sandi</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-2 focus:ring-redbull-red focus:border-transparent"
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-redbull-light mb-2">Konfirmasi Kata Sandi</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-2 focus:ring-redbull-red focus:border-transparent"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Buat Akun
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-redbull-light">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-redbull-red hover:text-redbull-lighter font-medium transition duration-200">
                Masuk di sini
              </Link>
            </p>
            <p className="text-redbull-light mt-2">
              Ingin tahu lebih lanjut tentang tim kami?{' '}
              <Link href="/landing" className="text-redbull-red hover:text-redbull-lighter font-medium transition duration-200">
                Kunjungi situs kami
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