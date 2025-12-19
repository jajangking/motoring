'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export default function OrdersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState({
    qty: '',
    tarif: '',
    tanggal: '',
    note: '',
    labelType: 'klik' // Tambahkan state untuk jenis label
  });
  const [bookHistory, setBookHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [showClosedOrders, setShowClosedOrders] = useState<{period: string, subPeriod: string} | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { user, isLoading: authIsLoading, logout } = useAuth();
  const router = useRouter();

  // Fungsi untuk mengambil history tutup buku dari Firebase
  const fetchBookHistory = async () => {
    if (user) {
      setIsHistoryLoading(true);
      try {
        const q = query(
          collection(db, "bookHistory"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const historyList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            period: data.period,
            startDate: data.startDate,
            endDate: data.endDate,
            totalOrders: data.totalOrders,
            qtyByLabel: data.qtyByLabel,
            createdAt: data.createdAt
          };
        });

        setBookHistory(historyList);
      } catch (err) {
        console.error("Error fetching book history: ", err);
      } finally {
        setIsHistoryLoading(false);
      }
    }
  };

  // Fetch orders from Firebase
  const fetchOrders = async () => {
    if (user) {
      setIsFetching(true); // Set fetching state
      try {
        console.log("Fetching orders for user:", user.uid);
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid)
          // Hapus orderBy untuk menghindari kebutuhan indeks
        );
        const querySnapshot = await getDocs(q);
        console.log("Query result:", querySnapshot.size, "documents");

        const fetchedOrders = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Processing order document:", doc.id, "data:", data);

          // Handle date conversion properly
          let tanggalFormatted = data.tanggal;
          if (data.tanggal instanceof Timestamp) {
            tanggalFormatted = data.tanggal.toDate().toISOString().split('T')[0];
          } else if (typeof data.tanggal === 'string') {
            // If it's already a string in YYYY-MM-DD format, use as is
            tanggalFormatted = data.tanggal;
          }

          const order = {
            id: doc.id,
            qty: data.qty || 0,
            tarif: data.tarif || 0,
            tanggal: tanggalFormatted,
            total: data.total || 0,
            note: data.note || '',
            labelType: data.labelType || 'klik'
          };
          console.log("Processed order:", order);
          return order;
        }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()); // Urutkan di sisi client dari terbaru

        console.log("Setting orders state to:", fetchedOrders);
        setOrders(fetchedOrders);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error("Error fetching orders: ", err);
        setError("Gagal mengambil data orderan. Silakan coba lagi.");
      } finally {
        setIsFetching(false); // Always reset fetching state
      }
    }
  };

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchOrders(); // Fetch orders from Firebase
        setIsLoading(false);
      }
    }
  }, [user, authIsLoading, router]);

  // Fetch orders when user changes or component mounts
  useEffect(() => {
    if (user && !authIsLoading) {
      fetchOrders();
    }
  }, [user, authIsLoading]);

  // Log orders state changes
  useEffect(() => {
    console.log("Orders state updated:", orders);
  }, [orders]);

  // Fetch book history when user changes or component mounts
  useEffect(() => {
    if (user && !authIsLoading) {
      fetchBookHistory();
    }
  }, [user, authIsLoading]);

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

  // Function to add a new order to Firebase
  const addOrderToList = async (newOrder: any) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Adding order:", newOrder);
      const orderData = {
        userId: user?.uid,
        qty: parseFloat(newOrder.qty),
        tarif: parseFloat(newOrder.tarif),
        tanggal: newOrder.tanggal,
        total: parseFloat(newOrder.qty) * parseFloat(newOrder.tarif),
        note: newOrder.note || '',
        labelType: newOrder.labelType || 'klik',
        createdAt: Timestamp.now()
      };

      console.log("Order data to be saved:", orderData);
      const docRef = await addDoc(collection(db, "orders"), orderData);
      console.log("Document added with ID:", docRef.id);

      // Add to local state - format the same as fetchOrders
      const newOrderWithId = {
        id: docRef.id,
        qty: orderData.qty,
        tarif: orderData.tarif,
        tanggal: orderData.tanggal,
        total: orderData.total,
        note: orderData.note
      };
      console.log("New order with ID added to state:", newOrderWithId);
      setOrders(prevOrders => [newOrderWithId, ...prevOrders]); // Add to the beginning
      console.log("Updated orders state:", [newOrderWithId, ...orders]);

      return docRef.id;
    } catch (err) {
      console.error("Error adding order: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Function to update an existing order in Firebase
  const updateOrderInFirebase = async (orderId: string, updatedOrder: any) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Updating order with ID:", orderId, "data:", updatedOrder);
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        qty: parseFloat(updatedOrder.qty),
        tarif: parseFloat(updatedOrder.tarif),
        tanggal: updatedOrder.tanggal,
        total: parseFloat(updatedOrder.qty) * parseFloat(updatedOrder.tarif),
        note: updatedOrder.note || '',
        labelType: updatedOrder.labelType || 'klik',
        updatedAt: Timestamp.now()
      });

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                qty: parseFloat(updatedOrder.qty),
                tarif: parseFloat(updatedOrder.tarif),
                tanggal: updatedOrder.tanggal,
                total: parseFloat(updatedOrder.qty) * parseFloat(updatedOrder.tarif),
                note: updatedOrder.note || ''
              }
            : order
        )
      );
      console.log("Order updated in state, new orders state:", setOrders);
    } catch (err) {
      console.error("Error updating order: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Function to delete an order from Firebase
  const deleteOrderFromFirebase = async (orderId: string) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Deleting order with ID:", orderId);
      const orderRef = doc(db, "orders", orderId);
      await deleteDoc(orderRef);

      // Remove from local state
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      console.log("Order deleted from state, new orders state:", setOrders);
    } catch (err) {
      console.error("Error deleting order: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const qtyNum = parseFloat(orderData.qty);
    const tarifNum = parseFloat(orderData.tarif);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Jumlah (Qty) harus lebih besar dari 0');
      return;
    }

    if (isNaN(tarifNum) || tarifNum < 0) {
      setError('Tarif harus angka positif atau nol');
      return;
    }

    if (!orderData.tanggal) {
      setError('Tanggal wajib diisi');
      return;
    }

    setIsSubmitting(true); // Set submitting state
    console.log("Form submitted with data:", orderData, "editingOrderId:", editingOrderId);
    try {
      let result;
      if (editingOrderId) {
        // Update existing order
        console.log("Updating existing order with ID:", editingOrderId);
        await updateOrderInFirebase(editingOrderId, {
          qty: qtyNum,
          tarif: tarifNum,
          tanggal: orderData.tanggal,
          note: orderData.note,
          labelType: orderData.labelType
        });
        setSuccessMessage('Orderan berhasil diperbarui!');
      } else {
        // Add new order
        console.log("Adding new order");
        result = await addOrderToList({
          qty: qtyNum,
          tarif: tarifNum,
          tanggal: orderData.tanggal,
          note: orderData.note,
          labelType: orderData.labelType
        });
        console.log("New order added with result:", result);
        setSuccessMessage('Orderan berhasil ditambahkan!');
      }

      setError('');

      // Reset form
      setOrderData({
        qty: '',
        tarif: '',
        tanggal: '',
        note: ''
      });

      // Close popup and reset editing state
      setIsPopupOpen(false);
      setEditingOrderId(null);

      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(editingOrderId ? 'Gagal memperbarui orderan. Silakan coba lagi.' : 'Gagal menambahkan orderan. Silakan coba lagi.');
      console.error('Error handling order:', err);
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Fungsi untuk mengambil orderan berdasarkan periode tutup buku
  const fetchOrdersForPeriod = async (period: string, subPeriod: '1-15' | '16-31') => {
    if (!user) return [];

    const [year, month] = period.split('-').map(Number);

    const startDate = subPeriod === '1-15'
      ? new Date(year, month - 1, 1)
      : new Date(year, month - 1, 16);

    const endDate = subPeriod === '1-15'
      ? new Date(year, month - 1, 16)  // 16 - 1 hari = 15
      : new Date(year, month, 0);      // akhir bulan

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        where("tanggal", ">=", startDateString),
        where("tanggal", "<", endDateString)
      );

      const querySnapshot = await getDocs(q);

      const periodOrders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let tanggalFormatted = data.tanggal;
        if (data.tanggal instanceof Timestamp) {
          tanggalFormatted = data.tanggal.toDate().toISOString().split('T')[0];
        } else if (typeof data.tanggal === 'string') {
          tanggalFormatted = data.tanggal;
        }

        return {
          id: doc.id,
          qty: data.qty || 0,
          tarif: data.tarif || 0,
          tanggal: tanggalFormatted,
          total: data.total || 0,
          note: data.note || '',
          labelType: data.labelType || 'klik'
        };
      }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

      return periodOrders;
    } catch (error) {
      console.error("Error fetching orders for period:", error);
      return [];
    }
  };

  // Function to open edit form with existing order data
  // Fungsi untuk menutup buku (dari tanggal 1-15 setiap bulan)
  const closeBook = async (month: number, year: number, period: 'first' | 'second' = 'first') => {
    try {
      const startDate = period === 'first'
        ? new Date(year, month - 1, 1)   // tanggal 1-15
        : new Date(year, month - 1, 16); // tanggal 16-akhir bulan

      const endDate = period === 'first'
        ? new Date(year, month - 1, 16)  // sampai 15 (tanggal 16-1 = 15)
        : new Date(year, month, 1);      // sampai akhir bulan

      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];

      // Filter orders untuk periode ini
      const ordersForPeriod = orders.filter(order => {
        const orderDate = new Date(order.tanggal);
        return orderDate >= startDate && orderDate < endDate;
      });

      if (ordersForPeriod.length === 0) {
        return { success: false, message: `Tidak ada orderan untuk periode ${startDateString} - ${new Date(endDate.getTime() - 86400000).toISOString().split('T')[0]}` };
      }

      // Hitung total qty dan nominal untuk setiap label type
      const result = ordersForPeriod.reduce((acc, order) => {
        const labelType = order.labelType || 'klik';

        if (!acc.qtyByLabel[labelType]) {
          acc.qtyByLabel[labelType] = 0;
        }
        if (!acc.nominalByLabel[labelType]) {
          acc.nominalByLabel[labelType] = 0;
        }

        acc.qtyByLabel[labelType] += order.qty;
        acc.nominalByLabel[labelType] += order.total;
        acc.totalQty += order.qty;
        acc.totalNominal += order.total;

        return acc;
      }, {
        qtyByLabel: {} as Record<string, number>,
        nominalByLabel: {} as Record<string, number>,
        totalQty: 0,
        totalNominal: 0
      });

      // Simpan ke history
      const historyData = {
        userId: user?.uid,
        period: `${year}-${month.toString().padStart(2, '0')}`,
        subPeriod: period === 'first' ? '1-15' : '16-31',
        startDate: startDateString,
        endDate: endDateString,
        totalOrders: ordersForPeriod.length,
        qtyByLabel: result.qtyByLabel,
        nominalByLabel: result.nominalByLabel,
        totalQty: result.totalQty,
        totalNominal: result.totalNominal,
        createdAt: Timestamp.now()
      };

      // Simpan ke koleksi history di Firebase
      await addDoc(collection(db, "bookHistory"), historyData);

      return {
        success: true,
        message: `Buku untuk periode ${period === 'first' ? '1-15' : '16-31'} ${startDateString} - ${new Date(endDate.getTime() - 86400000).toISOString().split('T')[0]} berhasil ditutup`,
        historyData
      };
    } catch (error) {
      console.error("Error saat menutup buku:", error);
      return { success: false, message: "Gagal menutup buku", error };
    }
  };

  // Fungsi untuk menghapus orderan berdasarkan periode (opsional)
  const deleteOrdersForPeriod = async (startDate: Date, endDate: Date) => {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", user?.uid),
      where("tanggal", ">=", startDate.toISOString().split('T')[0]),
      where("tanggal", "<", endDate.toISOString().split('T')[0])
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  };

  const openEditForm = (order: any) => {
    setOrderData({
      qty: order.qty.toString(),
      tarif: order.tarif.toString(),
      tanggal: order.tanggal,
      note: order.note,
      labelType: order.labelType || 'klik'
    });
    setEditingOrderId(order.id);
    setIsPopupOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-redbull-dark to-redbull-darker text-white flex flex-col">
      <header className="bg-redbull-darker/80 backdrop-blur-sm border-b border-redbull-red/30 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="bg-redbull-red p-2 rounded-full">
            <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center">
              <span className="text-redbull-dark font-bold text-sm">M</span>
            </div>
          </div>
          <h1 className="text-xl font-bold">Motoring</h1>
        </div>

        <button
          onClick={() => setIsPopupOpen(true)}
          disabled={isSubmitting}
          className="bg-redbull-red hover:bg-redbull-lighter disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center"
        >
          {isSubmitting && editingOrderId ? (
            <>
              <span className="animate-spin mr-2">🔄</span> Memperbarui...
            </>
          ) : isSubmitting && !editingOrderId ? (
            <>
              <span className="animate-spin mr-2">🔄</span> Menyimpan...
            </>
          ) : (
            'Tambah Orderan'
          )}
        </button>
      </header>

      <main className="max-w-full mx-auto py-8 px-0 text-center flex-grow">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-redbull-red/30">
          <h2 className="text-3xl font-bold text-white mb-6 px-6">Daftar Orderan per Hari</h2>

          {isFetching && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-redbull-red mx-auto"></div>
              <p className="text-redbull-light mt-4">Memuat data orderan...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-redbull-light">Belum ada orderan</p>
              <p className="text-redbull-light/70 text-sm mt-2">Tambah orderan pertama Anda dengan klik tombol di atas</p>
            </div>
          ) : (
            (() => {
              // Group orders by date
              const groupedOrders = orders.reduce((acc, order) => {
                if (!acc[order.tanggal]) {
                  acc[order.tanggal] = [];
                }
                acc[order.tanggal].push(order);
                return acc;
              }, {} as Record<string, typeof orders>);

              // Sort dates in descending order (most recent first)
              const sortedDates = Object.keys(groupedOrders).sort((a, b) =>
                new Date(b).getTime() - new Date(a).getTime()
              );

              // Fungsi untuk mengecualikan orderan yang sudah ditutup buku
              const filterOutClosedOrders = (allOrders: any[]) => {
                if (!bookHistory || bookHistory.length === 0) return allOrders;

                return allOrders.filter(order => {
                  const orderDate = new Date(order.tanggal);

                  // Periksa apakah order ini termasuk dalam periode yang sudah ditutup buku
                  for (const history of bookHistory) {
                    const [year, month] = history.period.split('-').map(Number);

                    const startDate = history.subPeriod === '1-15'
                      ? new Date(year, month - 1, 1)
                      : new Date(year, month - 1, 16);

                    const endDate = history.subPeriod === '1-15'
                      ? new Date(year, month - 1, 16)  // 16 - 1 hari = 15
                      : new Date(year, month, 0);      // akhir bulan

                    if (orderDate >= startDate && orderDate < endDate) {
                      // Jika order ini termasuk dalam periode yang sudah ditutup buku
                      return false;
                    }
                  }

                  // Jika tidak termasuk dalam periode yang sudah ditutup buku
                  return true;
                });
              };

              // Filter orders untuk mengecualikan yang sudah ditutup buku
              const filteredOrders = filterOutClosedOrders(orders);

              // Group orders by date for display
              const groupedOrders = filteredOrders.reduce((acc, order) => {
                if (!acc[order.tanggal]) {
                  acc[order.tanggal] = [];
                }
                acc[order.tanggal].push(order);
                return acc;
              }, {} as Record<string, typeof orders>);

              // Sort dates in descending order (most recent first)
              const sortedDates = Object.keys(groupedOrders).sort((a, b) =>
                new Date(b).getTime() - new Date(a).getTime()
              );

              return (
                <div className="space-y-2 -mx-6">
                  {/* Tampilkan tombol untuk melihat orderan yang ditutup buku jika sedang tidak menampilkan detailnya */}
                  {!showClosedOrders && bookHistory.length > 0 && orders.length > 0 && (
                    <div className="mx-6 bg-redbull-darker/50 p-3 rounded-lg border border-redbull-red/30">
                      <p className="text-redbull-light mb-2">Terdapat orderan yang sudah ditutup buku</p>
                      <div className="flex flex-wrap gap-2">
                        {bookHistory.map(history => (
                          <button
                            key={history.id}
                            onClick={async () => {
                              setShowClosedOrders({period: history.period, subPeriod: history.subPeriod});
                              const periodOrders = await fetchOrdersForPeriod(history.period, history.subPeriod as '1-15' | '16-31');
                              setClosedOrders(periodOrders);
                            }}
                            className="text-xs bg-redbull-red hover:bg-redbull-lighter text-white py-1 px-2 rounded transition duration-200"
                          >
                            Lihat {history.period} ({history.subPeriod})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tampilkan orderan untuk periode yang dipilih dari history jika sedang ditampilkan */}
                  {showClosedOrders && (
                    <div className="mx-6 bg-redbull-darker/50 p-3 rounded-lg border border-redbull-red/30 mb-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white">Orderan {showClosedOrders.period} ({showClosedOrders.subPeriod})</h4>
                        <button
                          onClick={() => setShowClosedOrders(null)}
                          className="text-xs bg-gray-600 hover:bg-gray-700 text-white py-1 px-2 rounded transition duration-200"
                        >
                          Tutup
                        </button>
                      </div>
                      {(() => {
                        // Group the orders by date
                        const groupedOrders = closedOrders.reduce((acc, order) => {
                          if (!acc[order.tanggal]) {
                            acc[order.tanggal] = [];
                          }
                          acc[order.tanggal].push(order);
                          return acc;
                        }, {} as Record<string, any[]>);

                        // Sort dates in descending order (most recent first)
                        const sortedDates = Object.keys(groupedOrders).sort((a, b) =>
                          new Date(b).getTime() - new Date(a).getTime()
                        );

                        return (
                          <div className="mt-4 space-y-4">
                            {sortedDates.map((date) => {
                              const dateOrders = groupedOrders[date];
                              const dailyTotal = dateOrders.reduce((sum, order) => sum + order.total, 0);

                              return (
                                <div key={date} className="border border-redbull-red/30 rounded-xl overflow-hidden">
                                  <div className="bg-redbull-darker p-4 border-b border-redbull-red/30">
                                    <h3 className="font-bold text-white">
                                      {new Date(date).toLocaleDateString('id-ID', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </h3>
                                    <p className="text-sm text-green-400">Total Harian: Rp {dailyTotal.toLocaleString()}</p>
                                  </div>

                                  <div className="space-y-2 p-4">
                                    {dateOrders.map((order) => (
                                      <div key={order.id} className="overflow-hidden">
                                        <div className="grid grid-cols-12 items-center px-6 py-2 hover:bg-white/5 transition-colors duration-200">
                                          <div className="col-span-1">
                                            <div className={`w-2 h-8 rounded ${order.labelType === 'klik' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                          </div>
                                          <div className="col-span-2 text-sm">
                                            <div className="text-redbull-light/80 text-xs">Qty</div>
                                            <div className="font-medium">{order.qty}</div>
                                          </div>
                                          <div className="col-span-3 text-sm">
                                            <div className="text-redbull-light/80 text-xs">Tarif</div>
                                            <div className="font-medium text-xs">Rp {order.tarif.toLocaleString()}</div>
                                          </div>
                                          <div className="col-span-3 text-sm">
                                            <div className="text-redbull-light/80 text-xs font-bold">Total</div>
                                            <div className="font-bold text-green-400 text-xs">Rp {order.total.toLocaleString()}</div>
                                          </div>
                                          <div className="col-span-3 flex flex-col space-y-1 justify-end">
                                            <button
                                              onClick={() => openEditForm(order)}
                                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded transition duration-200"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (confirm('Apakah Anda yakin ingin menghapus orderan ini?')) {
                                                  await deleteOrderFromFirebase(order.id);
                                                }
                                              }}
                                              className="text-xs bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded transition duration-200"
                                            >
                                              Hapus
                                            </button>
                                          </div>
                                        </div>
                                        {order.note && (
                                          <div className="px-6 py-1 bg-white/3 hover:bg-white/5 transition-colors duration-200">
                                            <div className="text-redbull-light/80 text-xs">Catatan</div>
                                            <div className="text-white text-sm">{order.note}</div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Tampilkan orderan saat ini jika tidak sedang menampilkan detail dari history */}
                  {!showClosedOrders && (
                    <div>
                      {sortedDates.map((date) => {
                        const dateOrders = groupedOrders[date];
                        const dailyTotal = dateOrders.reduce((sum, order) => sum + order.total, 0);

                        return (
                          <div key={date} className="space-y-2">
                            <div className="pt-6 pb-2 border-t border-redbull-red/30 px-6">
                              <h3 className="font-bold text-white text-lg">
                                {new Date(date).toLocaleDateString('id-ID', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </h3>
                              <p className="text-sm text-green-400">Total Harian: Rp {dailyTotal.toLocaleString()}</p>
                            </div>
                            {dateOrders.map((order, index) => (
                              <div key={order.id} className="overflow-hidden">
                                <div className="grid grid-cols-12 items-center px-6 py-2 hover:bg-white/5 transition-colors duration-200">
                                  <div className="col-span-1">
                                    <div className={`w-2 h-8 rounded ${order.labelType === 'klik' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                  </div>
                                  <div className="col-span-2 text-sm">
                                    <div className="text-redbull-light/80 text-xs">Qty</div>
                                    <div className="font-medium">{order.qty}</div>
                                  </div>
                                  <div className="col-span-3 text-sm">
                                    <div className="text-redbull-light/80 text-xs">Tarif</div>
                                    <div className="font-medium text-xs">Rp {order.tarif.toLocaleString()}</div>
                                  </div>
                                  <div className="col-span-3 text-sm">
                                    <div className="text-redbull-light/80 text-xs font-bold">Total</div>
                                    <div className="font-bold text-green-400 text-xs">Rp {order.total.toLocaleString()}</div>
                                  </div>
                                  <div className="col-span-3 flex flex-col space-y-1 justify-end">
                                    <button
                                      onClick={() => openEditForm(order)}
                                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded transition duration-200"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm('Apakah Anda yakin ingin menghapus orderan ini?')) {
                                          await deleteOrderFromFirebase(order.id);
                                        }
                                      }}
                                      className="text-xs bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded transition duration-200"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                                {order.note && (
                                  <div className="px-6 py-1 bg-white/3 hover:bg-white/5 transition-colors duration-200">
                                    <div className="text-redbull-light/80 text-xs">Catatan</div>
                                    <div className="text-white text-sm">{order.note}</div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Data status indicator */}
          {orders.length > 0 && !isFetching && (
            <div className="mt-6 text-sm text-redbull-light/80 flex justify-between items-center px-6">
              <span>Menampilkan {orders.length} orderan dari {new Set(orders.map(o => o.tanggal)).size} hari berbeda</span>
              <button
                onClick={fetchOrders}
                disabled={isFetching}
                className="text-xs bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white py-1 px-2 rounded transition duration-200 flex items-center"
              >
                {isFetching ? (
                  <>
                    <span className="animate-spin mr-1">🔄</span> Muat Ulang
                  </>
                ) : 'Muat Ulang'}
              </button>
            </div>
          )}

          {/* Tutup Buku Section */}
          <div className="mt-8 px-6">
            <h3 className="text-xl font-bold text-white mb-4">Tutup Buku</h3>
            <div className="bg-redbull-darker/50 p-4 rounded-lg border border-redbull-red/30">
              <p className="text-redbull-light mb-4">Tutup buku untuk periode 1-15 dan 16-akhir bulan</p>
              <div className="flex flex-wrap gap-4">
                {(() => {
                  const now = new Date();
                  const currentDay = now.getDate();

                  // Cek apakah ada orderan untuk periode tertentu
                  const hasOrdersForPeriod = (startDate: Date, endDate: Date) => {
                    return orders.some(order => {
                      const orderDate = new Date(order.tanggal);
                      return orderDate >= startDate && orderDate < endDate;
                    });
                  };

                  // Periode 1-15 bulan ini
                  const currentFirstPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  const currentFirstPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 16);

                  // Periode 16-akhir bulan ini
                  const currentSecondPeriodStart = new Date(now.getFullYear(), now.getMonth(), 16);
                  const currentSecondPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

                  // Periode 1-15 bulan lalu
                  const lastMonthFirstStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastMonthFirstEnd = new Date(now.getFullYear(), now.getMonth() - 1, 16);

                  // Periode 16-akhir bulan lalu
                  const lastMonthSecondStart = new Date(now.getFullYear(), now.getMonth() - 1, 16);
                  const lastMonthSecondEnd = new Date(now.getFullYear(), now.getMonth(), 1);

                  return (
                    <>
                      {/* Tombol 1-15 bulan ini (tampil hanya jika masih tanggal 1-15 dan ada orderan) */}
                      {currentDay <= 15 && hasOrdersForPeriod(currentFirstPeriodStart, currentFirstPeriodEnd) && (
                        <button
                          key="current-1-15"
                          onClick={async () => {
                            const result = await closeBook(now.getMonth() + 1, now.getFullYear(), 'first');
                            if (result.success) {
                              alert(result.message);
                              fetchBookHistory(); // Refresh history setelah tutup buku
                              fetchOrders(); // Refresh orders
                            } else {
                              alert(`Error: ${result.message}`);
                            }
                          }}
                          className="bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                          Tutup Buku 1-15 Bulan Ini
                        </button>
                      )}

                      {/* Tombol 16-akhir bulan ini (tampil hanya jika sudah lewat tanggal 15 dan ada orderan) */}
                      {currentDay > 15 && hasOrdersForPeriod(currentSecondPeriodStart, currentSecondPeriodEnd) && (
                        <button
                          key="current-16-end"
                          onClick={async () => {
                            const result = await closeBook(now.getMonth() + 1, now.getFullYear(), 'second');
                            if (result.success) {
                              alert(result.message);
                              fetchBookHistory(); // Refresh history setelah tutup buku
                              fetchOrders(); // Refresh orders
                            } else {
                              alert(`Error: ${result.message}`);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                          Tutup Buku 16-{new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()} Bulan Ini
                        </button>
                      )}

                      {/* Tombol bulan lalu - 1-15 (tampil hanya jika ada orderan) */}
                      {hasOrdersForPeriod(lastMonthFirstStart, lastMonthFirstEnd) && (
                        <button
                          onClick={async () => {
                            const result = await closeBook(lastMonthFirstStart.getMonth() + 1, lastMonthFirstStart.getFullYear(), 'first');
                            if (result.success) {
                              alert(result.message);
                              fetchBookHistory(); // Refresh history setelah tutup buku
                              fetchOrders(); // Refresh orders
                            } else {
                              alert(`Error: ${result.message}`);
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                          Tutup Buku 1-15 Bulan Lalu
                        </button>
                      )}

                      {/* Tombol bulan lalu - 16-akhir (tampil hanya jika ada orderan) */}
                      {hasOrdersForPeriod(lastMonthSecondStart, lastMonthSecondEnd) && (
                        <button
                          onClick={async () => {
                            const result = await closeBook(lastMonthSecondStart.getMonth() + 1, lastMonthSecondStart.getFullYear(), 'second');
                            if (result.success) {
                              alert(result.message);
                              fetchBookHistory(); // Refresh history setelah tutup buku
                              fetchOrders(); // Refresh orders
                            } else {
                              alert(`Error: ${result.message}`);
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                          Tutup Buku 16-{(() => {
                            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            return new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate();
                          })()} Bulan Lalu
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* History Tutup Buku Section */}
          <div className="mt-8 px-6">
            <h3 className="text-xl font-bold text-white mb-4">History Tutup Buku</h3>
            <div className="bg-redbull-darker/50 p-4 rounded-lg border border-redbull-red/30">
              {isHistoryLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-redbull-red mx-auto"></div>
                  <span className="ml-2 text-redbull-light">Memuat history...</span>
                </div>
              ) : bookHistory.length === 0 ? (
                <p className="text-center text-redbull-light py-6">Belum ada history tutup buku</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-redbull-red/30">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Periode</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Tanggal</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Total Order</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Rekap Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Rekap Nominal</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-redbull-red/20">
                      {bookHistory.map((history) => (
                        <tr key={history.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{history.period} ({history.subPeriod})</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">
                            {new Date(history.startDate).toLocaleDateString('id-ID')} - {new Date(new Date(history.endDate).getTime() - 86400000).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{history.totalOrders}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {history.qtyByLabel ? Object.entries(history.qtyByLabel).map(([label, qty]) => (
                              <div key={label} className="flex items-center">
                                <span className={`w-2 h-4 mr-2 rounded ${label === 'klik' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                <span className="text-white">{label}: {qty}</span>
                              </div>
                            )) : <span className="text-redbull-light">-</span>}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {history.nominalByLabel ? Object.entries(history.nominalByLabel).map(([label, nominal]) => (
                              <div key={label} className="flex items-center">
                                <span className={`w-2 h-4 mr-2 rounded ${label === 'klik' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                <span className="text-white">{label}: Rp {nominal.toLocaleString()}</span>
                              </div>
                            )) : <span className="text-redbull-light">-</span>}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-white">
                            <div className="flex flex-col">
                              <span>Qty: {history.totalQty || 0}</span>
                              <span className="text-green-400">Rp: {(history.totalNominal || 0).toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Order Form Popup */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-redbull-darker rounded-xl p-6 w-full max-w-md border border-redbull-red/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-redbull-red">{editingOrderId ? 'Edit Orderan' : 'Orderan Baru'}</h3>
              <button
                onClick={() => {
                  setIsPopupOpen(false);
                  setEditingOrderId(null); // Reset editing state when closing
                }}
                className="text-white hover:text-redbull-red"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="qty" className="block text-redbull-light mb-1">Jumlah (Qty)</label>
                <input
                  type="number"
                  id="qty"
                  value={orderData.qty}
                  onChange={(e) => setOrderData({...orderData, qty: e.target.value})}
                  className="w-full px-3 py-2 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Masukkan jumlah"
                  min="1"
                />
              </div>

              <div>
                <label htmlFor="tarif" className="block text-redbull-light mb-1">Tarif (per unit)</label>
                <input
                  type="number"
                  id="tarif"
                  value={orderData.tarif}
                  onChange={(e) => setOrderData({...orderData, tarif: e.target.value})}
                  className="w-full px-3 py-2 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Masukkan tarif per unit"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label htmlFor="tanggal" className="block text-redbull-light mb-1">Tanggal</label>
                <input
                  type="date"
                  id="tanggal"
                  value={orderData.tanggal}
                  onChange={(e) => setOrderData({...orderData, tanggal: e.target.value})}
                  className="w-full px-3 py-2 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                />
              </div>

              <div>
                <label className="block text-redbull-light mb-1">Jenis Label</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="labelType"
                      value="klik"
                      checked={orderData.labelType === 'klik'}
                      onChange={(e) => setOrderData({...orderData, labelType: e.target.value})}
                      className="form-radio text-redbull-red focus:ring-redbull-red"
                    />
                    <span className="ml-2">Klik</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="labelType"
                      value="paket"
                      checked={orderData.labelType === 'paket'}
                      onChange={(e) => setOrderData({...orderData, labelType: e.target.value})}
                      className="form-radio text-redbull-red focus:ring-redbull-red"
                    />
                    <span className="ml-2">Paket</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="total" className="block text-redbull-light mb-1">Total</label>
                <input
                  type="number"
                  id="total"
                  value={orderData.qty && orderData.tarif ? (parseFloat(orderData.qty) * parseFloat(orderData.tarif)).toString() : ''}
                  readOnly
                  className="w-full px-3 py-2 bg-redbull-darker/30 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none"
                />
                <p className="text-redbull-light/70 text-xs mt-1">Total dihitung otomatis (Qty x Tarif)</p>
              </div>

              <div>
                <label htmlFor="note" className="block text-redbull-light mb-1">Catatan</label>
                <textarea
                  id="note"
                  value={orderData.note}
                  onChange={(e) => setOrderData({...orderData, note: e.target.value})}
                  className="w-full px-3 py-2 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Catatan tambahan"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    setEditingOrderId(null); // Reset editing state
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">🔄</span> {editingOrderId ? 'Memperbarui...' : 'Menyimpan...'}
                    </>
                  ) : (
                    editingOrderId ? 'Perbarui' : 'Simpan'
                  )}
                </button>
              </div>
            </form>

            {successMessage && (
              <div className="mt-4 p-2 bg-green-500/20 text-green-200 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mt-4 p-2 bg-red-500/20 text-red-200 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="bg-redbull-darker/80 backdrop-blur-sm border-t border-redbull-red/30 py-3 fixed bottom-0 left-0 right-0">
        <ul className="flex justify-around">
          <li>
            <a href="/dashboard" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Dasbor</span>
            </a>
          </li>
          <li>
            <a href="/oil-change" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Sparepart</span>
            </a>
          </li>
          <li>
            <a href="/orders" className="flex flex-col items-center text-redbull-red font-semibold">
              <span>Orderan</span>
            </a>
          </li>
          <li>
            <a href="/profile" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Profil</span>
            </a>
          </li>
          <li>
            <button
              onClick={async () => {
                try {
                  await logout();
                  router.push('/login');
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }}
              className="flex flex-col items-center text-white bg-transparent border-none"
            >
              <span>Keluar</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}