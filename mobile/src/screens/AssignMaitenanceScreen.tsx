import React, { useEffect, useState } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  Alert, 
  StatusBar, 
  Dimensions, 
  Animated, 
  Easing,
  RefreshControl 
} from 'react-native';
import { 
  Text, 
  ActivityIndicator, 
  Button, 
  RadioButton, 
  Surface,
  Avatar,
  Chip,
  IconButton 
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation, NavigationProp, RouteProp } from '@react-navigation/native';
import { theme as customTheme } from '../theme/theme';

const { width } = Dimensions.get('window');

type TeamMember = { id: number; name: string };

// Local route params type (no import from App.tsx)
type AssignParams = { requestId: number; departmentId?: number };
type AssignRoute = RouteProp<Record<'AssignMaintenance', AssignParams>, 'AssignMaintenance'>;

export default function AssignMaintenanceScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { params } = useRoute<AssignRoute>();
  const { requestId, departmentId: passedDeptId } = params;

  const [departmentId, setDepartmentId] = useState<number | undefined>(passedDeptId);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    (async () => {
      if (departmentId == null) {
        const depStr = await AsyncStorage.getItem('departmentId');
        if (depStr) setDepartmentId(Number(depStr));
      }
    })();
  }, [departmentId]);

  useEffect(() => {
    if (departmentId == null) return;
    (async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await axios.get(
          `http://192.168.10.157:8000/api/maintenance-team/${departmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
          }
        );
        setTeam(res.data?.data || []);
      } catch (e: any) {
        console.log('Team fetch error:', e?.response?.status, e?.response?.data || e?.message);
        Alert.alert('Error', 'Failed to load maintenance team');
      } finally {
        setLoading(false);
      }
    })();
  }, [departmentId]);

  const onAssign = async () => {
    if (!selectedMemberId) {
      Alert.alert('Pick someone', 'Please select a team member to assign.');
      return;
    }
    try {
      setAssigning(true);
      const token = await AsyncStorage.getItem('token');

      // 👇 Laravel expects `user_id` (NOT `assignee_id`)
      const body = { user_id: Number(selectedMemberId) };

      const res = await axios.post(
        `http://192.168.10.157:8000/api/maintenance-requests/${requestId}/assign`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );

      // Optional: show backend message if present
      const msg = res.data?.message || 'Request assigned successfully.';
      Alert.alert('Assigned', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      console.log('Assign error:', e?.response?.status, e?.response?.data || e?.message);
      const apiMsg =
        e?.response?.data?.message ||
        (Array.isArray(e?.response?.data?.errors)
          ? e.response.data.errors.join('\n')
          : 'Failed to assign the maintenance request.');
      Alert.alert('Error', apiMsg);
    } finally {
      setAssigning(false);
    }
  };

  const renderItem = ({ item }: { item: TeamMember }) => (
    <List.Item
      title={item.name}
      right={() => (
        <RadioButton
          value={String(item.id)}
          status={selectedMemberId === item.id ? 'checked' : 'unchecked'}
          onPress={() => setSelectedMemberId(item.id)}
        />
      )}
      onPress={() => setSelectedMemberId(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={{ marginBottom: 8 }}>
        Select a team member
      </Text>

      {departmentId == null && (
        <Text style={{ color: 'tomato', marginBottom: 8 }}>
          Department ID not found. Provide it on navigation or save it as "departmentId" in AsyncStorage.
        </Text>
      )}

      {loading ? (
        <ActivityIndicator />
      ) : team.length === 0 ? (
        <Text>No team members found.</Text>
      ) : (
        <>
          <FlatList
            data={team}
            keyExtractor={(m) => m.id.toString()}
            renderItem={renderItem}
            ItemSeparatorComponent={Divider}
            style={{ marginBottom: 12 }}
          />
          <Button
            mode="contained"
            onPress={onAssign}
            loading={assigning}
            disabled={!selectedMemberId || assigning}
          >
            Assign
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#FAFAFA' },
});
