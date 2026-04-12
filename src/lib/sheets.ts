import { Lead } from '../types';

export interface GoogleSheetRow {
  id: string;
  created_time: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  clinic_type: string;
  treatment_price: string;
  lead_quality_desc: string;
  notes: string;
}

export async function fetchLeadsFromSheet(spreadsheetId: string, apiKey: string): Promise<GoogleSheetRow[]> {
  // This is a skeleton for the Google Sheets API call
  // In a real implementation, we would use:
  // https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:Z?key=${apiKey}
  
  console.log(`Fetching leads from sheet ${spreadsheetId}...`);
  
  // Mocking the return for now to allow frontend development
  return [
    {
      id: 'row1',
      created_time: new Date().toISOString(),
      full_name: 'Dr. Rajesh Kumar',
      phone_number: '9876543210',
      company_name: 'Smile Dental Clinic',
      clinic_type: 'Dental',
      treatment_price: '5000',
      lead_quality_desc: 'Interested in implants',
      notes: 'Wants to start next month',
    },
    {
      id: 'row2',
      created_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      full_name: 'Dr. Priya Sharma',
      phone_number: '9123456789',
      company_name: 'Glow Skin Care',
      clinic_type: 'Dermatology',
      treatment_price: '12000',
      lead_quality_desc: 'Has existing leads but no conversions',
      notes: '',
    },
  ];
}

export function mapSheetRowToLead(row: GoogleSheetRow): Partial<Lead> {
  return {
    sheet_id: row.id,
    full_name: row.full_name,
    phone_number: row.phone_number,
    company_name: row.company_name,
    created_at: row.created_time,
    metadata: {
      clinic_type: row.clinic_type,
      price: row.treatment_price,
      quality: row.lead_quality_desc,
      notes: row.notes,
    },
  };
}
