import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  TextInput, 
  Surface, 
  Chip,
  useTheme,
  Badge,
  Searchbar,
  FAB,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  NewForm: undefined;
  OrganizationForm: undefined;
  CreateMaintenanceRequest: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Organization = {
  id: number;
  name: string;
  description?: string;
  url?: string;
  departments_count?: number;
  members_count?: number;
  user_status?: 'not_member' | 'pending' | 'accepted' | 'declined';
  is_member?: boolean;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const theme = customTheme;
  const isFocused = useIsFocused();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    if (isFocused) {
      fetchOrganizations();
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

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('http://192.168.10.157:8000/api/getAllOrganizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrganizations(response.data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrganizations();
  };

  const requestToJoin = async (orgId: number) => {
    setRequestingId(orgId);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `http://192.168.10.157:8000/api/MakeRequestToOrganization`,
        { organization_id: orgId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      Alert.alert(
        '🎉 Success!', 
        'Your request to join has been sent successfully!',
        [{ text: 'Got it', style: 'default' }]
      );
      // Refresh organizations to get updated status
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error requesting to join:', error);
      const message = error.response?.data?.message || 'Failed to send join request';
      Alert.alert('Error', message);
    } finally {
      setRequestingId(null);
    }
  };

  const renderMembershipButton = (item: Organization) => {
    // Check if user is already a member or has pending status
    if (item.is_member || item.user_status === 'accepted') {
      return (
        <Chip
          mode="flat"
          style={[styles.statusChip, { backgroundColor: theme.colors.success + '20' }]}
          textStyle={{ color: theme.colors.success, fontWeight: '600' }}
          icon="check-circle"
          compact
        >
          Already Joined
        </Chip>
      );
    }
    
    if (item.user_status === 'pending') {
      return (
        <Chip
          mode="flat"
          style={[styles.statusChip, { backgroundColor: theme.colors.warning + '20' }]}
          textStyle={{ color: theme.colors.warning, fontWeight: '600' }}
          icon="schedule"
          compact
        >
          Request Pending
        </Chip>
      );
    }
    
    if (item.user_status === 'declined') {
      return (
        <Chip
          mode="flat"
          style={[styles.statusChip, { backgroundColor: theme.colors.error + '20' }]}
          textStyle={{ color: theme.colors.error, fontWeight: '600' }}
          icon="cancel"
          compact
        >
          Request Declined
        </Chip>
      );
    }
    
    // Default: not a member, can request to join
    return (
      <Button
        mode="contained"
        onPress={() => requestToJoin(item.id)}
        loading={requestingId === item.id}
        disabled={requestingId === item.id}
        style={styles.joinButton}
        contentStyle={styles.joinButtonContent}
        labelStyle={styles.joinButtonLabel}
        buttonColor={theme.colors.primary}
        icon="send"
      >
        {requestingId === item.id ? 'Sending...' : 'Request to Join'}
      </Button>
    );
  };

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderStatsCard = () => (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Surface style={styles.statsCard} elevation={3}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          style={styles.statsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statsContent}>
            <View style={styles.statsItem}>
              <MaterialIcons name="business" size={24} color="white" />
              <Text style={styles.statsNumber}>{organizations.length}</Text>
              <Text style={styles.statsLabel}>Organizations</Text>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsItem}>
              <MaterialIcons name="people" size={24} color="white" />
              <Text style={styles.statsNumber}>
                {organizations.reduce((acc, org) => acc + (org.members_count || 0), 0)}
              </Text>
              <Text style={styles.statsLabel}>Total Members</Text>
            </View>
          </View>
        </LinearGradient>
      </Surface>
    </Animated.View>
  );

  const renderOrganizationCard = ({ item, index }: { item: Organization; index: number }) => {
    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: scaleAnim,
              },
            ],
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.95}>
          <Surface style={styles.organizationCard} elevation={4}>
            <View style={styles.cardHeader}>
              <View style={styles.orgIconContainer}>
                <LinearGradient
                  colors={[theme.colors.userIndigo, theme.colors.maintenanceTeal]}
                  style={styles.orgIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcons name="business" size={24} color="white" />
                </LinearGradient>
              </View>
              <View style={styles.cardHeaderInfo}>
                <Text style={[styles.orgName, { color: theme.colors.charcoal }]}>
                  {item.name}
                </Text>
                <View style={styles.badgeContainer}>
                  <Chip 
                    icon="people" 
                    style={[styles.membersBadge, { backgroundColor: theme.colors.primaryLight }]}
                    textStyle={{ color: theme.colors.primary, fontSize: 11 }}
                    compact
                  >
                    {item.members_count || 0} members
                  </Chip>
                </View>
              </View>
            </View>

            {item.description && (
              <Text style={[styles.orgDescription, { color: theme.colors.slate }]}>
                {item.description}
              </Text>
            )}

            <View style={styles.cardFooter}>
              <View style={styles.featuresContainer}>
                <View style={styles.feature}>
                  <MaterialIcons name="apartment" size={16} color={theme.colors.maintenanceTeal} />
                  <Text style={[styles.featureText, { color: theme.colors.slate }]}>
                    {item.departments_count || 0} Departments
                  </Text>
                </View>
                <View style={styles.feature}>
                  <MaterialIcons name="verified-user" size={16} color={theme.colors.success} />
                  <Text style={[styles.featureText, { color: theme.colors.slate }]}>
                    Verified
                  </Text>
                </View>
              </View>
              
              {renderMembershipButton(item)}
            </View>
          </Surface>
        </TouchableOpacity>
      </Animated.View>
    );
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
      <View style={styles.welcomeContainer}>
        <Text style={[styles.welcomeText, { color: theme.colors.charcoal }]}>
          Discover Amazing Organizations 🌟
        </Text>
        <Text style={[styles.subtitleText, { color: theme.colors.slate }]}>
          Find the perfect organization to join and grow
        </Text>
      </View>
      
      <Searchbar
        placeholder="Search organizations..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor={theme.colors.primary}
        elevation={2}
      />
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Surface style={styles.emptyCard} elevation={2}>
        <MaterialIcons name="search" size={64} color={theme.colors.outline} />
        <Text style={[styles.emptyTitle, { color: theme.colors.charcoal }]}>
          No Organizations Found
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.slate }]}>
          {search ? 'Try adjusting your search terms' : 'No organizations are available at the moment'}
        </Text>
        <Button
          mode="outlined"
          onPress={() => setSearch('')}
          style={styles.clearButton}
          icon="refresh"
        >
          Clear Search
        </Button>
      </Surface>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surfaceVariant]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {renderHeader()}
          {renderStatsCard()}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.slate }]}>
                Loading organizations...
              </Text>
            </View>
          ) : filteredOrganizations.length === 0 ? (
            renderEmptyState()
          ) : (
            <Animated.View
              style={[
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <FlatList
                data={filteredOrganizations}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderOrganizationCard}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
              />
            </Animated.View>
          )}
        </ScrollView>

        {/* Maintenance Request FAB */}
        <Animated.View
          style={[
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <FAB
            style={[
              styles.fab,
              {
                backgroundColor: theme.colors.userIndigo,
                shadowColor: theme.colors.userIndigo,
              },
            ]}
            icon="add"
            onPress={() => navigation.navigate('CreateMaintenanceRequest')}
            label="New Request"
            color="white"
            customSize={56}
          />
        </Animated.View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  welcomeContainer: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.8,
  },
  searchBar: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  searchInput: {
    fontSize: 16,
  },
  statsCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 24,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 20,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  organizationCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orgIconContainer: {
    marginRight: 16,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  membersBadge: {
    alignSelf: 'flex-start',
  },
  orgDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.8,
  },
  cardFooter: {
    gap: 16,
  },
  featuresContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
  },
  joinButton: {
    borderRadius: 12,
    elevation: 2,
  },
  joinButtonContent: {
    paddingVertical: 8,
  },
  joinButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusChip: {
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  listContent: {
    gap: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    maxWidth: width - 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  clearButton: {
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});