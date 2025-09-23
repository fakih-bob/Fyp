// src/notificationCenter.ts
// Central helper you can call from any screen:
// - initNotificationCenter(): wire listeners & ask permission
// - notifyNow(): fire a local notif now (and save to list)
// - notifyIn(): fire after N seconds (simulate "background push")
// - listNotifications(), clearNotifications(): manage history
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIST_KEY = '@notifs_v1';
const MAX_NOTIFS = 500;

let initialized = false;
let subs: Notifications.Subscription[] = [];

// ---------- Types ----------
export type SavedNotif = {
  id: string;
  title?: string;
  body?: string;
  data?: any;
  receivedAt: string;
};

// ---------- Safe storage helpers ----------
async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    console.warn('AsyncStorage read error:', key, e);
    return fallback;
  }
}
async function safeSet(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('AsyncStorage write error:', key, e);
  }
}

// ---------- Permissions (ask once) ----------
async function ensurePermissions() {
  // iOS needs explicit permission; on Android 13+ there’s also a runtime permission.
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

// ---------- Public API ----------
export async function initNotificationCenter() {
  if (initialized) return;
  initialized = true;

  // Ask for permission early (safe on emulator too)
  await ensurePermissions();

  // Save notifications delivered while app is foregrounded
  const s1 = Notifications.addNotificationReceivedListener(async (n) => {
    const c = n.request?.content ?? {};
    await appendToList({
      id: String(Date.now()),
      title: c.title ?? 'Notification',
      body: c.body ?? '',
      data: c.data ?? {},
      receivedAt: new Date().toISOString(),
    });
  });

  // Save when user taps from the tray
  const s2 = Notifications.addNotificationResponseReceivedListener(async (r) => {
    const c = r.notification?.request?.content ?? {};
    await appendToList({
      id: String(Date.now()),
      title: c.title ?? 'Notification',
      body: c.body ?? '',
      data: c.data ?? {},
      receivedAt: new Date().toISOString(),
    });
  });

  subs.push(s1, s2);
}

export function teardownNotificationCenter() {
  subs.forEach((s) => s.remove());
  subs = [];
  initialized = false;
}

/** Fire a local notification now (and also save to history by default). */
export async function notifyNow(opts: { title: string; body?: string; data?: any; alsoList?: boolean }) {
  const { title, body = '', data = {}, alsoList = true } = opts;

  if (alsoList) {
    await appendToList({
      id: String(Date.now()),
      title, body, data,
      receivedAt: new Date().toISOString(),
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null, // now
  });
}

/** Fire a local notification after N seconds. */
export async function notifyIn(seconds: number, opts: { title: string; body?: string; data?: any }) {
  const { title, body = '', data = {} } = opts;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, // or: 'timeInterval'
    seconds: 5,
    repeats: false,
  },
  });
}

/** Read saved notifications (newest first). */
export async function listNotifications(): Promise<SavedNotif[]> {
  return safeGet<SavedNotif[]>(LIST_KEY, []);
}

/** Clear saved list (does not clear OS tray). */
export async function clearNotifications(): Promise<void> {
  await safeSet(LIST_KEY, []);
}

// ---------- internal ----------
async function appendToList(item: SavedNotif) {
  const arr = await safeGet<SavedNotif[]>(LIST_KEY, []);
  arr.unshift(item);
  await safeSet(LIST_KEY, arr.slice(0, MAX_NOTIFS));
}

/* Usage cheat-sheet:
import './src/notifications/setup'; // App.tsx top
useEffect(() => { initNotificationCenter(); }, []);
await notifyNow({ title: 'Hello', body: 'From anywhere', data: { foo:'bar' } });
const items = await listNotifications();
*/
