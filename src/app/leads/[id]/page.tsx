"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  NURTURE_SEQUENCE,
  getDaysUntilDue,
  autoSelectVariant,
  personalizeMessage,
  generateWhatsAppLink,
  APPOINTMENT_CONFIRMATIONS,
  autoExtractNickname,
  isAppointmentNote,
  parseAppointmentInfo,
  getNextDueTimestamp,
} from "@/lib/nurture";
import MessageBubble from "@/components/Leads/MessageBubble";
import ActionCenter from "@/components/Leads/ActionCenter";
import Timer from "@/components/UI/Timer";
import { Skeleton } from "@/components/UI/Skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

type LeadStatus = "active" | "paused" | "converted" | "completed";

interface Lead {
  id: string;
  sheet_id: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  current_step: number;
  status: LeadStatus;
  last_sent_at: string | null;
  created_at: string;
  internal_tag?: string;
  nickname?: string;
  metadata: {
    clinic_type: string;
    treatment_price: string;
    lead_quality_desc: string;
    notes: string;
    ad_name: string;
    campaign_name: string;
    platform: string;
    india_time: string;
    lead_status: string;
  };
}

interface Note {
  lead_id: string;
  note_text: string;
  created_at: string;
  source: string;
}

const AUTH_KEY = "tb_auth_session";
const LOCAL_LEADS_KEY = "tb_manual_leads";

// ── Templates ─────────────────────────────────────────────────────────────────

const MESSAGE_TEMPLATES = [
  {
    id: "starter",
    name: "Starter Capacity",
    text: `Hi [NAME], great speaking with you!

I'm excited to get started on building your patient acquisition engine with our Starter Capacity setup (₹60,000/campaign) tailored specifically for your [CLINIC_TYPE].

Our singular focus is *Lead Quality*. We don't chase vanity metrics; we are engineering an infrastructure strictly to bring you high-intent patients who are actually ready to book.

For this build, we handle all the heavy lifting, which includes:
- 1 Dedicated Ad Set
- 2 Research-Backed Authority Videos
- Complete Tech Setup & Lead Forms

Ongoing Management:
To ensure the system stays optimized, there is an ongoing support fee of ₹15,000/month per campaign. However, to get us off to a flying start, this fee is completely waived for your first month.

The 'Skin-in-the-Game' Guarantee:
We are backing this with a strict performance guarantee. We guarantee you will get enough qualified leads in month one that you can make your money back—or we refund 50% of your total investment or waive the second half.

Investment & Terms:
(All prices are exclusive of GST)

1. Full Upfront: ₹51,000 (15% discount applied)
2. Split Payment: ₹30,000 now and ₹30,000 on launch

You can view the full breakdown of deliverables here: https://www.thethoughtbistro.com/pricing

Think over which payment option you'd prefer, and we can finalize everything during our meeting tomorrow!

-Vishrut`,
  },
  {
    id: "growth",
    name: "Growth Capacity",
    text: `Hi [NAME], great speaking with you!

I'm excited to get started on building your patient acquisition engine with our Growth Capacity setup (₹1,75,000/campaign) designed for [CLINIC_TYPE].

Our singular focus is Lead Quality. We don't chase vanity metrics; we are engineering an infrastructure strictly to bring you high-intent patients who are actually ready to book.

For this build, we handle all the heavy lifting, which includes:
- 1 Dedicated Ad Set
- 7 Research-Backed Authority Videos
- Complete Tech Setup & Lead Forms

Ongoing Management:
To ensure the system stays optimized, there is an ongoing support fee of ₹15,000/month per campaign. However, to get us off to a flying start, this fee is completely waived for your first month.

The 'Skin-in-the-Game' Guarantee:
We are backing this with a strict performance guarantee. We guarantee you will get enough qualified leads in month one that you can make your money back—or we refund 50% of your total investment or waive the second half.

Investment & Terms:
(All prices are exclusive of GST)

1. Full Upfront: ₹1,48,750 (15% discount applied)
2. Split Payment: ₹87,500 now and ₹87,500 on launch

You can view the full breakdown of deliverables here: https://www.thethoughtbistro.com/pricing

Think over which payment option you'd prefer, and we can finalize everything during our meeting tomorrow!

-Vishrut`,
  },
  {
    id: "domination",
    name: "Market Domination",
    text: `Hi [NAME], great speaking with you!

I'm excited to get started on building your patient acquisition engine with our Market Domination setup (₹3,50,000/campaign) engineered for [CLINIC_TYPE].

Our singular focus is Lead Quality at scale. We don't chase vanity metrics; we are engineering a full-stack patient acquisition machine to bring you high-intent patients across multiple treatments simultaneously.

For this build, we handle all the heavy lifting, which includes:
- 2 Targeted Ad Sets (Different Patient Avatars)
- 14 Research-Backed Authority Videos (7 per Ad Set)
- Split Lead Forms by Avatar
- Dual CAPI Configuration for Rapid Scaling
- Complete Tech Setup & Lead Forms

Ongoing Management:
To ensure the system stays optimized, there is an ongoing support fee of ₹15,000/month per campaign. However, to get us off to a flying start, this fee is completely waived for your first month.

The 'Skin-in-the-Game' Guarantee:
We are backing this with a strict performance guarantee. We guarantee you will get enough qualified leads in month one that you can make your money back—or we refund 50% of your total investment or waive the second half.

Investment & Terms:
(All prices are exclusive of GST)

1. Full Upfront: ₹2,97,500 (15% discount applied)
2. Split Payment: ₹1,75,000 now and ₹1,75,000 on launch

You can view the full breakdown of deliverables here: https://www.thethoughtbistro.com/pricing

Think over which payment option you'd prefer, and we can finalize everything during our meeting tomorrow!

-Vishrut`,
  },
];

