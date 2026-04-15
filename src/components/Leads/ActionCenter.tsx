"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble from "@/components/Leads/MessageBubble";
import {
  generateWhatsAppLink,
  personalizeMessage,
  APPOINTMENT_CONFIRMATIONS,
} from "@/lib/nurture";

interface Note {
  lead_id: string;
  note_text: string;
  created_at: string;
  source: string;
  /** If this note is a superseded original, its edit timestamp */
  edited_by?: string;
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

// ── Auto-expanding textarea ────────────────────────────────────────────────────

function AutoTextarea({
  value,
  onChange,
  placeholder,
  onKeyDown,
  className,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      className={className}
      style={{ resize: "none", overflow: "hidden", minHeight: 40, ...style }}
    />
  );
}

// ── NoteItem — single note with edit support ─────────────────────────────────

function NoteItem({
  note,
  fmtDate,
  onDelete,
  onEdit,
}: {
  note: Note;
  fmtDate: (d: string) => string;
  onDelete: (text: string) => void;
  onEdit: (oldText: string, newText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(note.note_text);
  const [showHistory, setShowHistory] = useState(false);

  const isOriginal = note.note_text.startsWith("[ORIGINAL] ");
  const isEdit = note.note_text.startsWith("[EDITED] ");

  const displayText = isEdit
    ? note.note_text.replace(/^\[EDITED\] /, "")
    : isOriginal
      ? note.note_text.replace(/^\[ORIGINAL\] /, "")
      : note.note_text;

  if (isOriginal) {
    // Render as collapsed "history" — only shown when parent toggles it
    return null; // handled by parent grouping; skip rendering inline
  }

  return (
    <div
      className="rounded-xl transition-enterprise"
      style={{
        background: "var(--surface-color)",
        border: "1px solid var(--border-color)",
        overflow: "hidden",
      }}
    >
      <div className="p-3">
        {/* Note body */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <AutoTextarea
              value={editText}
              onChange={setEditText}
              className="input-field w-full"
              style={{ fontSize: 13 }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditing(false);
                  setEditText(note.note_text);
                }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: "var(--border-color)",
                  color: "var(--text-color)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editText.trim() && editText.trim() !== note.note_text) {
                    onEdit(note.note_text, editText.trim());
                  }
                  setEditing(false);
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{
                  background: "var(--accent-color)",
                  color: "var(--bg-color)",
                }}
              >
                Save Edit
              </button>
            </div>
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed"
            style={{
              color: "var(--text-color)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {displayText}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px]"
              style={{ color: "var(--text-color)", opacity: 0.4 }}
            >
              {note.source === "imported"
                ? "Imported from Sheet"
                : fmtDate(note.created_at)}
            </span>
            {isEdit && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(234,179,8,0.15)",
                  color: "#eab308",
                  fontWeight: 700,
                }}
              >
                Edited
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-[10px] px-2 py-1 rounded opacity-40 hover:opacity-80 transition-enterprise"
                style={{ color: "var(--accent-color)" }}
              >
                Edit
              </button>
            )}
            <button
              onClick={() => onDelete(note.note_text)}
              className="text-lg leading-none opacity-30 hover:opacity-80 transition-enterprise"
              style={{ color: "#ef4444" }}
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

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
  templates,
}: ActionCenterProps) {
  const [newNote, setNewNote] = useState("");
  const [callDate, setCallDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookSuccess, setBookSuccess] = useState("");

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const text = newNote.trim();
    setNewNote("");
    await onAddNote(text);
  };

