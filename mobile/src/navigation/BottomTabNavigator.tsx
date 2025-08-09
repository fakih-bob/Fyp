import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import HomeScreen from '../../src/screens/HomeScreen';
import MyRequestsScreen from '../../src/screens/MyRequestsScreen';
import NotificationsScreen from '../../src/screens/NotificationsScreen';
import ProfileScreen from '../../src/screens/ProfileScreen';
import OwnerOrganizationsScreen from '../../src/screens/OwnerDashboard';
import OrganizationRequestsScreen from '../../src/screens/JoinOrganizationRequest'


export type BottomTabParamList = {
  Home: undefined;
  MyRequests: undefined;
  Notifications: undefined;
  Profile: undefined;
  Ownerdashboard:undefined;
  OrganizationRequestsScreen:undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  const theme = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    // Or return a splash/loading screen here
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'MyRequests':
              iconName = 'assignment';
              break;
            case 'Notifications':
              iconName = 'notifications';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 0.5,
          paddingBottom: 5,
          paddingTop: 5,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: theme.colors.outline,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontSize: 18,
          fontWeight: '600',
        },
      })}
    >
      {/* Tabs for owner */}
      {role === 'owner' && (
        <>
          <Tab.Screen name="Home" component={OwnerOrganizationsScreen} options={{ title: 'Owner Dashboard', tabBarLabel: 'Home' }} />
          <Tab.Screen name="MyRequests" component={OrganizationRequestsScreen} options={{ title: 'My Requests', tabBarLabel: 'My Requests' }} />
          <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', tabBarLabel: 'Notifications' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
        </>
      )}

      {/* Tabs for dept_admin */}
      {role === 'dept_admin' && (
        <>
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'DeptAdmin Dashboard', tabBarLabel: 'Home' }} />
          <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', tabBarLabel: 'Notifications' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
        </>
      )}

      {/* Tabs for maintenance */}
      {role === 'maintenance' && (
        <>
          <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', tabBarLabel: 'Notifications' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
        </>
      )}

      {/* Tabs for normal user */}
      {role === 'user' && (
        <>
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home', tabBarLabel: 'Home' }} />
          <Tab.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: 'My Requests', tabBarLabel: 'My Requests' }} />
          <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications', tabBarLabel: 'Notifications' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
        </>
      )}
    </Tab.Navigator>
  );
}
