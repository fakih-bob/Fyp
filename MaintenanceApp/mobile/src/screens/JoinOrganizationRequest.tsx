// src/screens/OrganizationRequestsScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Menu,
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initNotificationCenter, notifyNow } from '../NotificationCenter';

type Organization = { id: number; name: string };
type OrgRequest = {
  id: number;
  status: 'pending' | 'approved' | 'declined';
  user?: { id: number; name?: string; email?: string; phone_number?: string | null };
  organization?: { id: number; name?: string };
  created_at?: string;
};

const API_BASE = 'http://10.0.2.2:8000/api';
const SEEN_PREFIX = '@seen_join_req_ids_'; // per-org key

async function getSeenSet(orgId: number): Promise<Set<number>> {
  try {
    const key = SEEN_PREFIX + orgId;
    const raw = await AsyncStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(arr);
  } catch (e) {
    console.warn('Seen read error', e);
    return new Set();
  }
}

async function setSeenSet(orgId: number, set: Set<number>) {
  try {
    const key = SEEN_PREFIX + orgId;
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Seen write error', e);
  }
}

export default function OrganizationRequestsScreen() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [requests, setRequests] = useState<OrgRequest[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const seenCache = useRef<Record<number, Set<number>>>({}); // orgId -> Set<id>

  useEffect(() => {
    // ask permissions / start listeners once
    initNotificationCenter();
    fetchMyOrganizations();
  }, []);

  // when org changes, fetch and start polling
  useEffect(() => {
    let interval: any;
    (async () => {
      if (!selectedOrg) {
        setRequests([]);
        return;
      }
      // prime seen set for this org
      if (!seenCache.current[selectedOrg.id]) {
        seenCache.current[selectedOrg.id] = await getSeenSet(selectedOrg.id);
      }
      await fetchRequests(selectedOrg.id, /*notify*/ true);
      // poll every 15s
      interval = setInterval(() => fetchRequests(selectedOrg.id, /*notify*/ true), 15000);
    })();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedOrg]);

  const fetchMyOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/myorganizations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.organization ?? res.data?.organizations ?? res.data?.data ?? [];
      const list: Organization[] = Array.isArray(data) ? data : [];
      setOrganizations(list);
      // pick first org by default (optional)
      if (list.length && !selectedOrg) setSelectedOrg(list[0]);
    } catch (e: any) {
      console.log('fetchMyOrganizations error:', e?.response?.data || e?.message || e);
      Alert.alert('Error', 'Failed to load your organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchRequests = async (orgId: number, notify = false) => {
    setLoadingRequests(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/getRequestsForOrganization/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list: OrgRequest[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setRequests(list);

      if (notify) {
        const seen = seenCache.current[orgId] || new Set<number>();
        const newPending = list.filter((r) => r?.id != null && r.status === 'pending' && !seen.has(r.id));

        if (newPending.length) {
          for (const r of newPending) {
            await notifyNow({
              title: 'New join request',
              body: `${r.user?.name || 'User'} wants to join "${r.organization?.name || 'your organization'}"`,
              data: {
                type: 'ORG_JOIN_REQUEST',
                requestId: r.id,
                orgId,
                userId: r.user?.id ?? null,
                status: r.status,
                created_at: r.created_at,
              },
              alsoList: true,
            });
          }
          newPending.forEach((r) => seen.add(r.id));
          seenCache.current[orgId] = seen;
          await setSeenSet(orgId, seen);
        }
      }
    } catch (e: any) {
      console.log('fetchRequests error:', e?.response?.data || e?.message || e);
      Alert.alert('Error', 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const acceptRequest = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${API_BASE}/acceptRequest/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Request accepted');
      if (selectedOrg) {
        await fetchRequests(selectedOrg.id, /*notify*/ false);
      }
    } catch (e: any) {
      console.log('acceptRequest error:', e?.response?.data || e?.message || e);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const declineRequest = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${API_BASE}/declineRequest/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Request declined');
      if (selectedOrg) {
        await fetchRequests(selectedOrg.id, /*notify*/ false);
      }
    } catch (e: any) {
      console.log('declineRequest error:', e?.response?.data || e?.message || e);
      Alert.alert('Error', 'Failed to decline request');
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequest = ({ item }: { item: OrgRequest }) => (
    <Card style={styles.card} key={item.id}>
      <Card.Content>
        <Text variant="titleMedium">User: {item.user?.name || 'N/A'}</Text>
        <Text>Email: {item.user?.email || 'N/A'}</Text>
        <Text>Phone: {item.user?.phone_number || 'N/A'}</Text>
        <Text>Status: {item.status}</Text>
        {!!item.created_at && <Text>Requested: {new Date(item.created_at).toLocaleString()}</Text>}
      </Card.Content>
      <Card.Actions style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => acceptRequest(item.id)}
          loading={processingId === item.id}
          disabled={processingId === item.id}
        >
          Accept
        </Button>
        <Button
          mode="contained"
          buttonColor="#dc3545"
          onPress={() => declineRequest(item.id)}
          loading={processingId === item.id}
          disabled={processingId === item.id}
        >
          Decline
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      {/* Org dropdown */}
      <View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity style={styles.dropdownAnchor} onPress={() => setMenuVisible(true)}>
              <Text style={styles.selectedOrgText}>
                {selectedOrg ? selectedOrg.name : 'Select Organization'}
              </Text>
            </TouchableOpacity>
          }
        >
          {loadingOrgs ? (
            <ActivityIndicator style={{ margin: 10 }} />
          ) : organizations.length === 0 ? (
            <Menu.Item title="No organizations found" disabled />
          ) : (
            organizations.map((org) => (
              <Menu.Item
                key={org.id}
                onPress={() => {
                  setSelectedOrg(org);
                  setMenuVisible(false);
                }}
                title={org.name}
              />
            ))
          )}
        </Menu>
      </View>

      {/* Requests list */}
      {loadingRequests ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 20 }} />
      ) : requests.length === 0 ? (
        <Text style={styles.noRequestsText}>
          {selectedOrg ? 'No requests found for this organization.' : 'Please select an organization.'}
        </Text>
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
  dropdownAnchor: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedOrgText: { fontSize: 16 },
  card: { marginBottom: 12 },
  actions: { justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 },
  noRequestsText: { textAlign: 'center', marginTop: 20, color: '#666' },
});
