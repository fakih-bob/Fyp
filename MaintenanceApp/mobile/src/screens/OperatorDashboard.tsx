// src/screens/OperatorDashboardScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  StatusBar,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  IconButton,
  ActivityIndicator,
  Divider,
  Menu,
  Chip,
  Avatar,
  Card,
  FAB,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const API_BASE = 'http://10.0.2.2:8000/api';

/** ---------------- Types (align with your Laravel relations) ---------------- */
type MRUser = {
  id?: number;
  name?: string;
  email?: string;
  phone_number?: string;
};

type MRPhoto = {
  id?: number;
  url?: string;
};

type MRDepartment = {
  id: number;
  name: string;
  organization_id?: number;
};

type MaintenanceRequest = {
  id: number;
  title?: string;
  description?: string;
  status?: string; // "new"
  address?: string;
  organization_id?: number;
  department_id?: number | null;
  created_at?: string;
  user?: MRUser | null;
  department?: MRDepartment | null;
  assignee?: MRUser | null;
  photos?: MRPhoto[];
};

type OperatorDepartmentsResponse =
  | {
      // multi-org shape
      organizations: Array<{
        id: number;
        name: string;
        departments: MRDepartment[];
      }>;
    }
  | {
      // single-org shape
      organization: { id: number; name: string };
      departments: MRDepartment[];
    };

type DeptPick = { id: number; name: string };

