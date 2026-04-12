import { NurtureStep } from '../types';

export const NURTURE_SEQUENCE: NurtureStep[] = [
  {
    step_number: 1,
    day_offset: 1,
    message_text: `Hey Doctor 👋\n\nBased on your answers, [you're dealing with something a lot of clinics who work with us have dealt with: generating leads but them not answering your calls.]\n\nQuick context on who we are: we're Thought Bistro, and we obsess over one thing only — getting qualified patients into your clinic. Not clicks. Not impressions. Actual people who show up ready to consult.\n\nWe're so confident in this that we guarantee you'll get enough quality leads to make your money back in Month 1 — or we lose 50% of our fee.\n\nI'd love to show you how the system works. Free for a quick 5-minute call tomorrow?`
  },
  {
    step_number: 2,
    day_offset: 2,
    message_text: `Doctor, here's what we actually do — because most marketing folk sound the same, so let me be specific.\n\nWe find the real clinical research behind your treatments. We turn that into a single-take video ads. That ad attracts patients who already understand the procedure before they ever fill out a form.\n\nBy the time a lead reaches your team — they're not curious. They're informed and ready.\n\nYour staff stop making cold calls and start having warm conversations instead.\n\nThat's the whole machine. Want to see how it plugs into your clinic? 🙂`
  },
  {
    step_number: 3,
    day_offset: 4,
    message_text: `Doctor, do most marketing folk tell you that “results take time”?\n\nDr. Asheena's skin clinic in Lajpat Nagar got 12 qualified leads in the first 6 days.\n\nShe asked us to guarantee 2 leads in Month 1. We got her 12 in less than a week.\n\nThe reason it works fast: patients come in already convinced by the science in the video. They're not browsing — they're deciding.\n\nWant to see how we'd build this for your clinic?`
  },
  {
    step_number: 4,
    day_offset: 6,
    message_text: `Doctor, honest question \n\nWhen your team calls your current leads, what's the most common thing they hear?\n\n"I was just looking." \n"Send me more information." \n"Call me next month."\n\nIf it's any of those — the problem isn't your team. It's that your ads are attracting browsers, not buyers. And that's 100% fixable at the campaign level.\n\nWorth a quick chat?`
  },
  {
    step_number: 5,
    day_offset: 9,
    message_text: `Doctor, is your team tired of calling people who "just clicked by mistake"? 😅\n\nOur lead forms are built around patient pain points. Before your team picks up the phone, they already know:  What the patient is struggling with, How long they've had the problem, Whether they've tried other treatments\n\nIksana Wellness (skin clinic, Hauz Khas) asked us to guarantee 4 qualified leads in Month 1.\n\nThey got 16 in the first 14 days.\n\nThis quality is exactly why we back it with a guarantee: get enough qualified leads to make your money back in Month 1 or we lose 50% of our fee.\n\nWorth 5 minutes to see how we'd set this up for you?`
  },
  {
    step_number: 6,
    day_offset: 12,
    message_text: `One thing we do differently that most clinics don't expect:\n\nWe only focus on one treatment at a time.\n\nWe build a complete dedicated system for that single procedure — research, video, lead form, follow-up — and we prove it works before we touch anything else.\n\nNo scattergun marketing. No "let's try everything." One thing, done properly, until it prints.\n\nWhich high-value treatment would you want to own in your area first?`
  },
  {
    step_number: 7,
    day_offset: 16,
    message_text: `Doctor, here's something most agencies won't tell you — you'll never actually meet the people running your campaigns.\n\nAt Thought Bistro, the founders are the ones who appear in the videos. Our faces. Our credibility on the line. Every single time.\n\nDr. Aakash's obesity clinic in Lajpat Nagar asked us to guarantee 2 leads in Month 1.\n\nHe got 45. ✅\n\nThat's not a fluke — that's what happens when the people building your campaign actually care about the outcome.\n\nWant to see what this would look like in practice for you?`
  },
  {
    step_number: 8,
    day_offset: 20,
    message_text: `Doctor, the biggest hidden cost in clinic marketing isn't ad spend.\n\nIt's the hours your front desk burns on leads that were never serious.\n\nBad leads don't just waste money — they burn out good people.\n\nBecause our leads come pre-educated by research videos and pre-qualified by pain-point forms, your team spends less time convincing and more time confirming.\n\nShorter calls. Higher close rate. Staff that actually stays motivated.\n\nIs that worth solving? 🙂`
  },
  {
    step_number: 9,
    day_offset: 25,
    message_text: `Doctor, here's the long game if you're interested.\n\nMonth 1: We pick your highest-value treatment and build the full system around it. You get your min qualified leads — guaranteed, or we lose 50% of our fee.\n\nMonth 2+: Once the machine is proven, we replicate it for every other treatment in your clinic. One by one. Until your patient acquisition runs without you touching it.\n\nDr. Aakash started with obesity. Dr. Asheena started with skin. Iksana started with one treatment line.\n\nAll three are now expanding.\n\nWant to pick which treatment we start with for you?`
  },
  {
    step_number: 10,
    day_offset: 30,
    message_text: `Doctor, this is my last follow-up — I don't want to clog your inbox 🙏\n\nI'll assume the timing isn't right just yet, and that's completely okay.\n\nBut when you're ready — we're the only company that guarantees your ROI in Month 1 or loses 50% of our fee. And as you've seen, our clients don't just hit the guarantee. They blow past it.\n\nDr. Aakash wanted 2 leads. Got 45. Dr. Asheena wanted 2. Got 12 in 6 days. Iksana wanted 4. Got 16 in 14 days.\n\nWhen the time is right, you know where to find us. 🙂\n\nWishing you and your clinic the very best.`
  }
];

export function calculateIsDue(lead: any): boolean {
  if (lead.status !== 'active' || lead.current_step >= NURTURE_SEQUENCE.length) {
    return false;
  }

  const currentStep = NURTURE_SEQUENCE[lead.current_step];
  const createdDate = new Date(lead.created_at);
  const today = new Date();
  
  const diffTime = Math.abs(today.getTime() - createdDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= currentStep.day_offset;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Ensure it has a country code (Assuming India +91 if not provided)
  let formattedPhone = cleanPhone;
  if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('91')) {
    formattedPhone = '91' + cleanPhone;
  } else if (cleanPhone.startsWith('0')) {
    formattedPhone = '91' + cleanPhone.substring(1);
  }

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
