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
  Image,
} from 'react-native';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Organization = {
  id: number;
  name: string;
  description: string;
  url?: string;
};

type RootStackParamList = {
  OrganizationForm: {
    mode: 'create' | 'edit';
    organization?: Organization;
  };
};

type OrganizationFormRouteProp = RouteProp<RootStackParamList, 'OrganizationForm'>;
type OrganizationFormNavigationProp = NavigationProp<RootStackParamList, 'OrganizationForm'>;

export default function OrganizationForm() {
  const route = useRoute<OrganizationFormRouteProp>();
  const navigation = useNavigation<OrganizationFormNavigationProp>();

  const { mode, organization } = route.params;

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photo, setPhoto] = useState<any>(null);

  useEffect(() => {
    if (mode === 'edit' && organization) {
      setName(organization.name);
      setDescription(organization.description);

      // If there's already an image, display it
      if (organization.url) {
        setPhoto({ uri: organization.url });
      }
    }
  }, [mode, organization]);

  // Pick image from gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'You need to allow access to the gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,  
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0]); // Store selected image
    }
  };

  // Handle submit for create/update
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Organization name is required.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);

    if (photo && photo.uri && !photo.uri.startsWith('http')) {
      // New image chosen (local file)
      formData.append('photo', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'organization.jpg',
      } as any);
    }

    try {
      const urlApi =
        mode === 'edit' && organization
          ? `http://10.0.2.2:8000/api/organizations/${organization.id}`
          : 'http://10.0.2.2:8000/api/organizations';

      const method = mode === 'edit' ? 'POST' : 'POST'; // Laravel can handle file PUT via POST + _method
      formData.append('_method', mode === 'edit' ? 'PUT' : 'POST');
const token = await AsyncStorage.getItem('token');
      const response = await fetch(urlApi, {
        method,
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to save organization');

      Alert.alert('Success', mode === 'edit' ? 'Organization updated!' : 'Organization created!');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save organization');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flexContainer}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>
          {mode === 'edit' ? 'Edit Organization' : 'Create Organization'}
        </Text>

        <Text style={styles.label}>Organization Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter organization name"
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

        <Text style={styles.label}>Organization Image</Text>
        <Button title="Pick an Image" onPress={pickImage} />
        {photo && (
          <Image
            source={{ uri: photo.uri }}
            style={{ width: '100%', height: 200, marginTop: 10, borderRadius: 8 }}
            resizeMode="cover"
          />
        )}

        <View style={{ marginTop: 20 }}>
          <Button
            title={mode === 'edit' ? 'Update Organization' : 'Create Organization'}
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
