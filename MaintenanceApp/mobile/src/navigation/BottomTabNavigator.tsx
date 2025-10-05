import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { theme as customTheme } from '../theme/theme';

// Import screens
import HomeScreen from '../../src/screens/HomeScreen';
import MyRequestsScreen from '../../src/screens/MyRequestsScreen';
import NotificationsScreen from '../../src/screens/NotificationsScreen';
import ProfileScreen from '../../src/screens/ProfileScreen';
import OwnerOrganizationsScreen from '../../src/screens/OwnerDashboard';
import OrganizationRequestsScreen from '../../src/screens/JoinOrganizationRequest';
import DeptAdminDashboard from '../../src/screens/DeptAdminDashboard';
import MyAssignedRequestsScreen from '../../src/screens/MaintenanceDashboard';
import OperatorDashboard from '../../src/screens/OperatorDashboard';

export type BottomTabParamList = {
  Home: undefined;
  MyRequests: undefined;
  Notifications: undefined;
  Profile: undefined;
  Ownerdashboard: undefined;
  OrganizationRequestsScreen: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Custom Tab Bar Icon with animations - Optimized
const AnimatedTabIcon = React.memo(({ 
  iconName, 
  color, 
  size, 
  focused, 
  badgeCount 
}: { 
  iconName: string; 
  color: string; 
  size: number; 
  focused: boolean;
  badgeCount?: number;
}) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const animation = Animated.timing(scaleValue, {
      toValue: focused ? 1.15 : 1,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    
    animation.start();
    return () => { animation.stop(); };
  }, [focused, scaleValue]);

  return (
    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          transform: [{ scale: scaleValue }],
          shadowColor: focused ? color : 'transparent',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: focused ? 3 : 0,
        }}
      >
        <MaterialIcons name={iconName as any} size={size} color={color} />
      </Animated.View>
      {badgeCount !== undefined && badgeCount > 0 && (
        <Badge
          style={{
            position: 'absolute',
            top: -5,
            right: -10,
            backgroundColor: '#DC2626',
            fontSize: 9,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: '#fff',
          }}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </Badge>
      )}
    </View>
  );
});

