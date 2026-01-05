'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import TabBar from '@/components/TabBar';

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { user: currentUser, isLoading: authIsLoading, logout, resetPassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading) {
      if (!currentUser) {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    }
  }, [currentUser, authIsLoading, router]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErrorMessage('Semua field harus diisi');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Kata sandi baru dan konfirmasi tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru harus minimal 6 karakter');
      return;
    }

    try {
      if (!currentUser) {
        throw new Error('User tidak ditemukan');
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      setSuccessMessage('Kata sandi berhasil diubah');
      setErrorMessage('');

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      // Hide the form after success
      setTimeout(() => {
        setShowChangePassword(false);
        setSuccessMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setErrorMessage('Kata sandi saat ini salah');
      } else {
        setErrorMessage('Gagal mengubah kata sandi. Silakan coba lagi.');
      }
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      setErrorMessage('Nama pengguna tidak boleh kosong');
      return;
    }

    // In a real app, you would update the username in your database
    // For now, we'll just show a success message
    setSuccessMessage('Nama pengguna berhasil diubah');
    setErrorMessage('');

    // Reset form
    setNewUsername('');

    // Hide the form after success
    setTimeout(() => {
      setShowChangeUsername(false);
      setSuccessMessage('');
    }, 3000);
  };

  const handleResetData = async () => {
    if (window.confirm('Apakah Anda yakin ingin mereset semua data? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        // In a real app, you would reset user data in your database
        // For now, we'll just show a success message
        setSuccessMessage('Data berhasil direset');
        setErrorMessage('');

        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (error) {
        setErrorMessage('Gagal mereset data. Silakan coba lagi.');
        console.error('Error resetting data:', error);
      }
    }
  };

  if (isLoading) {
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
              <p className="text-redbull-light/80 text-xs">Profil Pengguna</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium">Akun</p>
              <p className="text-redbull-light/80 text-xs">{currentUser?.email?.split('@')[0]}</p>
            </div>
            <div className="bg-redbull-red w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{currentUser?.email?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6 text-center flex-grow">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-redbull-red/30 mb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-redbull-red w-24 h-24 rounded-full flex items-center justify-center mb-4">
              <span className="text-white font-bold text-3xl">{currentUser?.email?.charAt(0).toUpperCase() || 'U'}</span>
            </div>
            <h2 className="text-2xl font-bold text-redbull-red mb-2">{currentUser?.email?.split('@')[0] || 'Pengguna'}</h2>
            <p className="text-redbull-light">{currentUser?.email || 'Email tidak tersedia'}</p>
          </div>

          <div className="space-y-4 text-left max-w-md mx-auto">
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

            <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
              <h3 className="font-semibold text-redbull-red mb-2">Informasi Akun</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-redbull-light">Status:</span>
                  <span className="text-white">Aktif</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-redbull-light">Tanggal Bergabung:</span>
                  <span className="text-white">{currentUser?.email ? new Date().toLocaleDateString('id-ID') : 'Tidak diketahui'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
              <h3 className="font-semibold text-redbull-red mb-2">Pengaturan</h3>
              <ul className="space-y-2">
                <li className="flex justify-between items-center py-2 border-b border-redbull-red/10">
                  <span className="text-redbull-light">Notifikasi</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationEnabled}
                      onChange={() => setNotificationEnabled(!notificationEnabled)}
                    />
                    <div className="w-11 h-6 bg-redbull-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-redbull-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-redbull-red"></div>
                  </label>
                </li>
                <li className="flex justify-between items-center py-2 border-b border-redbull-red/10">
                  <span className="text-redbull-light">Mode Gelap</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={darkModeEnabled}
                      onChange={() => setDarkModeEnabled(!darkModeEnabled)}
                    />
                    <div className="w-11 h-6 bg-redbull-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-redbull-light after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-redbull-red"></div>
                  </label>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
              <h3 className="font-semibold text-redbull-red mb-2">Keamanan</h3>
              <ul className="space-y-2">
                <li className="py-2 border-b border-redbull-red/10">
                  {!showChangePassword ? (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="text-redbull-red hover:underline"
                    >
                      Ubah Kata Sandi
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-medium text-white">Ubah Kata Sandi</h4>
                      <div className="space-y-2">
                        <input
                          type="password"
                          placeholder="Kata sandi saat ini"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white placeholder-redbull-light"
                        />
                        <input
                          type="password"
                          placeholder="Kata sandi baru"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white placeholder-redbull-light"
                        />
                        <input
                          type="password"
                          placeholder="Konfirmasi kata sandi baru"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white placeholder-redbull-light"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleChangePassword}
                            className="flex-1 py-2 bg-redbull-red hover:bg-redbull-darker rounded text-white font-medium"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => {
                              setShowChangePassword(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmNewPassword('');
                            }}
                            className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white font-medium"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
                <li className="py-2 border-b border-redbull-red/10">
                  {!showChangeUsername ? (
                    <button
                      onClick={() => setShowChangeUsername(true)}
                      className="text-redbull-red hover:underline"
                    >
                      Ubah Nama Pengguna
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-medium text-white">Ubah Nama Pengguna</h4>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Nama pengguna baru"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white placeholder-redbull-light"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleChangeUsername}
                            className="flex-1 py-2 bg-redbull-red hover:bg-redbull-darker rounded text-white font-medium"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => {
                              setShowChangeUsername(false);
                              setNewUsername('');
                            }}
                            className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white font-medium"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
                <li className="py-2 border-b border-redbull-red/10">
                  <button
                    onClick={handleResetData}
                    className="text-red-500 hover:underline"
                  >
                    Reset Data
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={async () => {
                try {
                  await logout();
                  router.push('/login');
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition duration-200"
            >
              Keluar
            </button>
          </div>
        </div>
      </main>

      <TabBar />
    </div>
  );
}