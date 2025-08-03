import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall">Organization Name</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Switch organization
          </Text>
        </Card.Content>
      </Card>
      
      <Button 
        mode="contained" 
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        Submit a New Form
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  card: {
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
  },
  submitButton: {
    marginTop: 16,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
});