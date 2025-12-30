'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

interface AIInteractivePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuggestionClick: (suggestion: string) => void;
}

const AIInteractivePopup = ({ isOpen, onClose, onSuggestionClick }: AIInteractivePopupProps) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Generate suggestions based on current page and user context
  useEffect(() => {
    if (!isOpen || !user) return;
    
    const generateSuggestions = () => {
      const baseSuggestions = [
        "Apa yang bisa kamu bantu hari ini?",
        "Tampilkan ringkasan data saya",
        "Berikan saran untuk meningkatkan efisiensi"
      ];
      
      let pageSpecificSuggestions: string[] = [];
      
      switch (pathname) {
        case '/dashboard':
          pageSpecificSuggestions = [
            "Tampilkan ringkasan minggu ini",
            "Tampilkan ringkasan bulan ini",
            "Apa yang bisa saya tingkatkan dari data ini?",
            "Analisis tren dari data terbaru"
          ];
          break;
        case '/orders':
          pageSpecificSuggestions = [
            "Tampilkan orderan terbaru",
            "Tampilkan orderan yang belum selesai",
            "Bantu saya membuat laporan orderan minggu ini",
            "Apa yang bisa saya pelajari dari data orderan?"
          ];
          break;
        case '/spareparts':
          pageSpecificSuggestions = [
            "Tampilkan stok suku cadang terbaru",
            "Apa suku cadang yang paling sering digunakan?",
            "Bantu saya membuat laporan penggunaan suku cadang"
          ];
          break;
        case '/fueling':
          pageSpecificSuggestions = [
            "Tampilkan riwayat pengisian bahan bakar terbaru",
            "Apa pola penggunaan bahan bakar saya?",
            "Bantu saya menganalisis efisiensi bahan bakar"
          ];
          break;
        case '/profile':
          pageSpecificSuggestions = [
            "Tampilkan statistik penggunaan saya",
            "Apa yang bisa saya tingkatkan dalam penggunaan sistem?"
          ];
          break;
        case '/audit-trail':
          pageSpecificSuggestions = [
            "Tampilkan aktivitas saya hari ini",
            "Tampilkan aktivitas saya minggu ini",
            "Apa aktivitas yang paling sering saya lakukan?"
          ];
          break;
        case '/export-import':
        case '/backup-restore':
          pageSpecificSuggestions = [
            "Bantu saya membuat jadwal backup otomatis",
            "Apa yang perlu saya perhatikan sebelum backup?"
          ];
          break;
        default:
          pageSpecificSuggestions = [
            "Tampilkan ringkasan aktivitas terbaru",
            "Apa yang bisa saya pelajari dari data saya?",
            "Bantu saya membuat laporan mingguan"
          ];
      }
      
      // Add routine suggestions
      const routineSuggestions = [
        "Apa rutinitas yang harus saya lakukan hari ini?",
        "Tampilkan tugas harian saya",
        "Apa yang perlu saya perhatikan hari ini?"
      ];
      
      // Add report suggestions
      const reportSuggestions = [
        "Tampilkan laporan harian",
        "Tampilkan laporan mingguan",
        "Tampilkan laporan bulanan",
        "Bantu saya membuat laporan minggu ini",
        "Bantu saya membuat laporan bulan ini"
      ];
      
      // Combine all suggestions
      const allSuggestions = [
        ...baseSuggestions,
        ...pageSpecificSuggestions,
        ...routineSuggestions,
        ...reportSuggestions
      ];
      
      setSuggestions(allSuggestions);
    };
    
    generateSuggestions();
  }, [isOpen, user, pathname]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-redbull-darker rounded-xl shadow-2xl border border-redbull-red/30 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-redbull-red/30 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Asisten AI Interaktif</h3>
          <button 
            onClick={onClose}
            className="text-redbull-light hover:text-redbull-red transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-redbull-light mb-4">
            Halo! Saya adalah asisten AI yang siap membantu Anda. Berikut beberapa pertanyaan yang bisa Anda ajukan:
          </p>
          
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                className="w-full text-left p-3 bg-redbull-darker/50 hover:bg-redbull-red/20 rounded-lg border border-redbull-red/20 text-redbull-light transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-redbull-red/30">
          <button
            onClick={() => onSuggestionClick("")}
            className="w-full py-2 px-4 bg-redbull-red hover:bg-redbull-darker text-white rounded-lg transition-colors"
          >
            Tanya Sesuatu Lainnya...
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInteractivePopup;