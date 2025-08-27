import React, { useState, useEffect } from 'react';
import {
  View,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Portal,
  Dialog,
  Surface,
  Chip,
  IconButton,
  Avatar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  AssignUserToDepartmentScreen: {
    departmentId: number;
    organizationId: string;
  };
};

type AssignUserRouteProp = RouteProp<
  RootStackParamList,
  'AssignUserToDepartmentScreen'
>;

type User = {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role?: string;
};

export default function AssignUserToDepartmentScreen() {
  const route = useRoute<AssignUserRouteProp>();
  const navigation = useNavigation();
  const { departmentId, organizationId } = route.params;

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [processingAdminId, setProcessingAdminId] = useState<number | null>(null);
  const [processingMaintenanceId, setProcessingMaintenanceId] = useState<number | null>(null);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    fetchUsers();
    animateEntrance();
  }, []);

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

  const fetchUsers = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID is missing');
      setUsers([]);
      return;
    }
    
    try {
      if (!refreshing) setLoadingUsers(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      console.log('Fetching users for organization:', organizationId);
      
      const response = await axios.get(
        `http://192.168.10.157:8000/api/getUsersOfOrganization/${organizationId}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('Users response:', response.data);
      
      // Handle different response structures
      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        usersData = response.data.data;
      }
      
      console.log('Processed users data:', usersData);
      setUsers(usersData);
      
    } catch (error: any) {
      console.error('Fetch users error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to load users';
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view users';
      } else if (error.response?.status === 404) {
        errorMessage = 'Organization not found';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Error', errorMessage);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
      setRefreshing(false);
    }
  };

  const openAssignDialog = (userId: number) => {
    setSelectedUserId(userId);
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setSelectedUserId(null);
  };

  const assignUserToDepartment = async () => {
    if (!selectedUserId) {
      Alert.alert('Error', 'No user selected');
      return;
    }
    setProcessingUserId(selectedUserId);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        'http://192.168.10.157:8000/api/assign-user-department',
        { user_id: selectedUserId, department_id: departmentId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Assign response:', response.data);
      Alert.alert('Success', 'User assigned to department');
      closeDialog();
      fetchUsers();
    } catch (error: any) {
      console.log('Assign error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to assign user to department');
    } finally {
      setProcessingUserId(null);
    }
  };

  const toggleAdminRole = async (userId: number, isAdmin: boolean) => {
    setProcessingAdminId(userId);
    try {
      const token = await AsyncStorage.getItem('token');
      const endpoint = isAdmin
        ? 'http://192.168.10.157:8000/api/RemoveAdmins'
        : 'http://192.168.10.157:8000/api/AssignAdmins';

      const payload = {
        user_id: userId,
        department_id: departmentId,
      };

      const response = await axios.put(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Admin toggle response:', response.data);
      Alert.alert('Success', isAdmin ? 'Admin removed' : 'User promoted to admin');

      fetchUsers();
    } catch (error: any) {
      console.log('Admin toggle error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to update admin status');
    } finally {
      setProcessingAdminId(null);
    }
  };

  const assignAsMaintenance = async (userId: number) => {
    setProcessingMaintenanceId(userId);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `http://192.168.10.157:8000/api/users/${userId}/assign-maintenance`,
        { department_id: departmentId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Maintenance assign response:', response.data);
      Alert.alert('Success', 'User assigned as Maintenance');
      fetchUsers();
    } catch (error: any) {
      console.log('Maintenance assign error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to assign as maintenance');
    } finally {
      setProcessingMaintenanceId(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner': return customTheme.colors.ownerGold;
      case 'dept_admin':
      case 'admin': return customTheme.colors.adminBlue;
      case 'maintenance': return customTheme.colors.maintenanceTeal;
      case 'user': return customTheme.colors.userIndigo;
      default: return customTheme.colors.slate;
    }
  };

  const renderUser = ({ item }: { item: any }) => {
    const user = item.user || item; // Handle both nested and direct user data
    const isAdmin = ['admin', 'dept_admin'].includes(user.role?.toLowerCase());

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Surface style={styles.userCard} elevation={3}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <Avatar.Text 
                size={48} 
                label={user.name?.charAt(0)?.toUpperCase() || 'U'} 
                style={{ backgroundColor: getRoleColor(user.role || 'user') }}
                labelStyle={{ color: 'white', fontWeight: '700' }}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: customTheme.colors.charcoal }]}>
                  {user.name}
                </Text>
                <Text style={[styles.userEmail, { color: customTheme.colors.slate }]}>
                  {user.email}
                </Text>
                {user.phone_number && (
                  <Text style={[styles.userPhone, { color: customTheme.colors.slate }]}>
                    📱 {user.phone_number}
                  </Text>
                )}
              </View>
              <Chip
                mode="flat"
                style={[styles.roleChip, { backgroundColor: getRoleColor(user.role || 'user') + '20' }]}
                textStyle={{ color: getRoleColor(user.role || 'user'), fontSize: 12, fontWeight: '600' }}
              >
                {user.role || 'user'}
              </Chip>
            </View>

            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => openAssignDialog(user.id)}
                loading={processingUserId === user.id}
                disabled={
                  processingUserId === user.id ||
                  processingAdminId === user.id ||
                  processingMaintenanceId === user.id
                }
                style={[styles.primaryButton, { backgroundColor: customTheme.colors.userIndigo }]}
                icon="group-add"
                compact
              >
                Assign
              </Button>
              <Button
                mode={isAdmin ? "contained" : "outlined"}
                onPress={() => toggleAdminRole(user.id, isAdmin)}
                loading={processingAdminId === user.id}
                disabled={
                  processingUserId === user.id ||
                  processingAdminId === user.id ||
                  processingMaintenanceId === user.id
                }
                style={[
                  styles.secondaryButton, 
                  isAdmin ? 
                    { backgroundColor: customTheme.colors.adminBlue } :
                    { borderColor: customTheme.colors.adminBlue }
                ]}
                textColor={isAdmin ? 'white' : customTheme.colors.adminBlue}
                icon="admin-panel-settings"
                compact
              >
                {isAdmin ? 'Remove Admin' : 'Admin'}
              </Button>
              <Button
                mode="outlined"
                onPress={() => assignAsMaintenance(user.id)}
                loading={processingMaintenanceId === user.id}
                disabled={
                  processingUserId === user.id ||
                  processingAdminId === user.id ||
                  processingMaintenanceId === user.id
                }
                style={[styles.secondaryButton, { borderColor: customTheme.colors.maintenanceTeal }]}
                textColor={customTheme.colors.maintenanceTeal}
                icon="build"
                compact
              >
                Maintenance
              </Button>
            </View>
          </LinearGradient>
        </Surface>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <Surface style={styles.headerCard} elevation={2}>
      <LinearGradient
        colors={[customTheme.colors.userIndigo, customTheme.colors.adminBlue]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-back"
            iconColor="white"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Assign Users</Text>
            <Text style={styles.headerSubtitle}>Manage department members</Text>
          </View>
          <MaterialIcons name="group-add" size={28} color="white" />
        </View>
      </LinearGradient>
    </Surface>
  );

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: fadeAnim }],
        },
      ]}
    >
      <Surface style={styles.emptyCard} elevation={2}>
        <MaterialIcons name="group" size={64} color={customTheme.colors.outline} />
        <Text style={[styles.emptyTitle, { color: customTheme.colors.charcoal }]}>
          No Users Found
        </Text>
        <Text style={[styles.emptyText, { color: customTheme.colors.slate }]}>
          No users are available for assignment to this department.
        </Text>
      </Surface>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: customTheme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={customTheme.colors.userIndigo} translucent={false} />
      
      <LinearGradient
        colors={[customTheme.colors.background, customTheme.colors.surfaceVariant]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {renderHeader()}
          
          {loadingUsers ? (
            <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
              <Surface style={styles.loadingCard} elevation={2}>
                <ActivityIndicator size="large" color={customTheme.colors.userIndigo} />
                <Text style={[styles.loadingText, { color: customTheme.colors.charcoal }]}>
                  Loading users...
                </Text>
              </Surface>
            </Animated.View>
          ) : users.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderUser}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchUsers();
                  }}
                  colors={[customTheme.colors.userIndigo]}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </LinearGradient>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title style={{ color: customTheme.colors.charcoal }}>
            Assign User to Department
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: customTheme.colors.slate }}>
              Assigning user ID {selectedUserId} to department ID {departmentId}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog} textColor={customTheme.colors.slate}>
              Cancel
            </Button>
            <Button 
              onPress={assignUserToDepartment} 
              mode="contained"
              style={{ backgroundColor: customTheme.colors.userIndigo }}
              loading={processingUserId !== null}
            >
              Assign
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
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

  // Header
  headerCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
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

  // User Cards
  userCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
  },
  roleChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryButton: {
    flex: 1,
    minWidth: 100,
    borderRadius: 12,
    elevation: 2,
  },
  secondaryButton: {
    flex: 1,
    minWidth: 100,
    borderRadius: 12,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
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
    gap: 16,
    marginHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // List
  listContainer: {
    paddingBottom: 80,
  },
});
