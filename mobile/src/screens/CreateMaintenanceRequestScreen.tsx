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
    fetchUserDepartments();
    
    // Animate entrance
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

  const fetchUserDepartments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      
      if (!user) {
        Alert.alert('Error', 'User information not found');
        return;
      }

      const userData = JSON.parse(user);
      
      // Get user's departments - you may need to adjust this API endpoint
      // For now, I'll use a placeholder. You might need to create an endpoint that returns user's departments
      const response = await axios.get(
        'http://192.168.1.102:8000/api/user/departments', // This endpoint may need to be created
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setDepartments(response.data?.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      // For demo purposes, set empty array
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
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        // Limit to 5 images
        const newImages = result.assets.slice(0, 5 - selectedImages.length);
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for your request.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please provide a description of the issue.');
      return false;
    }
    if (!departmentId) {
      Alert.alert('Validation Error', 'Please select a department.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();

      formData.append('title', title);
      formData.append('description', description);
      formData.append('department_id', departmentId!.toString());
      formData.append('status', 'new');

      // Add images to form data
      selectedImages.forEach((image, index) => {
        formData.append('photos[]', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        } as any);
      });

      const response = await axios.post(
        'http://192.168.1.102:8000/api/maintenance-requests',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data) {
        Alert.alert(
          'Success',
          'Maintenance request created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('HomeScreen'),
            },
          ]
        );
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

  if (departments.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <MaterialIcons name="error-outline" size={64} color={theme.colors.error} />
        <Text style={styles.errorTitle}>No Departments Available</Text>
        <Text style={styles.errorText}>
          You need to be assigned to a department before creating maintenance requests.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('HomeScreen')}
          style={{ marginTop: 20 }}
        >
          Go Back
        </Button>
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
                <MaterialIcons
                  name="build"
                  size={48}
                  color={theme.colors.primary}
                />
              </Surface>
            </View>
            <Text style={[styles.title, { color: theme.colors.surface }]}>
              New Maintenance Request
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.primaryContainer }]}>
              Report an issue that needs attention
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
                  label="Request Title"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Brief description of the issue"
                  left={<TextInput.Icon icon="text-short" />}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                />

                <TextInput
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  style={[styles.input, { height: 120 }]}
                  placeholder="Detailed description of the issue..."
                  left={<TextInput.Icon icon="text-long" />}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                />

                <View style={styles.departmentSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Select Department
                  </Text>
                  <View style={styles.departmentList}>
                    {departments.map((dept) => (
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
                    ))}
                  </View>
                </View>

                <View style={styles.photoSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Photos (Optional)
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
                        <View key={index} style={styles.imagePreview}>
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
                  disabled={loading || !title.trim() || !description.trim() || !departmentId}
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
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoSurface: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '400',
  },
  formContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 35,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardContent: {
    padding: 32,
  },
  input: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  departmentSection: {
    marginBottom: 24,
  },
  departmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  departmentChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  photoSection: {
    marginBottom: 24,
  },
  photoButton: {
    marginBottom: 16,
    borderRadius: 12,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imagePreview: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    minWidth: 0,
    padding: 0,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
});
