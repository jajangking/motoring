'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc, writeBatch, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import NotificationPanel from '@/components/NotificationPanel';

export default function OrdersPage() {
  // Fungsi untuk mendapatkan bulan saat ini dalam format YYYY-MM
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Fungsi untuk mendapatkan periode saat ini (1-15 atau 16-31)
  const getCurrentPeriod = () => {
    const now = new Date();
    const day = now.getDate();
    return day <= 15 ? '1-15' : '16-31';
  };

  const [isLoading, setIsLoading] = useState(true);
  const [orderData, setOrderData] = useState({
    qty: '',
    tarif: '',
    tanggal: '',
    note: '',
    labelType: 'klik' // Tambahkan state untuk jenis label
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]); // Orders not in closed periods
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [bookHistory, setBookHistory] = useState<any[]>([]); // Store book history for filtering out closed periods
  const { user, isLoading: authIsLoading, logout } = useAuth();
  const router = useRouter();

  // Initialize filters with current month and period
  const [monthFilter, setMonthFilter] = useState<string>(getCurrentMonth()); // Filter by month (YYYY-MM format)
  const [periodFilter, setPeriodFilter] = useState<'all' | '1-15' | '16-31'>(getCurrentPeriod()); // Filter by period
  const [showExportPreview, setShowExportPreview] = useState(false); // State for showing export preview
  const [exportText, setExportText] = useState(''); // State to store the export text
  const [exportFormat, setExportFormat] = useState<'basic' | 'withRupiah'>('basic'); // State for export format
  
  // Pagination states
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageSize] = useState(20); // Number of items per page

  // Function to check if an order is in a closed book period
  const isOrderInClosedPeriod = (orderDate: string) => {
    const orderDateTime = new Date(orderDate);
    return bookHistory.some(history => {
      const startDate = new Date(history.startDate);
      const endDate = new Date(history.endDate);
      // Check if order date is within the closed period (end date is exclusive)
      return orderDateTime >= startDate && orderDateTime < endDate;
    });
  };

  // Function to get unique months from orders
  const getAvailableMonths = () => {
    if (!orders || orders.length === 0) return [];

    const monthsSet = new Set<string>();
    orders.forEach(order => {
      const date = new Date(order.tanggal);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthYear);
    });

    // Sort months in descending order (most recent first)
    return Array.from(monthsSet).sort((a: string, b: string) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - yearA;
    });
  };

  // Fetch orders and book history from Firebase with pagination
  const fetchOrders = async (reset: boolean = true) => {
    if (user) {
      setIsFetching(true); // Set fetching state
      try {
        console.log("Fetching orders for user:", user.uid);
        
        let q;
        if (reset) {
          // Initial fetch - get first page
          q = query(
            collection(db, "orders"),
            where("userId", "==", user.uid),
            orderBy("tanggal", "desc"),
            limit(pageSize)
          );
        } else {
          // Fetch next page
          if (!lastVisible) return; // If no last visible document, we've reached the end
          q = query(
            collection(db, "orders"),
            where("userId", "==", user.uid),
            orderBy("tanggal", "desc"),
            startAfter(lastVisible),
            limit(pageSize)
          );
        }
        
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
        });

        // Update last visible document for pagination
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        if (reset) {
          // Reset the list and set the first page
          setOrders(fetchedOrders);
          setLastVisible(lastDoc || null);
          setHasMore(querySnapshot.size === pageSize); // If we got exactly pageSize docs, there might be more
        } else {
          // Append to existing list
          setOrders(prev => [...prev, ...fetchedOrders]);
          setLastVisible(lastDoc || null);
          setHasMore(querySnapshot.size === pageSize); // If we got exactly pageSize docs, there might be more
        }

        // Fetch book history
        const historyQuery = query(collection(db, "bookHistory"), orderBy("startDate", "desc"));
        const historySnapshot = await getDocs(historyQuery);
        const historyList = historySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBookHistory(historyList);

        // Filter out orders that are in closed periods
        const filteredOrders = fetchedOrders.filter(order => !isOrderInClosedPeriod(order.tanggal));

        console.log("Setting orders state to:", fetchedOrders);
        setFilteredOrders(filteredOrders); // Set filtered orders (orders not in closed periods)
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error("Error fetching orders: ", err);
        setError("Gagal mengambil data orderan. Silakan coba lagi.");
      } finally {
        setIsFetching(false); // Always reset fetching state
        setIsLoadingMore(false); // Reset loading more state
      }
    }
  };

  // Function to load more orders
  const loadMoreOrders = async () => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      await fetchOrders(false); // Fetch next page
    }
  };

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchOrders(true); // Fetch orders from Firebase
        setIsLoading(false);
      }
    }
  }, [user, authIsLoading, router]);

  // Fetch orders when user changes or component mounts
  useEffect(() => {
    if (user && !authIsLoading) {
      fetchOrders(true);
    }
  }, [user, authIsLoading]);

  // Log orders state changes
  useEffect(() => {
    console.log("Orders state updated:", orders);
  }, [orders]);

  // Fetch book history when user changes or component mounts

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
        note: orderData.note || '',
        labelType: orderData.labelType || 'klik'
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

      // Refresh orders to trigger filtering
      await fetchOrders(true);
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

      // Refresh orders to trigger filtering
      await fetchOrders(true);
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
        note: '',
        labelType: 'klik'
      });

      // Close popup and reset editing state
      setIsPopupOpen(false);
      setEditingOrderId(null);

      // Refresh orders to trigger filtering
      await fetchOrders(true);

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


  // Function to open edit form with existing order data

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

    // Refresh orders to trigger filtering
    await fetchOrders(true);
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

  // Function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Function to generate basic export text based on current filters
  const generateBasicExportText = () => {
    // Apply month and period filters to get displayed orders for export
    let displayedOrders = [...filteredOrders];

    // Apply month filter
    if (monthFilter !== 'all') {
      displayedOrders = displayedOrders.filter(order => {
        const date = new Date(order.tanggal);
        const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return orderMonth === monthFilter;
      });
    }

    // Apply period filter
    if (periodFilter === '1-15') {
      displayedOrders = displayedOrders.filter(order => {
        const date = new Date(order.tanggal);
        return date.getDate() >= 1 && date.getDate() <= 15;
      });
    } else if (periodFilter === '16-31') {
      displayedOrders = displayedOrders.filter(order => {
        const date = new Date(order.tanggal);
        return date.getDate() >= 16 && date.getDate() <= 31;
      });
    }

    // Get month name for display
    const [year, month] = monthFilter.split('-').map(Number);
    const monthNames = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    const monthName = monthNames[month - 1] || 'BULAN';

    // Format the export text
    let exportText = `*REKAP ANTARAN*\n`;
    exportText += `*DELIMAN HL*\n`;
    exportText += `*${monthName} TGL ${periodFilter}*\n\n`;

    exportText += `NAMA : Jajang Nurdiana\n`;
    exportText += `NIK : 3207103103000001\n`;
    exportText += `NIK DMS : 32071031\n\n`;

    // Create array for each day of the period
    const daysInPeriod = periodFilter === '1-15' ? 15 : 16; // For 1-15 or 16-31
    const startDate = periodFilter === '1-15' ? 1 : 16;

    // Initialize arrays for klik and paket
    const klikArray = new Array(daysInPeriod).fill(null);
    const paketArray = new Array(daysInPeriod).fill(null);

    // Fill the arrays with actual data
    displayedOrders.forEach(order => {
      const date = new Date(order.tanggal);
      const day = date.getDate();

      if ((periodFilter === '1-15' && day >= 1 && day <= 15) ||
          (periodFilter === '16-31' && day >= 16 && day <= 31)) {

        const dayIndex = periodFilter === '1-15' ? day - 1 : day - 16;

        if (order.labelType === 'klik') {
          klikArray[dayIndex] = order.qty;
        } else if (order.labelType === 'paket') {
          paketArray[dayIndex] = order.qty;
        }
      }
    });

    // Add daily data to export text
    exportText += `TGL_KLIK_PAKET\n`;
    for (let i = 0; i < daysInPeriod; i++) {
      const day = startDate + i;
      const klikValue = klikArray[i] !== null ? klikArray[i] : '';
      const paketValue = paketArray[i] !== null ? paketArray[i] : '';
      exportText += `${day}.${klikValue}_${paketValue}\n`;
    }

    // Calculate totals
    const totalKlik = displayedOrders
      .filter(order => order.labelType === 'klik')
      .reduce((sum, order) => sum + order.qty, 0);

    const totalPaket = displayedOrders
      .filter(order => order.labelType === 'paket')
      .reduce((sum, order) => sum + order.qty, 0);

    const totalAntaran = totalKlik + totalPaket;

    // Format total section at the very bottom
    exportText += `\nTOTAL ANTARAN QTY: ${totalAntaran}\n`;
    exportText += `KLIK QTY: ${totalKlik}\n`;
    exportText += `PAKET QTY: ${totalPaket}`;

    return exportText;
  };

  // Function to generate export text with rupiah based on current filters
  const generateExportTextWithRupiah = () => {
    // Apply month and period filters to get displayed orders for export
    let displayedOrders = [...filteredOrders];

    // Apply month filter
    if (monthFilter !== 'all') {
      displayedOrders = displayedOrders.filter(order => {
        const date = new Date(order.tanggal);
        const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return orderMonth === monthFilter;
      });
    }

    // Apply period filter
    if (periodFilter === '1-15') {
      displayedOrders = displayedOrders.filter(order => {
        const date = new Date(order.tanggal);
        return date.getDate() >= 1 && date.getDate() <= 15;
      });
    } else if (periodFilter === '16-31') {
      displayedOrders = displayedOrders.filter(order => {
        const date = new Date(order.tanggal);
        return date.getDate() >= 16 && date.getDate() <= 31;
      });
    }

    // Get month name for display
    const [year, month] = monthFilter.split('-').map(Number);
    const monthNames = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    const monthName = monthNames[month - 1] || 'BULAN';

    // Format the export text
    let exportText = `*REKAP ANTARAN*\n`;
    exportText += `*DELIMAN HL*\n`;
    exportText += `*${monthName} TGL ${periodFilter}*\n\n`;

    exportText += `NAMA : Jajang Nurdiana\n`;
    exportText += `NIK : 3207103103000001\n`;
    exportText += `NIK DMS : 32071031\n\n`;

    // Create array for each day of the period
    const daysInPeriod = periodFilter === '1-15' ? 15 : 16; // For 1-15 or 16-31
    const startDate = periodFilter === '1-15' ? 1 : 16;

    // Initialize arrays for klik and paket
    const klikArray = new Array(daysInPeriod).fill(null);
    const paketArray = new Array(daysInPeriod).fill(null);

    // Fill the arrays with actual data
    displayedOrders.forEach(order => {
      const date = new Date(order.tanggal);
      const day = date.getDate();

      if ((periodFilter === '1-15' && day >= 1 && day <= 15) ||
          (periodFilter === '16-31' && day >= 16 && day <= 31)) {

        const dayIndex = periodFilter === '1-15' ? day - 1 : day - 16;

        if (order.labelType === 'klik') {
          klikArray[dayIndex] = order.qty;
        } else if (order.labelType === 'paket') {
          paketArray[dayIndex] = order.qty;
        }
      }
    });

    // Add daily data to export text (simplified format)
    exportText += `TGL_KLIK_PAKET\n`;
    for (let i = 0; i < daysInPeriod; i++) {
      const day = startDate + i;
      const klikValue = klikArray[i] !== null ? klikArray[i] : '';
      const paketValue = paketArray[i] !== null ? paketArray[i] : '';
      exportText += `${day}.${klikValue}_${paketValue}\n`;
    }

    // Calculate totals with rupiah
    const totalKlikQty = displayedOrders
      .filter(order => order.labelType === 'klik')
      .reduce((sum, order) => sum + order.qty, 0);

    const totalPaketQty = displayedOrders
      .filter(order => order.labelType === 'paket')
      .reduce((sum, order) => sum + order.qty, 0);

    const totalKlikNominal = displayedOrders
      .filter(order => order.labelType === 'klik')
      .reduce((sum, order) => sum + order.total, 0);

    const totalPaketNominal = displayedOrders
      .filter(order => order.labelType === 'paket')
      .reduce((sum, order) => sum + order.total, 0);

    const totalAntaranQty = totalKlikQty + totalPaketQty;
    const totalAntaranNominal = totalKlikNominal + totalPaketNominal;

    // Format total section at the very bottom
    exportText += `\nTOTAL ANTARAN QTY: ${totalAntaranQty}\n`;
    exportText += `TOTAL ANTARAN NOMINAL: ${formatCurrency(totalAntaranNominal)}\n`;
    exportText += `KLIK QTY: ${totalKlikQty} | NOMINAL: ${formatCurrency(totalKlikNominal)}\n`;
    exportText += `PAKET QTY: ${totalPaketQty} | NOMINAL: ${formatCurrency(totalPaketNominal)}`;

    return exportText;
  };

  // Function to generate export text based on current format selection
  const generateExportText = () => {
    if (exportFormat === 'withRupiah') {
      return generateExportTextWithRupiah();
    } else {
      return generateBasicExportText();
    }
  };

  // Function to show export preview
  const showExportPreviewHandler = () => {
    const text = generateExportText();
    setExportText(text);
    setShowExportPreview(true);
  };

  // Function to copy export text to clipboard
  const copyExportText = () => {
    navigator.clipboard.writeText(exportText)
      .then(() => {
        alert('Data berhasil disalin ke clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Gagal menyalin data ke clipboard');
      });
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

      {/* Filter Section */}
      <div className="bg-redbull-darker/60 border-b border-redbull-red/30 py-4 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-3">
            {/* Month Filter Dropdown */}
            <div className="w-full max-w-xs">
              <label className="block text-xs text-redbull-light mb-1">Pilih Bulan</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-redbull-red"
              >
                <option value="all">Semua Bulan</option>
                {getAvailableMonths().map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                  return (
                    <option key={month} value={month}>
                      {monthName}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Period Filter Buttons */}
            <div className="w-full max-w-xs">
              <label className="block text-xs text-redbull-light mb-1">Periode</label>
              <div className="flex space-x-1 bg-redbull-darker/50 rounded-lg p-1">
                <button
                  onClick={() => setPeriodFilter('all')}
                  className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${
                    periodFilter === 'all'
                      ? 'bg-redbull-red text-white'
                      : 'text-redbull-light hover:bg-redbull-darker'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setPeriodFilter('1-15')}
                  className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${
                    periodFilter === '1-15'
                      ? 'bg-redbull-red text-white'
                      : 'text-redbull-light hover:bg-redbull-darker'
                  }`}
                >
                  1-15
                </button>
                <button
                  onClick={() => setPeriodFilter('16-31')}
                  className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${
                    periodFilter === '16-31'
                      ? 'bg-redbull-red text-white'
                      : 'text-redbull-light hover:bg-redbull-darker'
                  }`}
                >
                  16-31
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-full mx-auto py-4 sm:py-8 px-2 sm:px-0 text-center flex-grow pb-20">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-redbull-red/30">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 px-2 sm:px-6">Daftar Orderan per Hari</h2>

          {isFetching && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-redbull-red mx-auto"></div>
              <p className="text-redbull-light mt-4">Memuat data orderan...</p>
            </div>
          ) : (() => {
            // Apply month and period filters to orders
            let displayedOrders = orders;

            // Apply month filter
            if (monthFilter !== 'all') {
              displayedOrders = displayedOrders.filter(order => {
                const date = new Date(order.tanggal);
                const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return orderMonth === monthFilter;
              });
            }

            // Apply period filter
            if (periodFilter === '1-15') {
              displayedOrders = displayedOrders.filter(order => {
                const date = new Date(order.tanggal);
                return date.getDate() >= 1 && date.getDate() <= 15;
              });
            } else if (periodFilter === '16-31') {
              displayedOrders = displayedOrders.filter(order => {
                const date = new Date(order.tanggal);
                return date.getDate() >= 16 && date.getDate() <= 31;
              });
            }

            if (displayedOrders.length === 0) {
              return (
                <div className="text-center py-6">
                  <p className="text-redbull-light">Belum ada orderan</p>
                  <p className="text-redbull-light/70 text-sm mt-2">Tambah orderan pertama Anda dengan klik tombol di atas</p>
                </div>
              );
            }

            // Group orders by date
            const allGroupedOrders = displayedOrders.reduce((acc, order) => {
              if (!acc[order.tanggal]) {
                acc[order.tanggal] = [];
              }
              acc[order.tanggal].push(order);
              return acc;
            }, {} as Record<string, typeof displayedOrders>);

            // Sort dates in descending order (most recent first)
            const allSortedDates = Object.keys(allGroupedOrders).sort((a, b) =>
              new Date(b).getTime() - new Date(a).getTime()
            );

            return (
              <div className="space-y-2 -mx-6">
                <div>
                  {allSortedDates.map((date) => {
                    const dateOrders = allGroupedOrders[date];
                    const dailyTotal = dateOrders.reduce((sum: number, order: any) => sum + order.total, 0);

                    return (
                      <div key={date} className="space-y-2">
                        <div className="pt-6 pb-2 border-t border-redbull-red/30 px-6">
                          <h3 className="font-bold text-white text-base sm:text-lg">
                            {new Date(date).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </h3>
                          <p className="text-sm text-green-400">Total Harian: Rp {dailyTotal.toLocaleString()}</p>
                        </div>
                        {dateOrders.map((order: any) => (
                          <div key={order.id} className="overflow-hidden">
                            <div className="grid grid-cols-12 items-center px-4 py-2 hover:bg-white/5 transition-colors duration-200 text-xs sm:text-sm">
                              <div className="col-span-1">
                                <div className={`w-2 h-8 rounded ${order.labelType === 'klik' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                              </div>
                              <div className="col-span-2 text-sm">
                                <div className="text-redbull-light/80 text-xs sm:text-xs">Qty</div>
                                <div className="font-medium">{order.qty}</div>
                              </div>
                              <div className="col-span-3 text-sm">
                                <div className="text-redbull-light/80 text-xs">Tarif</div>
                                <div className="font-medium text-xs sm:text-xs">Rp {order.tarif.toLocaleString()}</div>
                              </div>
                              <div className="col-span-3 text-sm">
                                <div className="text-redbull-light/80 text-xs font-bold">Total</div>
                                <div className="font-bold text-green-400 text-xs sm:text-xs">Rp {order.total.toLocaleString()}</div>
                              </div>
                              <div className="col-span-3 flex flex-col sm:flex-row sm:space-x-1 space-y-1 sm:space-y-0 justify-end">
                                <button
                                  onClick={() => openEditForm(order)}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded transition duration-200 whitespace-nowrap"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('Apakah Anda yakin ingin menghapus orderan ini?')) {
                                      await deleteOrderFromFirebase(order.id);
                                    }
                                  }}
                                  className="text-xs bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded transition duration-200 whitespace-nowrap"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                            {order.note && (
                              <div className="px-4 py-1 bg-white/3 hover:bg-white/5 transition-colors duration-200 text-sm">
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
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={loadMoreOrders}
                      disabled={isLoadingMore}
                      className="bg-redbull-red hover:bg-redbull-lighter disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                    >
                      {isLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Data status indicator */}
          {(() => {
            // Apply month and period filters to get displayed count
            let displayedOrders = orders;

            // Apply month filter
            if (monthFilter !== 'all') {
              displayedOrders = displayedOrders.filter(order => {
                const date = new Date(order.tanggal);
                const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return orderMonth === monthFilter;
              });
            }

            // Apply period filter
            if (periodFilter === '1-15') {
              displayedOrders = displayedOrders.filter(order => {
                const date = new Date(order.tanggal);
                return date.getDate() >= 1 && date.getDate() <= 15;
              });
            } else if (periodFilter === '16-31') {
              displayedOrders = displayedOrders.filter(order => {
                const date = new Date(order.tanggal);
                return date.getDate() >= 16 && date.getDate() <= 31;
              });
            }

            if (displayedOrders.length > 0 && !isFetching) {
              return (
                <div className="mt-6 text-sm text-redbull-light/80 flex justify-between items-center px-6">
                  <span className="text-sm">Menampilkan {displayedOrders.length} orderan dari {new Set(displayedOrders.map(o => o.tanggal)).size} hari berbeda</span>
                  <button
                    onClick={() => fetchOrders(true)}
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
              );
            }
            return null;
          })()}

          {/* Detailed Summary Section */}
          <div className="mt-8">
            <h3 className="text-xl font-bold text-white mb-4 px-2 sm:px-6">Rekap Data Berdasarkan Filter</h3>
            {(() => {
              // Apply month and period filters to get displayed orders for summary
              let displayedOrders = orders;

              // Apply month filter
              if (monthFilter !== 'all') {
                displayedOrders = displayedOrders.filter(order => {
                  const date = new Date(order.tanggal);
                  const orderMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  return orderMonth === monthFilter;
                });
              }

              // Apply period filter
              if (periodFilter === '1-15') {
                displayedOrders = displayedOrders.filter(order => {
                  const date = new Date(order.tanggal);
                  return date.getDate() >= 1 && date.getDate() <= 15;
                });
              } else if (periodFilter === '16-31') {
                displayedOrders = displayedOrders.filter(order => {
                  const date = new Date(order.tanggal);
                  return date.getDate() >= 16 && date.getDate() <= 31;
                });
              }

              if (displayedOrders.length === 0) {
                return (
                  <div className="text-center py-6">
                    <p className="text-redbull-light">Tidak ada data untuk filter yang dipilih</p>
                  </div>
                );
              }

              // Calculate summary data
              const totalOrders = displayedOrders.length;
              const totalQty = displayedOrders.reduce((sum, order) => sum + order.qty, 0);
              const totalNominal = displayedOrders.reduce((sum, order) => sum + order.total, 0);

              // Calculate total working days (unique dates with orders)
              const uniqueDates = new Set(displayedOrders.map(order => order.tanggal));
              const totalWorkingDays = uniqueDates.size;

              // Group by label type
              const labelSummary: Record<string, { qty: number, nominal: number, count: number }> = {};
              displayedOrders.forEach(order => {
                const label = order.labelType || 'klik';
                if (!labelSummary[label]) {
                  labelSummary[label] = { qty: 0, nominal: 0, count: 0 };
                }
                labelSummary[label].qty += order.qty;
                labelSummary[label].nominal += order.total;
                labelSummary[label].count += 1;
              });

              // Group by date for daily breakdown
              const dailySummary: Record<string, { qty: number, nominal: number, count: number }> = {};
              displayedOrders.forEach(order => {
                if (!dailySummary[order.tanggal]) {
                  dailySummary[order.tanggal] = { qty: 0, nominal: 0, count: 0 };
                }
                dailySummary[order.tanggal].qty += order.qty;
                dailySummary[order.tanggal].nominal += order.total;
                dailySummary[order.tanggal].count += 1;
              });

              // Sort dates in descending order
              const sortedDates = Object.keys(dailySummary).sort((a, b) =>
                new Date(b).getTime() - new Date(a).getTime()
              );

              return (
                <div className="space-y-6">
                  {/* Overall Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 px-2 sm:px-6">
                    <div className="bg-redbull-darker/50 p-4 rounded-lg border border-redbull-red/30">
                      <h4 className="text-redbull-light text-sm mb-1">Total Hari Kerja</h4>
                      <p className="text-2xl font-bold text-white">{totalWorkingDays}</p>
                    </div>
                    <div className="bg-redbull-darker/50 p-4 rounded-lg border border-redbull-red/30">
                      <h4 className="text-redbull-light text-sm mb-1">Total Order</h4>
                      <p className="text-2xl font-bold text-white">{totalOrders}</p>
                    </div>
                    <div className="bg-redbull-darker/50 p-4 rounded-lg border border-redbull-red/30">
                      <h4 className="text-redbull-light text-sm mb-1">Total Qty</h4>
                      <p className="text-2xl font-bold text-white">{totalQty}</p>
                    </div>
                    <div className="bg-redbull-darker/50 p-4 rounded-lg border border-redbull-red/30">
                      <h4 className="text-redbull-light text-sm mb-1">Total Nominal</h4>
                      <p className="text-2xl font-bold text-green-400">Rp {totalNominal.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Label Breakdown */}
                  <div className="px-2 sm:px-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Rekap Berdasarkan Jenis Label</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(labelSummary).map(([label, data]) => (
                        <div key={label} className="bg-redbull-darker/30 p-3 rounded-lg border border-redbull-red/20">
                          <div className="flex items-center mb-2">
                            <div className={`w-3 h-3 rounded mr-2 ${label === 'klik' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                            <span className="font-medium text-white">{label}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-redbull-light">Order</p>
                              <p className="text-white font-medium">{data.count}</p>
                            </div>
                            <div>
                              <p className="text-redbull-light">Qty</p>
                              <p className="text-white font-medium">{data.qty}</p>
                            </div>
                            <div>
                              <p className="text-redbull-light">Nominal</p>
                              <p className="text-green-400 font-medium">Rp {data.nominal.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Breakdown */}
                  <div className="px-2 sm:px-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Rekap Harian</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-redbull-red/30">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Tanggal</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Order</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Qty</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Nominal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-redbull-red/20">
                          {sortedDates.map(date => (
                            <tr key={date} className="hover:bg-white/5">
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-white">
                                {new Date(date).toLocaleDateString('id-ID', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{dailySummary[date].count}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{dailySummary[date].qty}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-green-400">Rp {dailySummary[date].nominal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Export Controls */}
        <div className="px-6 mt-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-redbull-light mb-1">Format Ekspor</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'basic' | 'withRupiah')}
                className="w-full bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-redbull-red"
              >
                <option value="basic">Basic (Qty Saja)</option>
                <option value="withRupiah">Dengan Rupiah Lengkap</option>
              </select>
            </div>
          </div>

          <button
            onClick={showExportPreviewHandler}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
          >
            <span>Pratinjau Ekspor Data</span>
          </button>
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

      {/* Export Preview Modal */}
      {showExportPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-redbull-darker rounded-xl p-6 w-full max-w-2xl border border-redbull-red/30 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-redbull-red">Pratinjau Ekspor Data</h3>
              <button
                onClick={() => setShowExportPreview(false)}
                className="text-white hover:text-redbull-red"
              >
                &times;
              </button>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg mb-4 overflow-y-auto flex-grow">
              <pre className="whitespace-pre-wrap text-sm text-white font-mono">
                {exportText}
              </pre>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowExportPreview(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Batal
              </button>
              <button
                onClick={copyExportText}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Salin ke Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-redbull-darker/80 backdrop-blur-sm border-t border-redbull-red/30 py-3 fixed bottom-0 left-0 right-0 z-40">
        <ul className="flex justify-around">
          <li>
            <a href="/dashboard" className="flex flex-col items-center hover:text-redbull-red transition duration-200">
              <span>Dasbor</span>
            </a>
          </li>
          <li>
            <a href="/orders" className="flex flex-col items-center text-redbull-red font-semibold">
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