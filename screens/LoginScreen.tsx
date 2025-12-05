import React, { useState } from "react";
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
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Username dan password harus diisi");
      return;
    }

    if (isRegisterMode && !email.trim()) {
      Alert.alert("Error", "Email harus diisi");
      return;
    }

    if (isRegisterMode && !displayName.trim()) {
      Alert.alert("Error", "Nama harus diisi");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(username.trim(), email.trim(), password, displayName.trim());
        Alert.alert("Sukses", "Registrasi berhasil!");
      } else {
        await login(username.trim(), password);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsRegisterMode(!isRegisterMode);
    setUsername("");
    setEmail("");
    setPassword("");
    setDisplayName("");
  };

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
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            editable={!loading}
          />

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
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
          
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
