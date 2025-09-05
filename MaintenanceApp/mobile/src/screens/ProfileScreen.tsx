import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  ActivityIndicator,
  Divider,
  Surface,
  Avatar,
  useTheme,
  Chip,
  Switch,
  Card,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme as customTheme } from '../theme/theme';

type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
};

const { width } = Dimensions.get('window');

type User = {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role: string;
  created_at: string;
};

export default function ProfileScreen() {
  console.log('ProfileScreen: Component rendered');
  const theme = customTheme;
  const isFocused = useIsFocused();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // Backup for cancel editing
  const [backup, setBackup] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });

  useEffect(() => {
    console.log('ProfileScreen: useEffect called, isFocused:', isFocused);
    if (isFocused) {
      fetchProfile();
      // Delay animation to ensure data is loaded
      setTimeout(() => {
        animateEntrance();
      }, 100);
    }
  }, [isFocused]);

  const animateEntrance = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.95);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.extraSlow,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: theme.animation.extraSlow,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: theme.animation.slow,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get('http://10.0.2.2:8000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data;
      setUser(userData);
      setName(userData.name || '');
      setEmail(userData.email || '');
      setPhoneNumber(userData.phone_number || '');

      // Set backup
      setBackup({
        name: userData.name || '',
        email: userData.email || '',
        phoneNumber: userData.phone_number || '',
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      console.log('ProfileScreen: Error details:', error.response?.data);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      console.log('ProfileScreen: fetchProfile completed');
    }
  };

  const handleEdit = () => {
    if (isEditing) {
      // Cancel editing - restore backup
      setName(backup.name);
      setEmail(backup.email);
      setPhoneNumber(backup.phoneNumber);
      setPassword('');
      setPasswordConfirmation('');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Name and email are required');
      return;
    }

    if (password && password !== passwordConfirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const updateData: any = {
        name: name.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim() || null,
      };

      if (password) {
        updateData.password = password;
        updateData.password_confirmation = passwordConfirmation;
      }

      await axios.put(
        'http://10.0.2.2:8000/api/profile',
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update backup
      setBackup({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      setPassword('');
      setPasswordConfirmation('');
      setIsEditing(false);
      
      Alert.alert('Success', 'Profile updated successfully!');
      fetchProfile(); // Refresh profile data
    } catch (error: any) {
      console.error('Update error:', error);
      const message = error.response?.data?.message || 'Failed to update profile';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'default',
          onPress: async () => {
            setSigningOut(true);
            try {
              // Clear stored data
              await AsyncStorage.multiRemove(['token', 'user']);
              
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete('http://10.0.2.2:8000/api/profile', {
                headers: { Authorization: `Bearer ${token}` },
              });

              await AsyncStorage.multiRemove(['token', 'user']);
              
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return theme.colors.ownerGold;
      case 'dept_admin': return theme.colors.adminBlue;
      case 'maintenance': return theme.colors.maintenanceTeal;
      case 'user': return theme.colors.userIndigo;
      default: return theme.colors.slate;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return 'business';
      case 'dept_admin': return 'admin-panel-settings';
      case 'maintenance': return 'build';
      case 'user': return 'person';
      default: return 'help';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Organization Owner';
      case 'dept_admin': return 'Department Admin';
      case 'maintenance': return 'Maintenance Staff';
      case 'user': return 'User';
      default: return role;
    }
  };

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.slate }]}>
          Loading your profile...
        </Text>
      </View>
    );
  }

  const roleColor = getRoleColor(user?.role || '');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surfaceVariant]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            overScrollMode="auto"
          >
            {/* Header Section */}
            <Animated.View
              style={[
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Surface style={styles.headerCard} elevation={4}>
                <LinearGradient
                  colors={[roleColor, `${roleColor}90`]}
                  style={styles.headerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.headerContent}>
                    <View style={styles.avatarContainer}>
                      <Avatar.Text
                        size={80}
                        label={user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        style={[styles.avatar, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
                        labelStyle={{ color: 'white', fontSize: 32, fontWeight: '700' }}
                      />
                      <TouchableOpacity style={styles.avatarEditButton}>
                        <MaterialIcons name="camera" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.headerInfo}>
                      <Text style={styles.userName}>{user?.name}</Text>
                      <Chip
                        icon={() => <MaterialIcons name={getRoleIcon(user?.role || '')} size={16} color="white" />}
                        style={styles.roleChip}
                        textStyle={styles.roleChipText}
                        compact
                      >
                        {getRoleLabel(user?.role || '')}
                      </Chip>
                    </View>

                    <IconButton
                      icon={isEditing ? 'close' : 'edit'}
                      iconColor="white"
                      size={24}
                      onPress={handleEdit}
                      style={styles.editButton}
                    />
                  </View>
                </LinearGradient>
              </Surface>
            </Animated.View>

            {/* Profile Info Section */}
            <Animated.View
              style={[
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Surface style={styles.profileCard} elevation={3}>
                <View style={styles.profileHeader}>
                  <MaterialIcons name="person" size={24} color={roleColor} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.charcoal }]}>
                    Profile Information
                  </Text>
                </View>

                <View style={styles.profileContent}>
                  <TextInput
                    label="Full Name"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    disabled={!isEditing}
                    style={styles.input}
                    left={<TextInput.Icon icon="account" />}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={roleColor}
                  />

                  <TextInput
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    disabled={!isEditing}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    left={<TextInput.Icon icon="email" />}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={roleColor}
                  />

                  <TextInput
                    label="Phone Number"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    mode="outlined"
                    disabled={!isEditing}
                    keyboardType="phone-pad"
                    style={styles.input}
                    left={<TextInput.Icon icon="phone" />}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={roleColor}
                  />

                  <View style={styles.memberSinceContainer}>
                    <MaterialIcons name="schedule" size={20} color={theme.colors.slate} />
                    <Text style={[styles.memberSinceText, { color: theme.colors.slate }]}>
                      Member since {formatJoinDate(user?.created_at || '')}
                    </Text>
                  </View>
                </View>
              </Surface>
            </Animated.View>

            {/* Security Section */}
            {isEditing && (
              <Animated.View
                style={[
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <Surface style={styles.profileCard} elevation={3}>
                  <View style={styles.profileHeader}>
                    <MaterialIcons name="security" size={24} color={theme.colors.warning} />
                    <Text style={[styles.sectionTitle, { color: theme.colors.charcoal }]}>
                      Change Password
                    </Text>
                  </View>

                  <View style={styles.profileContent}>
                    <TextInput
                      label="New Password (Optional)"
                      value={password}
                      onChangeText={setPassword}
                      mode="outlined"
                      secureTextEntry
                      style={styles.input}
                      left={<TextInput.Icon icon="lock" />}
                      outlineColor={theme.colors.outline}
                      activeOutlineColor={theme.colors.warning}
                    />

                    <TextInput
                      label="Confirm New Password"
                      value={passwordConfirmation}
                      onChangeText={setPasswordConfirmation}
                      mode="outlined"
                      secureTextEntry
                      style={styles.input}
                      left={<TextInput.Icon icon="lock" />}
                      outlineColor={theme.colors.outline}
                      activeOutlineColor={theme.colors.warning}
                      error={password !== passwordConfirmation && passwordConfirmation.length > 0}
                    />
                  </View>
                </Surface>
              </Animated.View>
            )}

            {/* Action Buttons */}
            <Animated.View
              style={[
                styles.actionsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {isEditing ? (
                <View style={styles.editActions}>
                  <Button
                    mode="outlined"
                    onPress={handleEdit}
                    style={styles.cancelButton}
                    textColor={theme.colors.slate}
                    icon="cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving}
                    style={[styles.saveButton, { backgroundColor: roleColor }]}
                    icon="check"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </View>
              ) : (
                <View style={styles.viewActions}>
                  <Button
                    mode="contained"
                    onPress={handleEdit}
                    style={[styles.editActionButton, { backgroundColor: roleColor }]}
                    icon="edit"
                  >
                    Edit Profile
                  </Button>
                </View>
              )}

              <Divider style={styles.divider} />

              <Button
                mode="contained"
                onPress={handleSignOut}
                loading={signingOut}
                disabled={signingOut}
                style={[styles.signOutButton, { backgroundColor: theme.colors.warning }]}
                icon="logout"
              >
                {signingOut ? 'Signing Out...' : 'Sign Out'}
              </Button>

              <Button
                mode="outlined"
                onPress={handleDeleteAccount}
                loading={deleting}
                disabled={deleting}
                style={styles.deleteButton}
                textColor={theme.colors.error}
                icon="delete-forever"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </Animated.View>
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120, // Extra padding to ensure full scroll to bottom
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  headerCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    elevation: 4,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  roleChipText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileCard: {
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  profileContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  memberSinceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
  },
  viewActions: {
    alignItems: 'center',
  },
  editActionButton: {
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  divider: {
    marginVertical: 8,
  },
  signOutButton: {
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
});