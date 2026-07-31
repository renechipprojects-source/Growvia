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

// ─── COMMUNICATIONS SERVICE (Module 4: communications) ───────────────────────

export async function fetchCircularsFromModule(): Promise<{ data: Circular[]; isFromSupabase: boolean }> {
  try {
    const { data, error } = await supabase
      .from("communications")
      .select("*")
      .eq("message_type", "circular")
      .order("published_at", { ascending: false });

    if (error || !data || data.length === 0) {
      // Fallback query to legacy circulars table
      const { data: legacy } = await supabase.from("circulars").select("*");
      if (legacy && legacy.length > 0) {
        const mapped: Circular[] = legacy.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          published_date: new Date(d.published_at || d.created_at).toISOString().split("T")[0],
          target_audience: d.target_audience || "All",
          author: d.author || "School Admin",
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: Circular[] = data.map((d: any) => ({
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
      .from("communications")
      .select("*")
      .eq("message_type", "general_message")
      .or(`sender_id.eq.${userId},recipient_user_id.eq.${userId}`);

    if (error || !data || data.length === 0) {
      // Fallback query to legacy messages table
      const { data: legacy } = await supabase.from("messages").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      if (legacy && legacy.length > 0) {
        const mapped: MessageRecord[] = legacy.map((d: any) => ({
          id: d.id,
          sender_id: d.sender_id,
          sender_name: d.sender_name,
          sender_role: d.sender_role,
          receiver_id: d.receiver_id,
          receiver_role: d.receiver_role,
          message_text: d.message_text,
          sent_at: d.sent_at,
          read_status: d.read_status,
        }));
        return { data: mapped, isFromSupabase: true };
      }
      return { data: [], isFromSupabase: false };
    }

    const mapped: MessageRecord[] = data.map((d: any) => ({
      id: d.id,
      sender_id: d.sender_id,
      sender_name: d.sender_name || "Sender",
      sender_role: d.sender_role || "user",
      receiver_id: d.recipient_user_id || "all",
      receiver_role: d.recipient_role || "user",
      message_text: d.body,
      sent_at: d.published_at || d.created_at,
      read_status: !!d.read_status,
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
    const { data, error } = await supabase.from("communications").insert([payload]).select();
    // Dual-write legacy circulars table for resilience
    Promise.resolve(supabase.from("circulars").insert([{
      id: payload.id,
      title: payload.title,
      content: payload.body,
      target_audience: payload.recipient_role,
      author: payload.sender_name,
      published_date: payload.published_at,
    }])).catch(() => {});
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
    const { data, error } = await supabase.from("communications").insert([payload]).select();
    // Dual-write legacy messages table for resilience
    Promise.resolve(supabase.from("messages").insert([{
      id: payload.id,
      sender_id: payload.sender_id,
      sender_name: payload.sender_name,
      sender_role: payload.sender_role,
      receiver_id: payload.recipient_user_id,
      receiver_role: payload.recipient_role,
      message_text: payload.body,
      sent_at: payload.published_at,
      read_status: false,
    }])).catch(() => {});
    return { data: data ? data[0] : payload, error };
  } catch (err) {
    return { data: payload, error: err };
  }
}
