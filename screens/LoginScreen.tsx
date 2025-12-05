
// Import React dan useState untuk membuat komponen dan state
import React, { useState } from "react";
// Import komponen-komponen UI dari React Native
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView
} from "react-native";
// Import custom hook untuk autentikasi
import { useAuth } from "../contexts/AuthContext";


// Komponen utama untuk layar login dan register
export default function LoginScreen() {
  // State untuk input username
  const [username, setUsername] = useState("");
  // State untuk input email (hanya saat register)
  const [email, setEmail] = useState("");
  // State untuk input password
  const [password, setPassword] = useState("");
  // State untuk input nama lengkap (display name)
  const [displayName, setDisplayName] = useState("");
  // State untuk mode register/login
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  // State loading saat proses login/register
  const [loading, setLoading] = useState(false);
  // Ambil fungsi login dan register dari context
  const { login, register } = useAuth();


  // Fungsi untuk submit login/register
  const handleSubmit = async () => {
    // Validasi input username dan password
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Username dan password harus diisi");
      return;
    }

    // Validasi input email saat register
    if (isRegisterMode && !email.trim()) {
      Alert.alert("Error", "Email harus diisi");
      return;
    }

    // Validasi input nama lengkap saat register
    if (isRegisterMode && !displayName.trim()) {
      Alert.alert("Error", "Nama harus diisi");
      return;
    }

    // Validasi panjang password
    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        // Proses registrasi
        await register(username.trim(), email.trim(), password, displayName.trim());
        Alert.alert("Sukses", "Registrasi berhasil!");
      } else {
        // Proses login
        await login(username.trim(), password);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };


  // Fungsi untuk mengganti mode login/register
  const handleModeSwitch = () => {
    setIsRegisterMode(!isRegisterMode);
    setUsername("");
    setEmail("");
    setPassword("");
    setDisplayName("");
  };


  // Render UI login/register
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {isRegisterMode ? "Daftar Akun Baru" : "Login"}
          </Text>
          
          {/* Input nama lengkap hanya saat register */}
          {isRegisterMode && (
            <TextInput
              style={styles.input}
              placeholder="Nama Lengkap"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              editable={!loading}
            />
          )}
          
          {/* Input username */}
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            editable={!loading}
          />

          {/* Input email hanya saat register */}
          {isRegisterMode && (
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          )}
          
          {/* Input password */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
          
          {/* Tombol submit login/register */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegisterMode ? "Daftar" : "Login"}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Tombol switch mode login/register */}
          <TouchableOpacity
            onPress={handleModeSwitch}
            disabled={loading}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isRegisterMode 
                ? "Sudah punya akun? Login" 
                : "Belum punya akun? Daftar"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


// StyleSheet untuk styling komponen
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f5f5" 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    padding: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold",
    textAlign: "center", 
    marginBottom: 30,
    color: "#333"
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  switchButton: {
    marginTop: 20,
    alignItems: "center",
  },
  switchText: {
    color: "#007AFF",
    fontSize: 16,
  },
});
