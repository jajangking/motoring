import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface ConversationMessage {
  id?: string;
  userId: string;
  sessionId: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date | Timestamp;
}

export interface ConversationSession {
  id?: string;
  userId: string;
  sessionId: string;
  title: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Function to save a message to the database
export const saveMessage = async (message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'ai_conversations'), {
      ...message,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

// Function to get conversation history for a user
export const getConversationHistory = async (userId: string, sessionId: string): Promise<ConversationMessage[]> => {
  try {
    const q = query(
      collection(db, 'ai_conversations'),
      where('userId', '==', userId),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        sessionId: data.sessionId,
        text: data.text,
        sender: data.sender,
        timestamp: data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp,
      };
    });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
};

// Function to create a new conversation session
export const createConversationSession = async (session: Omit<ConversationSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'ai_conversation_sessions'), {
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating conversation session:', error);
    throw error;
  }
};