import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, Button, FAB, TextInput } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  NewForm: undefined;
  OrganizationForm: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Organization = {
  id: number;
  name: string;
  description?: string;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('http://10.0.2.2:8000/api/getAllOrganizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrganizations(response.data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const requestToJoin = async (orgId: number) => {
  setRequestingId(orgId);
  try {
    const token = await AsyncStorage.getItem('token');
    await axios.post(
      `http://10.0.2.2:8000/api/MakeRequestToOrganization`,
      { organization_id: orgId }, // <-- pass the orgId here in the body
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    Alert.alert('Success', 'Request to join sent!');
  } catch (error) {
    console.error('Error requesting to join:', error);
    Alert.alert('Error', 'Failed to send join request');
  } finally {
    setRequestingId(null);
  }
};

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Organization }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="headlineSmall">{item.name}</Text>
        {item.description ? (
          <Text variant="bodyMedium" style={styles.subtitle}>
            {item.description}
          </Text>
        ) : null}
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="contained"
          onPress={() => requestToJoin(item.id)}
          loading={requestingId === item.id}
          disabled={requestingId === item.id}
        >
          Request to Join
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        Organizations
      </Text>
      <TextInput
        label="Search Organizations"
        value={search}
        onChangeText={setSearch}
        mode="outlined"
        style={styles.searchBar}
        clearButtonMode="while-editing"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 20 }} />
      ) : filteredOrganizations.length === 0 ? (
        <Text style={styles.noDataText}>No organizations found.</Text>
      ) : (
        <FlatList
          data={filteredOrganizations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('OrganizationForm')}
        label="Add Organization"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  title: {
    marginBottom: 16,
    fontWeight: '700',
  },
  searchBar: {
    marginBottom: 12,
  },
  card: {
    marginBottom: 16,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.7,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#6200ee',
  },
});
