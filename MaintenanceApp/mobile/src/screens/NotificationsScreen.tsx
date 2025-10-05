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
            colors={[theme.colors.info, theme.colors.primary]}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsContent}>
              <View style={styles.statsItem}>
                <MaterialIcons name="notifications" size={24} color="white" />
                <Text style={styles.statsNumber}>{totalCount}</Text>
                <Text style={styles.statsLabel}>Total</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="email" size={24} color="white" />
                <Text style={styles.statsNumber}>{unreadCount}</Text>
                <Text style={styles.statsLabel}>Unread</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <MaterialIcons name="schedule" size={24} color="white" />
                <Text style={styles.statsNumber}>
                  {notifications.filter(n => {
                    const hours = (new Date().getTime() - new Date(n.created_at).getTime()) / (1000 * 60 * 60);
                    return hours < 24;
                  }).length}
                </Text>
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
        <Surface 
          style={[
            styles.notificationCard,
            { 
              backgroundColor: item.read 
                ? 'rgba(255, 255, 255, 0.95)' 
                : 'rgba(255, 255, 255, 1)',
              borderLeftColor: notificationColor,
            }
          ]} 
          elevation={item.read ? 2 : 4}
        >
          <View style={styles.cardHeader}>
            <View style={styles.notificationIconContainer}>
              <LinearGradient
                colors={[notificationColor, `${notificationColor}80`]}
                style={styles.notificationIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons 
                  name={notificationIcon as any} 
                  size={20} 
                  color="white" 
                />
              </LinearGradient>
            </View>
            
            <View style={styles.cardHeaderInfo}>
              <Text style={[
                styles.notificationTitle, 
                { 
                  color: theme.colors.charcoal,
                  fontWeight: item.read ? '500' : '700'
                }
              ]}>
                {item.title}
              </Text>
              <Text style={[styles.notificationDate, { color: theme.colors.slate }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>

            {!item.read && (
              <View style={[styles.unreadDot, { backgroundColor: notificationColor }]} />
            )}
            
            <IconButton
              icon="delete"
              size={16}
              iconColor={theme.colors.error}
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

          <Text style={[
            styles.notificationMessage, 
            { 
              color: theme.colors.slate,
              opacity: item.read ? 0.7 : 1,
            }
          ]}>
            {item.message}
          </Text>

          {!item.read && (
            <View style={styles.cardActions}>
              <Button
                mode="text"
                onPress={() => markAsRead(item.id)}
                textColor={notificationColor}
                icon="check"
                compact
                style={{ marginTop: 8 }}
              >
                Mark as read
              </Button>
            </View>
          )}
        </Surface>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <Surface style={styles.emptyCard} elevation={2}>
        <MaterialIcons name="notifications" size={64} color={theme.colors.outline} />
        <Text style={[styles.emptyTitle, { color: theme.colors.charcoal }]}>
          No Notifications
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.slate }]}>
          You're all caught up! Check back later for new updates.
        </Text>
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
                    },
                  ]}
                >
                  <Button
                    mode="outlined"
                    onPress={markAllAsRead}
                    style={styles.markAllButton}
                    textColor={theme.colors.primary}
                    icon="check"
                    compact
                  >
                    Mark All as Read
                  </Button>
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
  actionContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  markAllButton: {
    borderRadius: 12,
    borderWidth: 1,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  notificationDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginTop: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    opacity: 0.7,
  },
});