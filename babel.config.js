module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@store': './src/store',
          '@database': './src/database',
          '@types': './src/types',
          '@utils': './src/utils',
          '@hooks': './src/hooks',
          '@services': './src/services',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
