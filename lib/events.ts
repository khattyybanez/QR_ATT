
import { supabase } from './supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
};

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: userError?.message ?? 'You must be logged in to create an event.',
    };
  }

  const { data, error } = await supabase
    .from('events')
    .upsert(
      {
        event_code: event.eventId,
        title: event.title,
        start_time: event.start || null,
        end_time: event.end || null,
        created_by: user.id,
      },
      { onConflict: 'event_code' }
    )
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  if (!data?.id) {
    return { error: 'Event saved, but its database ID was not returned.' };
  }

  return { error: null };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Could not load teacher events:', error?.message);
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error) {
    console.error('Could not find event:', error.message);
    return null;
  }

  return data as CloudEvent | null;
}
