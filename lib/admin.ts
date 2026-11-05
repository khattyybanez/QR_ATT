import { supabase } from './supabase';

export type AdminStats = {
  students: number;
  teachers: number;
  events: number;
  attendance: number;
  eventsToday: number;
  attendanceToday: number;
};

export async function getAdminStats(): Promise<{ data: AdminStats | null; error: string | null }> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const iso = start.toISOString();
  const results = await Promise.all([
    supabase.from('profiles').select('id, role'),
    supabase.from('events').select('id, created_at'),
    supabase.from('attendance').select('id, scanned_at'),
  ]);
  const err = results.find((r) => r.error)?.error;
  if (err) return { data: null, error: err.message };
  const profiles = results[0].data ?? [];
  const events = results[1].data ?? [];
  const attendance = results[2].data ?? [];
  return {
    data: {
      students: profiles.filter((p: any) => p.role === 'student').length,
      teachers: profiles.filter((p: any) => p.role === 'teacher').length,
      events: events.length,
      attendance: attendance.length,
      eventsToday: events.filter((e: any) => e.created_at >= iso).length,
      attendanceToday: attendance.filter((a: any) => a.scanned_at >= iso).length,
    },
    error: null,
  };
}

export async function getAdminUsers() {
  const { data, error } = await supabase.from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });
  return { data: data ?? [], error: error?.message ?? null };
}

export async function getAdminEvents() {
  const { data, error } = await supabase.from('events')
    .select('id, event_code, title, start_time, end_time, created_by, created_at')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  const rows = data ?? [];
  const creatorIds = [...new Set(rows.map((r: any) => r.created_by).filter(Boolean))];
  const { data: creators, error: creatorError } = creatorIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', creatorIds)
    : { data: [], error: null };
  if (creatorError) return { data: [], error: creatorError.message };
  const byId: Record<string, any> = {};
  (creators ?? []).forEach((p: any) => { byId[p.id] = p; });
  const eventIds = rows.map((r: any) => r.id);
  const { data: qrs, error: qrError } = eventIds.length
    ? await supabase.from('event_qr_codes').select('event_id, payload').in('event_id', eventIds)
    : { data: [], error: null };
  if (qrError) return { data: [], error: qrError.message };
  const qrByEvent: Record<string, string> = {};
  (qrs ?? []).forEach((qr: any) => { qrByEvent[qr.event_id] = qr.payload; });
  return {
    data: rows.map((r: any) => ({
      ...r,
      teacher_name: byId[r.created_by]?.full_name || byId[r.created_by]?.email || 'Unavailable',
      qr_payload: qrByEvent[r.id] ?? null,
    })),
    error: null,
  };
}

export async function getAdminAttendance() {
  const { data, error } = await supabase.from('attendance')
    .select('id, student_id, event_id, scanned_at, events(title, event_code, created_by)')
    .order('scanned_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r: any) => r.student_id).filter(Boolean))];
  const teacherIds = [...new Set(rows.map((r: any) => r.events?.created_by).filter(Boolean))];
  const profileIds = [...new Set([...ids, ...teacherIds])];
  const { data: profiles, error: profileError } = profileIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', profileIds)
    : { data: [], error: null };
  if (profileError) return { data: [], error: profileError.message };
  const byId: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { byId[p.id] = p; });
  return {
    data: rows.map((r: any) => ({
      ...r,
      student_name: byId[r.student_id]?.full_name || byId[r.student_id]?.email || r.student_id,
      event_title: r.events?.title || 'Unknown event',
      event_code: r.events?.event_code || '',
      teacher_id: r.events?.created_by || '',
      teacher_name: byId[r.events?.created_by]?.full_name || byId[r.events?.created_by]?.email || 'Unavailable',
    })),
    error: null,
  };
}
