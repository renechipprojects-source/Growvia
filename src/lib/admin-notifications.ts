// Admin notifications store with per-user unread + delete support.
import { notifications as seed } from "./admin-mock-data";

export type AdminNotification = {
  id: string;
  title: string;
  time: string;
  type: string;
  read: boolean;
};

type Listener = () => void;
const listeners = new Set<Listener>();
let store: AdminNotification[] = seed.map((n) => ({ ...n, read: false }));
let snapshot: AdminNotification[] = store;

function emit() {
  snapshot = store;
  for (const l of listeners) l();
}

export function subscribeAdminNotifications(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getAdminNotifications(): AdminNotification[] {
  return snapshot;
}

export function markAdminRead(id: string) {
  store = store.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

export function markAllAdminRead() {
  store = store.map((n) => ({ ...n, read: true }));
  emit();
}

export function removeAdminNotification(id: string) {
  store = store.filter((n) => n.id !== id);
  emit();
}
