'use client';

import { useState } from 'react';
import MessageBubble from '@/components/Leads/MessageBubble';
import { generateWhatsAppLink, personalizeMessage } from '@/lib/nurture';

interface Note {
  lead_id: string;
  note_text: string;
  created_at: string;
  source: string;
}

interface ActionCenterProps {
  lead: any;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  session: any;
  fmtDate: (date: string) => string;
  onAddNote: (text: string) => Promise<void>;
  onDeleteNote: (text: string) => Promise<void>;
  onBookCall: (details: any) => Promise<void>;
  onDeleteEvent: () => Promise<void>;
  templates: any[];
}

export default function ActionCenter({
  lead,
  notes,
  setNotes,
  session,
  fmtDate,
  onAddNote,
  onDeleteNote,
  onBookCall,
  onDeleteEvent,
  templates
}: ActionCenterProps) {
  const [newNote, setNewNote] = useState('');
  const [callDate, setCallDate] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookSuccess, setBookSuccess] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const text = newNote.trim();
    setNewNote('');
    await onAddNote(text);
  };

  const handleBookCall = async () => {
    if (!callDate) return;
    setBooking(true);
    setBookSuccess('');
    try {
      await onBookCall({ callDate, eventTitle, eventNote });
      setBookSuccess('Scheduled!');
      setTimeout(() => setBookSuccess(''), 3000);
      setCallDate('');
      setEventTitle('');
      setEventNote('');
    } catch (e: any) {
      alert(e.message || 'Failed to schedule');
    }
    setBooking(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── NOTES ── */}
      <div className="pane-card transition-enterprise">
        <div className="text-[11px] font-bold text-amber-500 tracking-widest mb-3.5 uppercase">Notes</div>
        <div className="flex flex-col gap-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <div className="text-xs text-slate-400 italic opacity-40">No notes yet.</div>
          ) : (
            notes.map((note, i) => (
              <div key={i} className="glass-surface rounded-xl p-3 flex justify-between items-start transition-enterprise hover:border-amber-500/30">
                <div>
                  <div className="text-sm text-amber-200/90 leading-relaxed mb-1.5">{note.note_text}</div>
                  <div className="text-[10px] text-slate-400 opacity-50">
                    {note.source === 'imported' ? 'Imported from Sheet' : fmtDate(note.created_at)}
                  </div>
                </div>
                <button onClick={() => onDeleteNote(note.note_text)} className="text-red-400 hover:text-red-300 transition-colors text-lg leading-none opacity-60 hover:opacity-100">×</button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newNote} 
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a note..." 
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            className="input-field flex-1"
          />
          <button 
            onClick={handleAddNote} 
            disabled={!newNote.trim()}
            className="btn-primary transition-enterprise px-4 py-2 text-xs"
            style={{ backgroundColor: 'var(--warning-color)', color: 'var(--bg-color)' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* ── BOOKING ── */}
      <div className="pane-card transition-enterprise">
        <div className="text-[11px] font-bold text-blue-500 tracking-widest mb-3.5 uppercase">Book Appointment</div>
        {session?.accessToken ? (
          <div className="flex flex-col gap-3">
            <input 
              type="text" 
              placeholder="Event Title" 
              value={eventTitle} 
              onChange={e => setEventTitle(e.target.value)} 
              className="input-field w-full" 
            />
            <input 
              type="text" 
              placeholder="Appointment Note" 
              value={eventNote} 
              onChange={e => setEventNote(e.target.value)} 
              className="input-field w-full" 
            />
            <input 
              type="datetime-local" 
              value={callDate} 
              onChange={e => setCallDate(e.target.value)} 
              className="input-field w-full"
              style={{ colorScheme: 'dark' }} 
            />
            <div className="flex gap-2">
              <button 
                onClick={handleBookCall} 
                disabled={booking || !callDate} 
                className="btn-primary transition-enterprise flex-1 py-3 text-xs"
                style={{ backgroundColor: 'var(--info-color)', color: 'var(--bg-color)' }}
              >
                {booking ? 'Scheduling...' : bookSuccess ? `✓ ${bookSuccess}` : 'Add to Google Calendar'}
              </button>
              <button 
                onClick={onDeleteEvent} 
                className="transition-enterprise px-3 py-3 rounded-xl border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors text-lg"
              >
                🗑
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-xs text-slate-400 opacity-60">
            Sign in to Google on your Dashboard to enable 1-tap scheduling here.
          </div>
        )}
      </div>

      {/* ── TEMPLATES ── */}
      <div className="pane-card transition-enterprise">
        <div className="text-[11px] font-bold text-emerald-500 tracking-widest mb-3.5 uppercase">Quick Templates</div>
        <div className="flex flex-col gap-2">
          {templates.map(tpl => {
            const personalised = personalizeMessage(tpl.text, lead.full_name, lead.metadata?.clinic_type);
            return (
              <MessageBubble
                key={tpl.id}
                title={tpl.name}
                messageText={personalised}
                phoneNumber={lead.phone_number}
                generateWhatsAppLink={generateWhatsAppLink}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
