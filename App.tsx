/**
 * Dream Traders ERP
 * Complete Mobile ERP Solution for Wholesale Business
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import AppNavigator from './src/navigation/AppNavigator';
import database from './src/database';
import SplashScreen from './src/components/SplashScreen';

function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setDebugInfo('Opening database...');
      database.connect();
      setDebugInfo('Database connected!');
      setIsDbReady(true);
    } catch (err: any) {
      console.error('Failed to initialize app:', err);
      console.error('Error stack:', err.stack);
      setError(err.message);
      setDebugInfo('Error: ' + err.message);
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to initialize database</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
        <AppNavigator />
      </SafeAreaProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    fontSize: 18,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  debugText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorDetail: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default App;
