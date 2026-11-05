import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { getAdminUsers } from '@/lib/admin';

export default function AdminUsersScreen() {
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
      const result = await getAdminUsers();
      if (!active) return;
      setRows(result.data); setError(result.error ?? ''); setLoading(false);
    })();
    return () => { active = false; };
  }, [user]));
  const filtered = rows.filter((r) => `${r.full_name ?? ''} ${r.email ?? ''} ${r.role}`.toLowerCase().includes(query.toLowerCase()));
  return <View style={styles.container}>
    <Text style={styles.title}>Registered Users</Text>
    <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search name, email, or role" placeholderTextColor={COLORS.textSecondary}/>
    {loading ? <ActivityIndicator color={COLORS.primary}/> : error ? <Text style={styles.note}>{error}</Text> :
      <FlatList data={filtered} keyExtractor={(r) => r.id} ListEmptyComponent={<Text style={styles.note}>No users found.</Text>}
        renderItem={({item}) => <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.full_name || 'Name not set'}</Text><Text style={styles.meta}>{item.email}</Text>
          <View style={styles.role}><Text style={styles.roleText}>{String(item.role).toUpperCase()}</Text></View>
        </View>}/>}
  </View>;
}
const styles = StyleSheet.create({
 container:{flex:1,backgroundColor:COLORS.background,padding:20},title:{fontSize:23,fontWeight:'700',color:COLORS.textPrimary,marginBottom:14},
 search:{backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:12,color:COLORS.textPrimary,marginBottom:12},
 card:{backgroundColor:COLORS.card,borderRadius:14,padding:15,marginBottom:10,borderWidth:1,borderColor:COLORS.border},cardTitle:{fontSize:16,fontWeight:'700',color:COLORS.textPrimary},meta:{fontSize:13,color:COLORS.textSecondary,marginTop:5},
 role:{alignSelf:'flex-start',backgroundColor:COLORS.surface,borderRadius:99,paddingHorizontal:10,paddingVertical:4,marginTop:8},roleText:{fontSize:11,fontWeight:'700',color:COLORS.primary},note:{textAlign:'center',color:COLORS.textSecondary,marginTop:24}
});
