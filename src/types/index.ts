export type LeadStatus = 'active' | 'paused' | 'converted' | 'completed';

export interface Lead {
  id: string;
  sheet_id: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  current_step: number; // 0-indexed (0 = Message 1)
  status: LeadStatus;
  internal_tag?: string;
  nickname?: string; // Preferred name for messages (avoids "Dr. Dr." issue)
  last_sent_at: string | null;
  created_at: string;
  metadata: any;
}

export interface MessageVariant {
  id: string; // e.g. 'no-ads', 'no-budget', 'no-show', 'no-pickup', 'default'
  label: string; // e.g. "Not Running Ads"
  text: string;
}

export interface NurtureStep {
  step_number: number; // 1-indexed
  day_offset: number;
  message_text: string; // Default fallback message
  variants?: MessageVariant[]; // Branches for the tree architecture
}
