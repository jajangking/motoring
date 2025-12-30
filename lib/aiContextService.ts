import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

// Function to get dashboard summary data
export const getDashboardSummary = async (userId: string) => {
  try {
    // Get recent orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const ordersSnapshot = await getDocs(ordersQuery);
    const recentOrders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        qty: data.qty || 0,
        tarif: data.tarif || 0,
        total: data.total || 0,
        date: data.tanggal || data.createdAt?.toDate ? (typeof data.tanggal === 'string' ? new Date(data.tanggal) : data.createdAt.toDate()) : new Date(),
        note: data.note || '',
        labelType: data.labelType || 'klik'
      };
    });

    // Get recent spare parts
    const sparepartsQuery = query(
      collection(db, 'spareparts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const sparepartsSnapshot = await getDocs(sparepartsQuery);
    const recentSpareparts = sparepartsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown',
        quantity: data.quantity || 0,
        price: data.price || 0,
        total: data.total || 0,
        date: data.date || data.createdAt?.toDate ? (typeof data.date === 'string' ? new Date(data.date) : data.createdAt.toDate()) : new Date(),
        note: data.note || '',
        motorcycleId: data.motorcycleId || 'Unknown'
      };
    });

    // Get recent fueling records
    const fuelingQuery = query(
      collection(db, 'fuelStops'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(5)
    );
    const fuelingSnapshot = await getDocs(fuelingQuery);
    const recentFueling = fuelingSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date || (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()),
        liters: data.liters || 0,
        price: data.price || 0,
        cost: data.total || 0,
        location: data.location || 'Unknown',
        motorcycleId: data.motorcycleId || 'Unknown'
      };
    });

    return {
      recentOrders,
      recentSpareparts,
      recentFueling
    };
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    throw error;
  }
};

// Function to get recent orders
export const getRecentOrders = async (userId: string, limitCount: number = 5) => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const ordersSnapshot = await getDocs(ordersQuery);
    return ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        qty: data.qty || 0,
        tarif: data.tarif || 0,
        total: data.total || 0,
        date: data.tanggal || data.createdAt?.toDate ? (typeof data.tanggal === 'string' ? new Date(data.tanggal) : data.createdAt.toDate()) : new Date(),
        note: data.note || '',
        labelType: data.labelType || 'klik'
      };
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    throw error;
  }
};

// Function to get recent spare parts
export const getRecentSpareparts = async (userId: string, limitCount: number = 5) => {
  try {
    const sparepartsQuery = query(
      collection(db, 'spareparts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const sparepartsSnapshot = await getDocs(sparepartsQuery);
    return sparepartsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown',
        quantity: data.quantity || 0,
        price: data.price || 0,
        total: data.total || 0,
        date: data.date || data.createdAt?.toDate ? (typeof data.date === 'string' ? new Date(data.date) : data.createdAt.toDate()) : new Date(),
        note: data.note || '',
        motorcycleId: data.motorcycleId || 'Unknown'
      };
    });
  } catch (error) {
    console.error('Error fetching recent spareparts:', error);
    throw error;
  }
};

// Function to get recent fueling records
export const getRecentFueling = async (userId: string, limitCount: number = 5) => {
  try {
    const fuelingQuery = query(
      collection(db, 'fuelStops'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    const fuelingSnapshot = await getDocs(fuelingQuery);
    return fuelingSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date || (data.createdAt?.toDate ? data.createdAt.toDate() : new Date()),
        liters: data.liters || 0,
        price: data.price || 0,
        cost: data.total || 0,
        location: data.location || 'Unknown',
        motorcycleId: data.motorcycleId || 'Unknown'
      };
    });
  } catch (error) {
    console.error('Error fetching recent fueling:', error);
    throw error;
  }
};

// Function to get profile information
export const getProfileInfo = async (userId: string) => {
  try {
    // In a real app, this would fetch from a users collection
    // For now, we'll return a placeholder
    return {
      userId,
      name: 'User',
      joinDate: new Date(),
      permissions: ['read', 'write']
    };
  } catch (error) {
    console.error('Error fetching profile info:', error);
    throw error;
  }
};