// Custom Header Component - Optimized
const CustomHeader = React.memo(({ title, role }: { title: string; role: string }) => {
  const theme = customTheme;
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return theme.colors.ownerGold;
      case 'dept_admin': return theme.colors.adminBlue;
      case 'maintenance': return theme.colors.maintenanceTeal;
      case 'operator': return theme.colors.primary; // uses primary; change if you add theme.colors.operator
      case 'user': return theme.colors.userIndigo;
      default: return theme.colors.primary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return 'business';
      case 'dept_admin': return 'admin-panel-settings';
      case 'maintenance': return 'build';
      case 'operator': return 'support-agent';
      case 'user': return 'person';
      default: return 'dashboard';
    }
  };

  return (
    <LinearGradient
      colors={[getRoleColor(role), `${getRoleColor(role)}95`]}
      style={{
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingTop: Platform.OS === 'ios' ? 45 : 20,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
        <View style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.25)', 
          borderRadius: 12, 
          padding: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <MaterialIcons name={getRoleIcon(role)} size={24} color="white" />
        </View>
        <View>
          <Animated.Text style={{ 
            fontSize: 20, 
            fontWeight: '700', 
            color: 'white', 
            letterSpacing: 0.5,
            textShadowColor: 'rgba(0, 0, 0, 0.1)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}>
            {title}
          </Animated.Text>
        </View>
      </View>
    </LinearGradient>
  );
});

export default function BottomTabNavigator() {
  const theme = customTheme;
  const navigation = useNavigation();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchRole = async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setRole(user.role);
        } catch {
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    };
    fetchRole();
    fetchUnreadCount(); // Initial fetch
  }, []);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://10.0.2.2:8000/api/notifications/unread-count', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      setNotificationCount(response.data?.unread_count || 0);
    } catch (error) {
      // Silently fail - don't show errors for badge count
      setNotificationCount(0);
    }
  };

  // Refresh notification count every 30 seconds and on navigation state change
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30 seconds
    
    // Also refresh when navigation state changes
    const unsubscribe = navigation.addListener('state', () => {
      fetchUnreadCount();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [navigation]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return theme.colors.ownerGold;
      case 'dept_admin': return theme.colors.adminBlue;
      case 'maintenance': return theme.colors.maintenanceTeal;
      case 'operator': return theme.colors.primary; // uses primary; change if you add theme.colors.operator
      case 'user': return theme.colors.userIndigo;
      default: return theme.colors.primary;
    }
  };

  if (loading) return null;

  const roleColor = getRoleColor(role || '');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: string;
          let badgeCount: number | undefined;

          switch (route.name) {
            case 'Home':
              iconName =
                role === 'owner' ? 'business' :
                role === 'dept_admin' ? 'admin-panel-settings' :
                role === 'maintenance' ? 'build' :
                role === 'operator' ? 'support-agent' :
                'home';
              break;
            case 'MyRequests':
              iconName = 'assignment';
              break;
            case 'Notifications':
              iconName = 'notifications';
              badgeCount = notificationCount;
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return (
            <AnimatedTabIcon
              iconName={iconName}
              color={color}
              size={size}
              focused={focused}
              badgeCount={badgeCount}
            />
          );
        },
        tabBarActiveTintColor: roleColor,
        tabBarInactiveTintColor: theme.colors.slate,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 70,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 12,
          position: 'absolute',
        },
        tabBarLabelStyle: { 
          fontSize: 11, 
          fontWeight: '600', 
          letterSpacing: 0.3, 
          marginTop: 4,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        },
        tabBarItemStyle: { 
          paddingVertical: 8,
          paddingHorizontal: 4,
        },
        header: ({ route }) => (
          <CustomHeader
            title={
              route.name === 'Home'
                ? role === 'owner' ? 'Owner Dashboard'
                : role === 'dept_admin' ? 'Admin Dashboard'
                : role === 'maintenance' ? 'Maintenance Dashboard'
                : role === 'operator' ? 'Operator Dashboard'
                : 'Home'
                : route.name === 'MyRequests' ? 'My Requests'
                : route.name === 'Notifications' ? 'Notifications'
                : route.name === 'Profile' ? 'Profile'
                : 'Dashboard'
            }
            role={role || 'user'}
          />
        ),
      })}
    >
      {/* Tabs for owner */}
      {role === 'owner' && (
        <>
          <Tab.Screen
            name="Home"
            component={OwnerOrganizationsScreen}
            options={{ tabBarLabel: 'Organizations' }}
          />
          <Tab.Screen
            name="MyRequests"
            component={OrganizationRequestsScreen}
            options={{ tabBarLabel: 'Requests' }}
          />
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ tabBarLabel: 'Notifications' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile' }}
          />
        </>
      )}

      {/* Tabs for dept_admin */}
      {role === 'dept_admin' && (
        <>
          <Tab.Screen
            name="Home"
            component={DeptAdminDashboard}
            options={{ tabBarLabel: 'Dashboard' }}
          />
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ tabBarLabel: 'Notifications' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile' }}
          />
        </>
      )}

      {/* Tabs for maintenance */}
      {role === 'maintenance' && (
        <>
          <Tab.Screen
            name="Home"
            component={MyAssignedRequestsScreen}
            options={{ tabBarLabel: 'My Tasks' }}
          />
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ tabBarLabel: 'Notifications' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile' }}
          />
        </>
      )}

      {/* Tabs for operator (Home + Profile only) */}
      {role === 'operator' && (
        <>
          <Tab.Screen
            name="Home"
            component={OperatorDashboard} // change to your Operator dashboard if needed
            options={{ tabBarLabel: 'Dashboard' }}
          />
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ tabBarLabel: 'Notifications' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile' }}
          />
        </>
      )}

      {/* Tabs for normal user */}
      {role === 'user' && (
        <>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ tabBarLabel: 'Organizations' }}
          />
          <Tab.Screen
            name="MyRequests"
            component={MyRequestsScreen}
            options={{ tabBarLabel: 'My Requests' }}
          />
          <Tab.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ tabBarLabel: 'Notifications' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'Profile' }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}
