// src/screens/OwnerOrganizationsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  RefreshControl,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  FAB,
  Surface,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation, NavigationProp } from '@react-navigation/native';
import { initNotificationCenter } from '../NotificationCenter'; // keep notifications ready

type Organization = {
  id: number;
  name: string;
  description?: string;
  url?: string;                 // <- image URL (logo/avatar)
  departments_count?: number;
  users_count?: number;
};

type RootStackParamList = {
  OrganizationRequestsScreen: undefined;
  OrganizationForm: { mode: 'create' | 'edit'; organization?: Organization };
  DepartmentsListScreen: { organizationId: number };
};

const { width } = Dimensions.get('window');
const API_BASE = 'http://10.0.2.2:8000/api';

export default function OwnerOrganizationsScreen() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    // Ensure local notifications are ready on the owner device
    initNotificationCenter();
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchOrganizations();
      setTimeout(animateEntrance, 200);
    }
  }, [isFocused]);

  const animateEntrance = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchOrganizations = async () => {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        setOrganizations([]);
        return;
      }
      const res = await axios.get(`${API_BASE}/myorganizations`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      const data =
        res.data?.organization ??
        res.data?.organizations ??
        res.data?.data ??
        (Array.isArray(res.data) ? res.data : []);
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.log('Owner orgs error:', e?.response?.data || e?.message || e);
      Alert.alert('Error', 'Failed to load organizations');
      setOrganizations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrganizations();
  };

  const confirmDelete = (id: number, name: string) => {
    Alert.alert(
      'Delete Organization',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => deleteOrganization(id),
          style: 'destructive',
        },
      ]
    );
  };

  const deleteOrganization = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      await axios.delete(`${API_BASE}/organizations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchOrganizations();
      Alert.alert('Success', 'Organization deleted successfully');
    } catch (e: any) {
      console.log('Delete org error:', e?.response?.data || e?.message || e);
      Alert.alert('Error', 'Failed to delete organization');
    }
  };

  const renderOrganization = ({ item }: { item: Organization }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Surface style={styles.organizationCard} elevation={4}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              {/* If we have an image URL, show the mini picture; otherwise show fallback gradient+icon */}
              {item.url ? (
                <Image source={{ uri: item.url }} style={styles.orgIconImage} resizeMode="cover" />
              ) : (
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.iconGradient}>
                  <MaterialIcons name="business" size={24} color="white" />
                </LinearGradient>
              )}
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.orgName}>{item.name}</Text>
              {!!item.url && <Text style={styles.orgUrl}>{item.url}</Text>}
            </View>

            <IconButton icon="more-horiz" onPress={() => {}} />
          </View>

          {!!item.description && <Text style={styles.desc}>{item.description}</Text>}

          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="domain" size={16} color="#F59E0B" />
              <Text style={styles.statText}>{item.departments_count || 0} Departments</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="group" size={16} color="#F59E0B" />
              <Text style={styles.statText}>{item.users_count || 0} Users</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              mode="outlined"
              icon="domain"
              onPress={() => navigation.navigate('DepartmentsListScreen', { organizationId: item.id })}
              style={styles.actionBtn}
            >
              Departments
            </Button>
            <Button
              mode="outlined"
              icon="edit"
              onPress={() => navigation.navigate('OrganizationForm', { mode: 'edit', organization: item })}
              style={styles.actionBtn}
            >
              Edit
            </Button>
            <Button
              mode="outlined"
              icon="delete"
              textColor="#DC2626"
              onPress={() => confirmDelete(item.id, item.name)}
              style={[styles.actionBtn, { borderColor: '#DC2626' }]}
            >
              Delete
            </Button>
          </View>
        </LinearGradient>
      </Surface>
    </Animated.View>
  );

  const renderEmpty = () => (
    <Surface style={styles.emptyCard} elevation={2}>
      <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.emptyIcon}>
        <MaterialIcons name="business" size={48} color="white" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Start Building Your Empire! 🏢</Text>
      <Text style={styles.emptyText}>
        Create your first organization and begin managing departments, users, and maintenance requests.
      </Text>
      <Button
        mode="contained"
        icon="add"
        onPress={() => navigation.navigate('OrganizationForm', { mode: 'create' })}
        style={{ borderRadius: 12, backgroundColor: '#F59E0B' }}
      >
        Create Organization
      </Button>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F59E0B" />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
        {!loading && organizations.length > 0 && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              marginBottom: 16,
            }}
          >
            {/* Optional: add stats header here if you want */}
          </Animated.View>
        )}

        {loading ? (
          <View style={styles.centered}>
            <MaterialIcons name="business" size={48} color="#F59E0B" />
            <Text style={{ marginTop: 12 }}>Loading your organizations...</Text>
          </View>
        ) : organizations.length === 0 ? (
          renderEmpty()
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={organizations}
              keyExtractor={(it) => it.id.toString()}
              renderItem={renderOrganization}
              contentContainerStyle={{ paddingBottom: 100 }}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#F59E0B"
                  colors={['#F59E0B']}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}
      </View>

      <FAB
        style={styles.fab}
        icon="add"
        label={organizations.length ? 'New Organization' : 'Create Organization'}
        onPress={() => navigation.navigate('OrganizationForm', { mode: 'create' })}
        color="white"
        customSize={56}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },

  organizationCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: { padding: 20 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconWrap: { marginRight: 12 },
  // image icon style (from org.url)
  orgIconImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
  },
  // fallback gradient icon style
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orgName: { fontSize: 18, fontWeight: '700', marginBottom: 2, color: '#1F2937' },
  orgUrl: { fontSize: 12, opacity: 0.7, color: '#6B7280' },
  desc: { fontSize: 14, lineHeight: 18, marginBottom: 16, opacity: 0.8, color: '#374151' },

  cardStats: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, fontWeight: '500', color: '#374151' },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 12, borderColor: '#E5E7EB' },

  emptyCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    maxWidth: width - 80,
    alignSelf: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center', color: '#1F2937' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, opacity: 0.7, color: '#374151' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
