import React, { useState, useEffect } from 'react';
import {
  View,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Portal,
  Dialog,
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, RouteProp } from '@react-navigation/native';

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
  const { departmentId, organizationId } = route.params;

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [processingAdminId, setProcessingAdminId] = useState<number | null>(null);
  const [processingMaintenanceId, setProcessingMaintenanceId] = useState<number | null>(null);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Organization ID is missing');
      return;
    }
    setLoadingUsers(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `http://10.0.2.2:8000/api/getUsersOfOrganization/${organizationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(response.data || []);
    } catch (error: any) {
      console.log('Fetch users error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoadingUsers(false);
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
        'http://10.0.2.2:8000/api/assign-user-department',
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
        ? 'http://10.0.2.2:8000/api/RemoveAdmins'
        : 'http://10.0.2.2:8000/api/AssignAdmins';

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
        `http://10.0.2.2:8000/api/users/${userId}/assign-maintenance`,
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

  const renderUser = ({ item }: { item: any }) => {
    const user = item.user; // If your backend returns `user` nested. If not, just use item directly.
    const isAdmin = ['admin', 'dept_admin'].includes(user.role?.toLowerCase());

    return (
      <Card style={styles.card} key={user.id}>
        <Card.Content>
          <Text variant="titleMedium">{user.name}</Text>
          <Text>Email: {user.email}</Text>
          {user.phone_number && <Text>Phone: {user.phone_number}</Text>}
          {user.role && <Text>Role: {user.role}</Text>}
        </Card.Content>
        <Card.Actions style={styles.actions}>
          <Button
            mode="contained"
            onPress={() => openAssignDialog(user.id)}
            disabled={processingUserId === user.id}
            loading={processingUserId === user.id}
            style={{ marginRight: 8 }}
          >
            Assign to Department
          </Button>

          <Button
            mode={isAdmin ? 'outlined' : 'contained'}
            onPress={() => toggleAdminRole(user.id, isAdmin)}
            disabled={processingAdminId === user.id}
            loading={processingAdminId === user.id}
            style={{ marginRight: 8 }}
          >
            {isAdmin ? 'Remove Admin' : 'Make Admin'}
          </Button>

          <Button
            mode="contained"
            onPress={() => assignAsMaintenance(user.id)}
            disabled={processingMaintenanceId === user.id}
            loading={processingMaintenanceId === user.id}
          >
            Assign as Maintenance
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {loadingUsers ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : users.length === 0 ? (
        <Text style={styles.noDataText}>No users found.</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 80 }}
          style={{ marginTop: 10 }}
        />
      )}

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>Assign User to Department</Dialog.Title>
          <Dialog.Content>
            <Text>
              Assigning user ID {selectedUserId} to department ID {departmentId}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button
              mode="contained"
              onPress={assignUserToDepartment}
              loading={processingUserId !== null}
            >
              Assign
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  card: { marginBottom: 12 },
  actions: { justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 8 },
  noDataText: { textAlign: 'center', marginTop: 20, color: '#666' },
});
