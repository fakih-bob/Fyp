// src/screens/DeptAdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation, NavigationProp } from '@react-navigation/native';
import { initNotificationCenter, notifyNow } from '../NotificationCenter';

type MaintenanceRequest = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user?: { id: number; name: string };
  department?: { id: number; name: string };
  assignee?: { id: number; name: string };
  assigned_to?: number | null;
  assign_to?: number | null;
  photos?: { id: number; url: string }[];
};

const API_BASE = 'http://10.0.2.2:8000/api';
const SEEN_KEY = '@seen_maint_req_ids';

// Helper to convert relative URLs to absolute
const absolutizeUrl = (url: string | undefined) => {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return `http://10.0.2.2:8000${url}`;
};

// Safe helpers for seen IDs
async function getSeen(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(arr);
  } catch (e) {
    console.warn('Seen read error', e);
    return new Set();
  }
}
async function setSeen(set: Set<number>) {
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Seen write error', e);
  }
}

export default function DeptAdminDashboard() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());
  const navigation = useNavigation<NavigationProp<any>>();
  const isFocused = useIsFocused();

  // Init once
  useEffect(() => {
    initNotificationCenter();        // wire listeners + permissions
    (async () => setSeenIds(await getSeen()))();
  }, []);

  const saveSeen = async (ids: number[]) => {
    const updated = new Set(seenIds);
    ids.forEach((id) => updated.add(id));
    setSeenIds(updated);
    await setSeen(updated);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const res = await axios.get(`${API_BASE}/maintenance-requests`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      const list: MaintenanceRequest[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setRequests(list);

      // Notify for new IDs only
      const newOnes = list.filter((r) => r?.id != null && !seenIds.has(r.id));
      if (newOnes.length > 0) {
        for (const req of newOnes) {
          await notifyNow({
            title: 'New maintenance request',
            body: `${req.title || 'Untitled'}${req.department?.name ? ' • ' + req.department.name : ''}`,
            data: {
              type: 'MAINT_REQ',
              requestId: req.id,
              departmentId: req.department?.id ?? null,
              status: req.status,
              created_at: req.created_at,
            },
            alsoList: true,
          });
        }
        await saveSeen(newOnes.map((r) => r.id));
      }
    } catch (error: any) {
      console.log('Fetch requests error:', error?.response?.data || error?.message || error);
      let msg = 'Failed to fetch maintenance requests';
      if (error?.code === 'ECONNABORTED') msg = 'Request timeout. Please check your connection.';
      else if (!error?.response) msg = 'Network error. Please check your connection.';
      else if (error?.response?.status === 404) msg = 'No department assigned to this admin.';
      Alert.alert('Error', msg);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchRequests();
      const t = setInterval(fetchRequests, 15000); // simple polling
      return () => clearInterval(t);
    }
  }, [isFocused, seenIds]);

  const isAlreadyAssigned = (req: MaintenanceRequest) => {
    if (req.assignee?.id != null) return true;
    if (req.assigned_to != null && req.assigned_to !== 0) return true;
    if (req.assign_to != null && req.assign_to !== 0) return true;
    if (req.status && /^(assigned|in[_\s-]?progress|ongoing)$/i.test(req.status)) return true;
    return false;
  };

  const goToAssign = (req: MaintenanceRequest) => {
    if (isAlreadyAssigned(req)) return;
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
          <Text variant="titleMedium">{item.title || 'Untitled'}</Text>
          {!!item.description && <Text>Description: {item.description}</Text>}
          <Text>Status: {item.status}</Text>
          <Text>Created At: {new Date(item.created_at).toLocaleString()}</Text>
          {item.user && <Text>User: {item.user.name}</Text>}
          {item.assignee && <Text>Assignee: {item.assignee.name}</Text>}
          {item.department && <Text>Department: {item.department.name}</Text>}

          {/* Photos gallery */}
          {item.photos?.length ? (
            <>
              <View style={{ height: 8 }} />
              <Text>Photos:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoStrip}
                contentContainerStyle={styles.photoStripContent}
              >
                {item.photos.map((p) => (
                  <Image
                    key={p.id}
                    source={{ uri: absolutizeUrl(p.url) }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          <View style={{ height: 12 }} />

          <Button mode={assigned ? 'outlined' : 'contained'} onPress={() => goToAssign(item)} disabled={assigned}>
            {assigned ? 'Already Assigned' : 'Assign Maintenance'}
          </Button>

          {assigned && (
            <Text style={styles.hint}>
              This request is already assigned{item.assignee?.name ? ` to ${item.assignee.name}` : ''}.
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
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

  // photos
  photoStrip: { marginTop: 8 },
  photoStripContent: { gap: 8 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
});
