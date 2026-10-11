import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { PermissionProvider } from './src/context/PermissionContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PermissionProvider>
        <HomeScreen />
      </PermissionProvider>
    </SafeAreaProvider>
  );
}
