'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';

export default function FuelingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [fuelStopData, setFuelStopData] = useState({
    date: new Date().toISOString().split('T')[0],
    price: '',
    liters: '',
    total: '',
    location: '',
    motorcycleId: ''
  });
  const [fuelStops, setFuelStops] = useState<any[]>([]);
  const [motorcycles, setMotorcycles] = useState<any[]>([]);
  const [showFuelStopForm, setShowFuelStopForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, isLoading: authIsLoading, logout } = useAuth();

  // Fetch motorcycles from Firebase
  const fetchMotorcycles = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "motorcycles"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const fetchedMotorcycles = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            model: data.model || '',
            year: data.year || '',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          };
        });

        setMotorcycles(fetchedMotorcycles);
      } catch (err) {
        console.error("Error fetching motorcycles: ", err);
      }
    }
  };

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.push('/login');
      } else {
        setIsLoading(false);
        // Fetch fuel stops and motorcycles when user is authenticated
        fetchFuelStops();
        fetchMotorcycles();
      }
    }
  }, [user, authIsLoading, router]);

  // Fetch fuel stops from Firebase
  const fetchFuelStops = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "fuelStops"),
          where("userId", "==", user.uid),
          orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        
        const fetchedFuelStops = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date || '',
            price: data.price || 0,
            liters: data.liters || 0,
            total: data.total || 0,
            motorcycleId: data.motorcycleId || null,
            location: data.location || '',
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : ''
          };
        });

        setFuelStops(fetchedFuelStops);
      } catch (err) {
        console.error("Error fetching fuel stops: ", err);
      }
    }
  };

  // Handle input changes for fuel stop form
  const handleFuelStopChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Update total when price or liters change
    if (name === 'price' || name === 'liters') {
      setFuelStopData(prev => {
        const updatedData = { ...prev, [name]: value };

        // Calculate total if both price and liters are provided
        if (updatedData.price && updatedData.liters) {
          const total = parseFloat(updatedData.price) * parseFloat(updatedData.liters);
          updatedData.total = total.toString();
        }

        return updatedData;
      });
    } else {
      setFuelStopData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Submit fuel stop data to Firebase
  const submitFuelStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    if (!fuelStopData.date || !fuelStopData.price || !fuelStopData.liters || !fuelStopData.total) {
      setErrorMessage('Tanggal, harga, liter, dan total harus diisi');
      setIsSubmitting(false);
      return;
    }

    const priceNum = parseFloat(fuelStopData.price);
    const litersNum = parseFloat(fuelStopData.liters);
    const totalNum = parseFloat(fuelStopData.total);

    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Harga harus lebih besar dari 0');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(litersNum) || litersNum <= 0) {
      setErrorMessage('Jumlah liter harus lebih besar dari 0');
      setIsSubmitting(false);
      return;
    }

    if (isNaN(totalNum) || totalNum <= 0) {
      setErrorMessage('Total harus lebih besar dari 0');
      setIsSubmitting(false);
      return;
    }

    // Verify that total = price * liters
    if (Math.abs(totalNum - (priceNum * litersNum)) > 0.01) { // Allow small floating point differences
      setErrorMessage('Total harus sama dengan Harga x Liter');
      setIsSubmitting(false);
      return;
    }

    try {
      if (user) {
        const fuelStopDataToSave = {
          userId: user.uid,
          date: fuelStopData.date,
          price: priceNum,
          liters: litersNum,
          total: totalNum,
          motorcycleId: fuelStopData.motorcycleId || null, // Save motorcycle ID or null if not selected
          location: fuelStopData.location || 'Lokasi tidak disebutkan',
          createdAt: Timestamp.now()
        };

        const docRef = await addDoc(collection(db, "fuelStops"), fuelStopDataToSave);

        // Add to local state
        const newFuelStop = {
          id: docRef.id,
          ...fuelStopDataToSave,
          createdAt: new Date().toISOString().split('T')[0]
        };

        setFuelStops(prev => [newFuelStop, ...prev]);

        // Reset form
        setFuelStopData({
          date: new Date().toISOString().split('T')[0],
          price: '',
          liters: '',
          total: '',
          location: '',
          motorcycleId: ''
        });

        setSuccessMessage('Isi bensin berhasil ditambahkan!');
        setErrorMessage('');

        // Hide form after successful submission
        setTimeout(() => {
          setShowFuelStopForm(false);
          setSuccessMessage('');
        }, 3000);
      }
    } catch (err) {
      console.error("Error adding fuel stop: ", err);
      setErrorMessage('Gagal menambahkan isi bensin. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a fuel stop entry
  const deleteFuelStop = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus riwayat isi bensin ini?')) {
      try {
        await deleteDoc(doc(db, "fuelStops", id));
        setFuelStops(prev => prev.filter(stop => stop.id !== id));
        setSuccessMessage('Riwayat isi bensin berhasil dihapus');

        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (err) {
        console.error("Error deleting fuel stop: ", err);
        setErrorMessage('Gagal menghapus riwayat isi bensin. Silakan coba lagi.');
      }
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
              <p className="text-redbull-light/80 text-xs">Isi Bensin</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium">Selamat Datang</p>
              <p className="text-redbull-light/80 text-xs">{user?.email?.split('@')[0]}</p>
            </div>
            <div className="bg-redbull-red w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6 text-center flex-grow">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-redbull-red/30">
          <h2 className="text-3xl font-bold text-redbull-red mb-4">Isi Bensin</h2>
          
          {successMessage && (
            <div className="bg-green-600/30 border border-green-600 text-green-300 p-3 rounded-lg mb-4">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="bg-red-600/30 border border-red-600 text-red-300 p-3 rounded-lg mb-4">
              {errorMessage}
            </div>
          )}

          <div className="mb-8">
            {!showFuelStopForm ? (
              <button
                onClick={() => setShowFuelStopForm(true)}
                className="py-3 px-6 bg-redbull-red hover:bg-redbull-darker rounded-lg font-semibold transition duration-200 mb-6"
              >
                Tambah Isi Bensin
              </button>
            ) : (
              <div className="max-w-md mx-auto bg-white/5 p-6 rounded-lg border border-redbull-red/20 mb-6">
                <h3 className="text-xl font-bold text-redbull-red mb-4">Isi Bensin Baru</h3>
                <form onSubmit={submitFuelStop} className="space-y-4">
                  <div>
                    <label className="block text-left text-redbull-light mb-1">Tanggal</label>
                    <input
                      type="date"
                      name="date"
                      value={fuelStopData.date}
                      onChange={handleFuelStopChange}
                      className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-left text-redbull-light mb-1">Harga per Liter (Rp)</label>
                    <input
                      type="number"
                      name="price"
                      value={fuelStopData.price}
                      onChange={handleFuelStopChange}
                      placeholder="Harga per liter"
                      className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-left text-redbull-light mb-1">Jumlah Liter</label>
                    <input
                      type="number"
                      name="liters"
                      value={fuelStopData.liters}
                      onChange={handleFuelStopChange}
                      placeholder="Jumlah liter"
                      className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-left text-redbull-light mb-1">Total (Rp)</label>
                    <input
                      type="number"
                      name="total"
                      value={fuelStopData.total}
                      onChange={handleFuelStopChange}
                      placeholder="Total pembayaran"
                      readOnly
                      className="w-full p-2 rounded bg-white/20 border border-redbull-red/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-left text-redbull-light mb-1">Motor</label>
                    <select
                      name="motorcycleId"
                      value={fuelStopData.motorcycleId}
                      onChange={handleFuelStopChange}
                      className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white"
                    >
                      <option value="">Pilih Motor</option>
                      {motorcycles.map(motor => (
                        <option key={motor.id} value={motor.id}>{motor.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-left text-redbull-light mb-1">Lokasi</label>
                    <input
                      type="text"
                      name="location"
                      value={fuelStopData.location}
                      onChange={handleFuelStopChange}
                      placeholder="Lokasi SPBU"
                      className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white"
                    />
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2 bg-redbull-red hover:bg-redbull-darker rounded text-white font-medium disabled:opacity-50"
                    >
                      {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFuelStopForm(false);
                        setErrorMessage('');
                      }}
                      className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white font-medium"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {fuelStops.length > 0 && (
            <div className="max-w-2xl mx-auto text-left">
              <h3 className="text-xl font-bold text-redbull-red mb-4">Riwayat Isi Bensin</h3>
              <div className="space-y-3">
                {fuelStops.map((stop) => (
                  <div key={stop.id} className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{new Date(stop.date).toLocaleDateString('id-ID')}</p>
                        <p className="text-sm text-redbull-light">{stop.location}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-bold">Rp {parseInt(stop.total).toLocaleString('id-ID')}</p>
                          <p className="text-sm text-redbull-light">{stop.liters}L @ Rp {parseInt(stop.price).toLocaleString('id-ID')}/L</p>
                        </div>
                        <button
                          onClick={() => deleteFuelStop(stop.id)}
                          className="text-red-500 hover:text-red-400 p-1"
                          title="Hapus"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <a href="/fueling" className="flex flex-col items-center text-redbull-red font-semibold">
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