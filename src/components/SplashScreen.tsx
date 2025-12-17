import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('@/assets/animations/splash.json')}
        style={styles.lottie}
        autoPlay
        loop
      />
      <Text style={styles.loadingText}>Dream Traders</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: width * 0.8,
    height: width * 0.8,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
