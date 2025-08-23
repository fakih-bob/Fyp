import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Surface,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { theme as customTheme } from '../theme/theme';

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
  const theme = customTheme;

  const { mode, organization } = route.params;

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (mode === 'edit' && organization) {
      setName(organization.name);
      setDescription(organization.description);

      // If there's already an image, display it
      if (organization.url) {
        setPhoto({ uri: organization.url });
      }
    }

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
  }, [mode, organization]);

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to allow access to the gallery.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,  
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets) {
        setPhoto(result.assets[0]); // Store selected image
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setPhoto(null);
  };

  // Handle submit for create/update
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Organization name is required.');
      return;
    }

    setLoading(true);
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
          ? `http://192.168.1.102:8000/api/organizations/${organization.id}`
          : 'http://192.168.1.102:8000/api/organizations';

      const method = mode === 'edit' ? 'POST' : 'POST'; // Laravel can handle file PUT via POST + _method
      if (mode === 'edit') {
        formData.append('_method', 'PUT');
      }
      
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(urlApi, {
        method,
        headers: {
          // Don't set Content-Type for FormData - let the browser set it
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', response.status, response.statusText);
        console.error('API Error Body:', errorData);
        
        let errorMessage = 'Failed to save organization';
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.errors) {
            errorMessage = Object.values(errorJson.errors).flat().join(', ');
          }
        } catch (e) {
          errorMessage = errorData || 'Unknown error occurred';
        }
        
        throw new Error(errorMessage);
      }

      Alert.alert(
        'Success', 
        mode === 'edit' ? 'Organization updated!' : 'Organization created!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.secondary]}
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
                  name="business"
                  size={48}
                  color={theme.colors.primary}
                />
              </Surface>
            </View>
            <Text style={[styles.title, { color: theme.colors.surface }]}>
              {mode === 'edit' ? 'Edit Organization' : 'Create Organization'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.primaryContainer }]}>
              {mode === 'edit' ? 'Update your organization details' : 'Set up your organization'}
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
                  label="Organization Name"
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Enter organization name"
                  left={<TextInput.Icon icon="business" />}
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
                  placeholder="Describe your organization..."
                  left={<TextInput.Icon icon="text-long" />}
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                />

                <View style={styles.imageSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Organization Logo
                  </Text>
                  
                  <View style={styles.imageActions}>
                    <Button
                      mode="outlined"
                      onPress={pickImage}
                      style={styles.imageButton}
                      icon="camera"
                    >
                      {photo ? 'Change Image' : 'Add Image'}
                    </Button>
                    
                    {photo && (
                      <Button
                        mode="contained"
                        onPress={removeImage}
                        style={styles.removeButton}
                        buttonColor={theme.colors.error}
                        icon="delete"
                        compact
                      >
                        Remove
                      </Button>
                    )}
                  </View>

                  {photo && (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={loading || !name.trim()}
                  style={styles.submitButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  buttonColor={theme.colors.primary}
                >
                  {loading 
                    ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
                    : (mode === 'edit' ? 'Update Organization' : 'Create Organization')
                  }
                </Button>
              </View>
            </Surface>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
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
  imageSection: {
    marginBottom: 24,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    borderRadius: 12,
  },
  removeButton: {
    borderRadius: 12,
  },
  imagePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePreview: {
    width: '100%',
    height: 200,
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
});
