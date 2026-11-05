import { useCallback, useState } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';

export default function TabLayout() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!user) {
      setRole(null);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    getProfile(user.id).then((profile) => {
      if (!active) return;
      setRole(profile?.role ?? 'student');
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]));

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>;
  }

  const icon = (active: string, inactive: string) =>
    ({ color, focused }: { color: string; focused: boolean }) =>
      <Ionicons name={(focused ? active : inactive) as any} color={color} size={22} />;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      headerStyle: { backgroundColor: COLORS.background },
      headerShadowVisible: false,
      headerTintColor: COLORS.textPrimary,
      tabBarStyle: { backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
    }}>
      <Tabs.Screen name="index" options={{ title: role === 'admin' ? 'Dashboard' : 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan QR', tabBarIcon: icon('qr-code', 'qr-code-outline'), href: role === 'student' ? undefined : null }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('time', 'time-outline'), href: role === 'admin' ? null : undefined }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person', 'person-outline') }} />
      <Tabs.Screen name="teacher" options={{ title: 'Events', tabBarIcon: icon('clipboard', 'clipboard-outline'), href: role === 'teacher' ? undefined : null }} />
      <Tabs.Screen name="admin-events" options={{ title: 'Events', tabBarIcon: icon('calendar', 'calendar-outline'), href: role === 'admin' ? undefined : null }} />
      <Tabs.Screen name="admin-users" options={{ title: 'Users', tabBarIcon: icon('people', 'people-outline'), href: role === 'admin' ? undefined : null }} />
      <Tabs.Screen name="admin-attendance" options={{ title: 'Attendance', tabBarIcon: icon('list', 'list-outline'), href: role === 'admin' ? undefined : null }} />
    </Tabs>
  );
}