/** ---------------- Screen ---------------- */
export default function OperatorDashboardScreen() {
  const isFocused = useIsFocused();

  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [departments, setDepartments] = useState<MRDepartment[]>([]);

  // Per-request selection + menu visibility
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null); // request id whose menu is open
  const [deptSelection, setDeptSelection] = useState<Record<number, DeptPick | undefined>>({});
  const [assigningReqId, setAssigningReqId] = useState<number | null>(null);

  // -------------- Effects --------------
  useEffect(() => {
    if (isFocused) {
      bootstrap();
    }
  }, [isFocused]);

  const bootstrap = async () => {
    setLoadingRequests(true);
    setLoadingDepts(true);
    try {
      await Promise.all([fetchRequests(), fetchOperatorDepartments()]);
    } finally {
      setLoadingRequests(false);
      setLoadingDepts(false);
      setRefreshing(false);
    }
  };

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found. Please login again.');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  };

  // -------------- API Calls --------------
  const fetchRequests = async () => {
    try {
      const headers = await getAuthHeaders();
      // API is POST per your route
      const res = await axios.post(`${API_BASE}/GetAllMaintenanceRequestForOperator`, {}, { headers, timeout: 15000 });

      const data =
        res.data?.data ??
        res.data?.requests ??
        (Array.isArray(res.data) ? res.data : []);
      const list: MaintenanceRequest[] = Array.isArray(data) ? data : [];

      setRequests(list);
    } catch (e: any) {
      console.log('Fetch requests error:', e?.response?.data || e?.message || e);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to load maintenance requests.');
      setRequests([]);
    }
  };

  const fetchOperatorDepartments = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get<OperatorDepartmentsResponse>(`${API_BASE}/operator/departments`, {
        headers,
        timeout: 15000,
      });

      // Flatten departments
      let flat: MRDepartment[] = [];
      if (Array.isArray((res.data as any).organizations)) {
        const orgs = (res.data as any).organizations as Array<{ departments: MRDepartment[] }>;
        flat = orgs.flatMap((o) => o.departments || []);
      } else if (Array.isArray((res.data as any).departments)) {
        flat = (res.data as any).departments as MRDepartment[];
      }

      // Deduplicate by id
      const dedup = Object.values(
        flat.reduce((acc, d) => {
          acc[d.id] = acc[d.id] || d;
          return acc;
        }, {} as Record<number, MRDepartment>)
      );

      setDepartments(dedup);
    } catch (e: any) {
      console.log('Fetch departments error:', e?.response?.data || e?.message || e);
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 403
          ? 'Only operators can load departments.'
          : 'Failed to load departments.');
      Alert.alert('Departments', msg);
      setDepartments([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    bootstrap();
  };

  const handlePickDept = (reqId: number, dept: MRDepartment) => {
    setDeptSelection((prev) => ({ ...prev, [reqId]: { id: dept.id, name: dept.name } }));
    setMenuOpenFor(null);
  };

  const handleAssign = async (req: MaintenanceRequest) => {
    const picked = deptSelection[req.id];
    if (!picked?.id) {
      Alert.alert('Select Department', 'Please choose a department before assigning.');
      return;
    }

    try {
      setAssigningReqId(req.id);
      const headers = await getAuthHeaders();

      await axios.patch(
        `${API_BASE}/maintenance-requests/${req.id}/assign-department`,
        { department_id: picked.id },
        { headers, timeout: 15000 }
      );

      // Optimistically update local request
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? {
                ...r,
                department_id: picked.id,
                department: { id: picked.id, name: picked.name, organization_id: r.organization_id } as MRDepartment,
              }
            : r
        )
      );

      Alert.alert('Success', `Request #${req.id} assigned to ${picked.name}.`);
    } catch (e: any) {
      console.log('Assign error:', e?.response?.data || e?.message || e);
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to assign department.';
      Alert.alert('Assign Failed', String(msg));
    } finally {
      setAssigningReqId(null);
    }
  };

  // -------------- UI helpers --------------
  const deptNameFor = (req: MaintenanceRequest) => {
    const picked = deptSelection[req.id];
    if (picked?.name) return picked.name;
    if (req.department?.name) return req.department.name;
    return '';
  };

  const renderHeader = useMemo(
    () => (
      <Surface style={styles.headerCard} elevation={1}>
        <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.headerGradient}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="dashboard" size={22} color="#92400e" />
            <Text style={styles.headerTitle}>Operator Dashboard</Text>
          </View>
          <Text style={styles.headerSubtitle}>Assign incoming maintenance requests to departments</Text>

          <View style={styles.headerStats}>
            <Chip icon="clipboard-list" style={styles.statChip} compact>
              Requests: {requests.length}
            </Chip>
            <Chip icon="domain" style={styles.statChip} compact>
              Depts: {departments.length}
            </Chip>
          </View>
        </LinearGradient>
      </Surface>
    ),
    [requests.length, departments.length]
  );

  const renderRequestItem = ({ item }: { item: MaintenanceRequest }) => {
    const isAssigning = assigningReqId === item.id;
    const currentDeptName = deptNameFor(item);

    return (
      <Card style={styles.reqCard} elevation={2}>
        <Card.Title
          title={item.title || `Maintenance Request #${item.id}`}
          subtitle={item.status ? `Status: ${item.status}` : undefined}
          left={(props) =>
            item.user?.name ? (
              <Avatar.Text {...props} size={40} label={getInitials(item.user.name)} />
            ) : (
              <Avatar.Icon {...props} size={40} icon="account" />
            )
          }
          right={(props) => (
            <View style={{ paddingRight: 6, flexDirection: 'row', alignItems: 'center' }}>
              <IconButton {...props} icon="image-multiple" disabled />
            </View>
          )}
        />
        <Card.Content>
          {item.description ? (
            <Text style={styles.reqDesc} numberOfLines={4}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.reqMetaRow}>
            {item.user?.name ? (
              <Chip icon="account" mode="outlined" compact style={styles.metaChip}>
                {item.user.name}
              </Chip>
            ) : null}
            {item.address ? (
              <Chip icon="map-marker" mode="outlined" compact style={styles.metaChip}>
                {item.address}
              </Chip>
            ) : null}
            <Chip icon="camera" mode="outlined" compact style={styles.metaChip}>
              Photos: {item.photos?.length ?? 0}
            </Chip>
          </View>

          <Divider style={{ marginVertical: 10 }} />

          {/* Department chooser */}
          <View style={styles.assignRow}>
            <Menu
              visible={menuOpenFor === item.id}
              onDismiss={() => setMenuOpenFor(null)}
              anchor={
                <Button
                  mode="outlined"
                  icon="menu-down"
                  onPress={() => setMenuOpenFor(item.id)}
                  style={styles.deptBtn}
                >
                  {currentDeptName || 'Choose department'}
                </Button>
              }
            >
              {loadingDepts ? (
                <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator />
                  <Text>Loading…</Text>
                </View>
              ) : departments.length === 0 ? (
                <View style={{ padding: 12 }}>
                  <Text>No departments found for your organizations.</Text>
                </View>
              ) : (
                departments.map((d) => (
                  <Menu.Item
                    key={d.id}
                    title={d.name}
                    onPress={() => handlePickDept(item.id, d)}
                    leadingIcon={() => <MaterialIcons name="domain" size={18} color="#6b7280" />}
                  />
                ))
              )}

              <Divider />
              <Menu.Item
                leadingIcon="refresh"
                title="Refresh departments"
                onPress={async () => {
                  await fetchOperatorDepartments();
                }}
              />
            </Menu>

            <Button
              mode="contained"
              onPress={() => handleAssign(item)}
              disabled={!deptSelection[item.id]?.id && !item.department_id}
              style={styles.assignBtn}
            >
              {isAssigning ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator animating size="small" />
                  <Text>Assigning…</Text>
                </View>
              ) : (
                'Assign'
              )}
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // -------------- Render --------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {renderHeader}

      {loadingRequests ? (
        <View style={styles.centered}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10 }}>Loading maintenance requests…</Text>
        </View>
      ) : requests.length === 0 ? (
        <Surface style={styles.emptyCard} elevation={1}>
          <LinearGradient colors={['#f3f4f6', '#e5e7eb']} style={styles.emptyGradient}>
            <MaterialIcons name="assignment" size={48} color="#6b7280" />
            <Text style={styles.emptyTitle}>No new requests</Text>
            <Text style={styles.emptyText}>
              New maintenance requests assigned to you will appear here.
            </Text>
            <Button mode="outlined" icon="refresh" onPress={onRefresh}>
              Refresh
            </Button>
          </LinearGradient>
        </Surface>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderRequestItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F59E0B']} />
          }
        />
      )}

      <FAB
        icon="refresh"
        style={styles.fab}
        onPress={onRefresh}
        color="white"
        label="Reload"
      />
    </View>
  );
}

/** ---------------- Helpers / Styles ---------------- */
const getInitials = (name?: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? 'U';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },

  headerCard: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  headerGradient: { padding: 16 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    color: '#92400e',
  },
  headerSubtitle: {
    marginTop: 6,
    color: '#78350f',
  },
  headerStats: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statChip: { backgroundColor: '#fff' },

  reqCard: { borderRadius: 16, overflow: 'hidden' },
  reqDesc: { color: '#374151', marginTop: 4 },
  reqMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaChip: { borderColor: '#e5e7eb' },

  assignRow: { marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center' },
  deptBtn: { flex: 1, borderRadius: 10 },
  assignBtn: { borderRadius: 10 },

  emptyCard: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  emptyGradient: { padding: 24, alignItems: 'center' },
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: '700', color: '#111827' },
  emptyText: { marginTop: 6, marginBottom: 12, color: '#6b7280', textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#F59E0B',
  },
});
