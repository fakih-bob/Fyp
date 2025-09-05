import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Menu,
  TextInput,
} from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Organization = {
  id: number;
  name: string;
};

export default function OrganizationRequestsScreen() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // For dropdown menu
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    fetchMyOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchRequests(selectedOrg.id);
    } else {
      setRequests([]);
    }
  }, [selectedOrg]);

  const fetchMyOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        'http://10.0.2.2:8000/api/myorganizations', // Your API to fetch user's organizations
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrganizations(response.data.organization || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      Alert.alert('Error', 'Failed to load your organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchRequests = async (orgId: number) => {
    setLoadingRequests(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `http://10.0.2.2:8000/api/getRequestsForOrganization/${orgId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  const acceptRequest = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `http://10.0.2.2:8000/api/acceptRequest/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Request accepted');
      if (selectedOrg) fetchRequests(selectedOrg.id);
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const declineRequest = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `http://10.0.2.2:8000/api/declineRequest/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Request declined');
      if (selectedOrg) fetchRequests(selectedOrg.id);
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline request');
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequest = ({ item }: { item: any }) => (
    <Card style={styles.card} key={item.id}>
      <Card.Content>
        <Text variant="titleMedium">User: {item.user?.name || 'N/A'}</Text>
        <Text>Email: {item.user?.email || 'N/A'}</Text>
        <Text>Phone: {item.user?.phone_number || 'N/A'}</Text>
        <Text>Status: {item.status}</Text>
      </Card.Content>
      <Card.Actions style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => acceptRequest(item.id)}
          loading={processingId === item.id}
          disabled={processingId === item.id}
        >
          Accept
        </Button>
        <Button
          mode="contained"
          buttonColor="#dc3545"
          onPress={() => declineRequest(item.id)}
          loading={processingId === item.id}
          disabled={processingId === item.id}
        >
          Decline
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.dropdownAnchor}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={styles.selectedOrgText}>
                {selectedOrg ? selectedOrg.name : 'Select Organization'}
              </Text>
            </TouchableOpacity>
          }
        >
          {loadingOrgs ? (
            <ActivityIndicator style={{ margin: 10 }} />
          ) : organizations.length === 0 ? (
            <Menu.Item title="No organizations found" disabled />
          ) : (
            organizations.map((org) => (
              <Menu.Item
                key={org.id}
                onPress={() => {
                  setSelectedOrg(org);
                  setMenuVisible(false);
                }}
                title={org.name}
              />
            ))
          )}
        </Menu>
      </View>

      {loadingRequests ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 20 }} />
      ) : requests.length === 0 ? (
        <Text style={styles.noRequestsText}>
          {selectedOrg
            ? 'No requests found for this organization.'
            : 'Please select an organization.'}
        </Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequest}
          contentContainerStyle={{ paddingBottom: 80 }}
          style={{ marginTop: 10 }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
  dropdownAnchor: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedOrgText: { fontSize: 16 },
  card: { marginBottom: 12 },
  actions: { justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 },
  noRequestsText: { textAlign: 'center', marginTop: 20, color: '#666' },
});
