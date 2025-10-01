import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme, Badge } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      {badgeCount && badgeCount > 0 && (
        <Badge
          style={{
            position: 'absolute',
            top: -4,
            right: -8,
            backgroundColor: '#DC2626',
            fontSize: 10,
            fontWeight: '600',
          }}
          size={18}
        >
          {badgeCount > 99 ? '99+' : badgeCount.toString()}
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
      colors={[getRoleColor(role), `${getRoleColor(role)}80`]}
      style={{
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingTop: Platform.OS === 'ios' ? 45 : 25,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
      }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
        <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, padding: 8 }}>
          <MaterialIcons name={getRoleIcon(role)} size={24} color="white" />
        </View>
        <View>
          <Animated.Text style={{ fontSize: 20, fontWeight: '700', color: 'white', letterSpacing: 0.5 }}>
            {title}
          </Animated.Text>
        </View>
      </View>
    </LinearGradient>
  );
});

export default function BottomTabNavigator() {
  const theme = customTheme;
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(3); // Mock notification count

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
  }, []);

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
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 70,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 15,
          position: 'absolute',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginTop: 4 },
        tabBarItemStyle: { paddingVertical: 8 },
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
