import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  FAB, 
  useTheme, 
  Surface,
  Chip,
  IconButton 
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation, NavigationProp } from '@react-navigation/native';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

type Organization = {
  id: number;
  name: string;
  description: string;
  url?: string;
  departments_count?: number;
  users_count?: number;
};

type RootStackParamList = {
  ownerdashboard: undefined;
  OrganizationForm: {
    mode: 'create' | 'edit';
    organization?: Organization;
  };
  DepartmentsListScreen: {
    organizationId: number;
  };
};

export default function OwnerOrganizationsScreen() {
  const theme = customTheme;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (isFocused) {
      fetchOrganizations();
      // Delay animation to ensure data is loaded
      setTimeout(() => {
        animateEntrance();
      }, 200);
    }
  }, [isFocused]);

  const animateEntrance = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.extraSlow,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: theme.animation.extraSlow,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchOrganizations = async () => {
    try {
      // Only set loading if not refreshing
      if (!refreshing) setLoading(true);
      
      const token = await AsyncStorage.getItem('token');
      console.log('Fetching organizations...');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        setOrganizations([]);
        return;
      }
      
      const response = await axios.get(
        'http://10.0.2.2:8000/api/myorganizations',
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('Fetch response:', response.data);
      console.log('Organizations data:', response.data.organization);
      
      // Handle multiple possible response structures
      let organizationsData;
      if (response.data.organization) {
        organizationsData = response.data.organization;
      } else if (response.data.organizations) {
        organizationsData = response.data.organizations;
      } else if (Array.isArray(response.data)) {
        organizationsData = response.data;
      } else if (response.data.data) {
        organizationsData = response.data.data;
      } else {
        organizationsData = [];
      }
      
      const validOrganizations = Array.isArray(organizationsData) ? organizationsData : [];
      console.log('Setting organizations:', validOrganizations);
      setOrganizations(validOrganizations);
      
    } catch (error: any) {
      console.error('Fetch error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to load organizations';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view organizations';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication expired. Please login again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
      setOrganizations([]); // Set empty array on error
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
          style: 'destructive' 
        },
      ]
    );
  };

  const deleteOrganization = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Attempting to delete organization with ID:', id);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }
      
      const response = await axios.delete(`http://10.0.2.2:8000/api/organizations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Delete response:', response.data);
      fetchOrganizations();
      Alert.alert('Success', 'Organization deleted successfully');
    } catch (error: any) {
      console.error('Delete failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to delete organization';
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this organization';
      } else if (error.response?.status === 404) {
        errorMessage = 'Organization not found';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const renderStatsHeader = () => {
    const totalOrgs = organizations.length;
    const totalDepts = organizations.reduce((sum, org) => sum + (org.departments_count || 0), 0);
    const totalUsers = organizations.reduce((sum, org) => sum + (org.users_count || 0), 0);

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Surface style={styles.statsCard} elevation={3}>
          <LinearGradient
            colors={[theme.colors.ownerGold, '#F59E0B']}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsContent}>
              <View style={styles.statsItem}>
                <MaterialIcons name="business" size={24} color="white" />
                <Text style={styles.statsNumber}>{totalOrgs}</Text>
                <Text style={styles.statsLabel}>Organizations</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="domain" size={24} color="white" />
                <Text style={styles.statsNumber}>{totalDepts}</Text>
                <Text style={styles.statsLabel}>Departments</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="group" size={24} color="white" />
                <Text style={styles.statsNumber}>{totalUsers}</Text>
                <Text style={styles.statsLabel}>Total Users</Text>
              </View>
            </View>
          </LinearGradient>
        </Surface>
      </Animated.View>
    );
  };

  const renderOrganization = ({ item, index }: { item: Organization; index: number }) => {
    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Surface style={styles.organizationCard} elevation={4}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            style={styles.cardGradient}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.organizationIcon}>
                <LinearGradient
                  colors={[theme.colors.ownerGold, '#F59E0B']}
                  style={styles.iconGradient}
                >
                  <MaterialIcons name="business" size={24} color="white" />
                </LinearGradient>
              </View>
              
              <View style={styles.cardHeaderInfo}>
                <Text style={[styles.organizationName, { color: theme.colors.charcoal }]}>
                  {item.name}
                </Text>
                {item.url && (
                  <Text style={[styles.organizationUrl, { color: theme.colors.slate }]}>
                    {item.url}
                  </Text>
                )}
              </View>

              <IconButton
                icon="more-horiz"
                size={20}
                iconColor={theme.colors.slate}
                onPress={() => {}}
              />
            </View>

            {/* Description */}
            {item.description ? (
              <Text style={[styles.organizationDescription, { color: theme.colors.slate }]}>
                {item.description}
              </Text>
            ) : null}

            {/* Stats */}
            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <MaterialIcons name="domain" size={16} color={theme.colors.ownerGold} />
                <Text style={[styles.statText, { color: theme.colors.slate }]}>
                  {item.departments_count || 0} Departments
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="group" size={16} color={theme.colors.ownerGold} />
                <Text style={[styles.statText, { color: theme.colors.slate }]}>
                  {item.users_count || 0} Users
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.cardActions}>
              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('DepartmentsListScreen', {
                    organizationId: item.id,
                  })
                }
                style={[styles.actionButton, styles.deptButton]}
                textColor={theme.colors.info}
                icon="domain"
                compact
              >
                Departments
              </Button>

              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('OrganizationForm', {
                    mode: 'edit',
                    organization: item,
                  })
                }
                style={[styles.actionButton, styles.editButton]}
                textColor={theme.colors.ownerGold}
                icon="edit"
                compact
              >
                Edit
              </Button>

              <Button
                mode="outlined"
                onPress={() => confirmDelete(item.id, item.name)}
                style={[styles.actionButton, styles.deleteButton]}
                textColor={theme.colors.error}
                icon="delete"
                compact
              >
                Delete
              </Button>
            </View>
          </LinearGradient>
        </Surface>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Surface style={styles.emptyCard} elevation={2}>
        <LinearGradient
          colors={[theme.colors.ownerGold, '#F59E0B']}
          style={styles.emptyIconContainer}
        >
          <MaterialIcons name="business" size={48} color="white" />
        </LinearGradient>
        
        <Text style={[styles.emptyTitle, { color: theme.colors.charcoal }]}>
          Start Building Your Empire! 🏢
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.slate }]}>
          Create your first organization and begin managing departments, users, and maintenance requests.
        </Text>
        
        <Button
          mode="contained"
          onPress={() => navigation.navigate('OrganizationForm', { mode: 'create' })}
          style={[styles.emptyButton, { backgroundColor: theme.colors.ownerGold }]}
          icon="add"
        >
          Create Organization
        </Button>
      </Surface>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.ownerGold} />
      
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surfaceVariant]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {!loading && organizations.length > 0 && renderStatsHeader()}
          
          {loading ? (
            <Animated.View style={[styles.centered, { opacity: fadeAnim }]}>
              <Surface style={styles.loadingCard} elevation={2}>
                <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
                  <MaterialIcons name="business" size={48} color={theme.colors.ownerGold} />
                </Animated.View>
                <Text style={[styles.loadingText, { color: theme.colors.charcoal }]}>
                  Loading your organizations...
                </Text>
              </Surface>
            </Animated.View>
          ) : organizations.length === 0 ? (
            renderEmptyState()
          ) : (
            <Animated.View
              style={[
                styles.listContainer,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <FlatList
                data={organizations}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderOrganization}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.colors.ownerGold}
                    colors={[theme.colors.ownerGold]}
                  />
                }
                showsVerticalScrollIndicator={false}
              />
            </Animated.View>
          )}
        </View>

        {/* Premium FAB - Always show when not loading */}
        {!loading && (
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
                transform: [
                  {
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <FAB
              style={[
                styles.fab,
                {
                  backgroundColor: theme.colors.ownerGold,
                  shadowColor: theme.colors.ownerGold,
                },
              ]}
              icon="add"
              onPress={() => {
                console.log('FAB pressed - navigating to OrganizationForm');
                navigation.navigate('OrganizationForm', { mode: 'create' });
              }}
              label={organizations.length > 0 ? "New Organization" : "Create Organization"}
              color="white"
              customSize={56}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  statsCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginTop: 6,
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  organizationCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  organizationIcon: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  organizationName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  organizationUrl: {
    fontSize: 12,
    opacity: 0.7,
  },
  organizationDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
    opacity: 0.8,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  deptButton: {
    borderColor: '#7C3AED',
  },
  editButton: {
    borderColor: '#F59E0B',
  },
  deleteButton: {
    borderColor: '#DC2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    maxWidth: width - 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.7,
  },
  emptyButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});