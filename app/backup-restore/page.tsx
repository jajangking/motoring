'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp, addDoc } from 'firebase/firestore';

// Interface untuk struktur data backup
interface BackupData {
  orders: any[];
  spareparts: any[];
  fuelStops: any[];
  motorcycles: any[];
  dailyKmHistory: any[];
  metadata: {
    createdAt: Date;
    userId: string;
    userEmail: string;
  };
}

export default function BackupRestorePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, isLoading: authIsLoading, logout } = useAuth();

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    }
  }, [user, authIsLoading, router]);

  // Fungsi untuk membuat backup data
  const createBackup = async () => {
    if (!user) return;
    
    setIsBackingUp(true);
    setError('');
    setMessage('');
    setProgress(0);
    
    try {
      // Ambil semua data dari koleksi pengguna
      const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProgress(20);
      setMessage('Mengambil data orderan...');

      const sparepartsQuery = query(collection(db, "spareparts"), where("userId", "==", user.uid));
      const sparepartsSnapshot = await getDocs(sparepartsQuery);
      const spareparts = sparepartsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProgress(40);
      setMessage('Mengambil data spareparts...');

      const fuelStopsQuery = query(collection(db, "fuelStops"), where("userId", "==", user.uid));
      const fuelStopsSnapshot = await getDocs(fuelStopsQuery);
      const fuelStops = fuelStopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProgress(60);
      setMessage('Mengambil data pengisian bensin...');

      const motorcyclesQuery = query(collection(db, "motorcycles"), where("userId", "==", user.uid));
      const motorcyclesSnapshot = await getDocs(motorcyclesQuery);
      const motorcycles = motorcyclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProgress(80);
      setMessage('Mengambil data motor...');

      const kmHistoryQuery = query(collection(db, "dailyKmHistory"), where("userId", "==", user.uid));
      const kmHistorySnapshot = await getDocs(kmHistoryQuery);
      const dailyKmHistory = kmHistorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProgress(90);
      setMessage('Mengambil data riwayat KM...');

      // Buat objek backup
      const backup: BackupData = {
        orders,
        spareparts,
        fuelStops,
        motorcycles,
        dailyKmHistory,
        metadata: {
          createdAt: new Date(),
          userId: user.uid,
          userEmail: user.email || ''
        }
      };

      setBackupData(backup);
      setProgress(100);
      setMessage('Backup selesai!');

      // Buat file JSON dan unduh
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `motoring_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage('File backup berhasil diunduh!');
    } catch (err: any) {
      console.error('Error creating backup:', err);
      setError(`Gagal membuat backup: ${err.message || 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Fungsi untuk mengembalikan data dari file
  const restoreData = async (file: File) => {
    if (!user) return;
    
    setIsRestoring(true);
    setError('');
    setMessage('');
    setProgress(0);
    
    try {
      // Baca file JSON
      const text = await file.text();
      const data: BackupData = JSON.parse(text);
      
      // Validasi data backup
      if (!data.metadata || !data.metadata.userId || data.metadata.userId !== user.uid) {
        throw new Error('File backup tidak valid atau bukan untuk pengguna ini');
      }
      
      setMessage('Memvalidasi data...');
      setProgress(10);
      
      // Hapus data lama pengguna (opsional - bisa ditanyakan ke pengguna)
      // Kita akan menimpa data yang ada dengan data backup
      
      // Kembalikan data orderan
      if (data.orders && Array.isArray(data.orders)) {
        setMessage('Mengembalikan data orderan...');
        for (let i = 0; i < data.orders.length; i++) {
          const order = data.orders[i];
          // Hapus ID karena akan dibuat ulang
          const { id, ...orderData } = order;
          await addDoc(collection(db, "orders"), {
            ...orderData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(10 + (i / data.orders.length) * 20));
        }
      }
      
      setMessage('Mengembalikan data spareparts...');
      setProgress(30);
      
      // Kembalikan data spareparts
      if (data.spareparts && Array.isArray(data.spareparts)) {
        for (let i = 0; i < data.spareparts.length; i++) {
          const sparepart = data.spareparts[i];
          const { id, ...sparepartData } = sparepart;
          await addDoc(collection(db, "spareparts"), {
            ...sparepartData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(30 + (i / data.spareparts.length) * 20));
        }
      }
      
      setMessage('Mengembalikan data pengisian bensin...');
      setProgress(50);
      
      // Kembalikan data fuel stops
      if (data.fuelStops && Array.isArray(data.fuelStops)) {
        for (let i = 0; i < data.fuelStops.length; i++) {
          const fuelStop = data.fuelStops[i];
          const { id, ...fuelStopData } = fuelStop;
          await addDoc(collection(db, "fuelStops"), {
            ...fuelStopData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(50 + (i / data.fuelStops.length) * 20));
        }
      }
      
      setMessage('Mengembalikan data motor...');
      setProgress(70);
      
      // Kembalikan data motorcycles
      if (data.motorcycles && Array.isArray(data.motorcycles)) {
        for (let i = 0; i < data.motorcycles.length; i++) {
          const motorcycle = data.motorcycles[i];
          const { id, ...motorcycleData } = motorcycle;
          await addDoc(collection(db, "motorcycles"), {
            ...motorcycleData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(70 + (i / data.motorcycles.length) * 20));
        }
      }
      
      setMessage('Mengembalikan data riwayat KM...');
      setProgress(90);
      
      // Kembalikan data dailyKmHistory
      if (data.dailyKmHistory && Array.isArray(data.dailyKmHistory)) {
        for (let i = 0; i < data.dailyKmHistory.length; i++) {
          const kmEntry = data.dailyKmHistory[i];
          const { id, ...kmData } = kmEntry;
          await addDoc(collection(db, "dailyKmHistory"), {
            ...kmData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(90 + (i / data.dailyKmHistory.length) * 10));
        }
      }
      
      setProgress(100);
      setMessage('Data berhasil dikembalikan!');
      
      // Tanyakan ke pengguna apakah ingin kembali ke dashboard
      if (confirm('Data berhasil dipulihkan! Apakah Anda ingin kembali ke dashboard?')) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Error restoring data:', err);
      setError(`Gagal mengembalikan data: ${err.message || 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/json') {
        setError('Silakan pilih file JSON yang valid');
        return;
      }
      
      restoreData(file);
    }
  };

  if (isLoading || authIsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-redbull-dark to-redbull-darker">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-redbull-red mx-auto"></div>
          <p className="text-redbull-light mt-4">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-redbull-dark to-redbull-darker text-white flex flex-col">
      <header className="bg-redbull-darker/80 backdrop-blur-sm border-b border-redbull-red/30 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-redbull-red p-3 rounded-full">
              <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center">
                <span className="text-redbull-dark font-bold text-lg">M</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">Motoring</h1>
              <p className="text-redbull-light/80 text-xs">Backup & Restore</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium">Akun</p>
              <p className="text-redbull-light/80 text-xs">{user?.email?.split('@')[0]}</p>
            </div>
            <div className="bg-redbull-red w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6 text-center flex-grow">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-redbull-red/30">
          <h2 className="text-3xl font-bold text-redbull-red mb-6">Backup & Restore Data</h2>
          
          <p className="text-redbull-light mb-8 max-w-2xl mx-auto">
            Simpan salinan data Anda secara lokal atau pulihkan data dari file backup sebelumnya. 
            Fitur ini memungkinkan Anda untuk menjaga data penting tetap aman dan dapat dipulihkan kapan saja.
          </p>

          {error && (
            <div className="bg-red-600/30 border border-red-600 text-red-300 p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-blue-600/30 border border-blue-600 text-blue-300 p-3 rounded-lg mb-6">
              {message}
              {isBackingUp || isRestoring ? (
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-redbull-red h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            {/* Backup Section */}
            <div className="bg-white/5 p-6 rounded-xl border border-redbull-red/20">
              <div className="w-16 h-16 bg-redbull-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-redbull-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Buat Backup</h3>
              <p className="text-redbull-light mb-4">
                Simpan salinan semua data Anda ke file lokal
              </p>
              <button
                onClick={createBackup}
                disabled={isBackingUp}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-300 ${
                  isBackingUp 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-redbull-red hover:bg-redbull-lighter'
                }`}
              >
                {isBackingUp ? 'Membuat Backup...' : 'Buat Backup'}
              </button>
            </div>

            {/* Restore Section */}
            <div className="bg-white/5 p-6 rounded-xl border border-redbull-red/20">
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Pulihkan Data</h3>
              <p className="text-redbull-light mb-4">
                Kembalikan data dari file backup sebelumnya
              </p>
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={isRestoring}
                  className="hidden"
                />
                <div className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-300 cursor-pointer text-center ${
                  isRestoring 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}>
                  {isRestoring ? 'Mengembalikan...' : 'Pilih File Backup'}
                </div>
              </label>
              <p className="text-redbull-light/70 text-xs mt-2">
                Hanya file .json yang didukung
              </p>
            </div>
          </div>

          <div className="mt-10 bg-redbull-darker/50 p-4 rounded-lg border border-redbull-red/30">
            <h4 className="font-bold text-redbull-red mb-2">Catatan Penting</h4>
            <ul className="text-redbull-light text-sm text-left space-y-1">
              <li>• Backup mencakup semua data orderan, spareparts, pengisian bensin, motor, dan riwayat KM</li>
              <li>• File backup disimpan dalam format JSON yang aman</li>
              <li>• Proses restore akan menimpa data saat ini dengan data dari backup</li>
              <li>• Pastikan untuk membuat backup secara berkala untuk menjaga data tetap aman</li>
            </ul>
          </div>
        </div>
      </main>

      <nav className="bg-redbull-darker/80 backdrop-blur-sm border-t border-redbull-red/30 py-3 fixed bottom-0 left-0 right-0">
        <ul className="flex justify-around">
          <li>
            <a href="/dashboard" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Dasbor</span>
            </a>
          </li>
          <li>
            <a href="/orders" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Orderan</span>
            </a>
          </li>
          <li>
            <a href="/spareparts" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Spareparts</span>
            </a>
          </li>
          <li>
            <a href="/fueling" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Isi Bensin</span>
            </a>
          </li>
          <li>
            <a href="/profile" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Profil</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}