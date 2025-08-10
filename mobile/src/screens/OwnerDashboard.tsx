import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Card, Text, Button, FAB } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation, NavigationProp } from '@react-navigation/native';

type Organization = {
  id: number;
  name: string;
  description: string;
  url?: string;
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (isFocused) {
      fetchOrganizations();
    }
  }, [isFocused]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        'http://10.0.2.2:8000/api/myorganizations',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrganizations(response.data.organization);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number) => {
    Alert.alert(
      'Delete Organization',
      'Are you sure you want to delete this organization?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => deleteOrganization(id), style: 'destructive' },
      ]
    );
  };

  const deleteOrganization = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`http://10.0.2.2:8000/api/organizations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Delete failed:', error);
      Alert.alert('Error', 'Failed to delete organization');
    }
  };

  const renderItem = ({ item }: { item: Organization }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{item.name}</Text>
        {item.description ? (
          <Text variant="bodyMedium" style={styles.description}>
            {item.description}
          </Text>
        ) : null}
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="contained"
          onPress={() =>
            navigation.navigate('OrganizationForm', {
              mode: 'edit',
              organization: item,
            })
          }
        >
          Edit
        </Button>

              <Button
        mode="contained"
        buttonColor="#007bff"
        onPress={() =>
          navigation.navigate('DepartmentsListScreen', {
            organizationId: item.id,
          })
        }
      >
        Departments
      </Button>

        <Button
          mode="contained"
          buttonColor="#dc3545"
          onPress={() => confirmDelete(item.id)}
        >
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : organizations.length === 0 ? (
        <Text style={styles.noOrgText}>No organizations found.</Text>
      ) : (
        <FlatList
          data={organizations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('OrganizationForm', { mode: 'create' })}
        label="Add Organization"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  card: { marginBottom: 16 },
  description: { marginTop: 4, opacity: 0.7 },
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200ee',
  },
  noOrgText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
