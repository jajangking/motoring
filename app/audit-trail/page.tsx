'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import TabBar from '@/components/TabBar';

interface AuditLog {
  id: string;
  action: string;
  description: string;
  timestamp: Date;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export default function AuditTrailPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const router = useRouter();
  const { user, isLoading: authIsLoading, logout } = useAuth();

  // Fungsi untuk mencatat aktivitas pengguna
  const logActivity = async (action: string, description: string) => {
    if (!user) return;
    
    try {
      // Dapatkan informasi IP dan user agent (ini akan dilakukan di backend sebenarnya)
      // Untuk sekarang kita hanya menyimpan informasi dasar
      const logData = {
        userId: user.uid,
        action,
        description,
        timestamp: Timestamp.now(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
        // IP address biasanya didapatkan dari server, bukan dari client
      };

      await addDoc(collection(db, "auditLogs"), logData);
    } catch (err) {
      console.error("Error logging activity:", err);
      // Jangan tampilkan error ke pengguna untuk aktivitas logging
    }
  };

  // Fungsi untuk mengambil log aktivitas
  const fetchAuditLogs = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, "auditLogs"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedLogs = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          action: data.action || '',
          description: data.description || '',
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          userId: data.userId || '',
          ipAddress: data.ipAddress || '',
          userAgent: data.userAgent || ''
        };
      });

      setLogs(fetchedLogs);
      setFilteredLogs(fetchedLogs);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      setError(`Gagal mengambil log aktivitas: ${err.message || 'Kesalahan tidak diketahui'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk memfilter log
  const applyFilters = () => {
    let result = [...logs];

    // Filter by action type
    if (filter !== 'all') {
      result = result.filter(log => log.action === filter);
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter(log => log.timestamp >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      // Include the full day
      toDate.setDate(toDate.getDate() + 1);
      result = result.filter(log => log.timestamp < toDate);
    }

    setFilteredLogs(result);
  };

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchAuditLogs();
        // Log aktivitas saat pengguna membuka halaman audit trail
        logActivity('view_audit_trail', 'Pengguna membuka halaman log aktivitas');
      }
    }
  }, [user, authIsLoading, router]);

  // Terapkan filter setiap kali filter atau tanggal berubah
  useEffect(() => {
    applyFilters();
  }, [filter, dateFrom, dateTo, logs]);

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

  if (error) {
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
                <p className="text-redbull-light/80 text-xs">Audit Trail</p>
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
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
              <p className="text-redbull-light mb-6 max-w-md">{error}</p>
              <button
                onClick={() => fetchAuditLogs()}
                className="bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-2 px-6 rounded-lg transition duration-300"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </main>

        <TabBar />
      </div>
    );
  }

  // Fungsi untuk memformat tanggal
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // Fungsi untuk mendapatkan ikon berdasarkan jenis aktivitas
  const getIconForAction = (action: string) => {
    switch (action) {
      case 'login':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        );
      case 'logout':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        );
      case 'create_order':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'update_order':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'delete_order':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'view_audit_trail':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

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
              <p className="text-redbull-light/80 text-xs">Audit Trail</p>
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

      <main className="max-w-6xl mx-auto py-8 px-6 text-center flex-grow">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-redbull-red/30">
          <h2 className="text-3xl font-bold text-redbull-red mb-6">Audit Trail - Log Aktivitas</h2>
          
          <p className="text-redbull-light mb-8 max-w-3xl mx-auto">
            Riwayat aktivitas akun Anda. Fitur ini mencatat semua tindakan penting yang Anda lakukan di aplikasi.
          </p>

          {/* Filter Controls */}
          <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-redbull-light mb-2 text-sm">Filter Aktivitas</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-redbull-red"
                >
                  <option value="all">Semua Aktivitas</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="create_order">Buat Orderan</option>
                  <option value="update_order">Update Orderan</option>
                  <option value="delete_order">Hapus Orderan</option>
                  <option value="view_audit_trail">Lihat Audit Trail</option>
                </select>
              </div>

              <div>
                <label className="block text-redbull-light mb-2 text-sm">Dari Tanggal</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-redbull-red"
                />
              </div>

              <div>
                <label className="block text-redbull-light mb-2 text-sm">Sampai Tanggal</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-redbull-red"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setFilter('all');
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-lg">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10">
                <div className="bg-redbull-darker/50 p-6 rounded-lg border border-redbull-red/30 inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-redbull-light mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-redbull-light text-lg">Tidak ada aktivitas tercatat</p>
                  <p className="text-redbull-light/70 text-sm mt-2">Aktivitas Anda akan muncul di sini</p>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-redbull-red/30">
                <thead className="bg-redbull-darker/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Aktivitas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Deskripsi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Perangkat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-redbull-red/20">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors duration-200">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          {getIconForAction(log.action)}
                          <span className="ml-2 capitalize">{log.action.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white max-w-xs truncate">
                        {log.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-redbull-light">
                        {log.userAgent ? (
                          <span title={log.userAgent}>
                            {log.userAgent.length > 30 
                              ? `${log.userAgent.substring(0, 30)}...` 
                              : log.userAgent}
                          </span>
                        ) : (
                          'Tidak diketahui'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          <div className="mt-8 bg-redbull-darker/30 p-4 rounded-lg border border-redbull-red/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{logs.length}</p>
                <p className="text-redbull-light text-sm">Total Aktivitas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{filteredLogs.length}</p>
                <p className="text-redbull-light text-sm">Aktivitas Ditampilkan</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {dateFrom && dateTo 
                    ? `${new Date(dateFrom).toLocaleDateString('id-ID')} - ${new Date(dateTo).toLocaleDateString('id-ID')}` 
                    : 'Semua Waktu'}
                </p>
                <p className="text-redbull-light text-sm">Rentang Waktu</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <TabBar />
    </div>
  );
}