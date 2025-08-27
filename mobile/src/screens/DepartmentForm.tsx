import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

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
};

type DepartmentFormRouteProp = RouteProp<RootStackParamList, 'DepartmentForm'>;
type DepartmentFormNavigationProp = NavigationProp<RootStackParamList, 'DepartmentForm'>;

export default function DepartmentFormScreen() {
  const route = useRoute<DepartmentFormRouteProp>();
  const navigation = useNavigation<DepartmentFormNavigationProp>();
  const theme = useTheme();

  const { mode, department, organizationId } = route.params;

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    if (mode === 'edit' && department) {
      setName(department.name);
      setDescription(department.description || '');
    }

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: customTheme.animation.medium,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: customTheme.animation.medium,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: customTheme.animation.medium,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode, department]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Department name is required');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const requestData = {
        name: name.trim(),
        description: description.trim() || undefined,
        organization_id: organizationId,
      };

      console.log('Submitting department:', requestData);

      let url = 'http://192.168.10.157:8000/api/departments';
      let method: 'post' | 'put' = 'post';

      if (mode === 'edit' && department) {
        url = `http://192.168.10.157:8000/api/departments/${department.id}`;
        method = 'put';
      }

      const response = await axios[method](url, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Department response:', response.data);

      Alert.alert(
        'Success', 
        mode === 'edit' ? 'Department updated successfully!' : 'Department created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

    } catch (error: any) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = mode === 'edit' ? 'Failed to update department' : 'Failed to create department';
      
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to perform this action';
      } else if (error.response?.status === 422) {
        errorMessage = 'Please check your input and try again';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Surface style={styles.headerCard} elevation={3}>
        <LinearGradient
          colors={[customTheme.colors.adminBlue, customTheme.colors.info]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <MaterialIcons 
                  name={mode === 'edit' ? 'edit' : 'add'} 
                  size={28} 
                  color="white" 
                />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {mode === 'edit' ? 'Edit Department' : 'Create Department'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {mode === 'edit' ? 'Update department details' : 'Add a new department to your organization'}
                </Text>
              </View>
            </View>
            <IconButton
              icon="close"
              size={24}
              iconColor="white"
              onPress={() => navigation.goBack()}
            />
          </View>
        </LinearGradient>
      </Surface>
    </Animated.View>
  );

  const renderForm = () => (
    <Animated.View
      style={[
        styles.formContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <Surface style={styles.formCard} elevation={4}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
          style={styles.formGradient}
        >
          <View style={styles.formContent}>
            {/* Department Name Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <MaterialIcons 
                  name="domain" 
                  size={20} 
                  color={customTheme.colors.adminBlue} 
                />
                <Text style={[styles.fieldLabel, { color: customTheme.colors.charcoal }]}>
                  Department Name *
                </Text>
              </View>
              <TextInput
                mode="outlined"
                value={name}
                onChangeText={setName}
                placeholder="Enter department name"
                style={styles.textInput}
                outlineColor={customTheme.colors.slate + '40'}
                activeOutlineColor={customTheme.colors.adminBlue}
                theme={{
                  colors: {
                    primary: customTheme.colors.adminBlue,
                  },
                }}
                left={<TextInput.Icon icon="domain" color={customTheme.colors.adminBlue} />}
              />
            </View>

            {/* Description Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <MaterialIcons 
                  name="description" 
                  size={20} 
                  color={customTheme.colors.adminBlue} 
                />
                <Text style={[styles.fieldLabel, { color: customTheme.colors.charcoal }]}>
                  Description
                </Text>
              </View>
              <TextInput
                mode="outlined"
                value={description}
                onChangeText={setDescription}
                placeholder="Enter department description (optional)"
                multiline
                numberOfLines={4}
                style={[styles.textInput, styles.multilineInput]}
                outlineColor={customTheme.colors.slate + '40'}
                activeOutlineColor={customTheme.colors.adminBlue}
                theme={{
                  colors: {
                    primary: customTheme.colors.adminBlue,
                  },
                }}
                left={<TextInput.Icon icon="description" color={customTheme.colors.adminBlue} />}
              />
            </View>

            {/* Submit Button */}
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || !name.trim()}
                style={[
                  styles.submitButton,
                  { backgroundColor: customTheme.colors.adminBlue }
                ]}
                contentStyle={styles.submitButtonContent}
                icon={mode === 'edit' ? 'save' : 'add'}
              >
                {loading 
                  ? (mode === 'edit' ? 'Updating...' : 'Creating...') 
                  : (mode === 'edit' ? 'Update Department' : 'Create Department')
                }
              </Button>

              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                disabled={loading}
                style={[
                  styles.cancelButton,
                  { borderColor: customTheme.colors.slate }
                ]}
                textColor={customTheme.colors.slate}
                contentStyle={styles.cancelButtonContent}
                icon="close"
              >
                Cancel
              </Button>
            </View>
          </View>
        </LinearGradient>
      </Surface>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: customTheme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={customTheme.colors.adminBlue} />
      
      <LinearGradient
        colors={[customTheme.colors.background, customTheme.colors.surfaceVariant]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderHeader()}
            {renderForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  // Header
  header: {
    marginBottom: 24,
  },
  headerCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    maxWidth: width - 140,
  },
  // Form
  formContainer: {
    flex: 1,
  },
  formCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  formGradient: {
    padding: 24,
    minHeight: 400,
  },
  formContent: {
    flex: 1,
  },
  // Fields
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 120,
  },
  // Buttons
  buttonContainer: {
    marginTop: 32,
    gap: 16,
  },
  submitButton: {
    borderRadius: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  cancelButton: {
    borderRadius: 16,
    borderWidth: 1.5,
  },
  cancelButtonContent: {
    paddingVertical: 8,
  },
});
