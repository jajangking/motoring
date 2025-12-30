'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  action?: {
    text: string;
    url: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', action?: { text: string; url: string; }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Hitung jumlah notifikasi yang belum dibaca
  const unreadCount = notifications.filter(n => !n.read).length;

  // Ambil notifikasi dari Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notificationList.push({
          id: doc.id,
          title: data.title || '',
          message: data.message || '',
          type: data.type || 'info',
          read: data.read || false,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          action: data.action || undefined
        });
      });
      setNotifications(notificationList);
      setInitialLoadComplete(true);
    }, (error) => {
      console.error('Error fetching notifications:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Fungsi untuk menambahkan notifikasi
  const addNotification = async (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    action?: { text: string; url: string; }
  ) => {
    if (!user) return;

    try {
      const notificationData = {
        userId: user.uid,
        title,
        message,
        type,
        read: false,
        createdAt: Timestamp.now(),
        action: action || null
      };

      await addDoc(collection(db, 'notifications'), notificationData);
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  // Fungsi untuk menandai notifikasi sebagai dibaca
  const markAsRead = async (id: string) => {
    try {
      const notificationRef = doc(db, 'notifications', id);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Fungsi untuk menandai semua notifikasi sebagai dibaca
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        return updateDoc(notificationRef, { read: true });
      });
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}