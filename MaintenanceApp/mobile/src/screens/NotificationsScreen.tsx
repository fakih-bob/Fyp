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
} from 'react-native';
import {
  Text,
  Card,
  Surface,
  Chip,
  useTheme,
  Button,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

type Notification = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  icon?: string;
};

export default function NotificationsScreen() {
  const theme = customTheme;
  const isFocused = useIsFocused();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  const loadNotifications = () => {
    // Mock notifications data
    const mockNotifications: Notification[] = [
      {
        id: 1,
        title: 'Maintenance Request Approved',
        message: 'Your maintenance request for "Office AC repair" has been approved and assigned to John Smith.',
        type: 'success',
        read: false,
        created_at: '2024-01-15T10:30:00Z',
        icon: 'check-circle',
      },
      {
        id: 2,
        title: 'New Organization Request',
        message: 'A new user has requested to join your organization "TechCorp Solutions".',
        type: 'info',
        read: false,
        created_at: '2024-01-15T09:15:00Z',
        icon: 'business',
      },
      {
        id: 3,
        title: 'Request Status Update',
        message: 'Your maintenance request status has been updated to "In Progress".',
        type: 'warning',
        read: true,
        created_at: '2024-01-14T16:45:00Z',
        icon: 'update',
      },
      {
        id: 4,
        title: 'Welcome to MaintenanceApp!',
        message: 'Welcome! You can now create maintenance requests and track their progress.',
        type: 'info',
        read: true,
        created_at: '2024-01-14T14:20:00Z',
        icon: 'celebration',
      },
    ];

    setNotifications(mockNotifications);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      case 'info': return theme.colors.info;
      default: return theme.colors.primary;
    }
  };

  const getTypeIcon = (type: string, customIcon?: string) => {
    if (customIcon) return customIcon;
    
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'notifications';
    }
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
              borderLeftColor: getTypeColor(item.type),
            }
          ]} 
          elevation={item.read ? 2 : 4}
        >
          <View style={styles.cardHeader}>
            <View style={styles.notificationIconContainer}>
              <LinearGradient
                colors={[getTypeColor(item.type), `${getTypeColor(item.type)}80`]}
                style={styles.notificationIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons 
                  name={getTypeIcon(item.type, item.icon) as any} 
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
              <View style={[styles.unreadDot, { backgroundColor: getTypeColor(item.type) }]} />
            )}
            
            <IconButton
              icon="more-horiz"
              size={16}
              iconColor={theme.colors.slate}
              onPress={() => markAsRead(item.id)}
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

          <View style={styles.cardFooter}>
            <Chip
              style={[styles.typeChip, { backgroundColor: `${getTypeColor(item.type)}20` }]}
              textStyle={{ color: getTypeColor(item.type), fontSize: 11, fontWeight: '600' }}
              compact
            >
              {item.type}
            </Chip>
          </View>
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
  typeChip: {
    alignSelf: 'flex-start',
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