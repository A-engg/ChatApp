import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore } from '../firebase';

interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Auto login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const login = async (email: string, password: string) => {
    try {
      if (!validateEmail(email)) {
        throw new Error('Format email tidak valid');
      }

      // Query Firestore untuk user
      const userSnapshot = await firestore()
        .collection('users')
        .where('email', '==', email.toLowerCase())
        .where('password', '==', password)
        .get();

      if (userSnapshot.empty) {
        throw new Error('Email atau password salah');
      }

      const userData = userSnapshot.docs[0].data();
      const user: User = {
        id: userSnapshot.docs[0].id,
        email: userData.email,
        displayName: userData.displayName,
        createdAt: userData.createdAt?.toDate() || new Date(),
      };

      await AsyncStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      if (!validateEmail(email)) {
        throw new Error('Format email tidak valid');
      }

      if (!displayName.trim()) {
        throw new Error('Nama harus diisi');
      }

      // Cek apakah email sudah ada
      const existingUser = await firestore()
        .collection('users')
        .where('email', '==', email.toLowerCase())
        .get();

      if (!existingUser.empty) {
        throw new Error('Email sudah terdaftar');
      }

      // Buat user baru
      const userRef = await firestore().collection('users').add({
        email: email.toLowerCase(),
        displayName: displayName.trim(),
        password, // Dalam production, gunakan hashing!
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      const user: User = {
        id: userRef.id,
        email: email.toLowerCase(),
        displayName: displayName.trim(),
        createdAt: new Date(),
      };

      await AsyncStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
