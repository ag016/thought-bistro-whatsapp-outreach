import { NurtureStep, MessageVariant } from '../types';

export const NURTURE_SEQUENCE: NurtureStep[] = [
  {
    step_number: 1,
    day_offset: 1,
    message_text: `Hey Doctor, based on your answers, you're dealing with something a lot of clinics deal with...`,
    variants: [
      {
        id: 'no-ads',
        label: 'Not Running Ads',
        text: `Hey Doctor,\n\nBased on your answers, you aren't currently running ads. Usually this means relying entirely on word of mouth or Practo, which is great for steady business but unpredictable for scaling high-value treatments.\n\nQuick context on who we are: we're Thought Bistro, and we engineer patient acquisition machines. We build a predictable flow of premium patients so you aren't waiting on the algorithm or referrals.\n\nWe guarantee you'll get enough qualified leads in month 1 that you can make your money back - or we lose 50% of our fee.\n\nFree for a quick 5-minute call tomorrow?`
      },
      {
        id: 'no-budget',
        label: "Leads Don't Have Budget",
        text: `Hey Doctor,\n\nBased on your answers, you're getting leads but they don't seem to have the budget. This is the #1 symptom of running 'offer-based' generic ads that attract price shoppers instead of premium patients.\n\nQuick context: we're Thought Bistro. We fix this by running authority-based video ads that pre-educate patients on the value of the treatment before they ever see the price.\n\nWe guarantee you'll get enough qualified leads in month 1 that you can make your money back - or we lose 50% of our fee.\n\nFree for a quick 5-minute call tomorrow?`
      },
      {
        id: 'no-show',
        label: "Don't Show Up",
        text: `Hey Doctor,\n\nBased on your answers, you're booking appointments but patients aren't showing up. This usually means your lead generation process hasn't established enough trust or urgency.\n\nQuick context: we're Thought Bistro. Our system uses clinical research-backed videos and pain-point lead forms so that by the time they book, they are fully invested in solving their problem with you specifically.\n\nWe guarantee you'll get enough qualified leads in month 1 that you can make your money back - or we lose 50% of our fee.\n\nFree for a quick 5-minute call tomorrow?`
      },
      {
        id: 'no-pickup',
        label: "Don't Pick Up",
        text: `Hey Doctor,\n\nBased on your answers, you're dealing with something almost every clinic deals with: generating leads but them not answering your calls!\n\nThis happens because standard lead forms make it too easy to click by mistake. At Thought Bistro, we obsess over lead quality. We use strict, high-friction forms so that when your team calls, the patient is actually waiting for it.\n\nWe guarantee you'll get enough qualified leads in month 1 that you can make your money back - or we lose 50% of our fee.\n\nFree for a quick 5-minute call tomorrow?`
      }
    ]
  },
  {
    step_number: 2,
    day_offset: 2,
    message_text: `Doctor, here's what we actually do - because most marketing folk sound the same, so let me be specific.\n\nWe find the real clinical research behind your treatments. We turn that into single-take video ads...`,
    variants: [
      {
        id: 'general',
        label: 'General Follow-up',
        text: `Doctor, here's what we actually do - because most marketing folk sound the same, so let me be specific.\n\nWe find the real clinical research behind your treatments. We turn that into single-take video ads. That ad attracts patients who already understand the procedure before they ever fill out a form.\n\nBy the time a lead reaches your team - they're not curious. They're informed and ready.\n\nYour staff stop making cold calls and start having warm conversations instead.\n\nWant to see how it plugs into your clinic?`
      },
      {
        id: 'budget-focus',
        label: 'Focus on Premium Patient',
        text: `Doctor, let me be specific about how we fix the "no budget" problem.\n\nInstead of advertising discounts, we advertise your clinical expertise. We turn your research into single-take video ads. This filters out the bargain hunters and attracts patients who care about quality and safety.\n\nBy the time they reach your team, they're not asking "how much is it?" they're asking "when can I come in?"\n\nWant to see how we build this for your clinic?`
      }
    ]
  },
  {
    step_number: 3,
    day_offset: 4,
    message_text: `Doctor, do most marketing folk tell you that "results take time"?\n\nDr. Asheena's skin clinic in Lajpat Nagar got 12 qualified leads in the first 6 days.\n\nShe asked us to guarantee 2 leads in Month 1. We got her 12 in less than a week.\n\nThe reason it works fast: patients come in already convinced by the science in the video. They're not browsing - they're deciding.\n\nWant to see how we'd build this for your clinic?`
  },
  {
    step_number: 4,
    day_offset: 6,
    message_text: `Doctor, honest question -\n\nWhen your team calls your current leads, what's the most common thing they hear?\n\n"I was just looking."\n"Send me more information."\n"Call me next month."\n\nIf it's any of those - the problem isn't your team. It's that your ads are attracting browsers, not buyers. And that's 100% fixable at the campaign level.\n\nWorth a quick chat?`
  },
  {
    step_number: 5,
    day_offset: 9,
    message_text: `Doctor, is your team tired of calling people who "just clicked by mistake"?\n\nOur lead forms are built around patient pain points. Before your team picks up the phone, they already know:\n\n- What the patient is struggling with\n- How long they've had the problem\n- Whether they've tried other treatments\n\nIksana Wellness (skin clinic, Hauz Khas) asked us to guarantee 4 qualified leads in Month 1.\n\nThey got 16 in the first 14 days.\n\nThis quality is exactly why we back it with a guarantee: get enough qualified leads in month 1 that you can make your money back or we lose 50% of our fee.\n\nWorth 5 minutes to see how we'd set this up for you?`
  },
  {
    step_number: 6,
    day_offset: 12,
    message_text: `One thing we do differently that most clinics don't expect:\n\nWe only focus on one treatment at a time.\n\nWe build a complete dedicated system for that single procedure - research, video, lead form, follow-up - and we prove it works before we touch anything else.\n\nNo scattergun marketing. No "let's try everything." One thing, done properly, until it prints.\n\nWhich high-value treatment would you want to own in your area first?`
  },
  {
    step_number: 7,
    day_offset: 16,
    message_text: `Doctor, here's something most agencies won't tell you - you'll never actually meet the people running your campaigns.\n\nAt Thought Bistro, the founders are the ones who appear in the videos. Our faces. Our credibility on the line. Every single time.\n\nDr. Aakash's obesity clinic in Lajpat Nagar asked us to guarantee 2 leads in Month 1.\n\nHe got 45.\n\nThat's not a fluke - that's what happens when the people building your campaign actually care about the outcome.\n\nWant to see what this would look like in practice for you?`
  },
  {
    step_number: 8,
    day_offset: 20,
    message_text: `Doctor, the biggest hidden cost in clinic marketing isn't ad spend.\n\nIt's the hours your front desk burns on leads that were never serious.\n\nBad leads don't just waste money - they burn out good people.\n\nBecause our leads come pre-educated by research videos and pre-qualified by pain-point forms, your team spends less time convincing and more time confirming.\n\nShorter calls. Higher close rate. Staff that actually stays motivated.\n\nIs that worth solving?`
  },
  {
    step_number: 9,
    day_offset: 25,
    message_text: `Doctor, here's the long game if you're interested.\n\nMonth 1: We pick your highest-value treatment and build the full system around it. You get your minimum qualified leads - guaranteed, or we lose 50% of our fee.\n\nMonth 2+: Once the machine is proven, we replicate it for every other treatment in your clinic. One by one. Until your patient acquisition runs without you touching it.\n\nDr. Aakash started with obesity. Dr. Asheena started with skin. Iksana started with one treatment line.\n\nAll three are now expanding.\n\nWant to pick which treatment we start with for you?`
  },
  {
    step_number: 10,
    day_offset: 30,
    message_text: `Doctor, this is my last follow-up - I don't want to clog your inbox.\n\nI'll assume the timing isn't right just yet, and that's completely okay.\n\nBut when you're ready - we're the only company that guarantees your ROI in Month 1 or loses 50% of our fee. And as you've seen, our clients don't just hit the guarantee. They blow past it.\n\nDr. Aakash wanted 2 leads. Got 45.\nDr. Asheena wanted 2. Got 12 in 6 days.\nIksana wanted 4. Got 16 in 14 days.\n\nWhen the time is right, you know where to find us.\n\nWishing you and your clinic the very best.`
  }
];

