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

type AssignUserRouteProp = RouteProp<RootStackParamList, 'AssignUserToDepartmentScreen'>;

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
    } catch (error) {
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
      await axios.post(
        'http://10.0.2.2:8000/api/assign-user-department',
        {
          user_id: selectedUserId,
          department_id: departmentId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'User assigned to department');
      closeDialog();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign user to department');
    } finally {
      setProcessingUserId(null);
    }
  };

  const renderUser = ({ item }: { item: any }) => {
  const user = item.user;  // extract user info from the nested 'user' key
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
        >
          Assign to Department
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
