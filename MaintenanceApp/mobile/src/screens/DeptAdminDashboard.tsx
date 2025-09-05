// src/screens/DeptAdminDashboard.tsx (aka MaintenanceRequestsScreen.tsx)
import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation, NavigationProp } from '@react-navigation/native';

type MaintenanceRequest = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user?: { id: number; name: string };
  department?: { id: number; name: string };
  assignee?: { id: number; name: string }; // relation if populated
  assigned_to?: number | null;             // FK variant 1
  assign_to?: number | null;               // FK variant 2 (your note)
  photos?: { id: number; url: string }[];
};

export default function DeptAdminDashboard() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<any>>();
  const isFocused = useIsFocused();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const res = await axios.get('http://10.0.2.2:8000/api/maintenance-requests', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const requestsData = res.data?.data || [];
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (error: any) {
      console.log('Fetch requests error:', error);
      let errorMessage = 'Failed to fetch maintenance requests';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response?.status === 404) {
        errorMessage = 'No department assigned to this admin.';
      }
      
      Alert.alert('Error', errorMessage);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      // Delay to ensure proper navigation completion
      setTimeout(() => {
        fetchRequests();
      }, 100);
    }
  }, [isFocused]);

  // Robust check for "already assigned" across multiple API shapes
  const isAlreadyAssigned = (req: MaintenanceRequest) => {
    // Relation present?
    if (req.assignee?.id != null) return true;

    // FK fields (accept 0/null/undefined as unassigned)
    if (req.assigned_to != null && req.assigned_to !== 0) return true;
    if (req.assign_to != null && req.assign_to !== 0) return true;

    // Status implies assignment (tweak as needed)
    if (req.status && /^(assigned|in[_\s-]?progress|ongoing)$/i.test(req.status)) return true;

    return false;
    // If your API has a different canonical flag, add it here.
  };

  const goToAssign = (req: MaintenanceRequest) => {
    if (isAlreadyAssigned(req)) return; // extra guard
    navigation.navigate('AssignMaintenance', {
      requestId: req.id,
      departmentId: req.department?.id,
    });
  };

  const renderRequest = ({ item }: { item: MaintenanceRequest }) => {
    const assigned = isAlreadyAssigned(item);

    return (
      <Card style={styles.card} key={item.id}>
        <Card.Content>
          <Text variant="titleMedium">{item.title}</Text>
          <Text>Description: {item.description}</Text>
          <Text>Status: {item.status}</Text>
          <Text>Created At: {new Date(item.created_at).toLocaleString()}</Text>
          {item.user && <Text>User: {item.user.name}</Text>}
          {item.assignee && <Text>Assignee: {item.assignee.name}</Text>}
          {item.department && <Text>Department: {item.department.name}</Text>}
          {item.photos && item.photos.length > 0 && (
            <Text>Photos: {item.photos.length} attached</Text>
          )}

          <View style={{ height: 12 }} />

          <Button
            mode={assigned ? 'outlined' : 'contained'}
            onPress={() => goToAssign(item)}
            disabled={assigned}
          >
            {assigned ? 'Already Assigned' : 'Assign Maintenance'}
          </Button>

          {assigned && (
            <Text style={styles.hint}>
              This request is already assigned
              {item.assignee?.name ? ` to ${item.assignee.name}` : ''}.
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : requests.length === 0 ? (
        <Text style={styles.noDataText}>No maintenance requests found.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequest}
          contentContainerStyle={{ paddingBottom: 80 }}
          style={{ marginTop: 10 }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  card: { marginBottom: 12 },
  noDataText: { textAlign: 'center', marginTop: 20, color: '#666' },
  hint: { marginTop: 8, color: '#888' },
});
