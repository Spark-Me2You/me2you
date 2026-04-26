export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  org_id: string;
  body: string;
  created_at: string;
}

export interface MessageWithSender extends Message {
  sender: { id: string; name: string } | null;
}

export const MESSAGE_BODY_MAX = 500;
