// Import library React
import React from "react";
// Import komponen navigasi dari React Navigation
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Import komponen UI dari React Native
import { ActivityIndicator, View, StyleSheet } from "react-native";
// Import layar Login dan Chat
import LoginScreen from "./screens/LoginScreen";
import ChatScreen from "./screens/ChatScreen";
// Import context autentikasi
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Mendefinisikan tipe parameter untuk navigasi stack
export type RootStackParamList = {
  Login: undefined; // Layar Login tidak menerima parameter
  Chat: undefined;  // Layar Chat tidak menerima parameter
};

// Membuat instance stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

// Komponen Navigation untuk mengatur navigasi berdasarkan status autentikasi
function Navigation() {
  // Mengambil user dan loading dari context autentikasi
  const { user, loading } = useAuth();

  // Jika masih loading, tampilkan indikator loading
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Jika sudah tidak loading, tampilkan navigasi
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // Jika user sudah login, tampilkan layar Chat
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{ 
              title: `Chat - ${user.displayName}`,
              headerBackVisible: false // Tombol back disembunyikan
            }}
          />
        ) : (
          // Jika user belum login, tampilkan layar Login
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ title: 'Login / Register' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Komponen utama App
export default function App() {
  // Membungkus aplikasi dengan AuthProvider agar context autentikasi tersedia di seluruh aplikasi
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

// StyleSheet untuk styling komponen
const styles = StyleSheet.create({
  loading: {
    flex: 1, // Mengisi seluruh layar
    justifyContent: 'center', // Konten di tengah secara vertikal
    alignItems: 'center', // Konten di tengah secara horizontal
    backgroundColor: '#fff', // Latar belakang putih
  },
});