  const handleEditNote = async (oldText: string, newText: string) => {
    // Mark original as superseded (grey), append new version
    const now = new Date().toISOString();
    // Replace old note text with "[ORIGINAL]" prefix in local state
    setNotes((prev) =>
      prev
        .map((n) =>
          n.note_text === oldText
            ? { ...n, note_text: `[ORIGINAL] ${oldText}` }
            : n,
        )
        .concat([
          {
            lead_id: lead.id,
            note_text: `[EDITED] ${newText}`,
            created_at: now,
            source: "manual",
          },
        ]),
    );
    // Persist old → "[ORIGINAL]" version
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        noteText: `[ORIGINAL] ${oldText}`,
        createdAt: now,
      }),
    });
    // Persist new edited note
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        noteText: `[EDITED] ${newText}`,
        createdAt: now,
      }),
    });
    // Delete original plain note
    await fetch(
      `/api/notes?leadId=${encodeURIComponent(lead.id)}&noteText=${encodeURIComponent(oldText)}`,
      {
        method: "DELETE",
      },
    );
  };

  const handleBookCall = async () => {
    if (!callDate) return;
    setBooking(true);
    setBookSuccess("");
    try {
      await onBookCall({ callDate, eventTitle, eventNote });
      setBookSuccess("Scheduled!");
      setTimeout(() => setBookSuccess(""), 3000);
      setCallDate("");
      setEventTitle("");
      setEventNote("");
    } catch (e: any) {
      alert(e.message || "Failed to schedule");
    }
    setBooking(false);
  };

  // Separate system appointment notes from display notes
  const isAppointmentNote = (n: Note) =>
    n.note_text.startsWith("Scheduled call for ") && n.source === "system";
  const isOriginalNote = (n: Note) => n.note_text.startsWith("[ORIGINAL] ");
  const displayNotes = notes.filter((n) => !isAppointmentNote(n));

  // Group: find [ORIGINAL] partners for [EDITED] notes
  const getOriginalFor = (editedNote: Note): Note | undefined => {
    const editedText = editedNote.note_text.replace(/^\[EDITED\] /, "");
    return displayNotes.find(
      (n) =>
        n.note_text === `[ORIGINAL] ${editedText}` ||
        // also find any [ORIGINAL] that was created around the same time
        (n.note_text.startsWith("[ORIGINAL] ") &&
          Math.abs(
            new Date(n.created_at).getTime() -
              new Date(editedNote.created_at).getTime(),
          ) < 5000),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── NOTES ── */}
      <div className="pane-card transition-enterprise">
        <div
          className="text-[11px] font-bold tracking-widest mb-3.5 uppercase"
          style={{ color: "var(--accent-color)" }}
        >
          Notes
        </div>
        <div className="flex flex-col gap-2.5 mb-4">
          {displayNotes.length === 0 ? (
            <div
              className="text-xs italic"
              style={{ color: "var(--text-color)", opacity: 0.35 }}
            >
              No notes yet.
            </div>
          ) : (
            (() => {
              // Track which [ORIGINAL] notes have been "claimed" by an [EDITED] note
              const claimedOriginals = new Set<string>();

              return displayNotes.map((note, i) => {
                if (note.note_text.startsWith("[ORIGINAL] ")) {
                  // Render [ORIGINAL] notes in a greyed-out, collapsible style
                  if (claimedOriginals.has(note.note_text)) return null;
                  const origText = note.note_text.replace(/^\[ORIGINAL\] /, "");
                  return (
                    <details
                      key={i}
                      className="rounded-xl overflow-hidden"
                      style={{ border: "1px dashed var(--border-color)" }}
                    >
                      <summary
                        className="text-[11px] px-3 py-2 cursor-pointer select-none"
                        style={{
                          color: "var(--text-color)",
                          opacity: 0.4,
                          listStyle: "none",
                        }}
                      >
                        📜 Edit history — click to expand
                      </summary>
                      <div className="px-3 pb-3 pt-1">
                        <div
                          className="text-xs leading-relaxed"
                          style={{
                            color: "var(--text-color)",
                            opacity: 0.35,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            textDecoration: "line-through",
                          }}
                        >
                          {origText}
                        </div>
                        <div
                          className="text-[10px] mt-1"
                          style={{ color: "var(--text-color)", opacity: 0.25 }}
                        >
                          Originally written {fmtDate(note.created_at)}
                        </div>
                      </div>
                    </details>
                  );
                }

                return (
                  <NoteItem
                    key={i}
                    note={note}
                    fmtDate={fmtDate}
                    onDelete={onDeleteNote}
                    onEdit={handleEditNote}
                  />
                );
              });
            })()
          )}
        </div>
        {/* Auto-expanding note input */}
        <div className="flex gap-2 items-end">
          <AutoTextarea
            value={newNote}
            onChange={setNewNote}
            placeholder="Add a note... (Enter to submit)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            className="input-field flex-1"
            style={{ fontSize: 13 }}
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="btn-primary transition-enterprise px-4 text-xs font-bold"
            style={{
              backgroundColor: "var(--warning-color)",
              color: "var(--bg-color)",
              height: 40,
              borderRadius: 10,
              flexShrink: 0,
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* ── BOOKING ── */}
      <div className="pane-card transition-enterprise">
        <div
          className="text-[11px] font-bold tracking-widest mb-3.5 uppercase"
          style={{ color: "var(--info-color)" }}
        >
          Book Appointment
        </div>
        {session?.accessToken ? (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Event Title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="input-field w-full"
            />
            <input
              type="text"
              placeholder="Appointment Note"
              value={eventNote}
              onChange={(e) => setEventNote(e.target.value)}
              className="input-field w-full"
            />
            <input
              type="datetime-local"
              value={callDate}
              onChange={(e) => setCallDate(e.target.value)}
              className="input-field w-full"
              style={{ colorScheme: "dark" }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleBookCall}
                disabled={booking || !callDate}
                className="btn-primary transition-enterprise flex-1 py-3 text-xs"
                style={{
                  backgroundColor: "var(--info-color)",
                  color: "var(--bg-color)",
                }}
              >
                {booking
                  ? "Scheduling..."
                  : bookSuccess
                    ? `✓ ${bookSuccess}`
                    : "Add to Google Calendar"}
              </button>
              <button
                onClick={onDeleteEvent}
                className="transition-enterprise px-3 py-3 rounded-xl text-lg"
                style={{
                  border: "1px solid rgba(239,68,68,0.5)",
                  color: "#ef4444",
                }}
              >
                🗑
              </button>
            </div>
          </div>
        ) : (
          <div
            className="text-center py-2 text-xs"
            style={{ color: "var(--text-color)", opacity: 0.5 }}
          >
            Sign in to Google on your Dashboard to enable 1-tap scheduling here.
          </div>
        )}
      </div>

      {/* ── TEMPLATES ── */}
      <div className="pane-card transition-enterprise">
        <div
          className="text-[11px] font-bold tracking-widest mb-3.5 uppercase"
          style={{ color: "#10b981" }}
        >
          Quick Templates
        </div>
        <div className="flex flex-col gap-2">
          {templates.map((tpl) => {
            const personalised = personalizeMessage(
              tpl.text,
              lead.full_name,
              lead.metadata?.clinic_type,
              lead.nickname,
            );
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
