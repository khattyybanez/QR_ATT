import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { getAdminEvents } from '@/lib/admin';

export default function AdminEventsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const p = await getProfile(user.id);
      if (p?.role !== 'admin') { setError('Admin access required.'); setLoading(false); return; }
      const result = await getAdminEvents();
      if (!active) return;
      setRows(result.data); setError(result.error ?? ''); setLoading(false);
    })();
    return () => { active = false; };
  }, [user]));
  const filtered = rows.filter((r) => `${r.title} ${r.event_code}`.toLowerCase().includes(query.toLowerCase()));
  return <View style={styles.container}>
    <Text style={styles.title}>All Events</Text>
    <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search event or code" placeholderTextColor={COLORS.textSecondary}/>
    {loading ? <ActivityIndicator color={COLORS.primary}/> : error ? <Text style={styles.note}>{error}</Text> :
      <FlatList data={filtered} keyExtractor={(r) => r.id} ListEmptyComponent={<Text style={styles.note}>No events found.</Text>}
        renderItem={({item}) => <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.meta}>Code: {item.event_code}</Text>
          <Text style={styles.meta}>Created: {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</Text>
          <Text style={styles.meta}>Teacher: {item.teacher_name}</Text>
          <Text style={styles.meta}>Starts: {item.start_time ? new Date(item.start_time).toLocaleString() : 'Not set'}</Text>
          {item.qr_payload ? <View style={styles.qrWrap}><QRCode value={item.qr_payload} size={112}/><Text style={styles.meta}>Event QR</Text></View> : <Text style={styles.meta}>No saved QR code</Text>}
        </View>}/>}
  </View>;
}
const styles = StyleSheet.create({
 container:{flex:1,backgroundColor:COLORS.background,padding:20},title:{fontSize:23,fontWeight:'700',color:COLORS.textPrimary,marginBottom:14},
 search:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:12,color:COLORS.textPrimary,marginBottom:12},
 card:{backgroundColor:COLORS.card,borderRadius:14,padding:15,marginBottom:10,borderWidth:1,borderColor:COLORS.border},cardTitle:{fontSize:16,fontWeight:'700',color:COLORS.textPrimary},meta:{fontSize:12,color:COLORS.textSecondary,marginTop:5},qrWrap:{alignItems:'center',backgroundColor:'#FFFFFF',padding:10,borderRadius:10,alignSelf:'flex-start',marginTop:10},note:{textAlign:'center',color:COLORS.textSecondary,marginTop:24}
});
