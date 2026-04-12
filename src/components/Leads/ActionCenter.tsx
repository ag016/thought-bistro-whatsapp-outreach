'use client';

import { useState } from 'react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── NOTES ── */}
      <div style={{ 
        background: 'var(--surface-color)', 
        border: '1px solid var(--border-color)', 
        borderRadius: 18, 
        padding: 20 
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning-color)', letterSpacing: '0.08em', marginBottom: 14 }}>NOTES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          {notes.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.4, fontStyle: 'italic' }}>No notes yet.</div>
          ) : (
            notes.map((note, i) => (
              <div key={i} style={{ 
                background: 'color-mix(in srgb, var(--surface-color), var(--warning-color) 10%)', 
                border: '1px solid color-mix(in srgb, var(--border-color), var(--warning-color) 30%)', 
                borderRadius: 12, 
                padding: '12px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start' 
              }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--warning-color)', lineHeight: 1.5, marginBottom: 6 }}>{note.note_text}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-color)', opacity: 0.5 }}>
                    {note.source === 'imported' ? 'Imported from Sheet' : fmtDate(note.created_at)}
                  </div>
                </div>
                <button onClick={() => onDeleteNote(note.note_text)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>×</button>
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input 
            type="text" 
            value={newNote} 
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a note..." 
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            style={{ 
              flex: 1, 
              background: 'var(--bg-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 10, 
              padding: '10px 14px', 
              color: 'var(--text-color)', 
              fontSize: 13 
            }}
          />
          <button 
            onClick={handleAddNote} 
            disabled={!newNote.trim()}
            style={{ 
              padding: '0 16px', 
              borderRadius: 10, 
              background: 'var(--warning-color)', 
              color: 'var(--bg-color)', 
              fontWeight: 700, 
              border: 'none', 
              cursor: 'pointer' 
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* ── BOOKING ── */}
      <div style={{ 
        background: 'var(--surface-color)', 
        border: '1px solid var(--border-color)', 
        borderRadius: 18, 
        padding: 20 
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--info-color)', letterSpacing: '0.08em', marginBottom: 14 }}>BOOK APPOINTMENT</div>
        {session?.accessToken ? (
          <>
            <input 
              type="text" 
              placeholder="Event Title" 
              value={eventTitle} 
              onChange={e => setEventTitle(e.target.value)} 
              style={{ width: '100%', marginBottom: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-color)', fontSize: 13 }} 
            />
            <input 
              type="text" 
              placeholder="Appointment Note" 
              value={eventNote} 
              onChange={e => setEventNote(e.target.value)} 
              style={{ width: '100%', marginBottom: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-color)', fontSize: 13 }} 
            />
            <input 
              type="datetime-local" 
              value={callDate} 
              onChange={e => setCallDate(e.target.value)} 
              style={{ width: '100%', marginBottom: 12, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-color)', fontSize: 13, colorScheme: 'dark' }} 
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={handleBookCall} 
                disabled={booking || !callDate} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: 10, 
                  background: booking ? 'color-mix(in srgb, var(--info-color), black 40%)' : 'var(--info-color)', 
                  color: 'var(--bg-color)', 
                  fontWeight: 700, 
                  border: 'none', 
                  cursor: 'pointer' 
                }}
              >
                {booking ? 'Scheduling...' : bookSuccess ? '✓ ' + bookSuccess : 'Add to Google Calendar'}
              </button>
              <button 
                onClick={onDeleteEvent} 
                style={{ 
                  padding: '12px', 
                  borderRadius: 10, 
                  background: 'color-mix(in srgb, var(--surface-color), var(--danger-color) 20%)', 
                  color: 'var(--danger-color)', 
                  border: '1px solid var(--danger-color)', 
                  cursor: 'pointer', 
                  fontSize: 18 
                }}
              >
                🗑
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, color: 'var(--text-color)', opacity: 0.6 }}>
            Sign in to Google on your Dashboard to enable 1-tap scheduling here.
          </div>
        )}
      </div>

      {/* ── TEMPLATES ── */}
      <div style={{ 
        background: 'var(--surface-color)', 
        border: '1px solid var(--border-color)', 
        borderRadius: 18, 
        padding: 20 
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 14 }}>QUICK TEMPLATES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(tpl => {
            const personalised = tpl.text.replace('[NAME]', lead.full_name);
            const waLink = `https://wa.me/${lead.phone_number}?text=${encodeURIComponent(personalised)}`;
            return (
              <div key={tpl.id} style={{ position: 'relative' }}>
                <a 
                  href={waLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    padding: '12px', 
                    borderRadius: 12, 
                    background: 'var(--bg-color)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-color)', 
                    fontSize: 13, 
                    fontWeight: 600, 
                    textDecoration: 'none', 
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  {tpl.name}
                  <span style={{ fontSize: 16 }}>↗</span>
                </a>
                <button 
                  onClick={(e) => { e.preventDefault(); setPreviewTemplate(personalised); }}
                  style={{ 
                    position: 'absolute', 
                    right: 40, 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--accent-color)', 
                    cursor: 'pointer', 
                    fontSize: 11, 
                    fontWeight: 700, 
                    textDecoration: 'underline' 
                  }}
                >
                  Preview
                </button>
              </div>
            );
          })}
        </div>

        {previewTemplate && (
          <div style={{ 
            marginTop: 16, 
            padding: '12px', 
            background: 'var(--bg-color)', 
            border: '1px solid var(--accent-color)', 
            borderRadius: 12, 
            fontSize: 12, 
            color: 'var(--text-color)', 
            whiteSpace: 'pre-wrap',
            position: 'relative'
          }}>
            <button 
              onClick={() => setPreviewTemplate(null)} 
              style={{ position: 'absolute', top: -10, right: -10, background: 'var(--accent-color)', color: 'var(--bg-color)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              ×
            </button>
            {previewTemplate}
          </div>
        )}
      </div>
    </div>
  );
}
