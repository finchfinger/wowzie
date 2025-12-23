// src/components/messages/messageTypes.ts

export type Conversation = {
  id: string;
  participant_name: string;
  avatar_emoji?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;

  participant_profile_id?: string | null;

  camp_slug?: string | null;
  camp_name?: string | null;
};

export type Sender = "user" | "them" | "system";

export type Message = {
  id: string;
  conversation_id: string;
  sender: Sender;
  body: string;
  created_at: string;

  // ✅ add this for image attachments
  image_url?: string | null;
};
