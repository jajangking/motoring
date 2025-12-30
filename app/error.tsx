'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error ke analytics atau sistem monitoring
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body className="bg-gradient-to-br from-redbull-dark to-redbull-darker text-white min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="bg-redbull-darker/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-redbull-red/30">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">Terjadi Kesalahan</h2>
            <p className="text-redbull-light mb-6">
              Maaf, terjadi kesalahan tak terduga. Silakan coba lagi.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => reset()}
                className="w-full bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-3 px-4 rounded-lg transition duration-300"
              >
                Coba Lagi
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg transition duration-300 border border-redbull-red/30"
              >
                Kembali ke Beranda
              </button>
            </div>
            
            <div className="mt-6 text-xs text-redbull-light/70">
              <p>Error: {error.message}</p>
              {error.digest && <p>Digest: {error.digest}</p>}
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-redbull-light/70 text-sm">
              © {new Date().getFullYear()} Motoring. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}