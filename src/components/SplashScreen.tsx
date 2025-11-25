import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const { isDark } = useThemeStore();

  return (
    <View style={styles.container}>
      <Image
        source={
          isDark
            ? require('@/assets/images/DarkMode_Splash.png')
            : require('@/assets/images/LightMode_Splash.png')
        }
        style={styles.splashImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
