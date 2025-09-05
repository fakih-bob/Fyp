import React, { useState, useEffect } from 'react';
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
  TouchableOpacity,
} from 'react-native';
import { 
  Card, 
  Button, 
  FAB, 
  useTheme, 
  Surface,
  Text,
  IconButton,
  Chip,
  Searchbar
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

type Department = {
  id: number;
  name: string;
  description?: string;
  organization_id: number;
  admin_id?: number | null;
};

type RootStackParamList = {
  DepartmentForm: {
    mode: 'create' | 'edit';
    department?: Department;
    organizationId?: number;
  };
  DepartmentsListScreen: {
    organizationId: number;
  };
  DepartmentDetails: {
    departmentId: number;
    organizationId: number;
  };
  AssignUserToDepartmentScreen: {
    departmentId: number;
    organizationId: number;
  };
};

type DepartmentsListRouteProp = RouteProp<
  RootStackParamList,
  'DepartmentsListScreen'
>;
type DepartmentsListNavigationProp = NavigationProp<
  RootStackParamList,
  'DepartmentsListScreen'
>;

export default function DepartmentsListScreen() {
  const route = useRoute<DepartmentsListRouteProp>();
  const navigation = useNavigation<DepartmentsListNavigationProp>();

  const { organizationId } = route.params;

  const theme = useTheme();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const isFocused = useIsFocused();

  useEffect(() => {
    const startAnimations = () => {
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

    if (isFocused) {
      fetchDepartments();
      // Delay animation to ensure data is loaded
      setTimeout(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        startAnimations();
      }, 100);
    }
  }, [isFocused]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter((dept) =>
        dept.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDepartments(filtered);
    }
  }, [searchQuery, departments]);

  const fetchDepartments = async () => {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        setDepartments([]);
        setFilteredDepartments([]);
        return;
      }

      console.log('Fetching departments for organization:', organizationId);
      
      const response = await axios.get(
        `http://10.0.2.2:8000/api/departments/${organizationId}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // Increased timeout
        }
      );
      
      console.log('Departments response:', response.data);
      
      // More robust data extraction
      let departmentsData = [];
      if (response.data?.departments && Array.isArray(response.data.departments)) {
        departmentsData = response.data.departments;
      } else if (Array.isArray(response.data)) {
        departmentsData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        departmentsData = response.data.data;
      }
      
      console.log('Extracted departments data:', departmentsData);
      
      // Ensure we always have an array
      const validDepartments = departmentsData.filter((dept: { id: any; }) => dept && dept.id);
      
      console.log('Valid departments count:', validDepartments.length);
      
      setDepartments(validDepartments);
      setFilteredDepartments(validDepartments);
      
      // Force a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to fetch departments';
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view departments';
      } else if (error.response?.status === 404) {
        errorMessage = 'Organization not found';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      // Don't show alert for 404 if it's just no departments
      if (error.response?.status !== 404) {
        Alert.alert('Error', errorMessage);
      }
      setDepartments([]);
      setFilteredDepartments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepartments();
  };

  const confirmDelete = (id: number) => {
    Alert.alert(
      'Delete Department',
      'Are you sure you want to delete this department?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deleteDepartment(id), style: 'destructive' },
      ]
    );
  };

  const deleteDepartment = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`http://10.0.2.2:8000/api/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Success', 'Department deleted successfully');
      fetchDepartments();
    } catch (error: any) {
      console.error('Delete error:', error.response?.data || error);
      Alert.alert('Error', 'Failed to delete department');
    }
  };

  const assignAdmin = async (departmentId: number, userId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        'http://10.0.2.2:8000/api/AssignAdmins',
        { department_id: departmentId, user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Admin assigned successfully');
      fetchDepartments();
    } catch (error: any) {
      console.error('Assign admin error:', error.response?.data || error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to assign admin'
      );
    }
  };

  const removeAdmin = async (departmentId: number, userId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        'http://10.0.2.2:8000/api/RemoveAdmins',
        { department_id: departmentId, user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Admin removed successfully');
      fetchDepartments();
    } catch (error: any) {
      console.error('Remove admin error:', error.response?.data || error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to remove admin'
      );
    }
  };

  const renderStatsHeader = () => {
    const totalDepts = departments.length;
    const activeDepts = departments.filter(dept => dept.admin_id).length;

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
            colors={[customTheme.colors.adminBlue, customTheme.colors.info]}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsRow}>
              <View style={styles.statsItem}>
                <MaterialIcons name="domain" size={24} color="white" />
                <Text style={styles.statsNumber}>{totalDepts}</Text>
                <Text style={styles.statsLabel}>Total Departments</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="admin-panel-settings" size={24} color="white" />
                <Text style={styles.statsNumber}>{activeDepts}</Text>
                <Text style={styles.statsLabel}>With Admins</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="people" size={24} color="white" />
                <Text style={styles.statsNumber}>{totalDepts - activeDepts}</Text>
                <Text style={styles.statsLabel}>Need Admins</Text>
              </View>
            </View>
          </LinearGradient>
        </Surface>
      </Animated.View>
    );
  };

  const renderSearchBar = () => (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Searchbar
        placeholder="Search departments..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchBar, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
        inputStyle={{ color: customTheme.colors.charcoal }}
        iconColor={customTheme.colors.adminBlue}
        placeholderTextColor={customTheme.colors.slate}
        elevation={2}
      />
    </Animated.View>
  );

  const renderDepartment = ({ item, index }: { item: Department; index: number }) => {
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
        <Surface style={styles.departmentCard} elevation={4}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            style={styles.cardGradient}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.deptIconContainer}>
                <LinearGradient
                  colors={[customTheme.colors.adminBlue, customTheme.colors.info]}
                  style={styles.iconGradient}
                >
                  <MaterialIcons name="domain" size={24} color="white" />
                </LinearGradient>
              </View>
              
              <View style={styles.cardHeaderInfo}>
                <Text style={[styles.departmentName, { color: customTheme.colors.charcoal }]}>
                  {item.name}
                </Text>
                {item.admin_id ? (
                  <Chip 
                    mode="flat" 
                    style={[styles.adminChip, { backgroundColor: customTheme.colors.success + '20' }]}
                    textStyle={{ color: customTheme.colors.success, fontSize: 12 }}
                    icon="check-circle"
                  >
                    Has Admin
                  </Chip>
                ) : (
                  <Chip 
                    mode="flat" 
                    style={[styles.adminChip, { backgroundColor: customTheme.colors.warning + '20' }]}
                    textStyle={{ color: customTheme.colors.warning, fontSize: 12 }}
                    icon="alert-circle"
                  >
                    Needs Admin
                  </Chip>
                )}
              </View>

              <IconButton
                icon="more-horiz"
                size={20}
                iconColor={customTheme.colors.slate}
                onPress={() => {}}
              />
            </View>

            {/* Description */}
            {item.description ? (
              <Text style={[styles.departmentDescription, { color: customTheme.colors.slate }]}>
                {item.description}
              </Text>
            ) : null}

            {/* Admin Info */}
            <View style={styles.adminInfo}>
              <MaterialIcons 
                name={item.admin_id ? "admin-panel-settings" : "person"} 
                size={16} 
                color={item.admin_id ? customTheme.colors.success : customTheme.colors.warning} 
              />
              <Text style={[styles.adminText, { color: customTheme.colors.slate }]}>
                {item.admin_id ? `Admin ID: ${item.admin_id}` : 'No admin assigned'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.cardActions}>
              <Button
                mode="contained"
                onPress={() =>
                  navigation.navigate('DepartmentDetails', {
                    departmentId: item.id,
                    organizationId,
                  })
                }
                style={[styles.actionButton, styles.viewButton, { backgroundColor: customTheme.colors.adminBlue }]}
                icon="remove-red-eye"
                compact
              >
                View Details
              </Button>

              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('AssignUserToDepartmentScreen', {
                    departmentId: item.id,
                    organizationId,
                  })
                }
                style={[styles.actionButton, styles.assignButton]}
                textColor={customTheme.colors.info}
                icon="group-add"
                compact
              >
                Assign Users
              </Button>
            </View>

            {/* Secondary Action Buttons */}
            <View style={styles.secondaryActions}>
              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('DepartmentForm', {
                    mode: 'edit',
                    department: item,
                    organizationId,
                  })
                }
                style={[styles.actionButton, styles.editButton]}
                textColor={customTheme.colors.adminBlue}
                icon="edit"
                compact
              >
                Edit
              </Button>

              <Button
                mode="outlined"
                onPress={() => confirmDelete(item.id)}
                style={[styles.actionButton, styles.deleteButton]}
                textColor={customTheme.colors.error}
                icon="delete"
                compact
              >
                Delete
              </Button>
            </View>

            {/* Admin Actions */}
            {item.admin_id && (
              <View style={styles.adminActions}>
                <Button
                  mode="text"
                  onPress={() => removeAdmin(item.id, item.admin_id!)}
                  textColor={customTheme.colors.warning}
                  icon="remove-circle"
                  compact
                >
                  Remove Admin
                </Button>
              </View>
            )}
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
          colors={[customTheme.colors.adminBlue, customTheme.colors.info]}
          style={styles.emptyIconContainer}
        >
          <MaterialIcons name="domain" size={48} color="white" />
        </LinearGradient>
        
        <Text style={[styles.emptyTitle, { color: customTheme.colors.charcoal }]}>
          No Departments Yet! 🏢
        </Text>
        <Text style={[styles.emptyText, { color: customTheme.colors.slate }]}>
          Create your first department to organize your team and manage workflows effectively.
        </Text>
        
        <Button
          mode="contained"
          onPress={() => navigation.navigate('DepartmentForm', { 
            mode: 'create', 
            organizationId 
          })}
          style={[styles.emptyButton, { backgroundColor: customTheme.colors.adminBlue }]}
          icon="add"
        >
          Create Department
        </Button>
      </Surface>
    </Animated.View>
  );

  const renderPageHeader = () => (
    <Surface style={styles.pageHeaderCard} elevation={2}>
      <LinearGradient
        colors={[customTheme.colors.adminBlue, customTheme.colors.info]}
        style={styles.pageHeaderGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.pageHeaderContent}>
          <MaterialIcons name="domain" size={28} color="white" />
          <View style={styles.pageHeaderTextContainer}>
            <Text style={styles.pageHeaderTitle}>Departments</Text>
            <Text style={styles.pageHeaderSubtitle}>Manage organization departments</Text>
          </View>
        </View>
      </LinearGradient>
    </Surface>
  );

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
          {renderPageHeader()}
          {!loading && departments.length > 0 && renderStatsHeader()}
          {!loading && departments.length > 0 && renderSearchBar()}
          
          {loading ? (
            <Animated.View style={[styles.centered, { opacity: fadeAnim }]}>
              <Surface style={styles.loadingCard} elevation={2}>
                <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
                  <MaterialIcons name="domain" size={48} color={customTheme.colors.adminBlue} />
                </Animated.View>
                <Text style={[styles.loadingText, { color: customTheme.colors.charcoal }]}>
                  Loading departments...
                </Text>
              </Surface>
            </Animated.View>
          ) : filteredDepartments.length === 0 ? (
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
                data={filteredDepartments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderDepartment}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={customTheme.colors.adminBlue}
                    colors={[customTheme.colors.adminBlue]}
                  />
                }
                showsVerticalScrollIndicator={false}
              />
            </Animated.View>
          )}
        </View>

        {/* Premium FAB - Show only when departments exist */}
        {!loading && departments.length > 0 && (
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
                  backgroundColor: customTheme.colors.adminBlue,
                  shadowColor: customTheme.colors.adminBlue,
                },
              ]}
              icon="add"
              onPress={() => navigation.navigate('DepartmentForm', { 
                mode: 'create', 
                organizationId 
              })}
              label="New Department"
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
  // Page Header
  pageHeaderCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pageHeaderGradient: {
    padding: 20,
  },
  pageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pageHeaderTextContainer: {
    flex: 1,
  },
  pageHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  pageHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  // Stats Header
  statsCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // Search Bar
  searchBar: {
    marginBottom: 24,
    borderRadius: 16,
    elevation: 2,
  },
  statsGradient: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 8,
  },
  statsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  // Department Cards
  departmentCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deptIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  adminChip: {
    alignSelf: 'flex-start',
    height: 28,
  },
  departmentDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
    opacity: 0.8,
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  adminText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  viewButton: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  assignButton: {
    borderColor: customTheme.colors.info,
  },
  editButton: {
    borderColor: customTheme.colors.adminBlue,
  },
  deleteButton: {
    borderColor: customTheme.colors.error,
  },
  adminActions: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 12,
  },
  // Empty State
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  emptyButton: {
    borderRadius: 16,
    paddingHorizontal: 24,
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
