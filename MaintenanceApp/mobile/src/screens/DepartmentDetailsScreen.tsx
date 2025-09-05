import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { 
  Text, 
  Surface,
  Button,
  Chip,
  useTheme,
  IconButton,
  FAB,
  Avatar,
  Card,
  Divider
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, NavigationProp, useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

type Department = {
  id: number;
  name: string;
  description?: string;
  organization_id: number;
  admin_id?: number | null;
  admin?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  users?: User[];
  maintenance_requests_count?: number;
  active_requests?: number;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone_number?: string;
};

type MaintenanceRequest = {
  id: number;
  title: string;
  status: string;
  created_at: string;
  user: {
    name: string;
  };
};

type RootStackParamList = {
  DepartmentDetails: {
    departmentId: number;
    organizationId: number;
  };
  AssignUserToDepartmentScreen: {
    departmentId: number;
    organizationId: number;
  };
  DepartmentForm: {
    mode: 'edit';
    department: Department;
    organizationId: number;
  };
};

type DepartmentDetailsRouteProp = RouteProp<RootStackParamList, 'DepartmentDetails'>;
type DepartmentDetailsNavigationProp = NavigationProp<RootStackParamList, 'DepartmentDetails'>;

export default function DepartmentDetailsScreen() {
  const route = useRoute<DepartmentDetailsRouteProp>();
  const navigation = useNavigation<DepartmentDetailsNavigationProp>();
  const theme = useTheme();
  const isFocused = useIsFocused();

  const { departmentId, organizationId } = route.params;

  const [department, setDepartment] = useState<Department | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recentRequests, setRecentRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (isFocused) {
      fetchDepartmentDetails();
      setTimeout(() => {
        animateEntrance();
      }, 100);
    }
  }, [isFocused]);

  const animateEntrance = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: customTheme.animation.medium,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: customTheme.animation.medium,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchDepartmentDetails = async () => {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      // Fetch department info
      const deptResponse = await axios.get(
        `http://10.0.2.2:8000/api/departments/${organizationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const departments = deptResponse.data.departments || [];
      const currentDept = departments.find((d: any) => d.id === departmentId);
      
      if (currentDept) {
        setDepartment(currentDept);
      }

      // Fetch users in this department
      try {
        const usersResponse = await axios.get(
          `http://10.0.2.2:8000/api/department-users/${departmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('Department users response:', usersResponse.data);
        setUsers(usersResponse.data.users || usersResponse.data || []);
      } catch (error: any) {
        console.error('Error fetching department users:', error);
        // Fallback to admin user if available from department data
        if (currentDept?.admin_id) {
          try {
            const adminResponse = await axios.get(
              `http://10.0.2.2:8000/api/user/${currentDept.admin_id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            setUsers([adminResponse.data.user || adminResponse.data]);
          } catch (adminError) {
            console.error('Error fetching admin user:', adminError);
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
      }

      // Fetch recent maintenance requests for this department
      try {
        const requestsResponse = await axios.get(
          `http://10.0.2.2:8000/api/maintenance-requests?department_id=${departmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('Department requests response:', requestsResponse.data);
        const allRequests = requestsResponse.data.data || requestsResponse.data.requests || [];
        // Get only recent requests (last 10)
        const recentRequests = allRequests.slice(0, 10);
        setRecentRequests(recentRequests);
      } catch (error: any) {
        console.error('Error fetching department requests:', error);
        // Try alternative endpoint for department-specific requests
        try {
          const altResponse = await axios.get(
            `http://10.0.2.2:8000/api/departments/${departmentId}/requests`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setRecentRequests(altResponse.data.requests || altResponse.data || []);
        } catch (altError) {
          console.error('Error with alternative requests endpoint:', altError);
          setRecentRequests([]);
        }
      }

    } catch (error: any) {
      console.error('Error fetching department details:', error);
      Alert.alert('Error', 'Failed to fetch department details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepartmentDetails();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return customTheme.colors.info;
      case 'pending': return customTheme.colors.warning;
      case 'in-progress': return customTheme.colors.adminBlue;
      case 'done': return customTheme.colors.success;
      default: return customTheme.colors.slate;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return customTheme.colors.adminBlue;
      case 'maintenance': return customTheme.colors.maintenanceTeal;
      case 'user': return customTheme.colors.userIndigo;
      default: return customTheme.colors.slate;
    }
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Surface style={styles.headerCard} elevation={3}>
        <LinearGradient
          colors={[customTheme.colors.adminBlue, customTheme.colors.info]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <IconButton
              icon="arrow-back"
              size={24}
              iconColor="white"
              onPress={() => navigation.goBack()}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{department?.name || 'Department'}</Text>
              <Text style={styles.headerSubtitle}>
                {department?.description || 'Department Details'}
              </Text>
            </View>
            <IconButton
              icon="edit"
              size={24}
              iconColor="white"
              onPress={() => department && navigation.navigate('DepartmentForm', {
                mode: 'edit',
                department,
                organizationId
              })}
            />
          </View>
        </LinearGradient>
      </Surface>
    </Animated.View>
  );

  const renderStatsCards = () => (
    <Animated.View
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.statsRow}>
        <Surface style={[styles.statCard, { flex: 1 }]} elevation={2}>
          <LinearGradient
            colors={[customTheme.colors.userIndigo, customTheme.colors.secondary]}
            style={styles.statGradient}
          >
            <MaterialIcons name="people" size={32} color="white" />
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Team Members</Text>
          </LinearGradient>
        </Surface>

        <Surface style={[styles.statCard, { flex: 1 }]} elevation={2}>
          <LinearGradient
            colors={[customTheme.colors.warning, customTheme.colors.ownerGold]}
            style={styles.statGradient}
          >
            <MaterialIcons name="assignment" size={32} color="white" />
            <Text style={styles.statNumber}>{recentRequests.length}</Text>
            <Text style={styles.statLabel}>Active Requests</Text>
          </LinearGradient>
        </Surface>
      </View>

      <Surface style={styles.adminCard} elevation={2}>
        <View style={styles.adminCardContent}>
          <View style={styles.adminInfo}>
            <Avatar.Icon 
              size={48} 
              icon="admin-panel-settings"
              style={{ backgroundColor: customTheme.colors.adminBlue }}
            />
            <View style={styles.adminDetails}>
              <Text style={[styles.adminName, { color: customTheme.colors.charcoal }]}>
                {department?.admin?.name || 'No admin assigned'}
              </Text>
              <Text style={[styles.adminEmail, { color: customTheme.colors.slate }]}>
                {department?.admin?.email || 'Assign an admin to manage this department'}
              </Text>
            </View>
          </View>
          {!department?.admin_id && (
            <Button
              mode="outlined"
              onPress={() => {}}
              style={styles.assignAdminButton}
              textColor={customTheme.colors.adminBlue}
              icon="group-add"
            >
              Assign Admin
            </Button>
          )}
        </View>
      </Surface>
    </Animated.View>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <Card style={styles.userCard}>
      <Card.Content style={styles.userCardContent}>
        <Avatar.Text size={40} label={item.name.charAt(0)} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: customTheme.colors.charcoal }]}>
            {item.name}
          </Text>
          <Text style={[styles.userEmail, { color: customTheme.colors.slate }]}>
            {item.email}
          </Text>
        </View>
        <Chip
          mode="flat"
          style={[styles.roleChip, { backgroundColor: getRoleColor(item.role) + '20' }]}
          textStyle={{ color: getRoleColor(item.role), fontSize: 12 }}
        >
          {item.role}
        </Chip>
      </Card.Content>
    </Card>
  );

  const renderRequestItem = ({ item }: { item: MaintenanceRequest }) => (
    <Card style={styles.requestCard}>
      <Card.Content style={styles.requestCardContent}>
        <View style={styles.requestHeader}>
          <Text style={[styles.requestTitle, { color: customTheme.colors.charcoal }]}>
            {item.title}
          </Text>
          <Chip
            mode="flat"
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
            textStyle={{ color: getStatusColor(item.status), fontSize: 12 }}
          >
            {item.status}
          </Chip>
        </View>
        <Text style={[styles.requestUser, { color: customTheme.colors.slate }]}>
          Requested by {item.user.name}
        </Text>
        <Text style={[styles.requestDate, { color: customTheme.colors.slate }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  const renderContent = () => (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={customTheme.colors.adminBlue}
            colors={[customTheme.colors.adminBlue]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderStatsCards()}

        {/* Team Members Section */}
        <Surface style={styles.sectionCard} elevation={2}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={24} color={customTheme.colors.adminBlue} />
            <Text style={[styles.sectionTitle, { color: customTheme.colors.charcoal }]}>
              Team Members ({users.length})
            </Text>
            <Button
              mode="text"
              onPress={() => navigation.navigate('AssignUserToDepartmentScreen', {
                departmentId,
                organizationId
              })}
              textColor={customTheme.colors.adminBlue}
            >
              Add User
            </Button>
          </View>
          <Divider style={{ marginVertical: 16 }} />
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUserItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        </Surface>

        {/* Recent Requests Section */}
        <Surface style={styles.sectionCard} elevation={2}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="assignment" size={24} color={customTheme.colors.adminBlue} />
            <Text style={[styles.sectionTitle, { color: customTheme.colors.charcoal }]}>
              Recent Requests ({recentRequests.length})
            </Text>
            <Button
              mode="text"
              onPress={() => {}}
              textColor={customTheme.colors.adminBlue}
            >
              View All
            </Button>
          </View>
          <Divider style={{ marginVertical: 16 }} />
          <FlatList
            data={recentRequests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRequestItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        </Surface>
      </ScrollView>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: customTheme.colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={customTheme.colors.adminBlue} />
        <View style={styles.loadingContainer}>
          <Surface style={styles.loadingCard} elevation={2}>
            <MaterialIcons name="domain" size={48} color={customTheme.colors.adminBlue} />
            <Text style={[styles.loadingText, { color: customTheme.colors.charcoal }]}>
              Loading department details...
            </Text>
          </Surface>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: customTheme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={customTheme.colors.adminBlue} translucent={false} />
      
      <LinearGradient
        colors={[customTheme.colors.background, customTheme.colors.surfaceVariant]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {renderHeader()}
          {renderContent()}
        </View>

        <FAB
          style={[
            styles.fab,
            {
              backgroundColor: customTheme.colors.adminBlue,
              shadowColor: customTheme.colors.adminBlue,
            },
          ]}
          icon="add"
          onPress={() => {}}
          label="New Request"
          color="white"
        />
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
  loadingContainer: {
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
    fontWeight: '600',
  },
  // Header
  headerCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Stats
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  adminCard: {
    borderRadius: 16,
    backgroundColor: 'white',
  },
  adminCardContent: {
    padding: 20,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminDetails: {
    flex: 1,
    marginLeft: 16,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  adminEmail: {
    fontSize: 14,
  },
  assignAdminButton: {
    borderColor: customTheme.colors.adminBlue,
  },
  // Content
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Sections
  sectionCard: {
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  // User Cards
  userCard: {
    borderRadius: 12,
    elevation: 1,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  roleChip: {
    height: 28,
  },
  // Request Cards
  requestCard: {
    borderRadius: 12,
    elevation: 1,
  },
  requestCardContent: {
    padding: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  requestUser: {
    fontSize: 14,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
  },
  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
