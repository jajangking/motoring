'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
  User,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const result: UserCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Simpan data user tambahan ke Firestore
      const db = getFirestore();
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        firstName: firstName || 'User',
        lastName: lastName || '',
        createdAt: new Date().toISOString(),
        role: 'user',
        department: 'Motoring'
      });

      setUser(result.user);
      return result;
    } catch (error: any) {
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error: any) {
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error: any) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw error;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loginWithGoogle,
    resetPassword,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}