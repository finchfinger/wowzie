export type Conversation = {
  id: string;
  participant_name: string;
  avatar_emoji?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
    participant_profile_id?: string | null;
  camp_slug?: string | null;
  camp_name?: string | null; // optional if you want to display it

};

export type Message = {
  id: string;
  conversation_id: string;
  sender: "user" | "them";
  body: string;
  created_at: string;
};
