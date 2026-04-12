export type LeadStatus = 'active' | 'paused' | 'converted' | 'completed';

export interface Lead {
  id: string;
  sheet_id: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  current_step: number; // 0-indexed (0 = Message 1)
  status: LeadStatus;
  last_sent_at: string | null;
  created_at: string;
  metadata: any;
}

export interface NurtureStep {
  step_number: number; // 1-indexed
  day_offset: number;
  message_text: string;
}
