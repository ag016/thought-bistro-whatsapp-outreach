import React from 'react';
import { Lead } from '../types';
import { calculateIsDue, generateWhatsAppLink, NURTURE_SEQUENCE } from '../lib/nurture';

interface LeadCardProps {
  lead: Lead;
  onSend: (id: string) => void;
  onPause: (id: string) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onSend, onPause }) => {
  const isDue = calculateIsDue(lead);
  const currentStep = NURTURE_SEQUENCE[lead.current_step];
  const waLink = generateWhatsAppLink(lead.phone_number, currentStep.message_text);

  return (
    <div className={`p-4 mb-4 rounded-2xl border transition-enterprise ${isDue ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{lead.full_name}</h3>
          <p className="text-sm text-gray-500">{lead.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${isDue ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {isDue ? 'Due Today' : 'Pending'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a 
          href={waLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`flex-1 text-center py-3 rounded-xl font-semibold transition-enterprise ${isDue ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          onClick={() => isDue && onSend(lead.id)}
        >
          {isDue ? `Send Message ${currentStep.step_number}` : 'Wait for Day ' + currentStep.day_offset}
        </a>
        
        <button 
          onClick={() => onPause(lead.id)}
          className={`px-4 py-3 rounded-xl border font-medium transition-enterprise ${lead.status === 'paused' ? 'bg-red-100 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          {lead.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      </div>
      
      <div className="mt-3 text-xs text-gray-400 flex justify-between">
        <span>Next: Day {currentStep.day_offset}</span>
        <span>Step {lead.current_step} / 10</span>
      </div>
    </div>
  );
};
