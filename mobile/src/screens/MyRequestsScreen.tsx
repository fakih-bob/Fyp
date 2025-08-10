import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('http://10.0.2.2:8000/api/ShowAllMyRequests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      Alert.alert('Error', 'Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (id: number) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setCancelingId(id);
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`http://10.0.2.2:8000/api/CancelMyRequest/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Request canceled');
              fetchMyRequests();
            } catch (error) {
              console.error('Cancel failed:', error);
              Alert.alert('Error', 'Failed to cancel request');
            } finally {
              setCancelingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium"> {item.organization.name || 'N/A'} Join Request</Text>
        <Text>Status: {item.status || 'Pending'}</Text>
        {item.message ? <Text>Message: {item.message}</Text> : null}
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="contained"
          onPress={() => cancelRequest(item.id)}
          loading={cancelingId === item.id}
          disabled={cancelingId === item.id}
        >
          Cancel Request
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" />
      ) : requests.length === 0 ? (
        <Text style={styles.noDataText}>No requests found.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  card: { marginBottom: 16 },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
