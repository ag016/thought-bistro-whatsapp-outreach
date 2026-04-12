import { Lead } from '../types';

// LocalStorage Wrapper to simulate Supabase
export const localDb = {
  getLeads: (): Lead[] => {
    const data = localStorage.getItem('thought_bistro_leads');
    return data ? JSON.parse(data) : [];
  },

  saveLeads: (leads: Lead[]) => {
    localStorage.setItem('thought_bistro_leads', JSON.stringify(leads));
  },

  upsertLead: (leadData: Partial<Lead>) => {
    const leads = localDb.getLeads();
    const index = leads.findIndex(l => l.sheet_id === leadData.sheet_id);
    
    if (index > -1) {
      leads[index] = { ...leads[index], ...leadData };
    } else {
      const newLead: Lead = {
        id: crypto.randomUUID(),
        sheet_id: leadData.sheet_id || '',
        full_name: leadData.full_name || 'Unknown',
        phone_number: leadData.phone_number || '',
        company_name: leadData.company_name || '',
        current_step: 0,
        status: 'active',
        last_sent_at: null,
        created_at: leadData.created_at || new Date().toISOString(),
        metadata: leadData.metadata || {},
      };
      leads.push(newLead);
    }
    
    localDb.saveLeads(leads);
    return leads;
  },

  updateLeadStatus: (id: string, updates: Partial<Lead>) => {
    const leads = localDb.getLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index !== -1) {
      leads[index] = { ...leads[index], ...updates };
      localDb.saveLeads(leads);
    }
  }
};
