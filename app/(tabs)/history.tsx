
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { getEventQR } from '@/lib/eventQr';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] =
    useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] =
    useState<TeacherEventAttendance[]>([]);
  const [qrPayloads, setQrPayloads] =
    useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setStudentRecords([]);

        const payloadEntries = await Promise.all(
          events.map(async (event) => {
            const payload = await getEventQR(event.eventId);
            return [event.eventId, payload] as const;
          })
        );

        const payloadMap: Record<string, string> = {};

        for (const [eventId, payload] of payloadEntries) {
          if (payload) {
            payloadMap[eventId] = payload;
          }
        }

        setQrPayloads(payloadMap);
      } else if (currentRole === 'student') {
        const records = await getAttendanceHistory(user.id);
        setStudentRecords(records);
        setTeacherEvents([]);
        setQrPayloads({});
      } else {
        setStudentRecords([]);
        setTeacherEvents([]);
        setQrPayloads({});
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not load attendance history.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>Loading attendance history...</Text>
      </View>
    );
  }

  if (role === 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>
          Administrators should use the Admin Attendance screen.
        </Text>
      </View>
    );
  }

  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Events — Attendance</Text>

        {errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : null}

        {teacherEvents.length === 0 ? (
          <Text style={styles.subtitle}>
            No events yet. Create an event in the Teacher tab.
          </Text>
        ) : (
          <FlatList
            data={teacherEvents}
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.eventTitle}>{item.title}</Text>

                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {item.attendeeCount}
                    </Text>
                  </View>
                </View>

                <Text style={styles.eventMeta}>
                  Event code: {item.eventCode}
                </Text>

                {item.startTime ? (
                  <Text style={styles.eventMeta}>
                    Start Time: {formatDate(item.startTime)}
                  </Text>
                ) : null}

                {item.endTime ? (
                  <Text style={styles.eventMeta}>
                    End Time: {formatDate(item.endTime)}
                  </Text>
                ) : null}

                {qrPayloads[item.eventId] ? (
                  <View style={styles.qrWrap}>
                    <QRCode
                      value={qrPayloads[item.eventId]}
                      size={180}
                    />
                    <Text style={styles.qrCaption}>
                      Event QR Code
                    </Text>
                    <Text style={styles.qrHint}>
                      Students can scan this code to register attendance.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.qrMissing}>
                    <Text style={styles.qrMissingTitle}>
                      QR code not available
                    </Text>
                    <Text style={styles.qrHint}>
                      This event has no saved QR payload, or Supabase
                      could not load it. Check the event QR table and
                      its permissions.
                    </Text>
                  </View>
                )}

                {item.attendees.length === 0 ? (
                  <Text style={styles.emptyAttendees}>
                    No scans yet.
                  </Text>
                ) : (
                  <View style={styles.attendeeList}>
                    <Text style={styles.attendeeHeading}>
                      Attendees ({item.attendees.length})
                    </Text>

                    {item.attendees.map((attendee) => (
                      <View
                        key={`${item.eventId}-${attendee.studentId}`}
                        style={styles.attendeeRow}
                      >
                        <Text style={styles.attendeeId}>
                          {attendee.studentName ??
                            shortId(attendee.studentId)}
                        </Text>
                        <Text style={styles.attendeeTime}>
                          {formatDate(attendee.scannedAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>

      {studentRecords.length === 0 ? (
        <Text style={styles.subtitle}>
          No records yet. Scan a QR code to register your attendance.
        </Text>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.eventTitle}</Text>
              <Text style={styles.eventMeta}>
                Event code: {item.eventId}
              </Text>
              <Text style={styles.eventMeta}>
                {formatDate(item.scannedAt)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 24,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  countBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  qrWrap: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrCaption: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  qrHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  qrMissing: {
    backgroundColor: '#FFF7FC',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrMissingTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  attendeeList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  attendeeHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 8,
  },
  attendeeId: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  attendeeTime: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  emptyAttendees: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
    fontStyle: 'italic',
  },
  error: {
    fontSize: 13,
    color: '#D94368',
    marginBottom: 12,
  },
});