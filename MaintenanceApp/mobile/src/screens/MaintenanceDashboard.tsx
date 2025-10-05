// src/screens/MyAssignedRequestsScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Chip,
  Menu,
  Button,
  Divider,
  IconButton,
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

const API_BASE = 'http://10.0.2.2:8000/api';

// Match DeptAdminDashboard: absolutize relative URLs
const absolutizeUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `http://10.0.2.2:8000${url.startsWith('/') ? '' : '/'}${url}`;
};

const STATUS_OPTIONS = ['new', 'declined', 'pending', 'in-progress', 'done'] as const;
type StatusType = typeof STATUS_OPTIONS[number];

export default function MyAssignedRequestsScreen() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisibleId, setMenuVisibleId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

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
    } catch (e: any) {
      console.log('Update status error:', e?.response?.status, e?.response?.data || e?.message);
      setRequests(prev); // rollback
      const apiMsg = e?.response?.data?.message || 'Failed to update status.';
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

  // Photos strip (same sizing/spacing as DeptAdmin) + tap-to-preview
  const PhotoStrip = ({ photos }: { photos?: { id: number; url: string }[] }) => {
    if (!photos || photos.length === 0) return null;
    return (
      <>
        <View style={{ height: 8 }} />
        <Text>Photos:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoStrip}
          contentContainerStyle={styles.photoStripContent}
        >
          {photos.map((p) => (
            <TouchableOpacity key={p.id} onPress={() => setPreviewUri(absolutizeUrl(p.url))}>
              <Image
                source={{ uri: absolutizeUrl(p.url) }}
                style={styles.photoThumb}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </>
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

        {/* Photos */}
        <PhotoStrip photos={item.photos} />
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

      {/* Full-screen preview */}
      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewBar}>
            <IconButton
              icon="close"
              onPress={() => setPreviewUri(null)}
              mode="contained-tonal"
            />
          </View>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
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
  chip: { alignSelf: 'flex-start' },
  meta: { color: '#666' },

  // same as DeptAdminDashboard
  photoStrip: { marginTop: 8 },
  photoStripContent: { gap: 8 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },

  // preview modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBar: { position: 'absolute', top: 40, right: 16, zIndex: 2 },
  previewImage: { width: '92%', height: '80%' },
});
