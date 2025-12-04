import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import LoginScreen from "./screens/LoginScreen";
import ChatScreen from "./screens/ChatScreen";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

export type RootStackParamList = {
  Login: undefined;
  Chat: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{ 
              title: `Chat - ${user.displayName}`,
              headerBackVisible: false 
            }}
          />
        ) : (
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

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
