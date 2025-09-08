import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Easing,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Surface,
  Chip,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

type Department = {
  id: number;
  name: string;
  description?: string;
};

type RootStackParamList = {
  HomeScreen: undefined;
  MyRequests: undefined;
};

type CreateMaintenanceRequestNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HomeScreen'
>;

const API_BASE = 'http://10.0.2.2:8000/api';

const CreateMaintenanceRequestScreen: React.FC = () => {
  const navigation = useNavigation<CreateMaintenanceRequestNavigationProp>();
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    (async () => {
      await ensureMediaPermissions();
      await fetchDepartments();
    })();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const ensureMediaPermissions = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow photo library access to pick images.'
      );
    }
  };

  const fetchDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/AllMyDepartments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list: Department[] = res.data?.data ?? res.data ?? [];
      setDepartments(list);
      if (!departmentId && list.length > 0) {
        setDepartmentId(list[0].id);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      Alert.alert('Error', 'Failed to load departments.');
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9,
        allowsEditing: false,
        selectionLimit: 5 - selectedImages.length, // iOS respected, Android ignored
      });

      if (!result.canceled && result.assets) {
        const limit = 5 - selectedImages.length;
        const newImages = result.assets.slice(0, Math.max(0, limit));
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!departmentId) {
      Alert.alert('Validation Error', 'Please select a department.');
      return false;
    }
    if (selectedImages.length < 1) {
      Alert.alert('Validation Error', 'Please add at least one photo.');
      return false;
    }
    // title/description are optional
    return true;
  };

  const guessMimeFromUri = (uri: string) => {
    const lower = uri.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();

      // Required: department_id
      formData.append('department_id', String(departmentId));

      // Optional (backend defaults status=new if omitted in your controller; include explicitly if you want)
      formData.append('status', 'new');

      if (title.trim()) formData.append('title', title.trim());
      if (description.trim()) formData.append('description', description.trim());

      // photos[] required (at least one)
      selectedImages.forEach((asset, index) => {
        const name = asset.fileName ?? `photo_${index}.jpg`;
        const type = asset.mimeType ?? guessMimeFromUri(asset.uri);
        formData.append('photos[]', {
          uri: asset.uri,
          name,
          type,
        } as any);
      });

      const response = await axios.post(
        `${API_BASE}/maintenance-requests`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data) {
        Alert.alert('Success', 'Maintenance request created successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('HomeScreen') },
        ]);
      }
    } catch (error: any) {
      console.error('Error creating request:', error.response?.data || error.message);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create maintenance request'
      );
    } finally {
      setLoading(false);
    }
  };

  if (departmentsLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading departments...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.tertiary]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Surface style={styles.logoSurface} elevation={3}>
                <MaterialIcons name="build" size={48} color={theme.colors.primary} />
              </Surface>
            </View>
            <Text style={[styles.title, { color: theme.colors.surface }]}>
              New Maintenance Request
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.primaryContainer }]}>
              Upload photos and pick a department
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Surface style={styles.card} elevation={5}>
              <View style={styles.cardContent}>
                <TextInput
                  label="Title (optional)"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Brief description of the issue"
                  left={<TextInput.Icon icon="edit" />}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                />

                <TextInput
                  label="Description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  style={[styles.input, { height: 120 }]}
                  placeholder="Details..."
                  left={<TextInput.Icon icon="description" />}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                />

                <View style={styles.departmentSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Select Department (required)
                  </Text>
                  <View style={styles.departmentList}>
                    {departments.length === 0 ? (
                      <View style={{ gap: 8 }}>
                        <Text>No departments found.</Text>
                        <Button mode="outlined" onPress={fetchDepartments}>
                          Refresh
                        </Button>
                      </View>
                    ) : (
                      departments.map((dept) => (
                        <Chip
                          key={dept.id}
                          selected={departmentId === dept.id}
                          onPress={() => setDepartmentId(dept.id)}
                          style={[
                            styles.departmentChip,
                            {
                              backgroundColor:
                                departmentId === dept.id
                                  ? theme.colors.primary
                                  : theme.colors.surfaceVariant,
                            },
                          ]}
                          textStyle={{
                            color:
                              departmentId === dept.id
                                ? theme.colors.onPrimary
                                : theme.colors.onSurfaceVariant,
                          }}
                        >
                          {dept.name}
                        </Chip>
                      ))
                    )}
                  </View>
                </View>

                <View style={styles.photoSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Photos (at least one)
                  </Text>

                  <Button
                    mode="outlined"
                    onPress={pickImages}
                    style={styles.photoButton}
                    icon="camera"
                    disabled={selectedImages.length >= 5}
                  >
                    {selectedImages.length === 0
                      ? 'Add Photos'
                      : `Add Photos (${selectedImages.length}/5)`}
                  </Button>

                  {selectedImages.length > 0 && (
                    <View style={styles.imagePreviewContainer}>
                      {selectedImages.map((image, index) => (
                        <View key={`${image.uri}-${index}`} style={styles.imagePreview}>
                          <Image source={{ uri: image.uri }} style={styles.previewImage} />
                          <Button
                            mode="contained"
                            onPress={() => removeImage(index)}
                            style={styles.removeButton}
                            buttonColor={theme.colors.error}
                            compact
                          >
                            ×
                          </Button>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={loading || !departmentId || selectedImages.length < 1}
                  style={styles.submitButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  buttonColor={theme.colors.primary}
                >
                  {loading ? 'Creating Request...' : 'Submit Request'}
                </Button>
              </View>
            </Surface>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default CreateMaintenanceRequestScreen;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 40 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logoContainer: { marginBottom: 24 },
  logoSurface: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },
  subtitle: { fontSize: 16, textAlign: 'center', opacity: 0.9, fontWeight: '400' },
  formContainer: { flex: 1, paddingBottom: 20 },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 35,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardContent: { padding: 32 },
  input: { marginBottom: 20, backgroundColor: 'transparent' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  departmentSection: { marginBottom: 24 },
  departmentList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  departmentChip: { marginRight: 8, marginBottom: 8 },
  photoSection: { marginBottom: 24 },
  photoButton: { marginBottom: 16, borderRadius: 12 },
  imagePreviewContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imagePreview: { position: 'relative', width: 80, height: 80 },
  previewImage: { width: '100%', height: '100%', borderRadius: 8 },
  removeButton: {
    position: 'absolute', top: -8, right: -8,
    width: 24, height: 24, borderRadius: 12, minWidth: 0, padding: 0,
  },
  submitButton: {
    marginTop: 8, borderRadius: 12, elevation: 2,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  buttonContent: { paddingVertical: 8 },
  buttonLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});
