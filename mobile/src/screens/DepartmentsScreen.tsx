import React, { useState, useEffect } from 'react';
import {
  View,
  Alert,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Text,
} from 'react-native';
import { Card, Button, FAB } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native';

type Department = {
  id: number;
  name: string;
  description?: string;
  organization_id: number;
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
  AssignUserToDepartmentScreen: {
    departmentId: number;
    organizationId: number;
  };
};

type DepartmentsListRouteProp = RouteProp<RootStackParamList, 'DepartmentsListScreen'>;
type DepartmentsListNavigationProp = NavigationProp<RootStackParamList, 'DepartmentsListScreen'>;

export default function DepartmentsListScreen() {
  const route = useRoute<DepartmentsListRouteProp>();
  const navigation = useNavigation<DepartmentsListNavigationProp>();

  const { organizationId } = route.params;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) fetchDepartments();
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
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `http://10.0.2.2:8000/api/departments/${organizationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartments(response.data.departments || []);
      setFilteredDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    Alert.alert('Delete Department', 'Are you sure you want to delete this department?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', onPress: () => deleteDepartment(id), style: 'destructive' },
    ]);
  };

  const deleteDepartment = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`http://10.0.2.2:8000/api/departments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchDepartments();
    } catch (error) {
      console.error('Delete failed:', error);
      Alert.alert('Error', 'Failed to delete department');
    }
  };

  const renderItem = ({ item }: { item: Department }) => (
    <Card style={styles.card} elevation={3}>
      <Card.Content>
        <Text style={styles.departmentName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="contained"
          onPress={() =>
            navigation.navigate('DepartmentForm', {
              mode: 'edit',
              department: item,
              organizationId,
            })
          }
          style={styles.editButton}
          labelStyle={{ color: '#fff' }}
        >
          Edit
        </Button>
        <Button
          mode="contained"
          buttonColor="#dc3545"
          onPress={() => confirmDelete(item.id)}
          style={styles.deleteButton}
          labelStyle={{ color: '#fff' }}
        >
          Delete
        </Button>
        {/* New Button to Assign User */}
        <Button
          mode="outlined"
          onPress={() =>
            navigation.navigate('AssignUserToDepartmentScreen', {
              departmentId: item.id,
              organizationId,
            })
          }
          style={styles.assignButton}
        >
          Assign Users
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Departments</Text>

      <TextInput
        placeholder="Search departments..."
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 40 }} />
      ) : filteredDepartments.length === 0 ? (
        <Text style={styles.noDeptText}>No departments found.</Text>
      ) : (
        <FlatList
          data={filteredDepartments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() =>
          navigation.navigate('DepartmentForm', {
            mode: 'create',
            organizationId,
          })
        }
        label="Add Department"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: '#6200ee',
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 16,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  departmentName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  editButton: {
    backgroundColor: '#6200ee',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  assignButton: {
    borderColor: '#6200ee',
    marginLeft: 8,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200ee',
  },
  noDeptText: {
    marginTop: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
});
