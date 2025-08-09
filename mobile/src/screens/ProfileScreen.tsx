import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  // Backup to reset if cancel editing
  const [backup, setBackup] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get('http://10.0.2.2:8000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = res.data;
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phone_number || '');

      setBackup({
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phone_number || '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setBackup({ name, email, phoneNumber });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setName(backup.name);
    setEmail(backup.email);
    setPhoneNumber(backup.phoneNumber);
    setPassword('');
    setPasswordConfirmation('');
    setIsEditing(false);
  };

  const updateProfile = async () => {
    if (password && password !== passwordConfirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        'http://10.0.2.2:8000/api/profile',
        {
          name,
          email,
          phone_number: phoneNumber,
          ...(password ? { password, password_confirmation: passwordConfirmation } : {}),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Profile updated successfully');
      setPassword('');
      setPasswordConfirmation('');
      setIsEditing(false);
      setBackup({ name, email, phoneNumber });
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteProfile },
      ]
    );
  };

  const deleteProfile = async () => {
    setDeleting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete('http://10.0.2.2:8000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Deleted', 'Your profile has been deleted');
      // TODO: Add logout or redirect to login screen here after deletion
    } catch (error) {
      Alert.alert('Error', 'Failed to delete profile');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Profile</Text>

        {isEditing ? (
          <>
            <TextInput
              label="Name"
              mode="outlined"
              value={name}
              onChangeText={setName}
              style={styles.input}
              autoCapitalize="words"
            />

            <TextInput
              label="Email"
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              label="Phone Number"
              mode="outlined"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <TextInput
              label="New Password"
              mode="outlined"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              label="Confirm New Password"
              mode="outlined"
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry
              style={styles.input}
            />

            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={updateProfile}
                loading={saving}
                disabled={saving}
                style={[styles.button, { flex: 1, marginRight: 8 }]}
              >
                Save
              </Button>
              <Button
                mode="outlined"
                onPress={cancelEditing}
                disabled={saving}
                style={[styles.button, { flex: 1 }]}
              >
                Cancel
              </Button>
            </View>
          </>
        ) : (
          <>
            <View style={styles.readOnlyField}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{name}</Text>
            </View>

            <View style={styles.readOnlyField}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{email}</Text>
            </View>

            <View style={styles.readOnlyField}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{phoneNumber || '-'}</Text>
            </View>

            <Button mode="contained" onPress={startEditing} style={styles.button}>
              Edit Profile
            </Button>
          </>
        )}

        <Divider style={{ marginVertical: 20 }} />

        <Button
          mode="contained"
          buttonColor="#dc3545"
          onPress={confirmDelete}
          loading={deleting}
          disabled={deleting}
          style={styles.deleteButton}
        >
          Delete Profile
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
    color: '#6200ee',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginVertical: 8,
  },
  deleteButton: {
    marginVertical: 8,
    backgroundColor: '#dc3545',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  readOnlyField: {
    marginBottom: 16,
    backgroundColor: '#f4f4f4',
    padding: 12,
    borderRadius: 6,
  },
  label: {
    fontSize: 14,
    color: '#888',
  },
  value: {
    fontSize: 18,
    color: '#111',
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
