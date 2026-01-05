'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import TabBar from '@/components/TabBar';

export default function SparepartsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [sparepartData, setSparepartData] = useState({
    name: '',
    quantity: '',
    price: '',
    note: '',
    currentKm: '',
    date: '',
    nextKm: '',
    motorcycleId: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [spareparts, setSpareparts] = useState<any[]>([]);
  const [editingSparepartId, setEditingSparepartId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [motorcycles, setMotorcycles] = useState<any[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string>('');
  const [isMotorcyclePopupOpen, setIsMotorcyclePopupOpen] = useState(false);
  const [motorcycleData, setMotorcycleData] = useState({
    name: '',
    model: '',
    year: ''
  });
  const { user, isLoading: authIsLoading, logout } = useAuth();
  const router = useRouter();

  // State for current KM input field
  const [currentKm, setCurrentKm] = useState('');

  // State for daily KM history
  const [dailyKmHistory, setDailyKmHistory] = useState<any[]>([]);
  const [isKmHistoryPopupOpen, setIsKmHistoryPopupOpen] = useState(false);
  const [kmHistoryData, setKmHistoryData] = useState({
    km: '',
    date: new Date().toISOString().split('T')[0] // Default to today's date
  });

  // State to track if user has manually set currentKm
  const [hasUserSetCurrentKm, setHasUserSetCurrentKm] = useState(false);

  // Fetch motorcycles from Firebase
  const fetchMotorcycles = async () => {
    if (user) {
      try {
        console.log("Fetching motorcycles for user:", user.uid);
        const q = query(
          collection(db, "motorcycles"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        console.log("Motorcycle query result:", querySnapshot.size, "documents");

        const fetchedMotorcycles = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Processing motorcycle document:", doc.id, "data:", data);

          return {
            id: doc.id,
            name: data.name || '',
            model: data.model || '',
            year: data.year || '',
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : ''
          };
        });

        console.log("Setting motorcycles state to:", fetchedMotorcycles);
        setMotorcycles(fetchedMotorcycles);

        // If there are motorcycles and no selection is made, select the first one
        if (fetchedMotorcycles.length > 0 && !selectedMotorcycle) {
          setSelectedMotorcycle(fetchedMotorcycles[0].id);
        }
      } catch (err) {
        console.error("Error fetching motorcycles: ", err);
        setError("Gagal mengambil data motor. Silakan coba lagi.");
      }
    }
  };

  // Fetch spareparts from Firebase for selected motorcycle
  const fetchSpareparts = async () => {
    if (user && selectedMotorcycle) {
      setIsFetching(true); // Set fetching state
      try {
        console.log("Fetching spareparts for user:", user.uid, "and motorcycle:", selectedMotorcycle);
        const q = query(
          collection(db, "spareparts"),
          where("userId", "==", user.uid),
          where("motorcycleId", "==", selectedMotorcycle),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        console.log("Query result:", querySnapshot.size, "documents");

        const fetchedSpareparts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Processing sparepart document:", doc.id, "data:", data);

          return {
            id: doc.id,
            name: data.name || '',
            quantity: data.quantity || 0,
            price: data.price || 0,
            total: data.total || 0,
            note: data.note || '',
            currentKm: data.currentKm || 0,
            date: data.date || '',
            nextKm: data.nextKm || 0,
            motorcycleId: data.motorcycleId || '',
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : ''
          };
        });

        console.log("Setting spareparts state to:", fetchedSpareparts);
        setSpareparts(fetchedSpareparts);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error("Error fetching spareparts: ", err);
        setError("Gagal mengambil data spareparts. Silakan coba lagi.");
      } finally {
        setIsFetching(false); // Always reset fetching state
      }
    } else if (user && !selectedMotorcycle) {
      // If no motorcycle is selected, show empty array
      setSpareparts([]);
    }
  };

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchMotorcycles(); // Fetch motorcycles from Firebase
        setIsLoading(false);
      }
    }
  }, [user, authIsLoading, router]);

  // Fetch spareparts and daily KM history when user changes, motorcycle changes, or component mounts
  useEffect(() => {
    if (user && !authIsLoading && selectedMotorcycle) {
      // Reset the flag when a new motorcycle is selected
      setHasUserSetCurrentKm(false);
      fetchSpareparts();
      fetchDailyKmHistory(); // Fetch daily KM history
    }
  }, [user, authIsLoading, selectedMotorcycle]);

  // Update sparepartData motorcycleId when selectedMotorcycle changes
  useEffect(() => {
    setSparepartData(prevData => ({
      ...prevData,
      motorcycleId: selectedMotorcycle || ''
    }));
  }, [selectedMotorcycle]);

  // Update currentKm when dailyKmHistory changes (only if user hasn't manually set it)
  useEffect(() => {
    if (dailyKmHistory.length > 0 && !hasUserSetCurrentKm) {
      // Find the most recent entry for today, or the most recent entry overall if none for today
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = dailyKmHistory.find(entry => entry.date === today);
      const latestEntry = todayEntry || dailyKmHistory[0]; // Use today's entry if exists, otherwise use the most recent

      setCurrentKm(latestEntry.km.toString());
      setSparepartData(prevData => ({
        ...prevData,
        currentKm: latestEntry.km.toString()
      }));
    }
  }, [dailyKmHistory, hasUserSetCurrentKm]);

  // Log spareparts state changes
  useEffect(() => {
    console.log("Spareparts state updated:", spareparts);
  }, [spareparts]);

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

  // Function to add a new sparepart to Firebase
  const addSparepartToList = async (newSparepart: any) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Adding sparepart:", newSparepart);
      const sparepartData = {
        userId: user?.uid,
        motorcycleId: newSparepart.motorcycleId || selectedMotorcycle,
        name: newSparepart.name,
        quantity: parseFloat(newSparepart.quantity),
        price: parseFloat(newSparepart.price),
        total: parseFloat(newSparepart.quantity) * parseFloat(newSparepart.price),
        note: newSparepart.note || '',
        currentKm: parseFloat(newSparepart.currentKm) || 0,
        date: newSparepart.date || '',
        nextKm: parseFloat(newSparepart.nextKm) || 0,
        createdAt: Timestamp.now()
      };

      console.log("Sparepart data to be saved:", sparepartData);
      const docRef = await addDoc(collection(db, "spareparts"), sparepartData);
      console.log("Document added with ID:", docRef.id);

      // Add to local state
      const newSparepartWithId = {
        id: docRef.id,
        motorcycleId: sparepartData.motorcycleId,
        name: sparepartData.name,
        quantity: sparepartData.quantity,
        price: sparepartData.price,
        total: sparepartData.total,
        note: sparepartData.note || '',
        currentKm: sparepartData.currentKm,
        date: sparepartData.date,
        nextKm: sparepartData.nextKm,
        createdAt: sparepartData.createdAt.toDate().toISOString().split('T')[0]
      };
      console.log("New sparepart with ID added to state:", newSparepartWithId);
      setSpareparts(prevSpareparts => [newSparepartWithId, ...prevSpareparts]); // Add to the beginning
      console.log("Updated spareparts state:", [newSparepartWithId, ...spareparts]);

      return docRef.id;
    } catch (err) {
      console.error("Error adding sparepart: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Function to update an existing sparepart in Firebase
  const updateSparepartInFirebase = async (sparepartId: string, updatedSparepart: any) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Updating sparepart with ID:", sparepartId, "data:", updatedSparepart);
      const sparepartRef = doc(db, "spareparts", sparepartId);
      await updateDoc(sparepartRef, {
        name: updatedSparepart.name,
        quantity: parseFloat(updatedSparepart.quantity),
        price: parseFloat(updatedSparepart.price),
        total: parseFloat(updatedSparepart.quantity) * parseFloat(updatedSparepart.price),
        note: updatedSparepart.note || '',
        currentKm: parseFloat(updatedSparepart.currentKm) || 0,
        date: updatedSparepart.date || '',
        nextKm: parseFloat(updatedSparepart.nextKm) || 0,
        motorcycleId: updatedSparepart.motorcycleId || selectedMotorcycle,
        updatedAt: Timestamp.now()
      });

      // Update local state
      setSpareparts(prevSpareparts =>
        prevSpareparts.map(sparepart =>
          sparepart.id === sparepartId
            ? {
                ...sparepart,
                name: updatedSparepart.name,
                quantity: parseFloat(updatedSparepart.quantity),
                price: parseFloat(updatedSparepart.price),
                total: parseFloat(updatedSparepart.quantity) * parseFloat(updatedSparepart.price),
                note: updatedSparepart.note || '',
                currentKm: parseFloat(updatedSparepart.currentKm) || 0,
                date: updatedSparepart.date || '',
                nextKm: parseFloat(updatedSparepart.nextKm) || 0,
                motorcycleId: updatedSparepart.motorcycleId || selectedMotorcycle
              }
            : sparepart
        )
      );
      console.log("Sparepart updated in state, new spareparts state:", setSpareparts);

      // Refresh spareparts to trigger filtering
      await fetchSpareparts();
    } catch (err) {
      console.error("Error updating sparepart: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Function to delete a sparepart from Firebase
  const deleteSparepartFromFirebase = async (sparepartId: string) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Deleting sparepart with ID:", sparepartId);
      const sparepartRef = doc(db, "spareparts", sparepartId);
      await deleteDoc(sparepartRef);

      // Remove from local state
      setSpareparts(prevSpareparts => prevSpareparts.filter(sparepart => sparepart.id !== sparepartId));
      console.log("Sparepart deleted from state, new spareparts state:", setSpareparts);

      // Refresh spareparts to trigger filtering
      await fetchSpareparts();
    } catch (err) {
      console.error("Error deleting sparepart: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const quantityNum = parseFloat(sparepartData.quantity);
    const priceNum = parseFloat(sparepartData.price);
    const currentKmNum = parseFloat(sparepartData.currentKm) || 0;
    const nextKmNum = parseFloat(sparepartData.nextKm) || 0;

    if (!sparepartData.name.trim()) {
      setError('Nama sparepart wajib diisi');
      return;
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('Jumlah harus lebih besar dari 0');
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Harga harus angka positif atau nol');
      return;
    }

    if (isNaN(currentKmNum) || currentKmNum < 0) {
      setError('KM saat ini harus angka positif atau nol');
      return;
    }

    if (isNaN(nextKmNum) || nextKmNum < currentKmNum) {
      setError('KM penggantian berikutnya harus lebih besar dari KM saat ini');
      return;
    }

    if (!sparepartData.motorcycleId && !selectedMotorcycle) {
      setError('Pilih motor terlebih dahulu');
      return;
    }

    setIsSubmitting(true); // Set submitting state
    console.log("Form submitted with data:", sparepartData, "editingSparepartId:", editingSparepartId);
    try {
      let result;
      if (editingSparepartId) {
        // Update existing sparepart
        console.log("Updating existing sparepart with ID:", editingSparepartId);
        await updateSparepartInFirebase(editingSparepartId, {
          name: sparepartData.name,
          quantity: quantityNum,
          price: priceNum,
          note: sparepartData.note,
          currentKm: currentKmNum,
          date: sparepartData.date,
          nextKm: nextKmNum,
          motorcycleId: sparepartData.motorcycleId || selectedMotorcycle
        });
        setSuccessMessage('Sparepart berhasil diperbarui!');
      } else {
        // Add new sparepart
        console.log("Adding new sparepart");
        result = await addSparepartToList({
          name: sparepartData.name,
          quantity: quantityNum,
          price: priceNum,
          note: sparepartData.note,
          currentKm: currentKmNum,
          date: sparepartData.date,
          nextKm: nextKmNum,
          motorcycleId: sparepartData.motorcycleId || selectedMotorcycle
        });
        console.log("New sparepart added with result:", result);
        setSuccessMessage('Sparepart berhasil ditambahkan!');
      }

      setError('');

      // Reset form
      setSparepartData({
        name: '',
        quantity: '',
        price: '',
        note: '',
        currentKm: '',
        date: '',
        nextKm: '',
        motorcycleId: selectedMotorcycle
      });

      // Close popup and reset editing state
      setIsPopupOpen(false);
      setEditingSparepartId(null);

      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(editingSparepartId ? 'Gagal memperbarui sparepart. Silakan coba lagi.' : 'Gagal menambahkan sparepart. Silakan coba lagi.');
      console.error('Error handling sparepart:', err);
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const openEditForm = (sparepart: any) => {
    setSparepartData({
      name: sparepart.name,
      quantity: sparepart.quantity.toString(),
      price: sparepart.price.toString(),
      note: sparepart.note,
      currentKm: sparepart.currentKm.toString(),
      date: sparepart.date,
      nextKm: sparepart.nextKm.toString(),
      motorcycleId: sparepart.motorcycleId
    });
    setEditingSparepartId(sparepart.id);
    setIsPopupOpen(true);
  };

  // Function to fetch daily KM history from Firebase
  const fetchDailyKmHistory = async () => {
    if (user && selectedMotorcycle) {
      try {
        console.log("Fetching daily KM history for user:", user.uid, "and motorcycle:", selectedMotorcycle);
        const q = query(
          collection(db, "dailyKmHistory"),
          where("userId", "==", user.uid),
          where("motorcycleId", "==", selectedMotorcycle),
          orderBy("createdAt", "desc") // Order by createdAt to get most recent entries first
        );
        const querySnapshot = await getDocs(q);
        console.log("Daily KM history query result:", querySnapshot.size, "documents");

        const fetchedHistory = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            km: data.km || 0,
            date: data.date || '',
            time: data.time || '', // Include time
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString().split('T')[0] : ''
          };
        });

        console.log("Setting daily KM history state to:", fetchedHistory);
        setDailyKmHistory(fetchedHistory);
      } catch (err) {
        console.error("Error fetching daily KM history: ", err);
        setError("Gagal mengambil riwayat KM harian. Silakan coba lagi.");
      }
    }
  };

  // Function to add a new daily KM entry to Firebase
  const addDailyKmEntry = async (newKmEntry: any) => {
    setIsSubmitting(true); // Set submitting state
    let resultId = null; // Variable to store the ID to return

    try {
      console.log("Adding daily KM entry:", newKmEntry);

      // Check if there's already an entry for the same date
      const existingEntry = dailyKmHistory.find(entry => entry.date === newKmEntry.date);

      if (existingEntry) {
        // Update existing entry for the same date
        const entryRef = doc(db, "dailyKmHistory", existingEntry.id);
        await updateDoc(entryRef, {
          km: parseFloat(newKmEntry.km),
          updatedAt: Timestamp.now()
        });

        // Update local state by removing the old entry and adding the updated one at the beginning
        const filteredHistory = dailyKmHistory.filter(entry => entry.id !== existingEntry.id);
        const updatedEntry = {
          ...existingEntry,
          km: parseFloat(newKmEntry.km),
          updatedAt: Timestamp.now().toDate().toISOString()
        };
        setDailyKmHistory([updatedEntry, ...filteredHistory]); // Add updated entry to the beginning

        setSuccessMessage('Riwayat KM harian berhasil diperbarui!');
        resultId = existingEntry.id; // Set result ID for update case
      } else {
        // Add new entry
        const kmEntryData = {
          userId: user?.uid,
          motorcycleId: selectedMotorcycle,
          km: parseFloat(newKmEntry.km),
          date: newKmEntry.date,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), // Add time
          createdAt: Timestamp.now()
        };

        console.log("Daily KM entry data to be saved:", kmEntryData);
        const docRef = await addDoc(collection(db, "dailyKmHistory"), kmEntryData);
        console.log("Daily KM entry document added with ID:", docRef.id);

        // Add to local state
        const newKmEntryWithId = {
          id: docRef.id,
          km: kmEntryData.km,
          date: kmEntryData.date,
          time: kmEntryData.time, // Include time
          createdAt: kmEntryData.createdAt.toDate().toISOString().split('T')[0]
        };
        setDailyKmHistory(prevHistory => [newKmEntryWithId, ...prevHistory]); // Add to the beginning

        setSuccessMessage('Riwayat KM harian berhasil ditambahkan!');
        resultId = docRef.id; // Set result ID for add case
      }

      // Update current KM to the new value
      setCurrentKm(newKmEntry.km);
      setSparepartData(prevData => ({
        ...prevData,
        currentKm: newKmEntry.km
      }));
      // Mark that user has manually set the value
      setHasUserSetCurrentKm(true);

      return resultId;
    } catch (err) {
      console.error("Error adding daily KM entry: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Function to delete a daily KM entry from Firebase
  const deleteDailyKmEntry = async (entryId: string) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Deleting daily KM entry with ID:", entryId);
      const entryRef = doc(db, "dailyKmHistory", entryId);
      await deleteDoc(entryRef);

      // Remove from local state and update currentKm if needed
      setDailyKmHistory(prevHistory => {
        const updatedHistory = prevHistory.filter(entry => entry.id !== entryId);

        // If the deleted entry was the first (latest) entry, update currentKm
        const deletedEntryIndex = prevHistory.findIndex(entry => entry.id === entryId);
        if (deletedEntryIndex === 0) { // If it was the first (latest) entry
          if (updatedHistory.length > 0) {
            // Update currentKm to the new latest entry
            setCurrentKm(updatedHistory[0].km.toString());
            setSparepartData(prevData => ({
              ...prevData,
              currentKm: updatedHistory[0].km.toString()
            }));
            // Reset the flag since the value is now from history, not user input
            setHasUserSetCurrentKm(false);
          } else {
            // If no entries left, clear currentKm
            setCurrentKm('');
            setSparepartData(prevData => ({
              ...prevData,
              currentKm: ''
            }));
            // Reset the flag since there's no value to track
            setHasUserSetCurrentKm(false);
          }
        }

        return updatedHistory;
      });

      setSuccessMessage('Riwayat KM harian berhasil dihapus!');

      console.log("Daily KM entry deleted from state");
    } catch (err) {
      console.error("Error deleting daily KM entry: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const handleKmHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const kmNum = parseFloat(kmHistoryData.km);

    if (isNaN(kmNum) || kmNum < 0) {
      setError('KM harus angka positif atau nol');
      return;
    }

    if (!kmHistoryData.date) {
      setError('Tanggal harus diisi');
      return;
    }

    try {
      await addDailyKmEntry({
        km: kmNum,
        date: kmHistoryData.date
      });

      setError('');

      // Reset form
      setKmHistoryData({
        km: '',
        date: new Date().toISOString().split('T')[0]
      });

      // Close popup
      setIsKmHistoryPopupOpen(false);

      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Gagal menambahkan riwayat KM harian. Silakan coba lagi.');
      console.error('Error handling daily KM entry:', err);
    }
  };

  // Function to add a new motorcycle to Firebase
  const addMotorcycle = async (newMotorcycle: any) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Adding motorcycle:", newMotorcycle);
      const motorcycleData = {
        userId: user?.uid,
        name: newMotorcycle.name,
        model: newMotorcycle.model,
        year: newMotorcycle.year,
        createdAt: Timestamp.now()
      };

      console.log("Motorcycle data to be saved:", motorcycleData);
      const docRef = await addDoc(collection(db, "motorcycles"), motorcycleData);
      console.log("Motorcycle document added with ID:", docRef.id);

      // Add to local state
      const newMotorcycleWithId = {
        id: docRef.id,
        name: motorcycleData.name,
        model: motorcycleData.model,
        year: motorcycleData.year,
        createdAt: motorcycleData.createdAt.toDate().toISOString().split('T')[0]
      };
      setMotorcycles(prevMotorcycles => [newMotorcycleWithId, ...prevMotorcycles]); // Add to the beginning

      // Set this as the selected motorcycle
      setSelectedMotorcycle(docRef.id);
      setSuccessMessage('Motor berhasil ditambahkan!');

      return docRef.id;
    } catch (err) {
      console.error("Error adding motorcycle: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Function to delete a motorcycle from Firebase
  const deleteMotorcycleFromFirebase = async (motorcycleId: string) => {
    setIsSubmitting(true); // Set submitting state
    try {
      console.log("Deleting motorcycle with ID:", motorcycleId);

      // First, delete all spareparts associated with this motorcycle
      const sparepartsQuery = query(
        collection(db, "spareparts"),
        where("userId", "==", user?.uid),
        where("motorcycleId", "==", motorcycleId)
      );
      const sparepartsSnapshot = await getDocs(sparepartsQuery);

      // Delete all spareparts for this motorcycle
      const deletePromises = sparepartsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Then delete the motorcycle itself
      const motorcycleRef = doc(db, "motorcycles", motorcycleId);
      await deleteDoc(motorcycleRef);

      // Remove from local state
      setMotorcycles(prevMotorcycles => {
        const updatedMotorcycles = prevMotorcycles.filter(motorcycle => motorcycle.id !== motorcycleId);

        // If the deleted motorcycle was the selected one, select the first remaining motorcycle
        if (selectedMotorcycle === motorcycleId) {
          if (updatedMotorcycles.length > 0) {
            setSelectedMotorcycle(updatedMotorcycles[0].id);
          } else {
            setSelectedMotorcycle('');
            setSpareparts([]); // Clear spareparts when no motorcycle is selected
          }
        }

        return updatedMotorcycles;
      });

      setSuccessMessage('Motor berhasil dihapus!');
      console.log("Motorcycle and associated spareparts deleted from state");

      // Refresh spareparts to trigger filtering
      if (selectedMotorcycle !== motorcycleId) {
        await fetchSpareparts();
      }
    } catch (err) {
      console.error("Error deleting motorcycle: ", err);
      throw err;
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const handleMotorcycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!motorcycleData.name.trim()) {
      setError('Nama motor wajib diisi');
      return;
    }

    if (!motorcycleData.model.trim()) {
      setError('Model motor wajib diisi');
      return;
    }

    if (!motorcycleData.year.trim()) {
      setError('Tahun motor wajib diisi');
      return;
    }

    setIsSubmitting(true); // Set submitting state
    try {
      await addMotorcycle({
        name: motorcycleData.name,
        model: motorcycleData.model,
        year: motorcycleData.year
      });

      setError('');

      // Reset form
      setMotorcycleData({
        name: '',
        model: '',
        year: ''
      });

      // Close popup
      setIsMotorcyclePopupOpen(false);

      // Clear success message after delay
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Gagal menambahkan motor. Silakan coba lagi.');
      console.error('Error handling motorcycle:', err);
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  // Function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-redbull-dark to-redbull-darker text-white flex flex-col">
      <header className="bg-redbull-darker/80 backdrop-blur-sm border-b border-redbull-red/30 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-redbull-red p-2 rounded-full">
              <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center">
                <span className="text-redbull-dark font-bold text-sm">M</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Motoring</h1>
              <p className="text-redbull-light/80 text-xs">Spareparts Management</p>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            {/* Motorcycle Selection and Actions */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <select
                  value={selectedMotorcycle}
                  onChange={(e) => setSelectedMotorcycle(e.target.value)}
                  className="bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-redbull-red w-full"
                >
                  <option value="">Pilih Motor</option>
                  {motorcycles.map(motorcycle => (
                    <option key={motorcycle.id} value={motorcycle.id}>
                      {motorcycle.name} ({motorcycle.model} {motorcycle.year})
                    </option>
                  ))}
                </select>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsMotorcyclePopupOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg transition duration-300 whitespace-nowrap flex-1 sm:flex-none"
                  >
                    Tambah
                  </button>

                  {motorcycles.length > 0 && (
                    <button
                      onClick={async () => {
                        if (selectedMotorcycle) {
                          if (confirm('Apakah Anda yakin ingin menghapus motor ini? Semua data sparepart terkait juga akan dihapus.')) {
                            await deleteMotorcycleFromFirebase(selectedMotorcycle);
                          }
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-lg transition duration-300 whitespace-nowrap flex-1 sm:flex-none"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (!selectedMotorcycle) {
                    setError('Pilih motor terlebih dahulu sebelum menambah sparepart');
                    return;
                  }
                  setIsPopupOpen(true);
                }}
                disabled={isSubmitting || !selectedMotorcycle}
                className={`${
                  !selectedMotorcycle
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-redbull-red hover:bg-redbull-lighter'
                } text-white font-bold py-2 px-4 rounded-lg transition duration-300 w-full text-center`}
              >
                {isSubmitting && editingSparepartId ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">🔄</span> Memperbarui...
                  </span>
                ) : isSubmitting && !editingSparepartId ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">🔄</span> Menyimpan...
                  </span>
                ) : (
                  'Tambah Sparepart'
                )}
              </button>
            </div>

            {/* Current KM Input */}
            <div className="mt-2 flex flex-wrap gap-2 w-full">
              <input
                type="number"
                value={currentKm}
                onChange={(e) => {
                  setCurrentKm(e.target.value);
                  setHasUserSetCurrentKm(true); // Mark that user has manually set the value
                }}
                placeholder="KM saat ini"
                className="flex-1 min-w-[120px] bg-redbull-darker/50 border border-redbull-light/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-redbull-red"
              />
              <button
                onClick={async () => {
                  if (currentKm) {
                    // Update sparepart data
                    setSparepartData({...sparepartData, currentKm: currentKm});
                    setHasUserSetCurrentKm(true); // Mark that user has manually set the value

                    // Save to daily KM history for today's date
                    try {
                      const todayDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

                      await addDailyKmEntry({
                        km: currentKm,
                        date: todayDate
                      });

                      setSuccessMessage('KM saat ini berhasil disimpan ke riwayat!');

                      // Clear success message after delay
                      setTimeout(() => {
                        setSuccessMessage('');
                      }, 3000);
                    } catch (err) {
                      setError('Gagal menyimpan ke riwayat KM harian.');
                      console.error('Error saving current KM to history:', err);
                    }
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded-lg transition duration-300 whitespace-nowrap"
              >
                Simpan
              </button>
              <button
                onClick={() => setIsKmHistoryPopupOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-3 rounded-lg transition duration-300 whitespace-nowrap"
              >
                Riwayat
              </button>
            </div>

            {/* Current KM Display */}
            {currentKm && (
              <div className="mt-2 text-center text-sm text-redbull-light">
                <p>KM saat ini: <span className="text-white font-medium">{currentKm}</span> KM</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-4 text-center flex-grow pb-20">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-redbull-red/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white text-left w-full">
              Daftar Spareparts untuk <span className="text-redbull-red">{(() => {
                const selectedMotor = motorcycles.find(m => m.id === selectedMotorcycle);
                return selectedMotor ? `${selectedMotor.name} (${selectedMotor.model} ${selectedMotor.year})` : 'Motor Terpilih';
              })()}</span>
            </h2>
          </div>

          {isFetching && spareparts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-redbull-red mx-auto"></div>
              <p className="text-redbull-light mt-4">Memuat data spareparts...</p>
            </div>
          ) : spareparts.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-redbull-darker/50 p-6 rounded-lg border border-redbull-red/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-redbull-light mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-redbull-light text-lg">Belum ada sparepart</p>
                <p className="text-redbull-light/70 text-sm mt-2">Tambah sparepart pertama Anda dengan klik tombol di atas</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Mobile view - Card layout */}
              <div className="space-y-3 sm:hidden">
                {spareparts.map((sparepart) => (
                  <div key={sparepart.id} className="bg-redbull-darker/30 p-4 rounded-lg border border-redbull-red/20 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-base">{sparepart.name}</h4>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => openEditForm(sparepart)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-2.5 rounded transition duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Apakah Anda yakin ingin menghapus sparepart ini?')) {
                              await deleteSparepartFromFirebase(sparepart.id);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-2.5 rounded transition duration-200"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="bg-redbull-darker/40 p-2 rounded">
                        <p className="text-xs text-redbull-light">Jumlah</p>
                        <p className="text-sm font-medium text-white">{sparepart.quantity}</p>
                      </div>
                      <div className="bg-redbull-darker/40 p-2 rounded">
                        <p className="text-xs text-redbull-light">Harga</p>
                        <p className="text-sm font-medium text-white">Rp {sparepart.price.toLocaleString()}</p>
                      </div>
                      <div className="bg-green-900/30 p-2 rounded col-span-2">
                        <p className="text-xs text-redbull-light">Total</p>
                        <p className="text-sm font-bold text-green-400">Rp {sparepart.total.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-redbull-darker/40 p-2 rounded">
                        <p className="text-xs text-redbull-light">KM Saat Ini</p>
                        <p className="text-sm font-medium text-white">{sparepart.currentKm}</p>
                      </div>
                      <div className="bg-redbull-darker/40 p-2 rounded">
                        <p className="text-xs text-redbull-light">KM Berikutnya</p>
                        <p className="text-sm font-medium text-white">{sparepart.nextKm}</p>
                      </div>
                    </div>

                    {/* Check if this sparepart is approaching replacement */}
                    {(currentKm || sparepartData.currentKm) && sparepart.nextKm && sparepart.nextKm > 0 && (() => {
                      const currentKmValue = parseFloat(currentKm || sparepartData.currentKm);
                      const kmDifference = sparepart.nextKm - currentKmValue;
                      const thresholdKm = 1000; // Consider spareparts within 1000km as approaching replacement

                      if (!isNaN(currentKmValue) && kmDifference <= thresholdKm && kmDifference >= 0) {
                        return (
                          <div className="mt-2 p-2 bg-yellow-900/30 rounded border border-yellow-600/30">
                            <p className="text-sm text-yellow-300">Sisa: <span className="font-medium">{kmDifference}</span> KM</p>
                          </div>
                        );
                      } else if (!isNaN(currentKmValue) && kmDifference < 0) {
                        return (
                          <div className="mt-2 p-2 bg-red-900/30 rounded border border-red-600/30">
                            <p className="text-sm text-red-300">Melebihi: <span className="font-medium">{Math.abs(kmDifference)}</span> KM</p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="mt-2 space-y-1">
                      {sparepart.date && (
                        <div className="bg-redbull-darker/40 p-2 rounded">
                          <p className="text-xs text-redbull-light">Tanggal</p>
                          <p className="text-sm text-white">{new Date(sparepart.date).toLocaleDateString('id-ID')}</p>
                        </div>
                      )}
                      {sparepart.note && (
                        <div className="bg-redbull-darker/40 p-2 rounded">
                          <p className="text-xs text-redbull-light">Catatan</p>
                          <p className="text-sm text-white">{sparepart.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop view - Table */}
              <div className="overflow-x-auto rounded-lg hidden sm:block">
                <table className="min-w-full divide-y divide-redbull-red/30">
                  <thead className="bg-redbull-darker/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Nama</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Jumlah</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Harga</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">KM Saat Ini</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">KM Berikutnya</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Catatan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-redbull-light uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-redbull-red/20">
                    {spareparts.map((sparepart) => (
                      <tr key={sparepart.id} className="hover:bg-white/5 transition-colors duration-200">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium">{sparepart.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{sparepart.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-white">Rp {sparepart.price.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-green-400 font-bold">Rp {sparepart.total.toLocaleString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{sparepart.currentKm}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div>
                            <span className="text-white">{sparepart.nextKm}</span>
                            {/* Check if this sparepart is approaching replacement */}
                            {(currentKm || sparepartData.currentKm) && sparepart.nextKm && sparepart.nextKm > 0 && (() => {
                              const currentKmValue = parseFloat(currentKm || sparepartData.currentKm);
                              const kmDifference = sparepart.nextKm - currentKmValue;
                              const thresholdKm = 1000; // Consider spareparts within 1000km as approaching replacement

                              if (!isNaN(currentKmValue) && kmDifference <= thresholdKm && kmDifference >= 0) {
                                return (
                                  <div className="mt-1 text-xs bg-yellow-900/30 px-2 py-1 rounded">
                                    <span className="text-yellow-300">Sisa: {kmDifference} KM</span>
                                  </div>
                                );
                              } else if (!isNaN(currentKmValue) && kmDifference < 0) {
                                return (
                                  <div className="mt-1 text-xs bg-red-900/30 px-2 py-1 rounded">
                                    <span className="text-red-300">Melebihi: {Math.abs(kmDifference)} KM</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{sparepart.date ? new Date(sparepart.date).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="px-4 py-3 text-sm text-white max-w-xs truncate">{sparepart.note || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditForm(sparepart)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-2.5 rounded transition duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Apakah Anda yakin ingin menghapus sparepart ini?')) {
                                  await deleteSparepartFromFirebase(sparepart.id);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-2.5 rounded transition duration-200"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Display latest KM history */}
          {!isFetching && dailyKmHistory.length > 0 && (
            <div className="mt-8 bg-purple-900/20 p-3 rounded-lg border border-purple-600/30 text-purple-200 text-sm">
              <p>KM terakhir: <span className="text-white font-medium">{dailyKmHistory[0].km} KM</span> pada tanggal <span className="text-white font-medium">{dailyKmHistory[0].date}</span> {dailyKmHistory[0].time && <span className="text-white font-medium">pukul {dailyKmHistory[0].time}</span>}</p>
            </div>
          )}

          {/* Summary Section */}
          {spareparts.length > 0 && !isFetching && (
            <div className="mt-8">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Ringkasan Spareparts</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-redbull-darker/50 to-redbull-dark/30 p-5 rounded-xl border border-redbull-red/30 shadow-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-redbull-red/20 p-3 rounded-xl mb-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-redbull-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-redbull-light/80 text-sm uppercase tracking-wide font-medium">Total Item</p>
                      <p className="text-2xl font-bold text-white">{spareparts.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-redbull-darker/50 to-redbull-dark/30 p-5 rounded-xl border border-redbull-red/30 shadow-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-redbull-red/20 p-3 rounded-xl mb-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-redbull-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-redbull-light/80 text-sm uppercase tracking-wide font-medium">Total Kuantitas</p>
                      <p className="text-2xl font-bold text-white">
                        {spareparts.reduce((sum, part) => sum + part.quantity, 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-redbull-darker/50 to-redbull-dark/30 p-5 rounded-xl border border-redbull-red/30 shadow-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-redbull-red/20 p-3 rounded-xl mb-3 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-redbull-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-redbull-light/80 text-sm uppercase tracking-wide font-medium">Total Nilai</p>
                      <p className="text-2xl font-bold text-green-400">
                        Rp {spareparts.reduce((sum, part) => sum + part.total, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sparepart Form Popup */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-redbull-darker rounded-xl p-6 w-full max-w-md border border-redbull-red/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-redbull-red">{editingSparepartId ? 'Edit Sparepart' : 'Sparepart Baru'}</h3>
              <button
                onClick={() => {
                  setIsPopupOpen(false);
                  setEditingSparepartId(null); // Reset editing state when closing
                }}
                className="text-white hover:text-redbull-red text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedMotorcycle && (
                <div className="bg-blue-600/20 p-3 rounded-lg border border-blue-500/30">
                  <p className="text-blue-200 text-sm">
                    <span className="font-medium">Motor Terpilih:</span>
                    {(() => {
                      const selectedMotor = motorcycles.find(m => m.id === selectedMotorcycle);
                      return selectedMotor ? `${selectedMotor.name} (${selectedMotor.model} ${selectedMotor.year})` : 'Motor tidak ditemukan';
                    })()}
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-redbull-light mb-1">Nama Sparepart</label>
                <input
                  type="text"
                  id="name"
                  value={sparepartData.name}
                  onChange={(e) => setSparepartData({...sparepartData, name: e.target.value})}
                  className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Masukkan nama sparepart"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quantity" className="block text-redbull-light mb-1">Jumlah</label>
                  <input
                    type="number"
                    id="quantity"
                    value={sparepartData.quantity}
                    onChange={(e) => setSparepartData({...sparepartData, quantity: e.target.value})}
                    className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                    placeholder="Masukkan jumlah"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-redbull-light mb-1">Harga (per unit)</label>
                  <input
                    type="number"
                    id="price"
                    value={sparepartData.price}
                    onChange={(e) => setSparepartData({...sparepartData, price: e.target.value})}
                    className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                    placeholder="Masukkan harga per unit"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="currentKm" className="block text-redbull-light mb-1">KM Saat Ini</label>
                  <input
                    type="number"
                    id="currentKm"
                    value={sparepartData.currentKm}
                    onChange={(e) => setSparepartData({...sparepartData, currentKm: e.target.value})}
                    className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                    placeholder="Masukkan KM saat ini"
                    min="0"
                  />
                </div>

                <div>
                  <label htmlFor="nextKm" className="block text-redbull-light mb-1">KM Penggantian Berikutnya</label>
                  <input
                    type="number"
                    id="nextKm"
                    value={sparepartData.nextKm}
                    onChange={(e) => setSparepartData({...sparepartData, nextKm: e.target.value})}
                    className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                    placeholder="Masukkan KM penggantian berikutnya"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="date" className="block text-redbull-light mb-1">Tanggal</label>
                <input
                  type="date"
                  id="date"
                  value={sparepartData.date}
                  onChange={(e) => setSparepartData({...sparepartData, date: e.target.value})}
                  className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                />
              </div>

              <div>
                <label htmlFor="note" className="block text-redbull-light mb-1">Catatan</label>
                <textarea
                  id="note"
                  value={sparepartData.note}
                  onChange={(e) => setSparepartData({...sparepartData, note: e.target.value})}
                  className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Catatan tambahan"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="total" className="block text-redbull-light mb-1">Total</label>
                <input
                  type="number"
                  id="total"
                  value={sparepartData.quantity && sparepartData.price ? (parseFloat(sparepartData.quantity) * parseFloat(sparepartData.price)).toString() : ''}
                  readOnly
                  className="w-full px-3 py-3 bg-redbull-darker/30 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none"
                />
                <p className="text-redbull-light/70 text-xs mt-1">Total dihitung otomatis (Jumlah x Harga)</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPopupOpen(false);
                    setEditingSparepartId(null); // Reset editing state
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">🔄</span> {editingSparepartId ? 'Memperbarui...' : 'Menyimpan...'}
                    </>
                  ) : (
                    editingSparepartId ? 'Perbarui' : 'Simpan'
                  )}
                </button>
              </div>
            </form>

            {successMessage && (
              <div className="mt-4 p-3 bg-green-500/20 text-green-200 rounded-lg">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 text-red-200 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Motorcycle Form Popup */}
      {isMotorcyclePopupOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-redbull-darker rounded-xl p-6 w-full max-w-md border border-redbull-red/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-redbull-red">Motor Baru</h3>
              <button
                onClick={() => {
                  setIsMotorcyclePopupOpen(false);
                }}
                className="text-white hover:text-redbull-red text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleMotorcycleSubmit} className="space-y-4">
              <div>
                <label htmlFor="motorcycleName" className="block text-redbull-light mb-1">Nama Motor</label>
                <input
                  type="text"
                  id="motorcycleName"
                  value={motorcycleData.name}
                  onChange={(e) => setMotorcycleData({...motorcycleData, name: e.target.value})}
                  className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Masukkan nama motor"
                  required
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-redbull-light mb-1">Model</label>
                <input
                  type="text"
                  id="model"
                  value={motorcycleData.model}
                  onChange={(e) => setMotorcycleData({...motorcycleData, model: e.target.value})}
                  className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Masukkan model motor"
                  required
                />
              </div>

              <div>
                <label htmlFor="year" className="block text-redbull-light mb-1">Tahun</label>
                <input
                  type="text"
                  id="year"
                  value={motorcycleData.year}
                  onChange={(e) => setMotorcycleData({...motorcycleData, year: e.target.value})}
                  className="w-full px-3 py-3 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                  placeholder="Masukkan tahun motor"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMotorcyclePopupOpen(false);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">🔄</span> Menyimpan...
                    </>
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>

            {successMessage && (
              <div className="mt-4 p-3 bg-green-500/20 text-green-200 rounded-lg">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 text-red-200 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily KM History Popup */}
      {isKmHistoryPopupOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-redbull-darker rounded-xl p-6 w-full max-w-md border border-redbull-red/30 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-purple-400">Riwayat KM Harian</h3>
              <button
                onClick={() => {
                  setIsKmHistoryPopupOpen(false);
                }}
                className="text-white hover:text-redbull-red text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Add Daily KM Entry Form */}
            <div className="mb-6 p-4 bg-redbull-darker/50 rounded-lg border border-redbull-red/20">
              <h4 className="font-bold text-white mb-3">Tambah Riwayat KM</h4>
              <form onSubmit={handleKmHistorySubmit} className="space-y-4">
                <div>
                  <label htmlFor="km" className="block text-redbull-light mb-1">KM</label>
                  <input
                    type="number"
                    id="km"
                    value={kmHistoryData.km}
                    onChange={(e) => setKmHistoryData({...kmHistoryData, km: e.target.value})}
                    className="w-full px-3 py-2 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                    placeholder="Masukkan KM"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="date" className="block text-redbull-light mb-1">Tanggal</label>
                  <input
                    type="date"
                    id="date"
                    value={kmHistoryData.date}
                    onChange={(e) => setKmHistoryData({...kmHistoryData, date: e.target.value})}
                    className="w-full px-3 py-2 bg-redbull-darker/50 border border-redbull-light/20 rounded-lg text-white placeholder-redbull-light/50 focus:outline-none focus:ring-1 focus:ring-redbull-red"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsKmHistoryPopupOpen(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">🔄</span> Menyimpan...
                      </>
                    ) : (
                      'Simpan'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Daily KM History List */}
            <div>
              <h4 className="font-bold text-white mb-3">Riwayat Sebelumnya</h4>
              {dailyKmHistory.length === 0 ? (
                <div className="text-center py-4 text-redbull-light">
                  Belum ada riwayat KM harian
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {dailyKmHistory.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex justify-between items-center bg-redbull-darker/30 p-3 rounded-lg border border-redbull-red/20"
                    >
                      <div>
                        <p className="font-medium text-white">{entry.km} KM</p>
                        <p className="text-xs text-redbull-light">{entry.date} {entry.time ? `| ${entry.time}` : ''}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Apakah Anda yakin ingin menghapus entri ini?')) {
                            await deleteDailyKmEntry(entry.id);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded transition duration-200"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {successMessage && (
              <div className="mt-4 p-3 bg-green-500/20 text-green-200 rounded-lg">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 text-red-200 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}