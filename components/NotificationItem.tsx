'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationItemProps {
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
  onMarkAsRead: (id: string) => void;
}

const NotificationItem = ({ 
  id, 
  title, 
  message, 
  type, 
  read, 
  createdAt, 
  action,
  onMarkAsRead 
}: NotificationItemProps) => {
  const [isRead, setIsRead] = useState(read);
  
  // Warna berdasarkan tipe notifikasi
  const typeColors = {
    info: 'border-blue-500 bg-blue-900/20',
    success: 'border-green-500 bg-green-900/20',
    warning: 'border-yellow-500 bg-yellow-900/20',
    error: 'border-red-500 bg-red-900/20'
  };

  // Ikon berdasarkan tipe notifikasi
  const typeIcons = {
    info: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    success: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  };

  // Format tanggal
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(id);
    setIsRead(true);
  };

  return (
    <div className={`p-4 rounded-lg border ${typeColors[type]} ${!isRead ? 'ring-2 ring-white/20' : ''}`}>
      <div className="flex justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 pt-0.5">
            {typeIcons[type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${!isRead ? 'text-white' : 'text-redbull-light'}`}>
              {title}
            </p>
            <p className="mt-1 text-sm text-redbull-light break-words">
              {message}
            </p>
            {action && (
              <a 
                href={action.url} 
                className="mt-2 inline-flex items-center text-sm font-medium text-redbull-red hover:text-redbull-lighter"
              >
                {action.text}
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 space-x-2">
          <span className="text-xs text-redbull-light">
            {formatDate(createdAt)}
          </span>
          {!isRead && (
            <button
              onClick={handleMarkAsRead}
              className="text-redbull-light hover:text-white"
              title="Tandai sudah dibaca"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;