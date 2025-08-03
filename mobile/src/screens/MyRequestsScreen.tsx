import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function MyRequestsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">My Requests</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Your submitted requests will appear here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
});