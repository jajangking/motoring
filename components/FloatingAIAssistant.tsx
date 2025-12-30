'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import {
  saveMessage,
  getConversationHistory,
  createConversationSession,
  ConversationMessage
} from '@/lib/aiConversationService';
import {
  getDashboardSummary,
  getRecentOrders,
  getRecentSpareparts,
  getRecentFueling,
  getProfileInfo
} from '@/lib/aiContextService';
import FormattedText from '@/components/FormattedText';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const FloatingAIAssistant = () => {
  const { user } = useAuth(); // Get the current user from AuthContext
  const pathname = usePathname(); // Get the current route
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [contextualInfo, setContextualInfo] = useState<string>('');
  const [contextualData, setContextualData] = useState<any>(null);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [interactiveMessage, setInteractiveMessage] = useState("Halo! Saya asisten AI siap membantu Anda hari ini");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get contextual information based on current page
  useEffect(() => {
    if (pathname) {
      const context = getContextualInfo(pathname);
      setContextualInfo(context);
    }
  }, [pathname]);

  // Fetch contextual data based on current page and user
  useEffect(() => {
    if (user && pathname) {
      fetchContextualData();
    }
  }, [user, pathname]);

  // Initialize conversation when the assistant is opened
  useEffect(() => {
    if (isOpen && user) {
      initializeConversation();
    }
  }, [isOpen, user]);

  // Effect to handle the interactive message bubble
  useEffect(() => {
    if (!isOpen) { // Only show the bubble when chat is closed
      const messages = [
        "Halo! Saya asisten AI siap membantu Anda hari ini",
        "Butuh bantuan? Saya di sini untuk Anda",
        "Punya pertanyaan? Tanyakan pada saya",
        "Saya bisa bantu Anda dengan laporan dan analisis",
        "Klik saya untuk mulai berbicara dengan asisten AI",
        "Apa yang bisa saya bantu sekarang?",
        "Saya siap membantu Anda hari ini!",
        "Ingin tahu sesuatu? Tanyakan saja!"
      ];

      const interval = setInterval(() => {
        // Get a random message different from the current one
        let newMessage;
        do {
          newMessage = messages[Math.floor(Math.random() * messages.length)];
        } while (newMessage === interactiveMessage && messages.length > 1);

        setInteractiveMessage(newMessage);
      }, 8000); // Change message every 8 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen, interactiveMessage]);

  const getContextualInfo = (path: string): string => {
    switch (path) {
      case '/dashboard':
        return 'Dashboard - Informasi ringkasan sistem motoring';
      case '/orders':
        return 'Orderan - Manajemen pesanan pelanggan';
      case '/spareparts':
        return 'Spareparts - Manajemen suku cadang';
      case '/fueling':
        return 'Isi Bensin - Catatan pengisian bahan bakar';
      case '/profile':
        return 'Profil - Informasi akun pengguna';
      case '/audit-trail':
        return 'Audit Trail - Riwayat aktivitas sistem';
      case '/export-import':
        return 'Ekspor/Impor - Fungsi backup dan restore data';
      case '/backup-restore':
        return 'Backup & Restore - Fungsi cadangan dan pemulihan data';
      default:
        return 'Halaman Umum - Sistem motoring';
    }
  };

  const fetchContextualData = async () => {
    if (!user) return;

    setIsContextLoading(true);
    try {
      let data = null;

      switch (pathname) {
        case '/dashboard':
          data = await getDashboardSummary(user.uid);
          break;
        case '/orders':
          data = await getRecentOrders(user.uid);
          break;
        case '/spareparts':
          data = await getRecentSpareparts(user.uid);
          break;
        case '/fueling':
          data = await getRecentFueling(user.uid);
          break;
        case '/profile':
          data = await getProfileInfo(user.uid);
          break;
        default:
          // For other pages, fetch dashboard summary as default
          data = await getDashboardSummary(user.uid);
      }

      setContextualData(data);
    } catch (error) {
      console.error('Error fetching contextual data:', error);
      setContextualData(null);
    } finally {
      setIsContextLoading(false);
    }
  };

  const initializeConversation = async () => {
    if (!user) return;

    try {
      // Generate or retrieve a session ID
      let currentSessionId = localStorage.getItem('ai_assistant_session_id');
      if (!currentSessionId) {
        currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('ai_assistant_session_id', currentSessionId);
        setSessionId(currentSessionId);

        // Create a new session in the database
        await createConversationSession({
          userId: user.uid,
          sessionId: currentSessionId,
          title: 'New AI Conversation'
        });

        // Fetch contextual data for initial message
        let initialContextualData = null;
        try {
          switch (pathname) {
            case '/dashboard':
              initialContextualData = await getDashboardSummary(user.uid);
              break;
            case '/orders':
              initialContextualData = await getRecentOrders(user.uid);
              break;
            case '/spareparts':
              initialContextualData = await getRecentSpareparts(user.uid);
              break;
            case '/fueling':
              initialContextualData = await getRecentFueling(user.uid);
              break;
            case '/profile':
              initialContextualData = await getProfileInfo(user.uid);
              break;
            default:
              initialContextualData = await getDashboardSummary(user.uid);
          }
        } catch (fetchError) {
          console.error('Error fetching initial contextual data:', fetchError);
        }

        // Add initial greeting message with contextual information
        let initialText = `Halo! Saya adalah asisten AI yang siap membantu Anda. Anda saat ini berada di halaman: ${contextualInfo || 'Halaman Umum'}.`;

        if (initialContextualData) {
          initialText += ` Saya memiliki akses ke data terkini Anda. Apa yang bisa saya bantu hari ini?`;
        } else {
          initialText += ` Apa yang bisa saya bantu hari ini?`;
        }

        const initialMessage: Message = {
          id: '1',
          text: initialText,
          sender: 'assistant',
          timestamp: new Date(),
        };
        setMessages([initialMessage]);

        // Save the initial message to the database
        await saveMessage({
          userId: user.uid,
          sessionId: currentSessionId,
          text: initialMessage.text,
          sender: initialMessage.sender,
        });
      } else {
        setSessionId(currentSessionId);

        // Load conversation history from the database
        const history = await getConversationHistory(user.uid, currentSessionId);
        const formattedHistory: Message[] = history.map(msg => ({
          id: msg.id || Date.now().toString(),
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
        }));

        setMessages(formattedHistory);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);

      // Fallback to initial message if there's an error
      const initialText = `Halo! Saya adalah asisten AI yang siap membantu Anda. Anda saat ini berada di halaman: ${contextualInfo || 'Halaman Umum'}. Apa yang bisa saya bantu hari ini?`;

      const initialMessage: Message = {
        id: '1',
        text: initialText,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  };

  const startNewSession = async () => {
    if (!user) return;

    try {
      // Generate a new session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ai_assistant_session_id', newSessionId);
      setSessionId(newSessionId);

      // Create a new session in the database
      await createConversationSession({
        userId: user.uid,
        sessionId: newSessionId,
        title: 'New AI Conversation'
      });

      // Fetch contextual data for initial message
      let initialContextualData = null;
      try {
        switch (pathname) {
          case '/dashboard':
            initialContextualData = await getDashboardSummary(user.uid);
            break;
          case '/orders':
            initialContextualData = await getRecentOrders(user.uid);
            break;
          case '/spareparts':
            initialContextualData = await getRecentSpareparts(user.uid);
            break;
          case '/fueling':
            initialContextualData = await getRecentFueling(user.uid);
            break;
          case '/profile':
            initialContextualData = await getProfileInfo(user.uid);
            break;
          default:
            initialContextualData = await getDashboardSummary(user.uid);
        }
      } catch (fetchError) {
        console.error('Error fetching initial contextual data:', fetchError);
      }

      // Add initial greeting message with contextual information
      let initialText = `Halo! Sesi baru telah dimulai. Saya adalah asisten AI yang siap membantu Anda. Anda saat ini berada di halaman: ${contextualInfo || 'Halaman Umum'}.`;

      if (initialContextualData) {
        initialText += ` Saya memiliki akses ke data terkini Anda. Apa yang bisa saya bantu hari ini?`;
      } else {
        initialText += ` Apa yang bisa saya bantu hari ini?`;
      }

      const initialMessage: Message = {
        id: '1',
        text: initialText,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages([initialMessage]);

      // Save the initial message to the database
      await saveMessage({
        userId: user.uid,
        sessionId: newSessionId,
        text: initialMessage.text,
        sender: initialMessage.sender,
      });
    } catch (error) {
      console.error('Error starting new session:', error);

      const errorMessage: Message = {
        id: 'error_' + Date.now(),
        text: 'Terjadi kesalahan saat memulai sesi baru. Silakan coba lagi.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages([errorMessage]);
    }
  };

  const clearChat = async () => {
    if (!user || !sessionId) return;

    // Confirm before clearing chat
    if (!window.confirm('Apakah Anda yakin ingin membersihkan percakapan ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      // Add a simple greeting message without database context
      const clearChatText = `Percakapan telah dibersihkan. Sesi ini telah diakhiri. Halo! Silakan mulai sesi baru jika Anda memiliki pertanyaan lain.`;

      const clearChatMessage: Message = {
        id: 'clear_' + Date.now(),
        text: clearChatText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages([clearChatMessage]);

      // Save the clear chat message to the database
      await saveMessage({
        userId: user.uid,
        sessionId: sessionId,
        text: clearChatMessage.text,
        sender: 'assistant',
      });

      // Clear the session ID to force a new session on next open
      localStorage.removeItem('ai_assistant_session_id');
      setSessionId('');
    } catch (error) {
      console.error('Error clearing chat:', error);

      const errorMessage: Message = {
        id: 'error_' + Date.now(),
        text: 'Terjadi kesalahan saat membersihkan percakapan. Silakan coba lagi.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages([errorMessage]);
    }
  };

  const endCurrentSession = async () => {
    if (!user || !sessionId) return;

    try {
      // Add a message indicating the session has ended
      const endSessionText = `Sesi ini telah diakhiri. Terima kasih telah menggunakan asisten AI di halaman: ${contextualInfo || 'Halaman Umum'}. Silakan mulai sesi baru jika Anda memiliki pertanyaan lain.`;

      const endSessionMessage: Message = {
        id: 'end_' + Date.now(),
        text: endSessionText,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, endSessionMessage]);

      // Save the end session message to the database
      await saveMessage({
        userId: user.uid,
        sessionId: sessionId,
        text: endSessionMessage.text,
        sender: endSessionMessage.sender,
      });

      // Clear the session ID to force a new session on next open
      localStorage.removeItem('ai_assistant_session_id');
      setSessionId('');
    } catch (error) {
      console.error('Error ending session:', error);

      const errorMessage: Message = {
        id: 'error_' + Date.now(),
        text: 'Terjadi kesalahan saat mengakhiri sesi. Silakan coba lagi.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user || !sessionId) return;

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Save user message to database
      await saveMessage({
        userId: user.uid,
        sessionId: sessionId,
        text: inputValue,
        sender: 'user',
      });

      // Check if the user is asking for reports or analysis
      const isAskingForReport = inputValue.toLowerCase().includes('laporan') ||
                                inputValue.toLowerCase().includes('analisis') ||
                                inputValue.toLowerCase().includes('report') ||
                                inputValue.toLowerCase().includes('bulan') ||
                                inputValue.toLowerCase().includes('tahun');

      // Prepare messages for API - only include the last 10 messages to avoid token limits
      const conversationMessages = messages
        .slice(-10)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      // Add the new user message
      conversationMessages.push({ role: 'user' as const, content: inputValue });

      // Fetch fresh contextual data for every message
      let freshContextualData = null;
      try {
        switch (pathname) {
          case '/dashboard':
            freshContextualData = await getDashboardSummary(user.uid);
            break;
          case '/orders':
            freshContextualData = await getRecentOrders(user.uid);
            break;
          case '/spareparts':
            freshContextualData = await getRecentSpareparts(user.uid);
            break;
          case '/fueling':
            freshContextualData = await getRecentFueling(user.uid);
            break;
          case '/profile':
            freshContextualData = await getProfileInfo(user.uid);
            break;
          default:
            freshContextualData = await getDashboardSummary(user.uid);
        }
      } catch (fetchError) {
        console.error('Error fetching contextual data:', fetchError);
      }

      let systemMessage = `Anda adalah asisten AI yang membantu pengguna aplikasi motoring. Berikan jawaban yang informatif, ramah, dan relevan dengan konteks aplikasi motoring. Jawab dalam bahasa Indonesia. Gunakan konteks percakapan sebelumnya untuk memberikan jawaban yang konsisten dan kontekstual. Pengguna saat ini berada di halaman: ${contextualInfo || 'Halaman Umum'}.`;

      if (freshContextualData) {
        systemMessage += ` Berikut adalah data kontekstual terkini dari sistem: ${JSON.stringify(freshContextualData, null, 2)}. Gunakan informasi ini untuk memberikan jawaban yang akurat dan relevan.`;
      } else {
        systemMessage += ' Tidak ada data kontekstual tambahan saat ini.';
      }

      // Check if API key is available
      if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
        throw new Error('GROQ API key is not configured. Please set NEXT_PUBLIC_GROQ_API_KEY in your environment variables.');
      }

      if (process.env.NEXT_PUBLIC_GROQ_API_KEY.length < 10) {
        throw new Error('GROQ API key appears to be invalid (too short). Please verify your NEXT_PUBLIC_GROQ_API_KEY in your environment variables.');
      }

      // Call Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            ...conversationMessages
          ],
          model: 'llama-3.1-8b-instant', // Using a Groq OSS-based model (open source alternative to gpt-oss)
          temperature: 0.7,
          max_tokens: 1000, // Increased for reports/analysis
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, get the text
          try {
            const errorText = await response.text();
            errorData = { error: errorText || `HTTP Error ${response.status}` };
          } catch (textError) {
            // If we can't get the text, use the status code
            errorData = { error: `HTTP Error ${response.status}` };
          }
        }
        console.error('API Error:', errorData);
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Maaf, saya tidak bisa memproses permintaan Anda saat ini.';

      // Add assistant message to UI
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveMessage({
        userId: user.uid,
        sessionId: sessionId,
        text: aiResponse,
        sender: 'assistant',
      });
    } catch (error) {
      console.error('Error calling Groq API:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Terjadi kesalahan saat menghubungi asisten AI. Silakan coba lagi nanti.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      // Save error message to database
      await saveMessage({
        userId: user.uid,
        sessionId: sessionId,
        text: errorMessage.text,
        sender: 'assistant',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInteractiveSuggestions = (): string[] => {
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

    // Combine all suggestions (limit to 6 for UI)
    const allSuggestions = [
      ...baseSuggestions,
      ...pageSpecificSuggestions,
      ...routineSuggestions,
      ...reportSuggestions
    ];

    // Return first 6 suggestions to keep UI clean
    return allSuggestions.slice(0, 6);
  };


  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-redbull-darker/90 backdrop-blur-md rounded-xl shadow-2xl border border-redbull-red/30 w-80 h-96 flex flex-col max-w-xs">
          {/* Header */}
          <div className="bg-redbull-darker/80 p-3 rounded-t-xl border-b border-redbull-red/30 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white font-medium">Asisten AI</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={startNewSession}
                className="text-white hover:text-redbull-red transition-colors p-1"
                title="Sesi Baru"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={clearChat}
                className="text-white hover:text-redbull-red transition-colors p-1"
                title="Bersihkan Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-redbull-red transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 bg-redbull-darker/50">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <div className="text-center text-redbull-light/70 text-sm mb-4">
                    Halo! Saya adalah asisten AI yang siap membantu Anda.
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {getInteractiveSuggestions().map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setInputValue(suggestion)}
                        className="text-left p-2 bg-redbull-darker/50 hover:bg-redbull-red/20 rounded-lg border border-redbull-red/20 text-redbull-light text-xs transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.sender === 'user'
                        ? 'bg-redbull-red text-white rounded-tr-none'
                        : 'bg-redbull-light/20 text-white rounded-tl-none'
                    }`}
                  >
                    <FormattedText text={message.text} />
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-redbull-light/20 text-white rounded-lg rounded-tl-none px-3 py-2 text-sm max-w-[80%]">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-3 bg-redbull-darker/80 border-t border-redbull-red/30">
            <div className="flex space-x-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tanyakan sesuatu..."
                className="flex-1 bg-redbull-darker text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-redbull-red placeholder-redbull-light/50"
                rows={1}
                disabled={!user}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim() || !user}
                className={`bg-redbull-red text-white rounded-lg px-3 py-2 text-sm font-medium ${
                  isLoading || !inputValue.trim() || !user ? 'opacity-50 cursor-not-allowed' : 'hover:bg-redbull-darker transition-colors'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="group relative">
          {/* Interactive chat bubble that appears automatically */}
          <div className="absolute bottom-full right-0 mb-3 bg-redbull-darker text-white text-xs font-medium py-2 px-3 rounded-lg shadow-lg whitespace-nowrap transform transition-opacity duration-300 z-10">
            <div className="absolute -top-1 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-redbull-darker"></div>
            <span>{interactiveMessage}</span>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-redbull-red text-white rounded-full p-4 shadow-lg hover:bg-redbull-darker transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
            aria-label="Open AI Assistant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FloatingAIAssistant;