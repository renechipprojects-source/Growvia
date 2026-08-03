import { supabase } from "./supabase";
import type { Circular } from "./supabaseService";

export interface MessageRecord {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  receiver_id: string;
  receiver_role: string;
  message_text: string;
  sent_at: string;
  read_status: boolean;
}

// ─── COMMUNICATIONS SERVICE (Module 4: GV_communications) ───────────────────────

export async function fetchCircularsFromModule(): Promise<{ data: Circular[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "circular")
      .order("published_at", { ascending: false });

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: Circular[] = rows.map((d: any) => ({
      id: d.id,
      title: d.title || "School Circular",
      content: d.body,
      published_date: new Date(d.published_at || d.created_at).toISOString().split("T")[0],
      target_audience: d.recipient_role || "All",
      author: d.sender_name || d.sender_id || "School Admin",
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function fetchMessagesFromModule(userId: string): Promise<{ data: MessageRecord[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("gv_communications")
      .select("*")
      .eq("message_type", "general_message")
      .or(`sender_id.eq.${userId},recipient_user_id.eq.${userId}`);

    if (error) return { data: [], isFromSupabase: false };
    const rows = data || [];

    const mapped: MessageRecord[] = rows.map((d: any) => ({
      id: d.id,
      sender_id: d.sender_id,
      sender_name: d.sender_name,
      sender_role: d.sender_role,
      receiver_id: d.recipient_user_id || "ALL",
      receiver_role: d.recipient_role || "all",
      message_text: d.body || "",
      sent_at: d.created_at || new Date().toISOString(),
      read_status: Boolean(d.read_status),
    }));

    return { data: mapped, isFromSupabase: true };
  } catch {
    return { data: [], isFromSupabase: false };
  }
}

export async function publishCircularToModule(circular: Partial<Circular>) {
  const payload = {
    id: circular.id || `CIR-${Date.now()}`,
    message_type: "circular",
    title: circular.title,
    body: circular.content,
    sender_id: circular.author || "Admin",
    sender_name: circular.author || "School Admin",
    sender_role: "admin",
    recipient_role: circular.target_audience || "all",
    published_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("gv_communications").insert([payload]).select();
    Promise.resolve(supabase.from("communications").insert([payload])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}

export async function sendMessageToModule(msg: Partial<MessageRecord>) {
  const payload = {
    id: msg.id || `MSG-${Date.now()}`,
    message_type: "general_message",
    title: "Direct Message",
    body: msg.message_text,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name,
    sender_role: msg.sender_role,
    recipient_user_id: msg.receiver_id,
    recipient_role: msg.receiver_role,
    read_status: false,
    published_at: msg.sent_at || new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("gv_communications").insert([payload]).select();
    Promise.resolve(supabase.from("communications").insert([payload])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}
