import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore } from '../firebase';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName: string) => Promise<void>;
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

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const login = async (username: string, password: string) => {
    try {
      if (!validateUsername(username)) {
        throw new Error('Username harus 3-20 karakter (huruf, angka, underscore)');
      }

      const userSnapshot = await firestore()
        .collection('users')
        .where('username', '==', username.toLowerCase())
        .where('password', '==', password)
        .get();

      if (userSnapshot.empty) {
        throw new Error('Username atau password salah');
      }

      const userData = userSnapshot.docs[0].data();
      const user: User = {
        id: userSnapshot.docs[0].id,
        username: userData.username,
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

  const register = async (username: string, email: string, password: string, displayName: string) => {
    try {
      if (!validateUsername(username)) {
        throw new Error('Username harus 3-20 karakter (huruf, angka, underscore)');
      }

      if (!validateEmail(email)) {
        throw new Error('Format email tidak valid');
      }

      if (!displayName.trim()) {
        throw new Error('Nama harus diisi');
      }

      const existingUsername = await firestore()
        .collection('users')
        .where('username', '==', username.toLowerCase())
        .get();

      if (!existingUsername.empty) {
        throw new Error('Username sudah digunakan');
      }

      const existingEmail = await firestore()
        .collection('users')
        .where('email', '==', email.toLowerCase())
        .get();

      if (!existingEmail.empty) {
        throw new Error('Email sudah terdaftar');
      }

      const userRef = await firestore().collection('users').add({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        displayName: displayName.trim(),
        password,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      const user: User = {
        id: userRef.id,
        username: username.toLowerCase(),
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
