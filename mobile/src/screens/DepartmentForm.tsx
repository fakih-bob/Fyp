import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    organizationId?: number;  // <--- added here to receive org ID when creating
  };
};

type DepartmentFormRouteProp = RouteProp<RootStackParamList, 'DepartmentForm'>;
type DepartmentFormNavigationProp = NavigationProp<RootStackParamList, 'DepartmentForm'>;

export default function DepartmentFormScreen() {
  const route = useRoute<DepartmentFormRouteProp>();
  const navigation = useNavigation<DepartmentFormNavigationProp>();

  const { mode, department, organizationId } = route.params;

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (mode === 'edit' && department) {
      setName(department.name);
      setDescription(department.description || '');
    }
  }, [mode, department]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Department name is required.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      const payload: any = {
        name: name.trim(),
        description: description.trim(),
      };

      if (mode === 'create') {
        if (!organizationId) {
          Alert.alert('Error', 'Organization ID is missing.');
          return;
        }
        payload.organization_id = organizationId;  // <-- Add org ID here when creating
      }

      let url = 'http://10.0.2.2:8000/api/departments';
      let method: 'post' | 'put' = 'post';

      if (mode === 'edit' && department) {
        url += `/${department.id}`;
        method = 'put';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save department');
      }

      Alert.alert('Success', mode === 'edit' ? 'Department updated!' : 'Department created!');
      navigation.goBack();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to save department');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flexContainer}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{mode === 'edit' ? 'Edit Department' : 'Create Department'}</Text>

        <Text style={styles.label}>Department Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter department name"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Enter description"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={{ marginTop: 20 }}>
          <Button
            title={mode === 'edit' ? 'Update Department' : 'Create Department'}
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexContainer: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16 },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
