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
  FAB, 
  Chip, 
  Surface,
  useTheme,
  SegmentedButtons,
  Badge,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { theme as customTheme } from '../theme/theme';
import { StackNavigationProp } from '@react-navigation/stack';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  CreateMaintenanceRequest: undefined;
  MyRequests: undefined;
};

type MyRequestsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MyRequests'>;

type MaintenanceRequest = {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  department?: { id: number; name: string };
  assignee?: { id: number; name: string };
  photos?: { id: number; url: string }[];
};

type OrganizationRequest = {
  id: number;
  status: string;
  created_at: string;
  organization: { id: number; name: string; description?: string };
  message?: string;
};

export default function MyRequestsScreen() {
  const navigation = useNavigation<MyRequestsScreenNavigationProp>();
  const theme = customTheme;
  const isFocused = useIsFocused();
  
  const [organizationRequests, setOrganizationRequests] = useState<OrganizationRequest[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'maintenance' | 'organization'>('maintenance');
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    if (isFocused) {
      fetchAllRequests();
      animateEntrance();
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

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMyRequests(),
        fetchMyMaintenanceRequests(),
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('http://192.168.1.102:8000/api/ShowAllMyRequests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrganizationRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching organization requests:', error);
    }
  };

  const fetchMyMaintenanceRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('http://192.168.1.102:8000/api/my-maintenance-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMaintenanceRequests(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setMaintenanceRequests([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllRequests();
  };

  const cancelRequest = async (id: number) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setCancelingId(id);
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`http://192.168.1.102:8000/api/CancelMyRequest/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Request canceled');
              fetchMyRequests();
            } catch (error) {
              console.error('Cancel failed:', error);
              Alert.alert('Error', 'Failed to cancel request');
            } finally {
              setCancelingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return theme.colors.adminBlue;
      case 'pending': return theme.colors.warning;
      case 'approved': return theme.colors.success;
      case 'in-progress': return theme.colors.maintenanceTeal;
      case 'done': return theme.colors.success;
      case 'declined': return theme.colors.error;
      default: return theme.colors.slate;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'fiber-new';
      case 'pending': return 'schedule';
      case 'approved': return 'check-circle';
      case 'in-progress': return 'engineering';
      case 'done': return 'task-alt';
      case 'declined': return 'cancel';
      default: return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStatsHeader = () => {
    const maintenanceStats = {
      total: maintenanceRequests.length,
      pending: maintenanceRequests.filter(r => r.status === 'pending').length,
      inProgress: maintenanceRequests.filter(r => r.status === 'in-progress').length,
      completed: maintenanceRequests.filter(r => r.status === 'done').length,
    };

    const orgStats = {
      total: organizationRequests.length,
      pending: organizationRequests.filter(r => r.status === 'pending').length,
      approved: organizationRequests.filter(r => r.status === 'approved').length,
    };

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Surface style={styles.statsCard} elevation={3}>
          <LinearGradient
            colors={activeTab === 'maintenance' 
              ? [theme.colors.maintenanceTeal, theme.colors.adminBlue]
              : [theme.colors.userIndigo, theme.colors.primary]
            }
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsContent}>
              <View style={styles.statsItem}>
                <MaterialIcons 
                  name={activeTab === 'maintenance' ? 'build' : 'business'} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.statsNumber}>
                  {activeTab === 'maintenance' ? maintenanceStats.total : orgStats.total}
                </Text>
                <Text style={styles.statsLabel}>Total Requests</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="schedule" size={24} color="white" />
                <Text style={styles.statsNumber}>
                  {activeTab === 'maintenance' ? maintenanceStats.pending : orgStats.pending}
                </Text>
                <Text style={styles.statsLabel}>Pending</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="check-circle" size={24} color="white" />
                <Text style={styles.statsNumber}>
                  {activeTab === 'maintenance' ? maintenanceStats.completed : orgStats.approved}
                </Text>
                <Text style={styles.statsLabel}>
                  {activeTab === 'maintenance' ? 'Completed' : 'Approved'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Surface>
      </Animated.View>
    );
  };

  const renderMaintenanceRequest = ({ item, index }: { item: MaintenanceRequest; index: number }) => {
    const cardAnim = new Animated.Value(0);
    
    React.useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: theme.animation.slow,
        delay: index * 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Surface style={styles.requestCard} elevation={4}>
          <View style={styles.cardHeader}>
            <View style={styles.requestIconContainer}>
              <LinearGradient
                colors={[theme.colors.maintenanceTeal, theme.colors.adminBlue]}
                style={styles.requestIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="build" size={20} color="white" />
              </LinearGradient>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={[styles.requestTitle, { color: theme.colors.charcoal }]}>
                {item.title}
              </Text>
              <Text style={[styles.requestDate, { color: theme.colors.slate }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
            <Chip
              icon={() => <MaterialIcons name={getStatusIcon(item.status)} size={16} color="white" />}
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={{ color: 'white', fontSize: 12, fontWeight: '600' }}
              compact
            >
              {item.status}
            </Chip>
          </View>

          <Text style={[styles.requestDescription, { color: theme.colors.slate }]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.requestMeta}>
            {item.department && (
              <View style={styles.metaItem}>
                <MaterialIcons name="apartment" size={16} color={theme.colors.maintenanceTeal} />
                <Text style={[styles.metaText, { color: theme.colors.slate }]}>
                  {item.department.name}
                </Text>
              </View>
            )}
            {item.assignee && (
              <View style={styles.metaItem}>
                <MaterialIcons name="person" size={16} color={theme.colors.adminBlue} />
                <Text style={[styles.metaText, { color: theme.colors.slate }]}>
                  {item.assignee.name}
                </Text>
              </View>
            )}
            {item.photos && item.photos.length > 0 && (
              <View style={styles.metaItem}>
                <MaterialIcons name="photo" size={16} color={theme.colors.warning} />
                <Text style={[styles.metaText, { color: theme.colors.slate }]}>
                  {item.photos.length} photo(s)
                </Text>
              </View>
            )}
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderOrganizationRequest = ({ item, index }: { item: OrganizationRequest; index: number }) => {
    const cardAnim = new Animated.Value(0);
    
    React.useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: theme.animation.slow,
        delay: index * 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Surface style={styles.requestCard} elevation={4}>
          <View style={styles.cardHeader}>
            <View style={styles.requestIconContainer}>
              <LinearGradient
                colors={[theme.colors.userIndigo, theme.colors.primary]}
                style={styles.requestIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="business" size={20} color="white" />
              </LinearGradient>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={[styles.requestTitle, { color: theme.colors.charcoal }]}>
                {item.organization.name}
              </Text>
              <Text style={[styles.requestDate, { color: theme.colors.slate }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
            <Chip
              icon={() => <MaterialIcons name={getStatusIcon(item.status)} size={16} color="white" />}
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={{ color: 'white', fontSize: 12, fontWeight: '600' }}
              compact
            >
              {item.status}
            </Chip>
          </View>

          {item.organization.description && (
            <Text style={[styles.requestDescription, { color: theme.colors.slate }]} numberOfLines={2}>
              {item.organization.description}
            </Text>
          )}

          {item.message && (
            <View style={styles.messageContainer}>
              <MaterialIcons name="message" size={16} color={theme.colors.info} />
              <Text style={[styles.messageText, { color: theme.colors.slate }]}>
                {item.message}
              </Text>
            </View>
          )}

          <View style={styles.cardActions}>
        <Button
              mode="outlined"
          onPress={() => cancelRequest(item.id)}
          loading={cancelingId === item.id}
              disabled={cancelingId === item.id || item.status !== 'pending'}
              style={styles.cancelButton}
              buttonColor="transparent"
              textColor={item.status === 'pending' ? theme.colors.error : theme.colors.slate}
              icon="cancel"
              compact
            >
              {item.status === 'pending' ? 'Cancel' : 'Cannot Cancel'}
        </Button>
          </View>
        </Surface>
      </Animated.View>
    );
  };

  const renderTabSegments = () => (
    <Animated.View
      style={[
        styles.tabContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'maintenance' | 'organization')}
        buttons={[
          {
            value: 'maintenance',
            label: 'Maintenance',
            icon: 'build',
            style: {
              backgroundColor: activeTab === 'maintenance' 
                ? theme.colors.maintenanceTeal 
                : 'transparent',
            },
          },
          {
            value: 'organization',
            label: 'Organizations', 
            icon: 'business',
            style: {
              backgroundColor: activeTab === 'organization' 
                ? theme.colors.userIndigo 
                : 'transparent',
            },
          },
        ]}
        style={styles.segmentedButtons}
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
        <MaterialIcons 
          name={activeTab === 'maintenance' ? 'build-circle' : 'business-center'} 
          size={64} 
          color={theme.colors.outline} 
        />
        <Text style={[styles.emptyTitle, { color: theme.colors.charcoal }]}>
          No {activeTab === 'maintenance' ? 'Maintenance' : 'Organization'} Requests
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.slate }]}>
          {activeTab === 'maintenance' 
            ? 'Create your first maintenance request using the + button below'
            : 'Start by requesting to join an organization'
          }
        </Text>
      </Surface>
    </Animated.View>
  );

  const currentData = activeTab === 'maintenance' ? maintenanceRequests : organizationRequests;
  const currentRenderItem = activeTab === 'maintenance' ? renderMaintenanceRequest : renderOrganizationRequest;

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
          {renderStatsHeader()}
          {renderTabSegments()}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.slate }]}>
                Loading your requests...
              </Text>
            </View>
          ) : currentData.length === 0 ? (
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
                data={currentData as any}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={currentRenderItem as any}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
              />
            </Animated.View>
          )}
        </ScrollView>

        {/* FAB for creating maintenance requests */}
        {activeTab === 'maintenance' && (
          <Animated.View
            style={[
              styles.fabContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <FAB
              style={[styles.fab, { backgroundColor: theme.colors.maintenanceTeal }]}
              icon="add"
              onPress={() => navigation.navigate('CreateMaintenanceRequest')}
              label="New Request"
            />
          </Animated.View>
        )}
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
    paddingBottom: 120,
  },
  statsCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
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
    marginHorizontal: 16,
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginTop: 6,
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  tabContainer: {
    marginBottom: 20,
  },
  segmentedButtons: {
    borderRadius: 16,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestIconContainer: {
    marginRight: 12,
  },
  requestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  requestDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  requestDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
    opacity: 0.8,
  },
  requestMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  messageText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelButton: {
    borderRadius: 8,
    borderWidth: 1,
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  fab: {
    borderRadius: 16,
  },
});