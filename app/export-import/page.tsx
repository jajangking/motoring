'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp, addDoc, writeBatch, doc } from 'firebase/firestore';
import TabBar from '@/components/TabBar';

// Interface untuk struktur data ekspor
interface ExportData {
  orders: any[];
  spareparts: any[];
  fuelStops: any[];
  motorcycles: any[];
  dailyKmHistory: any[];
  metadata: {
    createdAt: Date;
    userId: string;
    userEmail: string;
    exportType: 'full' | 'orders' | 'spareparts' | 'fuel' | 'motorcycles';
  };
}

export default function ExportImportPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exportType, setExportType] = useState<'full' | 'orders' | 'spareparts' | 'fuel' | 'motorcycles'>('full');
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

  // Fungsi untuk mengekspor data
  const exportDataHandler = async () => {
    if (!user) return;
    
    setIsExporting(true);
    setError('');
    setMessage('');
    setProgress(0);
    
    try {
      // Ambil data berdasarkan tipe ekspor
      let orders: any[] = [], spareparts: any[] = [], fuelStops: any[] = [], motorcycles: any[] = [], dailyKmHistory: any[] = [];
      
      if (exportType === 'full' || exportType === 'orders') {
        const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
        const ordersSnapshot = await getDocs(ordersQuery);
        orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProgress(20);
        setMessage('Mengekspor data orderan...');
      }

      if (exportType === 'full' || exportType === 'spareparts') {
        const sparepartsQuery = query(collection(db, "spareparts"), where("userId", "==", user.uid));
        const sparepartsSnapshot = await getDocs(sparepartsQuery);
        spareparts = sparepartsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProgress(40);
        setMessage('Mengekspor data spareparts...');
      }

      if (exportType === 'full' || exportType === 'fuel') {
        const fuelStopsQuery = query(collection(db, "fuelStops"), where("userId", "==", user.uid));
        const fuelStopsSnapshot = await getDocs(fuelStopsQuery);
        fuelStops = fuelStopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProgress(60);
        setMessage('Mengekspor data pengisian bensin...');
      }

      if (exportType === 'full' || exportType === 'motorcycles') {
        const motorcyclesQuery = query(collection(db, "motorcycles"), where("userId", "==", user.uid));
        const motorcyclesSnapshot = await getDocs(motorcyclesQuery);
        motorcycles = motorcyclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProgress(80);
        setMessage('Mengekspor data motor...');
      }

      if (exportType === 'full') {
        const kmHistoryQuery = query(collection(db, "dailyKmHistory"), where("userId", "==", user.uid));
        const kmHistorySnapshot = await getDocs(kmHistoryQuery);
        dailyKmHistory = kmHistorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProgress(90);
        setMessage('Mengekspor data riwayat KM...');
      }

      // Buat objek ekspor
      const exportObj: ExportData = {
        orders,
        spareparts,
        fuelStops,
        motorcycles,
        dailyKmHistory,
        metadata: {
          createdAt: new Date(),
          userId: user.uid,
          userEmail: user.email || '',
          exportType
        }
      };

      setExportData(exportObj);
      setProgress(100);
      setMessage('Ekspor selesai!');

      // Buat file JSON dan unduh
      const jsonString = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `motoring_${exportType}_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage(`File ${exportType} berhasil diunduh!`);
    } catch (err: any) {
      console.error('Error exporting data:', err);
      setError(`Gagal mengekspor data: ${err.message || 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Fungsi untuk mengimpor data dari file
  const importData = async (file: File) => {
    if (!user) return;
    
    setIsImporting(true);
    setError('');
    setMessage('');
    setProgress(0);
    
    try {
      // Baca file JSON
      const text = await file.text();
      const data: ExportData = JSON.parse(text);
      
      // Validasi data ekspor
      if (!data.metadata || !data.metadata.userId || data.metadata.userId !== user.uid) {
        throw new Error('File ekspor tidak valid atau bukan untuk pengguna ini');
      }
      
      setMessage('Memvalidasi data...');
      setProgress(5);
      
      // Gunakan batch untuk operasi yang lebih efisien
      const batch = writeBatch(db);
      
      // Impor data orderan jika ada
      if (data.orders && Array.isArray(data.orders) && 
          (data.metadata.exportType === 'full' || data.metadata.exportType === 'orders')) {
        setMessage('Mengimpor data orderan...');
        for (let i = 0; i < data.orders.length; i++) {
          const order = data.orders[i];
          const { id, ...orderData } = order;
          const newOrderRef = collection(db, "orders");
          batch.set(doc(newOrderRef), {
            ...orderData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(5 + (i / data.orders.length) * 20));
        }
      }
      
      setMessage('Mengimpor data spareparts...');
      setProgress(25);
      
      // Impor data spareparts jika ada
      if (data.spareparts && Array.isArray(data.spareparts) && 
          (data.metadata.exportType === 'full' || data.metadata.exportType === 'spareparts')) {
        for (let i = 0; i < data.spareparts.length; i++) {
          const sparepart = data.spareparts[i];
          const { id, ...sparepartData } = sparepart;
          const newSparepartRef = doc(collection(db, "spareparts"));
          batch.set(newSparepartRef, {
            ...sparepartData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(25 + (i / data.spareparts.length) * 20));
        }
      }
      
      setMessage('Mengimpor data pengisian bensin...');
      setProgress(45);
      
      // Impor data fuel stops jika ada
      if (data.fuelStops && Array.isArray(data.fuelStops) && 
          (data.metadata.exportType === 'full' || data.metadata.exportType === 'fuel')) {
        for (let i = 0; i < data.fuelStops.length; i++) {
          const fuelStop = data.fuelStops[i];
          const { id, ...fuelStopData } = fuelStop;
          const newFuelStopRef = doc(collection(db, "fuelStops"));
          batch.set(newFuelStopRef, {
            ...fuelStopData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(45 + (i / data.fuelStops.length) * 20));
        }
      }
      
      setMessage('Mengimpor data motor...');
      setProgress(65);
      
      // Impor data motorcycles jika ada
      if (data.motorcycles && Array.isArray(data.motorcycles) && 
          (data.metadata.exportType === 'full' || data.metadata.exportType === 'motorcycles')) {
        for (let i = 0; i < data.motorcycles.length; i++) {
          const motorcycle = data.motorcycles[i];
          const { id, ...motorcycleData } = motorcycle;
          const newMotorcycleRef = doc(collection(db, "motorcycles"));
          batch.set(newMotorcycleRef, {
            ...motorcycleData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(65 + (i / data.motorcycles.length) * 20));
        }
      }
      
      setMessage('Mengimpor data riwayat KM...');
      setProgress(85);
      
      // Impor data dailyKmHistory jika ada dan tipe ekspor adalah full
      if (data.dailyKmHistory && Array.isArray(data.dailyKmHistory) && 
          data.metadata.exportType === 'full') {
        for (let i = 0; i < data.dailyKmHistory.length; i++) {
          const kmEntry = data.dailyKmHistory[i];
          const { id, ...kmData } = kmEntry;
          const newKmRef = doc(collection(db, "dailyKmHistory"));
          batch.set(newKmRef, {
            ...kmData,
            userId: user.uid
          });
          
          // Update progress
          setProgress(Math.floor(85 + (i / data.dailyKmHistory.length) * 15));
        }
      }
      
      // Commit batch
      await batch.commit();
      
      setProgress(100);
      setMessage('Data berhasil diimpor!');
      
      // Tanyakan ke pengguna apakah ingin kembali ke dashboard
      if (confirm('Data berhasil diimpor! Apakah Anda ingin kembali ke dashboard?')) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Error importing data:', err);
      setError(`Gagal mengimpor data: ${err.message || 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/json') {
        setError('Silakan pilih file JSON yang valid');
        return;
      }
      
      importData(file);
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
              <p className="text-redbull-light/80 text-xs">Export & Import</p>
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
          <h2 className="text-3xl font-bold text-redbull-red mb-6">Export & Import Data</h2>
          
          <p className="text-redbull-light mb-8 max-w-2xl mx-auto">
            Ekspor data Anda ke file lokal atau impor data dari file sebelumnya. 
            Fitur ini memungkinkan Anda untuk mentransfer data antar perangkat atau menyimpan cadangan.
          </p>

          {error && (
            <div className="bg-red-600/30 border border-red-600 text-red-300 p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-blue-600/30 border border-blue-600 text-blue-300 p-3 rounded-lg mb-6">
              {message}
              {isExporting || isImporting ? (
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
            {/* Export Section */}
            <div className="bg-white/5 p-6 rounded-xl border border-redbull-red/20">
              <div className="w-16 h-16 bg-redbull-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-redbull-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Ekspor Data</h3>
              <p className="text-redbull-light mb-4">
                Simpan data Anda ke file lokal
              </p>
              
              <div className="mb-4">
                <label className="block text-redbull-light mb-2">Pilih Tipe Ekspor</label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="w-full bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-redbull-red"
                >
                  <option value="full">Semua Data</option>
                  <option value="orders">Orderan Saja</option>
                  <option value="spareparts">Spareparts Saja</option>
                  <option value="fuel">Pengisian Bensin Saja</option>
                  <option value="motorcycles">Data Motor Saja</option>
                </select>
              </div>
              
              <button
                onClick={exportDataHandler}
                disabled={isExporting}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-300 ${
                  isExporting 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-redbull-red hover:bg-redbull-lighter'
                }`}
              >
                {isExporting ? 'Mengekspor...' : 'Ekspor Data'}
              </button>
            </div>

            {/* Import Section */}
            <div className="bg-white/5 p-6 rounded-xl border border-redbull-red/20">
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Impor Data</h3>
              <p className="text-redbull-light mb-4">
                Kembalikan data dari file ekspor sebelumnya
              </p>
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="hidden"
                />
                <div className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-300 cursor-pointer text-center ${
                  isImporting 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}>
                  {isImporting ? 'Mengimpor...' : 'Pilih File Ekspor'}
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
              <li>• Ekspor data mencakup informasi yang dipilih dalam format JSON yang aman</li>
              <li>• Impor data akan menimpa data saat ini dengan data dari file ekspor</li>
              <li>• Pastikan file ekspor berasal dari akun Anda sendiri</li>
              <li>• Proses impor mungkin memakan waktu tergantung jumlah data</li>
            </ul>
          </div>
        </div>
      </main>

      <TabBar />
    </div>
  );
}