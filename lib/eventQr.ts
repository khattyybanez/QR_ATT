import { supabase } from './supabase';

export async function saveEventQR(eventCode: string, payload: string): Promise<string | null> {
  const { data: event, error: eventError } = await supabase
    .from('events').select('id').eq('event_code', eventCode).maybeSingle();
  if (eventError || !event) return eventError?.message ?? 'Event not found after saving.';
  const { error } = await supabase.from('event_qr_codes').upsert({
    event_id: event.id,
    payload,
  }, { onConflict: 'event_id' });
  return error?.message ?? null;
}

export async function getEventQR(eventId: string): Promise<string | null> {
  const { data, error } = await supabase.from('event_qr_codes')
    .select('payload').eq('event_id', eventId).maybeSingle();
  if (error || !data?.payload) return null;
  return data.payload as string;
}
