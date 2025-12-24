'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalFuelCosts: 0,
    totalSparepartCosts: 0,
    totalDistance: 0,
    totalOrders: 0,
    totalFuelStops: 0,
    avgFuelPrice: 0,
    workingDaysInPeriod: 0,
    pastWorkingDaysInPeriod: 0,
    monthlyTrends: [] as any[],
    netIncomePerMonth: {} as Record<string, number>,
    netIncomePerPeriod: {} as Record<string, number>,
    lastUpdate: new Date()
  });
  const [dailyKmHistory, setDailyKmHistory] = useState<any[]>([]);
  const [spareparts, setSpareparts] = useState<any[]>([]);
  const [fuelStops, setFuelStops] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [motorcycles, setMotorcycles] = useState<any[]>([]);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Function to get current period based on current date
  const getCurrentPeriod = () => {
    const now = new Date();
    const day = now.getDate();
    return day <= 15 ? '1-15' : '16-31';
  };

  const [periodFilter, setPeriodFilter] = useState<'all' | '1-15' | '16-31'>(getCurrentPeriod());
  const router = useRouter();
  const { user, isLoading: authIsLoading, logout } = useAuth();

  // Fungsi untuk mendapatkan bulan saat ini dalam format YYYY-MM
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Fungsi untuk menghitung hari kerja dalam rentang tanggal tertentu
  const getWorkingDaysInRange = (startDate: Date, endDate: Date) => {
    let workingDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // In Indonesia, Saturday (6) and Sunday (0) are weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  };

  // Fungsi untuk mendapatkan jumlah hari kerja berdasarkan filter
  const getFilteredWorkingDays = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    // If a specific month is selected, use that month
    if (monthFilter !== 'all') {
      const [selectedYear, selectedMonth] = monthFilter.split('-').map(Number);
      year = selectedYear;
      month = selectedMonth;
    }

    // Determine start and end dates based on period filter
    let startDate: Date, endDate: Date;

    if (periodFilter === 'all') {
      // Full month
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // Last day of the month
    } else if (periodFilter === '1-15') {
      // 1st to 15th
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month - 1, 15);
    } else if (periodFilter === '16-31') {
      // 16th to end of month
      startDate = new Date(year, month - 1, 16);
      endDate = new Date(year, month, 0); // Last day of the month
    } else {
      // Default to full month
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    }

    return getWorkingDaysInRange(startDate, endDate);
  };

  // Fungsi untuk mendapatkan jumlah hari kerja yang telah berlalu dalam rentang filter
  const getPastFilteredWorkingDays = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    // If a specific month is selected, use that month
    if (monthFilter !== 'all') {
      const [selectedYear, selectedMonth] = monthFilter.split('-').map(Number);
      year = selectedYear;
      month = selectedMonth;
    }

    // Determine start date based on period filter
    let startDate: Date;
    const currentDate = new Date(year, month - 1, now.getDate()); // Current date in the selected month

    if (periodFilter === 'all') {
      // From 1st of month to today
      startDate = new Date(year, month - 1, 1);
    } else if (periodFilter === '1-15') {
      // From 1st to today (but only if today is in the first half)
      startDate = new Date(year, month - 1, 1);
      // If current day is after 15th, we only count up to 15th
      if (now.getDate() > 15) {
        currentDate.setDate(15);
      }
    } else if (periodFilter === '16-31') {
      // From 16th to today (but only if today is in the second half)
      startDate = new Date(year, month - 1, 16);
      // If current day is before 16th, don't count anything
      if (now.getDate() < 16) {
        return 0;
      }
    } else {
      // Default to full month
      startDate = new Date(year, month - 1, 1);
    }

    // Ensure we don't go beyond the end of the period
    const endDate = new Date(startDate);
    if (periodFilter === '1-15') {
      endDate.setDate(15);
    } else if (periodFilter === '16-31') {
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      endDate.setDate(Math.min(lastDayOfMonth, now.getDate()));
    }

    // If start date is after current date (e.g. period is 16-31 but today is before 16th), return 0
    if (startDate > currentDate) {
      return 0;
    }

    return getWorkingDaysInRange(startDate, new Date(Math.min(currentDate.getTime(), endDate.getTime())));
  };

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.push('/login');
      } else {
        setIsLoading(false);
        fetchAllData();
      }
    }
  }, [user, authIsLoading, router]);

  useEffect(() => {
    if (!authIsLoading && user) {
      fetchAllData();
    }
  }, [selectedMotorcycle, monthFilter, periodFilter, user, authIsLoading]);

  // ==================================================
  // HELPER FUNCTIONS
  // ==================================================

  // Function to get unique months from orders
  const getAvailableMonths = (data: any[]) => {
    if (!data || data.length === 0) return [];

    const monthsSet = new Set<string>();
    data.forEach(item => {
      const dateStr = item.tanggal || item.date || (item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
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

  // Function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // ==================================================
  // DATA FETCHING FUNCTIONS
  // ==================================================

  // Fetch all data for reports
  const fetchAllData = async () => {
    if (user) {
      try {
        // Fetch all necessary data in parallel
        const [kmHistoryPromise, sparepartsPromise, fuelStopsPromise, ordersPromise, motorcyclesPromise] = [
          fetchDailyKmHistory(),
          fetchSpareparts(),
          fetchFuelStops(),
          fetchOrders(),
          fetchMotorcycles()
        ];

        const [kmHistory, sparepartsData, fuelStopsData, ordersData, motorcyclesData] = await Promise.all([
          kmHistoryPromise,
          sparepartsPromise,
          fuelStopsPromise,
          ordersPromise,
          motorcyclesPromise
        ]);

        // Calculate reports
        calculateReports(kmHistory, sparepartsData, fuelStopsData, ordersData, motorcyclesData);
      } catch (err) {
        console.error("Error fetching data for reports:", err);
      }
    }
  };

  // Fetch daily KM history
  const fetchDailyKmHistory = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "dailyKmHistory"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const history = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            km: data.km || 0,
            date: data.date || '',
            motorcycleId: data.motorcycleId || '',
            tanggal: data.date || data.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0], // Consistent date field
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          };
        });

        setDailyKmHistory(history);
        return history;
      } catch (err) {
        console.error("Error fetching daily KM history: ", err);
        return [];
      }
    }
    return [];
  };

  // Fetch spareparts data
  const fetchSpareparts = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "spareparts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const spareparts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            price: data.price || 0,
            quantity: data.quantity || 0,
            total: data.total || 0,
            motorcycleId: data.motorcycleId || '',
            tanggal: data.date || data.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0], // Consistent date field
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          };
        });

        setSpareparts(spareparts);
        return spareparts;
      } catch (err) {
        console.error("Error fetching spareparts: ", err);
        return [];
      }
    }
    return [];
  };

  // Fetch fuel stops data
  const fetchFuelStops = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "fuelStops"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const fuelStops = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            date: data.date || '',
            price: data.price || 0,
            liters: data.liters || 0,
            total: data.total || 0,
            motorcycleId: data.motorcycleId || null,
            tanggal: data.date || data.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0], // Consistent date field
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          };
        });

        setFuelStops(fuelStops);
        return fuelStops;
      } catch (err) {
        console.error("Error fetching fuel stops: ", err);
        return [];
      }
    }
    return [];
  };

  // Fetch orders data
  const fetchOrders = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const orders = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            price: data.price || 0,
            quantity: data.quantity || 0,
            total: data.total || 0,
            motorcycleId: data.motorcycleId || '',
            tanggal: data.tanggal || data.date || data.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0], // Consistent date field
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          };
        });

        setOrders(orders);
        return orders;
      } catch (err) {
        console.error("Error fetching orders: ", err);
        return [];
      }
    }
    return [];
  };

  // Fetch motorcycles data
  const fetchMotorcycles = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, "motorcycles"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const motorcycles = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            model: data.model || '',
            year: data.year || '',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
          };
        });

        setMotorcycles(motorcycles);
        return motorcycles;
      } catch (err) {
        console.error("Error fetching motorcycles: ", err);
        return [];
      }
    }
    return [];
  };

  // Calculate reports from all data
  const calculateReports = (kmHistory: any[], sparepartsData: any[], fuelStopsData: any[], ordersData: any[], motorcyclesData: any[]) => {
    // Filter data based on selected period only for orders (income)
    const filteredOrders = filterDataByPeriodOnly(ordersData); // Orders are not filtered by motorcycle

    // Filter data based on selected motorcycle and period for expenses
    const filteredSpareparts = filterDataByMotorcycleAndPeriod(sparepartsData, 'motorcycleId');
    const filteredFuelStops = filterDataByMotorcycleAndPeriod(fuelStopsData, 'motorcycleId');
    const filteredKmHistory = filterDataByMotorcycleAndPeriod(kmHistory, 'motorcycleId');

    // Calculate total income from orders (not affected by motorcycle filter)
    const totalIncome = filteredOrders.reduce((sum, order) => sum + order.total, 0);

    // Calculate total expenses from spareparts and fuel (affected by motorcycle filter)
    const totalSparepartCosts = filteredSpareparts.reduce((sum, sparepart) => sum + sparepart.total, 0);
    const totalFuelCosts = filteredFuelStops.reduce((sum, fuelStop) => sum + fuelStop.total, 0);
    const totalExpenses = totalSparepartCosts + totalFuelCosts;

    // Calculate total distance traveled (affected by motorcycle filter)
    let totalDistance = 0;
    if (filteredKmHistory.length > 0) {
      // Group by motorcycleId to calculate distance separately for each motorcycle
      const kmByMotorcycle: Record<string, any[]> = {};

      for (const entry of filteredKmHistory) {
        const motorcycleId = entry.motorcycleId || 'unknown';
        if (!kmByMotorcycle[motorcycleId]) {
          kmByMotorcycle[motorcycleId] = [];
        }
        kmByMotorcycle[motorcycleId].push(entry);
      }

      // Calculate distance for each motorcycle separately
      for (const motorcycleId in kmByMotorcycle) {
        const motorcycleKmHistory = kmByMotorcycle[motorcycleId];
        // Sort by date to calculate distance traveled chronologically for this motorcycle
        const sortedKm = [...motorcycleKmHistory].sort((a, b) => {
          // Use both date and createdAt if date is not available
          const dateA = a.tanggal ? new Date(a.tanggal).getTime() :
                       (a.date ? new Date(a.date).getTime() :
                       (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          const dateB = b.tanggal ? new Date(b.tanggal).getTime() :
                       (b.date ? new Date(b.date).getTime() :
                       (b.createdAt ? new Date(b.createdAt).getTime() : 0));
          return dateA - dateB;
        });

        // Calculate distance by summing up the differences between consecutive valid readings
        for (let i = 1; i < sortedKm.length; i++) {
          const prevKm = sortedKm[i-1].km;
          const currentKm = sortedKm[i].km;

          // Only add distance if KM is not going backwards (valid readings)
          if (currentKm >= prevKm) {
            totalDistance += currentKm - prevKm;
          }
        }
      }
    }

    // Calculate average fuel price (affected by motorcycle filter)
    let avgFuelPrice = 0;
    if (filteredFuelStops.length > 0) {
      const totalFuelPrice = filteredFuelStops.reduce((sum, fuelStop) => sum + fuelStop.price, 0);
      avgFuelPrice = totalFuelPrice / filteredFuelStops.length;
    }

    // Calculate monthly trends
    const monthlyTrends = calculateMonthlyTrends(filteredOrders, filteredSpareparts, filteredFuelStops);

    // Calculate complete net income data (ignoring filters)
    const completeNetIncome = calculateCompleteNetIncome();

    // Calculate net income per period (current period only, based on filters)
    const netIncomePerPeriod: Record<string, number> = {};
    const currentPeriodKey = `${getCurrentMonth()}-${periodFilter}`;
    netIncomePerPeriod[currentPeriodKey] = totalIncome - totalExpenses;

    // Set the calculated reports
    setReports({
      totalIncome,
      totalExpenses,
      totalFuelCosts,
      totalSparepartCosts,
      totalDistance,
      totalOrders: filteredOrders.length,
      totalFuelStops: filteredFuelStops.length,
      avgFuelPrice,
      workingDaysInPeriod: getFilteredWorkingDays(),
      pastWorkingDaysInPeriod: getPastFilteredWorkingDays(),
      monthlyTrends,
      netIncomePerMonth: completeNetIncome, // Use complete data regardless of filters
      netIncomePerPeriod,
      lastUpdate: new Date()
    });
  };

  // Function to calculate monthly trends for charts
  const calculateMonthlyTrends = (ordersData: any[], sparepartsData: any[], fuelStopsData: any[]) => {
    // Group data by month
    const orderTrends: Record<string, number> = {};
    const expenseTrends: Record<string, number> = {};

    // Calculate monthly income
    ordersData.forEach(order => {
      const dateStr = order.tanggal || order.date || (order.createdAt && typeof order.createdAt.toDate === 'function' ? order.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      orderTrends[monthYear] = (orderTrends[monthYear] || 0) + order.total;
    });

    // Calculate monthly expenses (spareparts + fuel)
    sparepartsData.forEach(sparepart => {
      const dateStr = sparepart.tanggal || sparepart.date || (sparepart.createdAt && typeof sparepart.createdAt.toDate === 'function' ? sparepart.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      expenseTrends[monthYear] = (expenseTrends[monthYear] || 0) + sparepart.total;
    });

    fuelStopsData.forEach(fuelStop => {
      const dateStr = fuelStop.tanggal || fuelStop.date || (fuelStop.createdAt && typeof fuelStop.createdAt.toDate === 'function' ? fuelStop.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      expenseTrends[monthYear] = (expenseTrends[monthYear] || 0) + fuelStop.total;
    });

    // Get the last 6 months for display
    const now = new Date();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      last6Months.push({
        month: month.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        income: orderTrends[monthKey] || 0,
        expenses: expenseTrends[monthKey] || 0,
        profit: (orderTrends[monthKey] || 0) - (expenseTrends[monthKey] || 0)
      });
    }

    return last6Months;
  };

  // Calculate complete net income data (ignoring filters)
  const calculateCompleteNetIncome = () => {
    // Group all orders by month
    const orderTrends: Record<string, number> = {};
    orders.forEach(order => {
      const dateStr = order.tanggal || order.date || (order.createdAt && typeof order.createdAt.toDate === 'function' ? order.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      orderTrends[monthYear] = (orderTrends[monthYear] || 0) + order.total;
    });

    // Group all expenses (spareparts + fuel) by month
    const expenseTrends: Record<string, number> = {};

    spareparts.forEach(sparepart => {
      const dateStr = sparepart.tanggal || sparepart.date || (sparepart.createdAt && typeof sparepart.createdAt.toDate === 'function' ? sparepart.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      expenseTrends[monthYear] = (expenseTrends[monthYear] || 0) + sparepart.total;
    });

    fuelStops.forEach(fuelStop => {
      const dateStr = fuelStop.tanggal || fuelStop.date || (fuelStop.createdAt && typeof fuelStop.createdAt.toDate === 'function' ? fuelStop.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const date = new Date(dateStr);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      expenseTrends[monthYear] = (expenseTrends[monthYear] || 0) + fuelStop.total;
    });

    // Combine into net income data
    const allMonths = new Set([...Object.keys(orderTrends), ...Object.keys(expenseTrends)]);
    const completeNetIncome: Record<string, number> = {};

    allMonths.forEach(month => {
      const income = orderTrends[month] || 0;
      const expenses = expenseTrends[month] || 0;
      completeNetIncome[month] = income - expenses;
    });

    return completeNetIncome;
  };


  // ==================================================
  // FILTERING FUNCTIONS
  // ==================================================

  // Filter data by motorcycle and period (for expenses)
  const filterDataByMotorcycleAndPeriod = (data: any[], motorcycleField: string) => {
    let filtered = [...data];

    // Filter by motorcycle if not 'all'
    if (selectedMotorcycle !== 'all') {
      filtered = filtered.filter(item => {
        const itemMotorcycleId = item[motorcycleField];
        // If the item has a motorcycleId, match it against selected motorcycle
        // If the item doesn't have a motorcycleId (empty/null/undefined),
        // it might be legacy data that should be included with a specific motorcycle
        // For now, only include items that explicitly match the selected motorcycle
        return itemMotorcycleId === selectedMotorcycle;
      });
    }

    // Filter by month if not 'all'
    if (monthFilter !== 'all') {
      filtered = filtered.filter(item => {
        const dateStr = item.tanggal || item.date || (item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const date = new Date(dateStr);
        const itemMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return itemMonth === monthFilter;
      });
    }

    // Apply period filter (1-15 or 16-31)
    if (periodFilter === '1-15') {
      filtered = filtered.filter(item => {
        const dateStr = item.tanggal || item.date || (item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const date = new Date(dateStr);
        return date.getDate() >= 1 && date.getDate() <= 15;
      });
    } else if (periodFilter === '16-31') {
      filtered = filtered.filter(item => {
        const dateStr = item.tanggal || item.date || (item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const date = new Date(dateStr);
        return date.getDate() >= 16 && date.getDate() <= 31;
      });
    }

    return filtered;
  };

  // Filter data by period only (for income - orders)
  const filterDataByPeriodOnly = (data: any[]) => {
    let filtered = [...data];

    // Filter by month if not 'all'
    if (monthFilter !== 'all') {
      filtered = filtered.filter(item => {
        const dateStr = item.tanggal || item.date || (item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const date = new Date(dateStr);
        const itemMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return itemMonth === monthFilter;
      });
    }

    // Apply period filter (1-15 or 16-31)
    if (periodFilter === '1-15') {
      filtered = filtered.filter(item => {
        const dateStr = item.tanggal || item.date || (item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const date = new Date(dateStr);
        return date.getDate() >= 1 && date.getDate() <= 15;
      });
    } else if (periodFilter === '16-31') {
      filtered = filtered.filter(item => {
        const dateStr = item.tanggal || item.date || (item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const date = new Date(dateStr);
        return date.getDate() >= 16 && date.getDate() <= 31;
      });
    }

    return filtered;
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
              <p className="text-redbull-light/80 text-xs">Dashboard</p>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-3xl font-bold text-redbull-red">Dashboard</h2>
          </div>

          {/* Filter Controls */}
          <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="min-w-0">
                <label className="block text-left text-redbull-light mb-2 text-sm font-medium">Motor</label>
                <select
                  value={selectedMotorcycle}
                  onChange={(e) => setSelectedMotorcycle(e.target.value)}
                  className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white text-sm"
                >
                  <option value="all">Semua Motor</option>
                  {motorcycles.map(motor => (
                    <option key={motor.id} value={motor.id}>{motor.name}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-left text-redbull-light mb-2 text-sm font-medium">Bulan</label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white text-sm"
                >
                  <option value="all">Semua Bulan</option>
                  {getAvailableMonths(orders).map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-left text-redbull-light mb-2 text-sm font-medium">Periode</label>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as 'all' | '1-15' | '16-31')}
                  className="w-full p-2 rounded bg-white/10 border border-redbull-red/30 text-white text-sm"
                >
                  <option value="all">Semua Tanggal</option>
                  <option value="1-15">1-15</option>
                  <option value="16-31">16-31</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-3">
              <button
                onClick={fetchAllData}
                className="p-2 rounded-full bg-redbull-red hover:bg-redbull-lighter transition duration-200"
                title="Refresh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary Cards Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-redbull-red mb-3">Ringkasan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* Total Income Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Pendapatan</p>
                  <p className="text-lg font-bold text-green-400">Rp {reports.totalIncome.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Total Expenses Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Pengeluaran</p>
                  <p className="text-lg font-bold text-red-400">Rp {reports.totalExpenses.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Net Profit Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Keuntungan</p>
                  <p className={`text-lg font-bold ${reports.totalIncome - reports.totalExpenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Rp {(reports.totalIncome - reports.totalExpenses).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Total Distance Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Jarak Tempuh</p>
                  <p className="text-lg font-bold text-blue-400">{reports.totalDistance.toLocaleString('id-ID')} km</p>
                </div>
              </div>

              {/* Working Days Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Hari Kerja</p>
                  <p className="text-lg font-bold text-yellow-400">{reports.pastWorkingDaysInPeriod}/{reports.workingDaysInPeriod}</p>
                  <p className="text-xs text-redbull-light/80 mt-1">Berlalu/Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Details Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-redbull-red mb-3">Rincian Keuangan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total Orders Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Total Orderan</p>
                  <p className="text-lg font-bold text-yellow-400">{reports.totalOrders}</p>
                </div>
              </div>

              {/* Total Fuel Stops Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Isi Bensin</p>
                  <p className="text-lg font-bold text-purple-400">{reports.totalFuelStops}</p>
                </div>
              </div>

              {/* Fuel Costs Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Biaya Bensin</p>
                  <p className="text-lg font-bold text-orange-400">Rp {reports.totalFuelCosts.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Sparepart Costs Card */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <div className="text-left">
                  <p className="text-redbull-light mb-1 text-sm">Biaya Sparepart</p>
                  <p className="text-lg font-bold text-pink-400">Rp {reports.totalSparepartCosts.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Average Fuel Price Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-redbull-red mb-3">Rata-rata Harga Bensin</h3>
            <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
              <div className="text-left">
                <p className="text-redbull-light mb-1 text-sm">Rata-rata Harga Bensin</p>
                <p className="text-lg font-bold text-cyan-400">Rp {reports.avgFuelPrice.toLocaleString('id-ID')}/L</p>
              </div>
            </div>
          </div>

          {/* Net Income Summary Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-redbull-red mb-3">Ringkasan Pendapatan Bersih</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Net Income Per Month */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <h4 className="font-bold text-redbull-red mb-2">Per Bulan</h4>
                <div className="max-h-40 overflow-y-auto">
                  {Object.entries(reports.netIncomePerMonth).length > 0 ? (
                    Object.entries(reports.netIncomePerMonth)
                      .sort(([monthA], [monthB]) => monthB.localeCompare(monthA)) // Sort by month descending
                      .map(([month, netIncome], index) => (
                        <div key={index} className="py-1 border-b border-redbull-red/10 last:border-0">
                          <div className="flex justify-between">
                            <span className="text-redbull-light text-sm">
                              {new Date(`${month}-01`).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                            </span>
                            <span className={`text-sm ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome)}
                            </span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-redbull-light italic text-sm">Tidak ada data</p>
                  )}
                </div>
              </div>

              {/* Net Income Per Period */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <h4 className="font-bold text-redbull-red mb-2">Per Periode</h4>
                <div className="max-h-40 overflow-y-auto">
                  {Object.entries(reports.netIncomePerPeriod).length > 0 ? (
                    Object.entries(reports.netIncomePerPeriod).map(([period, netIncome], index) => (
                      <div key={index} className="py-1 border-b border-redbull-red/10 last:border-0">
                        <div className="flex justify-between">
                          <span className="text-redbull-light text-sm">{period}</span>
                          <span className={`text-sm ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-redbull-light italic text-sm">Tidak ada data</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-redbull-red mb-3">Aktivitas Terbaru</h3>
            <div className="grid grid-cols-1 gap-4">
              {/* Recent Orders */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <h4 className="font-bold text-redbull-red mb-2">Orderan Terbaru</h4>
                {orders.slice(0, 3).map((order, index) => (
                  <div key={index} className="py-2 border-b border-redbull-red/10 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-redbull-light text-sm">{order.name}</span>
                      <span className="text-white text-sm">Rp {order.total.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-redbull-light italic text-sm">Tidak ada orderan</p>
                )}
              </div>

              {/* Recent Fuel Stops */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <h4 className="font-bold text-redbull-red mb-2">Isi Bensin Terbaru</h4>
                {fuelStops.slice(0, 3).map((fuelStop, index) => {
                  // Find motorcycle name based on ID
                  const motorcycle = motorcycles.find(m => m.id === fuelStop.motorcycleId);
                  const motorcycleName = motorcycle ? motorcycle.name : 'Motor tidak disebutkan';

                  return (
                    <div key={index} className="py-2 border-b border-redbull-red/10 last:border-0">
                      <div className="flex justify-between">
                        <div className="text-left">
                          <span className="text-redbull-light text-sm block">{new Date(fuelStop.date).toLocaleDateString('id-ID')}</span>
                          <span className="text-xs text-redbull-light/80 block">{motorcycleName}</span>
                        </div>
                        <span className="text-white text-sm">Rp {fuelStop.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  );
                })}
                {fuelStops.length === 0 && (
                  <p className="text-redbull-light italic text-sm">Tidak ada isi bensin</p>
                )}
              </div>

              {/* Recent Spareparts */}
              <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
                <h4 className="font-bold text-redbull-red mb-2">Sparepart Terbaru</h4>
                {spareparts.slice(0, 3).map((sparepart, index) => (
                  <div key={index} className="py-2 border-b border-redbull-red/10 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-redbull-light text-sm">{sparepart.name}</span>
                      <span className="text-white text-sm">Rp {sparepart.total.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
                {spareparts.length === 0 && (
                  <p className="text-redbull-light italic text-sm">Tidak ada sparepart</p>
                )}
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-redbull-red mb-3">Tren Bulanan</h3>
            <div className="bg-white/5 p-4 rounded-lg border border-redbull-red/20">
              <div className="h-40 flex items-end space-x-1 justify-center pt-10 overflow-x-auto">
                {reports.monthlyTrends.map((trend, index) => {
                  // Find the maximum value to scale the chart properly
                  const maxValue = Math.max(
                    ...reports.monthlyTrends.map(t => Math.max(t.income, t.expenses, t.profit))
                  ) || 100; // Default to 100 if all values are 0

                  return (
                    <div key={index} className="flex flex-col items-center flex-1 min-w-[40px]">
                      <div className="text-redbull-light text-xs mb-1">{trend.month}</div>

                      {/* Income bar */}
                      <div
                        className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-all duration-300 mb-1"
                        style={{ height: `${(trend.income / maxValue) * 100}%` }}
                        title={`Pendapatan: ${formatCurrency(trend.income)}`}
                      ></div>

                      {/* Expenses bar */}
                      <div
                        className="w-full bg-red-500 rounded-t hover:bg-red-600 transition-all duration-300"
                        style={{ height: `${(trend.expenses / maxValue) * 100}%` }}
                        title={`Pengeluaran: ${formatCurrency(trend.expenses)}`}
                      ></div>

                      {/* Profit indicator */}
                      {trend.profit > 0 ? (
                        <div className="text-[0.6rem] mt-1 text-green-400" title={`Keuntungan: ${formatCurrency(trend.profit)}`}>+{Math.round(trend.profit/1000)}k</div>
                      ) : (
                        <div className="text-[0.6rem] mt-1 text-red-400" title={`Kerugian: ${formatCurrency(Math.abs(trend.profit))}`}>{Math.round(trend.profit/1000)}k</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center space-x-3 mt-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                  <span className="text-xs">Pendapatan</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                  <span className="text-xs">Pengeluaran</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                  <span className="text-xs">Keuntungan</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-redbull-light/60 text-sm mt-6">
            Laporan terakhir diperbarui: {reports.lastUpdate.toLocaleString('id-ID')}
          </p>
        </div>
      </main>

      <nav className="bg-redbull-darker/80 backdrop-blur-sm border-t border-redbull-red/30 py-3 fixed bottom-0 left-0 right-0">
        <ul className="flex justify-around">
          <li>
            <a href="/dashboard" className="flex flex-col items-center text-redbull-red font-semibold">
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