function fmt(str: string) {
  if (!str) return "—";
  const parts = str.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (parts) {
    const [, d, m, y, h, min, s] = parts;
    const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}`);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  }
  try {
    return new Date(str).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return str;
  }
}

function InfoField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      style={{
        display: fullWidth ? "block" : "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--text-color)",
          opacity: 0.5,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-color)", opacity: 0.9 }}>
        {value}
      </div>
    </div>
  );
}

function LeadDetailInner({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [fromTab, setFromTab] = useState("all");

  const [lead, setLead] = useState<Lead | null>(null);
  const [nurtureRaw, setNurtureRaw] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  const [showPastApts, setShowPastApts] = useState(false);
  const [mobileTab, setMobileTab] = useState<"info" | "timeline" | "notes">(
    "info",
  );

  const { data: session } = useSession();

  useEffect(() => {
    // Safe access to search params on client to avoid hydration/suspense errors
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setFromTab(sp.get("tab") || "all");
    }

    const isAuthed =
      typeof window !== "undefined" &&
      (sessionStorage.getItem(AUTH_KEY) === "1" || !!session);
    if (!isAuthed) {
      router.push("/");
    }
  }, [router, session]);

  const loadLead = useCallback(async () => {
    setLoading(true);
    try {
      const paramId = decodeURIComponent(params.id);
      const [leadsRes, nurtureRes, notesRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/nurture"),
        fetch(`/api/notes?leadId=${encodeURIComponent(paramId)}`),
      ]);

      // Safely parse each response — a 500 error may return non-JSON
      const leadsData: { leads?: any[] } = leadsRes.ok
        ? await leadsRes.json().catch(() => ({ leads: [] }))
        : { leads: [] };
      const nurtureData: { nurture?: Record<string, Record<string, string>> } =
        nurtureRes.ok
          ? await nurtureRes.json().catch(() => ({ nurture: {} }))
          : { nurture: {} };
      const notesData: { notes?: Note[] } = notesRes.ok
        ? await notesRes.json().catch(() => ({ notes: [] }))
        : { notes: [] };

      let found = (leadsData.leads ?? []).find(
        (l) => l.sheet_id === paramId || l.id === paramId,
      );

      // Local fallback for manual leads
      if (!found) {
        try {
          const stored = localStorage.getItem(LOCAL_LEADS_KEY);
          if (stored) {
            const localLeads = JSON.parse(stored);
            found = localLeads.find(
              (l: any) => l.sheet_id === paramId || l.id === paramId,
            );
          }
        } catch (e) {
          console.error("Failed to load local lead", e);
        }
      }

      if (found) {
        const nMap = nurtureData.nurture ?? {};
        const nEntry = nMap[found.sheet_id] ?? {};
        let currentStep = parseInt(nEntry.current_step ?? "0");
        if (isNaN(currentStep)) currentStep = 0;

        const resolvedLead: Lead = {
          ...found,
          id: found.sheet_id,
          current_step: currentStep,
          status: nEntry.status || "active",
          last_sent_at: nEntry.last_sent_at || null,
          nickname:
            nEntry.nickname ||
            found.nickname ||
            autoExtractNickname(found.full_name),
        };
        setLead(resolvedLead);
        setNicknameInput(resolvedLead.nickname || "");
        setNurtureRaw(nEntry);
      }
      setNotes(notesData.notes ?? []);
    } catch (e) {
      console.error("[LeadDetail] loadLead error:", e);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const handleMarkMsgSent = async (stepNumber?: number) => {
    if (!lead || stepNumber === undefined) return;
    const now = new Date().toISOString();
    const newCurrentStep = Math.max(lead.current_step, stepNumber);
    setLead((prev) =>
      prev
        ? { ...prev, current_step: newCurrentStep, last_sent_at: now }
        : prev,
    );
    setNurtureRaw((prev) => ({
      ...prev,
      current_step: String(newCurrentStep),
      last_sent_at: now,
      [`msg${stepNumber}_sent`]: now,
    }));
    await fetch("/api/nurture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        currentStep: newCurrentStep,
        lastSentAt: now,
        msgIndex: stepNumber,
        sentAt: now,
      }),
    });
  };

  const handlePause = async () => {
    if (!lead) return;
    const newStatus = lead.status === "paused" ? "active" : "paused";
    setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
    setNurtureRaw((prev) => ({ ...prev, status: newStatus }));
    await fetch("/api/nurture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, status: newStatus }),
    });
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!lead) return;
    setLead((prev) =>
      prev
        ? { ...prev, metadata: { ...prev.metadata, lead_status: newStatus } }
        : prev,
    );
    await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, newStatus }),
    });
  };

  const handleUpdateTag = async (newTag: string) => {
    if (!lead) return;
    setLead((prev) => (prev ? { ...prev, internal_tag: newTag } : prev));
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, tag: newTag }),
    });
  };

  const handleSaveNickname = async () => {
    if (!lead) return;
    setSavingNickname(true);
    const newNickname = nicknameInput.trim();
    setLead((prev) => (prev ? { ...prev, nickname: newNickname } : prev));
    setNurtureRaw((prev) => ({ ...prev, nickname: newNickname }));
    setEditingNickname(false);
    await fetch("/api/nurture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, nickname: newNickname }),
    });
    setSavingNickname(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead) return;
    setAddingNote(true);
    const text = newNote.trim();
    const now = new Date().toISOString();
    setNotes((prev) => [
      ...prev,
      { lead_id: lead.id, note_text: text, created_at: now, source: "manual" },
    ]);
    setNewNote("");
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, noteText: text, createdAt: now }),
    });
    setAddingNote(false);
  };

  const handleDeleteNote = async (noteText: string) => {
    if (!lead) return;
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(
        `/api/notes?leadId=${encodeURIComponent(lead.id)}&noteText=${encodeURIComponent(noteText)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to delete note");
      setNotes((prev) => prev.filter((n) => n.note_text !== noteText));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!lead) return;
    if (!confirm("Remove appointment from Google Calendar?")) return;
    try {
      const res = await fetch(
        `/api/calendar?leadName=${encodeURIComponent(lead.full_name)}&phone=${encodeURIComponent(lead.phone_number)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok)
        throw new Error("No matching event found or failed to delete");
      alert("Event removed from calendar");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBack = () => {
    router.push(fromTab !== "all" ? `/?tab=${fromTab}` : "/");
  };

  const handleBookCall = async ({
    callDate,
    eventTitle,
    eventNote,
  }: {
    callDate: string;
    eventTitle: string;
    eventNote: string;
  }) => {
    if (!lead) return;
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadName: lead.full_name,
        phone: lead.phone_number,
        dateStr: callDate,
        summary: eventTitle || undefined,
        description: eventNote || undefined,
      }),
    });
    if (!res.ok) throw new Error("Failed to schedule");
    const bookerEmail = session?.user?.email || "";
    const noteText = `Scheduled call for ${new Date(callDate).toLocaleString()} ${eventTitle ? `(${eventTitle})` : ""}${bookerEmail ? ` [by ${bookerEmail}]` : ""}`;
    const now = new Date().toISOString();
    setNotes((prev) => [
      ...prev,
      {
        lead_id: lead.id,
        note_text: noteText,
        created_at: now,
        source: "system",
      },
    ]);
    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, noteText, createdAt: now }),
    });
  };

  if (loading) return null; // Handled by Suspense fallback
  if (!lead) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          color: "var(--accent-color)",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 40 }}>404</div>
        <div>Lead not found</div>
        <button
          onClick={handleBack}
          className="btn-primary transition-enterprise"
          style={{ marginTop: 8, padding: "10px 20px" }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isCompleted = lead.current_step >= NURTURE_SEQUENCE.length;
  const daysUntil = getDaysUntilDue(lead);
  const m = lead.metadata;
  // ── Appointment Extraction ──
  const appointmentsRaw = notes
    .filter(n => isAppointmentNote(n.note_text))
    .map(n => {
      const info = parseAppointmentInfo(n.note_text)!;
      const aptDate = new Date(info.dateStr);
      const isValid = !isNaN(aptDate.getTime());
      return {
        ...info,
        dateObj: aptDate,
        formattedDate: isValid
          ? aptDate.toLocaleString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : info.dateStr,
        timeOnlyStr: isValid
          ? aptDate.toLocaleString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "",
      };
    });

  const upcomingAppointments = appointmentsRaw.filter(apt => apt.dateObj > new Date());
  const pastAppointments = appointmentsRaw.filter(apt => apt.dateObj <= new Date());

  const displayNotes = notes.filter((n) => !isAppointmentNote(n.note_text));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-color)",
        color: "var(--text-color)",
        paddingBottom: 60,
      }}
    >
      {/* --- Header --- */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--bg-color)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-color)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          onClick={handleBack}
          className="transition-enterprise"
          style={{
            background: "var(--surface-color)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            color: "var(--accent-color)",
            padding: "8px 14px",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: 700,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = "var(--accent-color)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-color)")
          }
        >
          &lt;
        </button>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-color)",
              opacity: 0.5,
              marginBottom: 4,
            }}
          >
            <span style={{ cursor: "pointer" }} onClick={handleBack}>
              Dashboard
            </span>
            <span>›</span>
            <span style={{ color: "var(--accent-color)" }}>
              {lead.full_name}
            </span>
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: "var(--text-color)",
            }}
          >
            {lead.full_name}
          </div>
          <div
            style={{ fontSize: 12, color: "var(--text-color)", opacity: 0.6 }}
          >
            {lead.company_name || "No company"} · {lead.phone_number}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={handlePause}
            className="transition-enterprise"
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid var(--border-color)",
              background: "var(--surface-color)",
              color:
                lead.status === "paused"
                  ? "var(--accent-color)"
                  : "var(--text-color)",
              opacity: lead.status === "paused" ? 1 : 0.6,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {lead.status === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      <div className="mobile-tab-nav" style={{ padding: '16px 24px', display: 'flex', gap: 12, overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {['info', 'timeline', 'notes'].map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab as any)}
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              background:
                mobileTab === tab
                  ? "var(--accent-color)"
                  : "var(--surface-color)",
              color:
                mobileTab === tab ? "var(--bg-color)" : "var(--text-color)",
              border:
                mobileTab === tab
                  ? "1px solid var(--accent-color)"
                  : "1px solid var(--border-color)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.2s ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px" }}>
        <div className="detail-grid">
          {/* --- LEFT PANEL: Lead Info & Identity --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className={mobileTab === 'info' ? '' : 'hidden-mobile'}>
              {/* Nurture Progress */}
              <div className="pane-card">
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent-color)",
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}
                >
                  NURTURE PROGRESS
                </div>
                <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                  {NURTURE_SEQUENCE.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background:
                          i < lead.current_step
                            ? "var(--accent-color)"
                            : i === lead.current_step && !isCompleted
                              ? "rgba(var(--accent-color), 0.35)"
                              : "var(--border-color)",
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--text-color)", fontWeight: 700 }}>
                    Step {lead.current_step} / 10
                  </span>
                  {isCompleted ? (
                    <span
                      style={{ color: "var(--accent-color)", fontWeight: 700 }}
                    >
                      Sequence complete
                    </span>
                  ) : (
                    (() => {
                      const dueTs = getNextDueTimestamp(lead);
                      return dueTs <= Date.now() ? (
                        <span
                          style={{
                            color: "var(--accent-color)",
                            fontWeight: 700,
                          }}
                        >
                          Due now
                        </span>
                      ) : (
                        <Timer
                          targetTimestamp={dueTs}
                          prefix="Next in"
                          style={{ color: "var(--text-color)" }}
                        />
                      );
                    })()
                  )}
                </div>
                {lead.last_sent_at && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-color)",
                      opacity: 0.4,
                      marginTop: 6,
                    }}
                  >
                    Last sent: {fmt(lead.last_sent_at)}
                  </div>
                )}
              </div>

              {/* Lead Info */}
              <div className="pane-card">
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--accent-color)",
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}
                >
                  LEAD INFO
                </div>

                {/* Nickname field */}
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-color)",
                      opacity: 0.5,
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    ADDRESSED NAME (NICKNAME)
                  </div>
                  {editingNickname ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveNickname();
                          if (e.key === "Escape") {
                            setEditingNickname(false);
                            setNicknameInput(lead.nickname || "");
                          }
                        }}
                        className="input-field"
                        style={{ flex: 1, fontSize: 13 }}
                        placeholder="e.g. Dr. Rajesh or just Rajesh"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveNickname}
                        disabled={savingNickname}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "var(--accent-color)",
                          color: "var(--bg-color)",
                          fontSize: 12,
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                      onClick={() => setEditingNickname(true)}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: lead.nickname
                            ? "var(--text-color)"
                            : "var(--text-color)",
                          opacity: lead.nickname ? 0.9 : 0.4,
                          flex: 1,
                        }}
                      >
                        {lead.nickname || "Click to set nickname…"}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--accent-color)",
                          opacity: 0.7,
                        }}
                      >
                        ✏️
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-color)",
                      opacity: 0.35,
                      marginTop: 4,
                    }}
                  >
                    Used in all outgoing messages (avoids "Dr. Dr." issue)
                  </div>
                </div>

                {/* Internal Tag */}
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-color)",
                      opacity: 0.5,
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    INTERNAL TAG
                  </div>
                  <select
                    value={lead.internal_tag || "NEW"}
                    onChange={(e) => handleUpdateTag(e.target.value)}
                    className="input-field"
                    style={{
                      width: "100%",
                      cursor: "pointer",
                      appearance: "none",
                    }}
                  >
                    <option value="NEW">NEW</option>
                    <option value="HOT">HOT</option>
                    <option value="WARM">WARM</option>
                    <option value="COLD">COLD</option>
                    <option value="FOLLOW_UP">FOLLOW UP</option>
                    <option value="CONVERTED">CONVERTED</option>
                  </select>
                </div>

                <div className="meta-grid">
                  {m.platform && (
                    <InfoField label="Platform" value={m.platform} />
                  )}
                  {m.campaign_name && (
                    <InfoField label="Campaign" value={m.campaign_name} />
                  )}
                  {m.ad_name && <InfoField label="Ad" value={m.ad_name} />}
                  {m.clinic_type && (
                    <InfoField label="Clinic Type" value={m.clinic_type} />
                  )}
                  {m.treatment_price && (
                    <InfoField
                      label="Avg Price"
                      value={`Rs. ${m.treatment_price}`}
                    />
                  )}
                  {m.lead_status && (
                    <InfoField label="Status" value={m.lead_status} />
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-color)",
                      opacity: 0.5,
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    SHEET STATUS (QUALIFICATION)
                  </div>
                  <select
                    value={m.lead_status || "CREATED"}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="input-field"
                    style={{
                      width: "100%",
                      cursor: "pointer",
                      appearance: "none",
                    }}
                  >
                    <option value="CREATED">CREATED</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Not Qualified">Not Qualified</option>
                  </select>
                </div>

                <InfoField
                  label="Submitted"
                  value={fmt(m.india_time || lead.created_at)}
                  fullWidth
                />

                {m.lead_quality_desc && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-color)",
                        opacity: 0.7,
                        marginBottom: 6,
                        fontWeight: 700,
                      }}
                    >
                      CURRENT LEAD SITUATION
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-color)",
                        opacity: 0.9,
                        lineHeight: 1.6,
                      }}
                    >
                      {m.lead_quality_desc}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booked Appointments — Moved to Notes tab on mobile */}
            {(upcomingAppointments.length > 0 || pastAppointments.length > 0) && (
              <div
                className={mobileTab === 'notes' ? '' : 'hidden-mobile'}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div
                  className="pane-card"
                  style={{
                    border: "2px solid var(--info-color)",
                    background:
                      "linear-gradient(to bottom, rgba(59,130,246,0.12), transparent)",
                    padding: 16,
                  }}
                >
                  {upcomingAppointments.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--info-color)",
                          letterSpacing: "0.08em",
                          marginBottom: 14,
                        }}
                      >
                        📅 UPCOMING CALLS
                      </div>
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 12 }}
                      >
                        {upcomingAppointments.map((apt, i) => (
                          <div
                            key={i}
                            style={{
                              borderRadius: 16,
                              padding: "16px",
                              background: "var(--surface-color)",
                              border: "1px solid var(--border-color)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "start",
                                marginBottom: 8,
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 800,
                                    color: "var(--text-color)",
                                  }}
                                  >
                                  {apt.formattedDate}
                                </div>
                                {apt.title && (
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: "var(--info-color)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {apt.title}
                                  </div>
                                )}
                              </div>
                              <div style={{ background: 'var(--info-color)', color: 'var(--bg-color)', padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>CONFIRMED</div>
                            </div>

                            {apt.bookerEmail && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-color)",
                                  opacity: 0.5,
                                  marginBottom: 12,
                                }}
                              >
                                Host:{" "}
                                <span
                                  style={{ color: "var(--text-color)", opacity: 0.9 }}
                                  >
                                  {apt.bookerEmail}
                                </span>
                              </div>
                            )}

                            <div
                              style={{
                                borderTop: "1px solid var(--border-color)",
                                paddingTop: 12,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  color: "var(--text-color)",
                                  opacity: 0.4,
                                  marginBottom: 8,
                                }}
                              >
                                Send Reminders
                              </div>
                              <div
                                style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                              >
                                {APPOINTMENT_CONFIRMATIONS.map((conf) => {
                                  const msg = conf.buildMessage(
                                    lead.full_name,
                                    apt.timeOnlyStr || apt.formattedDate,
                                    lead.nickname,
                                  );
                                  const waLink = generateWhatsAppLink(
                                    lead.phone_number,
                                    msg,
                                  );
                                  return (
                                    <a
                                      key={conf.id}
                                      href={waLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="transition-enterprise"
                                      style={{
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        padding: "6px 10px",
                                        borderRadius: 8,
                                        background: "var(--info-color)",
                                        color: "var(--bg-color)",
                                        textDecoration: "none",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {conf.label} ↗
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastAppointments.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowPastApts(!showPastApts)}
                        className="transition-enterprise"
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '8px 0',
                          marginBottom: showPastApts ? 12 : 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-color)",
                            opacity: 0.6,
                            letterSpacing: "0.08em",
                          }}
                        >
                          🕒 PAST BOOKINGS ({pastAppointments.length})
                        </div>
                        <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: showPastApts ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                      </button>
                      {showPastApts && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {pastAppointments.map((apt, i) => (
                            <div
                              key={i}
                              style={{
                                borderRadius: 16,
                                padding: "12px",
                                background: "var(--surface-color)",
                                border: "1px solid var(--border-color)",
                                opacity: 0.6,
                                filter: 'grayscale(1)',
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "start",
                                  marginBottom: 4,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 700,
                                      color: "var(--text-color)",
                                    }}
                                  >
                                    {apt.formattedDate}
                                  </div>
                                  {apt.title && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "var(--info-color)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {apt.title}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {apt.bookerEmail && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-color)",
                                    opacity: 0.5,
                                  }}
                                  >
                                  Host: {apt.bookerEmail}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* --- CENTER PANEL: Message Timeline --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className={mobileTab === 'timeline' ? '' : 'hidden-mobile'}>

            <div className="pane-card">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color)', letterSpacing: '0.08em', marginBottom: 16 }}>MESSAGE TIMELINE</div>
              <div style={{ fontSize: 12, color: 'var(--text-color)', opacity: 0.6, marginBottom: 20 }}>
                Click a message to expand. Open WhatsApp first, then mark as sent.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {NURTURE_SEQUENCE.map((step, i) => {
                  const sentTimestamp =
                    nurtureRaw[`msg${step.step_number}_sent`];
                  const hasBeenSent = !!sentTimestamp;
                  const isCurrentTarget =
                    !hasBeenSent && i === lead.current_step && !isCompleted;

                  const selectedVariant = autoSelectVariant(
                    step.step_number,
                    m.lead_quality_desc,
                    step.variants,
                  );
                  const baseText = selectedVariant
                    ? selectedVariant.text
                    : step.message_text;
                  const finalText = personalizeMessage(
                    baseText,
                    lead.full_name,
                    m.clinic_type,
                    lead.nickname,
                  );

                  return (
                    <div
                      key={i}
                      style={{ display: "flex", gap: 12, marginBottom: 16 }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          width: 20,
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            flexShrink: 0,
                            marginTop: 14,
                            background: hasBeenSent
                              ? "var(--accent-color)"
                              : isCurrentTarget
                                ? "rgba(var(--accent-color), 0.5)"
                                : "var(--border-color)",
                            border: isCurrentTarget
                              ? "2px solid var(--accent-color)"
                              : "none",
                          }}
                        />
                        {i < NURTURE_SEQUENCE.length - 1 && (
                          <div
                            style={{
                              width: 2,
                              flex: 1,
                              minHeight: 40,
                              background: hasBeenSent
                                ? "rgba(var(--accent-color), 0.2)"
                                : "var(--border-color)",
                              margin: "4px 0",
                            }}
                          />
                        )}
                      </div>

                      <div style={{ flex: 1, paddingTop: 8 }}>
                        <MessageBubble
                          stepNumber={step.step_number}
                          messageText={finalText}
                          hasBeenSent={hasBeenSent}
                          sentTimestamp={sentTimestamp}
                          isCurrentTarget={isCurrentTarget}
                          phoneNumber={lead.phone_number}
                          onMarkSent={handleMarkMsgSent}
                          fmtDate={fmt}
                          generateWhatsAppLink={generateWhatsAppLink}
                          nextDueTimestamp={
                            i === lead.current_step && !isCompleted
                              ? getNextDueTimestamp(lead)
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="system-event">
                  <span>Lead created on {fmt(lead.created_at)}</span>
                </div>
                {lead.internal_tag && (
                  <div className="system-event">
                    <span>Tag updated to {lead.internal_tag}</span>
                  </div>
                )}
                {lead.current_step > 0 && (
                  <div className="system-event">
                    <span>Reached Nurture Step {lead.current_step}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- RIGHT PANEL: Action Center --- */}
          <div className={mobileTab === 'notes' ? '' : 'hidden-mobile'}>
            <ActionCenter
              lead={lead}
              notes={displayNotes}
              setNotes={setNotes}
              session={session}
              fmtDate={fmt}
              onAddNote={async (text) => {
                if (!lead) return;
                const now = new Date().toISOString();
                setNotes((prev) => [
                  ...prev,
                  {
                    lead_id: lead.id,
                    note_text: text,
                    created_at: now,
                    source: "manual",
                  },
                ]);
                await fetch("/api/notes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    leadId: lead.id,
                    noteText: text,
                    createdAt: now,
                  }),
                });
              }}
              onDeleteNote={handleDeleteNote}
              onBookCall={handleBookCall}
              onDeleteEvent={handleDeleteEvent}
              templates={MESSAGE_TEMPLATES}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadDetail({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg-color)",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 32,
            }}
          >
            <Skeleton variant="rect" width={40} height={40} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton variant="text" width={200} />
              <Skeleton variant="text" width={120} />
            </div>
          </div>
          <div
            className="detail-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr 320px",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Skeleton variant="rect" height={120} />
              <Skeleton variant="rect" height={300} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Skeleton variant="rect" height={600} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Skeleton variant="rect" height={600} />
            </div>
          </div>
        </div>
      }
    >
      <LeadDetailInner params={params} />
    </Suspense>
  );
}
