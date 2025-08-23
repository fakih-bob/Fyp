import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OrganizationForm from './src/screens/OrganizationForm';
import DepartmentFormScreen from './src/screens/DepartmentForm';
import DepartmentsListScreen from './src/screens/DepartmentsScreen';
import OrganizationRequestsScreen from './src/screens/JoinOrganizationRequest';
import AssignUserToDepartmentScreen from './src/screens/AssignUserToDept';
import AssignMaintenanceScreen from './src/screens/AssignMaitenanceScreen';
import MyAssignedRequestsScreen from './src/screens/MaintenanceDashboard';  // make sure file name matches
import CreateMaintenanceRequestScreen from './src/screens/CreateMaintenanceRequestScreen';
import { theme } from './src/theme/theme';

// Keep your stack param list here (as you wanted)
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  HomeScreen: undefined;
  OrganizationForm: undefined;
  ownerdashboard: undefined;
  DepartmentForm: undefined;
  DepartmentsListScreen: undefined;
  OrganizationRequestsScreen: undefined;
  AssignUserToDepartmentScreen: undefined;
  MaintenanceDashboard: undefined;
  DeptAdminDashboard: undefined; // this mounts your tab navigator
  AssignMaintenance: { requestId: number; departmentId?: number };
  CreateMaintenanceRequest: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="OrganizationForm" component={OrganizationForm} />
            <Stack.Screen name="DepartmentForm" component={DepartmentFormScreen} />
            <Stack.Screen name="OrganizationRequestsScreen" component={OrganizationRequestsScreen} />
            <Stack.Screen name="AssignUserToDepartmentScreen" component={AssignUserToDepartmentScreen} />
            <Stack.Screen name="DepartmentsListScreen" component={DepartmentsListScreen} />

            {/* Your tab navigator is mounted under this stack route */}
            <Stack.Screen name="DeptAdminDashboard" component={BottomTabNavigator} />
             <Stack.Screen name="MaintenanceDashboard" component={BottomTabNavigator} />

            {/* Push-to Assign screen */}
            <Stack.Screen
              name="AssignMaintenance"
              component={AssignMaintenanceScreen}
              options={{ headerShown: true, title: 'Assign Maintenance' }}
            />

            <Stack.Screen
              name="CreateMaintenanceRequest"
              component={CreateMaintenanceRequestScreen}
              options={{ headerShown: true, title: 'New Maintenance Request' }}
            />

            {/* If you need these mapped to BottomTabNavigator too */}
            <Stack.Screen name="ownerdashboard" component={BottomTabNavigator} />
            <Stack.Screen name="HomeScreen" component={BottomTabNavigator} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
