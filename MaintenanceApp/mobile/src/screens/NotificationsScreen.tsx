import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  Easing,
  RefreshControl,
  StatusBar,
  Dimensions,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Surface,
  Chip,
  useTheme,
  Button,
  IconButton,
  ActivityIndicator,
  Badge,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');
const API_BASE = 'http://10.0.2.2:8000/api';

type Notification = {
  id: number;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  user_id?: number;
};

export default function NotificationsScreen() {
  const theme = customTheme;
  const isFocused = useIsFocused();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (isFocused) {
      loadNotifications();
      animateEntrance();
    }
  }, [isFocused]);

  const animateEntrance = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

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
    ]).start();
  };

  const loadNotifications = async () => {
    if (!refreshing) setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const response = await axios.get(`${API_BASE}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const notificationsData = response.data?.data || [];
      setNotifications(notificationsData);
    } catch (error: any) {
      console.error('Error loading notifications:', error?.response?.data || error?.message || error);
      let message = 'Failed to load notifications';
      
      if (error?.code === 'ECONNABORTED') {
        message = 'Request timeout. Please check your connection.';
      } else if (!error?.response) {
        message = 'Network error. Please check your connection.';
      } else if (error?.response?.status === 401) {
        message = 'Session expired. Please login again.';
      }
      
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${API_BASE}/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.post(
        `${API_BASE}/notifications/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );

      Alert.alert('Success', 'All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.delete(`${API_BASE}/notifications/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Remove from local state
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      Alert.alert('Success', 'Notification deleted');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const getNotificationColor = (notification: Notification) => {
    // Determine color based on title keywords
    const title = notification.title.toLowerCase();
    
    if (title.includes('approved') || title.includes('completed') || title.includes('success')) {
      return theme.colors.success;
    } else if (title.includes('declined') || title.includes('error') || title.includes('failed')) {
      return theme.colors.error;
    } else if (title.includes('assigned') || title.includes('update')) {
      return theme.colors.warning;
    }
    
    return theme.colors.info;
  };

  const getNotificationIcon = (notification: Notification) => {
    const title = notification.title.toLowerCase();
    
    if (title.includes('approved') || title.includes('success')) return 'check-circle';
    if (title.includes('declined') || title.includes('error')) return 'cancel';
    if (title.includes('assigned') || title.includes('role')) return 'assignment';
    if (title.includes('request') && title.includes('new')) return 'notification-important';
    if (title.includes('status') || title.includes('update')) return 'update';
    if (title.includes('join')) return 'group-add';
    
    return 'notifications';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const renderStatsHeader = () => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const totalCount = notifications.length;
    const todayCount = notifications.filter(n => {
      const hours = (new Date().getTime() - new Date(n.created_at).getTime()) / (1000 * 60 * 60);
      return hours < 24;
    }).length;

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Surface style={styles.statsCard} elevation={4}>
          <LinearGradient
            colors={['#667EEA', '#764BA2']}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsHeader}>
              <View style={styles.statsIcon}>
                <MaterialIcons name="notifications-active" size={32} color="white" />
              </View>
              <View style={styles.statsTitleContainer}>
                <Text style={styles.statsTitle}>Notifications</Text>
                <Text style={styles.statsSubtitle}>Stay updated with your activity</Text>
              </View>
            </View>
            
            <View style={styles.statsContent}>
              <View style={styles.statsItem}>
                <View style={styles.statIconWrapper}>
                  <MaterialIcons name="inbox" size={20} color="white" />
                </View>
                <Text style={styles.statsNumber}>{totalCount}</Text>
                <Text style={styles.statsLabel}>Total</Text>
              </View>
              
              <View style={styles.statsDivider} />
              
              <View style={styles.statsItem}>
                <View style={styles.statIconWrapper}>
                  <MaterialIcons name="mark-email-unread" size={20} color="white" />
                </View>
                <Text style={styles.statsNumber}>{unreadCount}</Text>
                <Text style={styles.statsLabel}>Unread</Text>
              </View>
              
              <View style={styles.statsDivider} />
              
              <View style={styles.statsItem}>
                <View style={styles.statIconWrapper}>
                  <MaterialIcons name="today" size={20} color="white" />
                </View>
                <Text style={styles.statsNumber}>{todayCount}</Text>
                <Text style={styles.statsLabel}>Today</Text>
              </View>
            </View>
          </LinearGradient>
        </Surface>
      </Animated.View>
    );
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    const notificationColor = getNotificationColor(item);
    const notificationIcon = getNotificationIcon(item);

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
            ],
          },
        ]}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => !item.read && markAsRead(item.id)}
        >
          <Surface 
            style={[
              styles.notificationCard,
              { 
                backgroundColor: item.read 
                  ? 'rgba(255, 255, 255, 0.6)' 
                  : 'rgba(255, 255, 255, 1)',
              }
            ]} 
            elevation={item.read ? 1 : 4}
          >
            <LinearGradient
              colors={item.read 
                ? ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']
                : ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.98)']
              }
              style={styles.cardGradient}
            >
              {/* Accent Bar */}
              <View style={[styles.accentBar, { backgroundColor: notificationColor }]} />
              
              <View style={styles.cardContent}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.iconBadgeContainer}>
                    <View style={[styles.iconBadge, { backgroundColor: notificationColor + '15' }]}>
                      <MaterialIcons 
                        name={notificationIcon as any} 
                        size={24} 
                        color={notificationColor} 
                      />
                    </View>
                    {!item.read && (
                      <View style={[styles.unreadBadge, { backgroundColor: notificationColor }]}>
                        <MaterialIcons name="fiber-manual-record" size={10} color="white" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.headerTextContainer}>
                    <Text style={[
                      styles.notificationTitle, 
                      { 
                        color: theme.colors.charcoal,
                        fontWeight: item.read ? '600' : '700',
                      }
                    ]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    
                    <View style={styles.metaRow}>
                      <MaterialIcons 
                        name="access-time" 
                        size={14} 
                        color={theme.colors.slate} 
                        style={{ opacity: 0.7 }}
                      />
                      <Text style={[styles.notificationDate, { color: theme.colors.slate }]}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>
                  </View>

                  <IconButton
                    icon="delete-outline"
                    size={20}
                    iconColor={theme.colors.error}
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        'Delete Notification',
                        'Are you sure you want to delete this notification?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item.id) },
                        ]
                      );
                    }}
                  />
                </View>

                {/* Message */}
                <Text style={[
                  styles.notificationMessage, 
                  { 
                    color: theme.colors.charcoal,
                    opacity: item.read ? 0.6 : 0.85,
                  }
                ]} numberOfLines={3}>
                  {item.message}
                </Text>

                {/* Action Footer */}
                {!item.read && (
                  <View style={styles.actionFooter}>
                    <View style={[styles.actionIndicator, { backgroundColor: notificationColor + '15' }]}>
                      <MaterialIcons name="touch-app" size={14} color={notificationColor} />
                      <Text style={[styles.actionText, { color: notificationColor }]}>
                        Tap to mark as read
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Surface>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: fadeAnim }],
        },
      ]}
    >
      <Surface style={styles.emptyCard} elevation={3}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
          style={styles.emptyGradient}
        >
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              style={styles.emptyIconGradient}
            >
              <MaterialIcons name="notifications-off" size={48} color="white" />
            </LinearGradient>
          </View>
          
          <Text style={[styles.emptyTitle, { color: theme.colors.charcoal }]}>
            All Caught Up! ✨
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.slate }]}>
            You have no notifications right now.{'\n'}
            We'll notify you when something important happens!
          </Text>
          
          <View style={styles.emptyBadgesContainer}>
            <Chip 
              icon="check-circle" 
              mode="flat"
              style={styles.emptyBadge}
              textStyle={{ fontSize: 12, color: customTheme.colors.success }}
            >
              No pending items
            </Chip>
          </View>
        </LinearGradient>
      </Surface>
    </Animated.View>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.info} />
      
      <LinearGradient
        colors={[theme.colors.background, theme.colors.surfaceVariant]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.slate }]}>
                Loading notifications...
              </Text>
            </View>
          ) : (
            <>
              {renderStatsHeader()}
              
              {unreadCount > 0 && (
                <Animated.View
                  style={[
                    styles.actionContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: fadeAnim }],
                    },
                  ]}
                >
                  <Surface style={styles.markAllCard} elevation={2}>
                    <LinearGradient
                      colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                      style={styles.markAllGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.markAllContent}>
                        <View style={styles.markAllInfo}>
                          <MaterialIcons name="done-all" size={20} color="#667EEA" />
                          <Text style={styles.markAllText}>
                            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Button
                          mode="contained"
                          onPress={markAllAsRead}
                          style={styles.markAllButton}
                          buttonColor="#667EEA"
                          icon="check-all"
                          compact
                        >
                          Mark all as read
                        </Button>
                      </View>
                    </LinearGradient>
                  </Surface>
                </Animated.View>
              )}
              
              {notifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <Animated.View
              style={[
                styles.listContainer,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderNotification}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.colors.primary}
                    colors={[theme.colors.primary]}
                  />
                }
                showsVerticalScrollIndicator={false}
              />
            </Animated.View>
              )}
            </>
          )}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Stats Header - Redesigned
  statsCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  statsGradient: {
    padding: 24,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  statsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsTitleContainer: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statsSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statsDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 12,
  },
  statsNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginTop: 4,
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  
  // Mark All Card - New Design
  actionContainer: {
    marginBottom: 16,
  },
  markAllCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  markAllGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  markAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markAllInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667EEA',
  },
  markAllButton: {
    borderRadius: 12,
  },
  
  // Notification Cards - Completely Redesigned
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  notificationCard: {
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardGradient: {
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardContent: {
    padding: 20,
    paddingLeft: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  iconBadgeContainer: {
    position: 'relative',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  headerTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notificationDate: {
    fontSize: 13,
    opacity: 0.7,
    fontWeight: '500',
  },
  deleteButton: {
    margin: -8,
  },
  notificationMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  actionFooter: {
    marginTop: 8,
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Empty State - Enhanced
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCard: {
    width: '100%',
    maxWidth: width - 80,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 20,
  },
  emptyBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  emptyBadge: {
    backgroundColor: customTheme.colors.success + '15',
  },
});
  },
});