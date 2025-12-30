'use client';

import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationItem from '@/components/NotificationItem';

export default function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-redbull-darker/50 transition duration-200"
        aria-label="Notifikasi"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden bg-redbull-darker rounded-xl border border-redbull-red/30 shadow-lg z-[9999]">
          <div className="p-4 border-b border-redbull-red/30 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-redbull-red hover:text-redbull-lighter"
              >
                Tandai semua sudah dibaca
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-redbull-light mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-redbull-light">Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="divide-y divide-redbull-red/20">
                {unreadNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    id={notification.id}
                    title={notification.title}
                    message={notification.message}
                    type={notification.type}
                    read={notification.read}
                    createdAt={notification.createdAt}
                    action={notification.action}
                    onMarkAsRead={markAsRead}
                  />
                ))}
                {readNotifications.length > 0 && (
                  <>
                    <div className="p-2 text-center text-redbull-light text-sm font-medium">Notifikasi Sebelumnya</div>
                    {readNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        id={notification.id}
                        title={notification.title}
                        message={notification.message}
                        type={notification.type}
                        read={notification.read}
                        createdAt={notification.createdAt}
                        action={notification.action}
                        onMarkAsRead={markAsRead}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay untuk menutup dropdown saat klik di luar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}