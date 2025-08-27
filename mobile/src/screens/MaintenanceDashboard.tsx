// src/screens/MyAssignedRequestsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Chip,
  Menu,
  Button,
  Divider,
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

type MaintenanceRequest = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  user?: { id: number; name: string };         // requester
  department?: { id: number; name: string };
  assignee?: { id: number; name: string };     // you
  photos?: { id: number; url: string }[];
};

const API_BASE = 'http://192.168.10.157:8000/api';
const STATUS_OPTIONS = ['new', 'declined', 'pending', 'in-progress', 'done'] as const;
type StatusType = typeof STATUS_OPTIONS[number];

export default function MyAssignedRequestsScreen() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisibleId, setMenuVisibleId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const isFocused = useIsFocused();

  const fetchAssigned = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/my-assigned-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      setRequests(res.data?.data || []);
    } catch (e: any) {
      console.log('Fetch assigned error:', e?.response?.status, e?.response?.data || e?.message);
      Alert.alert('Error', 'Failed to load your assigned requests.');
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    setLoading(true);
    fetchAssigned().finally(() => setLoading(false));
  }, [isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssigned().finally(() => setRefreshing(false));
  }, []);

  const prettyDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const onChangeStatus = async (req: MaintenanceRequest, newStatus: StatusType) => {
    setMenuVisibleId(null);
    if (req.status === newStatus) return;

    // optimistic update
    const prev = requests.slice();
    const next = requests.map(r => (r.id === req.id ? { ...r, status: newStatus } : r));
    setRequests(next);
    setUpdatingId(req.id);

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.patch(
        `${API_BASE}/maintenance-requests/${req.id}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );
      // success toast/alert optional
    } catch (e: any) {
      console.log('Update status error:', e?.response?.status, e?.response?.data || e?.message);
      setRequests(prev); // rollback
      const apiMsg =
        e?.response?.data?.message ||
        'Failed to update status.';
      Alert.alert('Error', apiMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const StatusMenu = ({ req }: { req: MaintenanceRequest }) => {
    const open = menuVisibleId === req.id;
    return (
      <Menu
        visible={open}
        onDismiss={() => setMenuVisibleId(null)}
        anchor={
          <Button
            mode="contained-tonal"
            onPress={() => setMenuVisibleId(req.id)}
            loading={updatingId === req.id}
            disabled={updatingId === req.id}
          >
            Change Status
          </Button>
        }
      >
        {STATUS_OPTIONS.map((s, idx) => (
          <View key={s}>
            <Menu.Item
              title={s === req.status ? `✓ ${s}` : s}
              onPress={() => onChangeStatus(req, s)}
            />
            {idx < STATUS_OPTIONS.length - 1 && <Divider />}
          </View>
        ))}
      </Menu>
    );
  };

  const renderItem = ({ item }: { item: MaintenanceRequest }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{item.title}</Text>
        <Text style={styles.meta}>Requested by: {item.user?.name ?? '—'}</Text>
        <Text style={styles.meta}>Department: {item.department?.name ?? '—'}</Text>
        <Text style={styles.meta}>Created: {prettyDate(item.created_at)}</Text>

        <View style={styles.row}>
          <Chip style={styles.chip} compact>
            Status: {item.status}
          </Chip>
          <StatusMenu req={item} />
        </View>

        {item.description ? (
          <>
            <View style={{ height: 8 }} />
            <Text>{item.description}</Text>
          </>
        ) : null}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading your assigned requests…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {requests.length === 0 ? (
        <View style={styles.center}>
          <Text>No assigned maintenance requests.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 12 },
  row: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chip: {
    alignSelf: 'flex-start',
  },
  meta: { color: '#666' },
});
