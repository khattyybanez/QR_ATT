import { useCallback, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { getAdminStats, type AdminStats } from '@/lib/admin';

function StatCard({ label, value }: { label: string; value: number }) {
  return <View style={styles.statCard}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

export default function Index() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const p = await getProfile(user.id);
      if (!active) return;
      const nextRole = p?.role ?? 'student';
      setRole(nextRole);
      if (nextRole === 'admin') {
        setLoading(true);
        const result = await getAdminStats();
        if (!active) return;
        setStats(result.data); setError(result.error ?? ''); setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]));

  if (role === 'admin') {
    return <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}><Header title="Admin Dashboard" /><Text style={styles.byLine}>QR-ATT System Overview</Text></View>
      {loading ? <ActivityIndicator color={COLORS.primary} size="large" /> : error ? <Text style={styles.error}>{error}</Text> :
        <View style={styles.statsGrid}>
          <StatCard label="Students" value={stats?.students ?? 0}/><StatCard label="Teachers" value={stats?.teachers ?? 0}/>
          <StatCard label="Total Events" value={stats?.events ?? 0}/><StatCard label="Attendance Records" value={stats?.attendance ?? 0}/>
          <StatCard label="Events Today" value={stats?.eventsToday ?? 0}/><StatCard label="Scans Today" value={stats?.attendanceToday ?? 0}/>
        </View>}
      <View style={styles.footerContainer}>
        <AppButton theme="primary" title="Manage Events" icon="calendar-outline" onPress={() => router.push('/admin-events')}/>
        <AppButton title="View Users" icon="people-outline" onPress={() => router.push('/admin-users')}/>
        <AppButton title="Attendance Records" icon="list-outline" onPress={() => router.push('/admin-attendance')}/>
      </View>
    </SafeAreaView>;
  }

  if (role === 'teacher') {
    return <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}><Header title="QR Attendance" /><Text style={styles.byLine}>Teacher Workspace</Text></View>
      <View style={styles.bodyContainer}><Text style={styles.mainTitle}>Manage your events</Text><Text style={styles.subtitle}>Create event QR codes and monitor attendance for your own events.</Text></View>
      <View style={styles.footerContainer}>
        <AppButton theme="primary" title="Create Event QR" icon="qr-code-outline" onPress={() => router.push('/teacher')}/>
        <AppButton title="Attendance History" icon="time-outline" onPress={() => router.push('/history')}/>
        <AppButton title="Profile" icon="person-outline" onPress={() => router.push('/profile')}/>
      </View>
    </SafeAreaView>;
  }

  return <SafeAreaView style={styles.container}>
    <View style={styles.headerContainer}><Header title="QR Attendance" /><Text style={styles.byLine}>by: Khatty Ybanez</Text></View>
    <View style={styles.bodyContainer}><Text style={styles.mainTitle}>School Event Attendance</Text><Text style={styles.subtitle}>Scan QR Codes to record attendance during school activities.</Text></View>
    <View style={styles.footerContainer}>
      <AppButton theme="primary" title="Scan QR Code" icon="qr-code-outline" onPress={() => router.push('/scan')}/>
      <AppButton title="Attendance History" icon="time-outline" onPress={() => router.push('/history')}/>
      <AppButton title="Profile" icon="person-outline" onPress={() => router.push('/profile')}/>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background},headerContainer:{paddingTop:18,paddingHorizontal:24},byLine:{fontSize:13,color:COLORS.textSecondary,marginTop:8,textAlign:'center'},
  bodyContainer:{paddingHorizontal:24,marginTop:24,marginBottom:16},mainTitle:{fontSize:22,fontWeight:'700',color:COLORS.textPrimary,marginBottom:6},subtitle:{fontSize:15,color:COLORS.textSecondary,lineHeight:21},
  footerContainer:{paddingHorizontal:24,width:'100%',marginTop:'auto',paddingBottom:20},statsGrid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:16,paddingTop:20},statCard:{width:'46%',margin:'2%',backgroundColor:COLORS.card,borderRadius:14,padding:16,borderWidth:1,borderColor:COLORS.border},statValue:{fontSize:26,fontWeight:'800',color:COLORS.primary},statLabel:{fontSize:12,color:COLORS.textSecondary,marginTop:4},error:{color:'#B42318',textAlign:'center',margin:20}
});