/**
 * A lead is "due" when enough time has passed since the PREVIOUS message was sent.
 * For step 0 (first message), we count from created_at.
 * For all subsequent steps, we count from last_sent_at.
 * Each step's day_offset represents days BETWEEN messages, not since inception.
 */
export function calculateIsDue(lead: { status: string; current_step: number; created_at: string; last_sent_at: string | null; metadata?: { lead_status?: string } }): boolean {
  if (lead.status !== 'active' || lead.current_step >= NURTURE_SEQUENCE.length) return false;
  if (lead.metadata?.lead_status === 'Not Qualified') return false;
  const currentStep = NURTURE_SEQUENCE[lead.current_step];
  // For the first message (step 0) use created_at; for subsequent steps use last_sent_at
  const baseline = lead.current_step === 0 || !lead.last_sent_at
    ? new Date(lead.created_at)
    : new Date(lead.last_sent_at);
  const daysSinceBaseline = Math.ceil((Date.now() - baseline.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceBaseline >= currentStep.day_offset;
}

export function getDaysUntilDue(lead: { current_step: number; created_at: string; last_sent_at: string | null }): number {
  if (lead.current_step >= NURTURE_SEQUENCE.length) return 0;
  const step = NURTURE_SEQUENCE[lead.current_step];
  const baseline = lead.current_step === 0 || !lead.last_sent_at
    ? new Date(lead.created_at)
    : new Date(lead.last_sent_at);
  const daysElapsed = Math.ceil((Date.now() - baseline.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, step.day_offset - daysElapsed);
}

export function generateWhatsAppLink(phone: string, message: string): string {
  // Completely strip non-digits
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  if (!cleanPhone) return '';
  let formattedPhone = cleanPhone;
  // If it's a 10 digit Indian number without country code
  if (cleanPhone.length === 10) {
    formattedPhone = '91' + cleanPhone;
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    formattedPhone = '91' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('91') && cleanPhone.length !== 10 && !cleanPhone.startsWith('1') && !cleanPhone.startsWith('44')) {
    // Arbitrary fallback just in case formatting is totally weird but it's an Indian lead
    formattedPhone = '91' + cleanPhone;
  }
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

export function autoExtractNickname(fullName: string): string {
  if (!fullName) return '';
  const titles = ['Doctor', 'Prof\\.', 'Prof', 'Dr\\.', 'Dr', 'Mr\\.', 'Mr', 'Ms\\.', 'Ms', 'Mrs\\.', 'Mrs'];
  const regex = new RegExp(`^(${titles.join('|')})\\s+`, 'i');
  const cleaned = fullName.trim().replace(regex, '');
  // Return only the first part of the cleaned name to be a concise nickname
  return cleaned.split(' ')[0];
}

/**
 * Personalise a message template.
 * Uses `nickname` first (as-is, no prefix added). Falls back to extracting
 * first name from fullName and prepending "Dr.".
 * This prevents the "Dr. Dr. Surname" issue when the lead fills "Dr. XYZ".
 */
export function personalizeMessage(text: string, fullName: string, clinicType?: string, nickname?: string): string {
  let nameToUse: string;
  const titles = ['Doctor', 'Prof\\.', 'Prof', 'Dr\\.', 'Dr', 'Mr\\.', 'Mr', 'Ms\\.', 'Ms', 'Mrs\\.', 'Mrs'];
  const titleRegex = new RegExp(`^(${titles.join('|')})`, 'i');

  if (nickname && nickname.trim()) {
    const trimmedNick = nickname.trim();
    // If nickname already starts with a title, use it verbatim. Otherwise, add "Dr. "
    nameToUse = titleRegex.test(trimmedNick) ? trimmedNick : `Dr. ${trimmedNick}`;
  } else {
    const nick = autoExtractNickname(fullName);
    nameToUse = nick ? `Dr. ${nick}` : 'Doctor';
  }
  
  return text
    // Replace "Hey Doctor," with personalised greeting
    .replace(/Hey Doctor,/g, `Hey ${nameToUse},`)
    // Replace generic "Doctor," salutation
    .replace(/Doctor,/g, `${nameToUse},`)
    // Specific template replacements
    .replace(/\[NAME\]/g, nameToUse)
    .replace(/\[CLINIC_TYPE\]/g, clinicType ? clinicType.toLowerCase() : 'clinic');
}

// ── Appointment Confirmation Messages ─────────────────────────────────────────

export interface AppointmentConfirmation {
  id: string;
  label: string;
  offsetLabel: string; // Human label for when to send
  buildMessage: (leadName: string, appointmentTime: string, nickname?: string) => string;
}

export const APPOINTMENT_CONFIRMATIONS: AppointmentConfirmation[] = [
  {
    id: 'day_before',
    label: 'Day Before',
    offsetLabel: 'Send the day before appointment',
    buildMessage: (leadName, appointmentTime, nickname) => {
      const titles = ['Doctor', 'Prof\\.', 'Prof', 'Dr\\.', 'Dr', 'Mr\\.', 'Mr', 'Ms\\.', 'Ms', 'Mrs\\.', 'Mrs'];
      const titleRegex = new RegExp(`^(${titles.join('|')})`, 'i');
      
      let name = 'Doctor';
      if (nickname && nickname.trim()) {
        const trimmedNick = nickname.trim();
        name = titleRegex.test(trimmedNick) ? trimmedNick : `Dr. ${trimmedNick}`;
      } else {
        const nick = autoExtractNickname(leadName);
        name = nick ? `Dr. ${nick}` : 'Doctor';
      }

      return `Hi ${name}!\n\nJust a quick reminder that we have our call scheduled for tomorrow at ${appointmentTime}.\n\nLooking forward to speaking with you and understanding how we can help grow your clinic. If anything comes up, just give me a heads-up!\n\nSee you tomorrow!\n\n— Team Bistro`;
    }
  },
  {
    id: 'day_of',
    label: 'Day Of',
    offsetLabel: 'Send on the day of appointment',
    buildMessage: (leadName, appointmentTime, nickname) => {
      const titles = ['Doctor', 'Prof\\.', 'Prof', 'Dr\\.', 'Dr', 'Mr\\.', 'Mr', 'Ms\\.', 'Ms', 'Mrs\\.', 'Mrs'];
      const titleRegex = new RegExp(`^(${titles.join('|')})`, 'i');
      
      let name = 'Doctor';
      if (nickname && nickname.trim()) {
        const trimmedNick = nickname.trim();
        name = titleRegex.test(trimmedNick) ? trimmedNick : `Dr. ${trimmedNick}`;
      } else {
        const nick = autoExtractNickname(leadName);
        name = nick ? `Dr. ${nick}` : 'Doctor';
      }

      return `Good morning ${name}!\n\nExcited for our call today at ${appointmentTime}!\n\nHere's the quick agenda:\n- Understand your current patient acquisition setup\n- Walk you through what we build\n- See if our system makes sense for your clinic\n\nTalk soon!\n\n— Team Bistro`;
    }
  },
  {
    id: 'one_hour_before',
    label: '1 Hour Before',
    offsetLabel: 'Send 1 hour before appointment',
    buildMessage: (leadName, appointmentTime, nickname) => {
      const titles = ['Doctor', 'Prof\\.', 'Prof', 'Dr\\.', 'Dr', 'Mr\\.', 'Mr', 'Ms\\.', 'Ms', 'Mrs\\.', 'Mrs'];
      const titleRegex = new RegExp(`^(${titles.join('|')})`, 'i');
      
      let name = 'Doctor';
      if (nickname && nickname.trim()) {
        const trimmedNick = nickname.trim();
        name = titleRegex.test(trimmedNick) ? trimmedNick : `Dr. ${trimmedNick}`;
      } else {
        const nick = autoExtractNickname(leadName);
        name = nick ? `Dr. ${nick}` : 'Doctor';
      }

      return `Hi ${name}!\n\nJust a heads-up — our call is in about an hour, at ${appointmentTime}.\n\nNo prep needed on your end, just bring your questions!\n\nSee you soon!\n\n— Team Bistro`;
    }
  }
];

export function autoSelectVariant(stepNumber: number, leadQualityDesc: string, variants: MessageVariant[] | undefined): MessageVariant | undefined {
  if (!variants || variants.length === 0) return undefined;
  
  const desc = (leadQualityDesc || '').toLowerCase();
  
  if (stepNumber === 1) {
    if (desc.includes('budget') || desc.includes('price')) {
      return variants.find(v => v.id === 'no-budget');
    }
    if (desc.includes('show up') || desc.includes('no show')) {
      return variants.find(v => v.id === 'no-show');
    }
    if (desc.includes('pick up') || desc.includes('answer')) {
      return variants.find(v => v.id === 'no-pickup');
    }
    if (desc.includes('ads') || desc.includes('not running')) {
      return variants.find(v => v.id === 'no-ads');
    }
  }
  
  if (stepNumber === 2) {
    if (desc.includes('budget') || desc.includes('price')) {
      return variants.find(v => v.id === 'budget-focus');
    }
  }
  
  // Return the first one as default if no match
  return variants[0];
}

/**
 * Standardised patterns for appointment markers in notes.
 * Used to extract scheduled calls from general history.
 */
export const APPOINTMENT_REGEX = /^Scheduled call for (.+?)(?:\s+\(([^)]+)\))?(?:\s+\[by ([^\]]+)\])?$/;

export function isAppointmentNote(text: string): boolean {
  return text.startsWith('Scheduled call for ');
}

export interface AppointmentInfo {
  dateStr: string;
  title: string;
  bookerEmail: string;
}

export function parseAppointmentInfo(text: string): AppointmentInfo | null {
  if (!isAppointmentNote(text)) return null;
  const match = text.match(APPOINTMENT_REGEX);
  if (!match) return { dateStr: text.replace('Scheduled call for ', ''), title: '', bookerEmail: '' };

  return {
    dateStr: match[1],
    title: match[2] || '',
    bookerEmail: match[3] || '',
  };
}

