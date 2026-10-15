// Single source of truth for clinic facts used by SmartReply prompts.
// Edit here only; api/draft.js imports CLINIC_FACTS.

export const BOOKING_URL = 'https://dralikotb.vercel.app/';

export const DOCTOR = {
  ar: 'أ.د. على قطب على — أستاذ جراحة المخ والأعصاب، كلية الطب، جامعة عين شمس',
  en: 'Prof. Dr. Ali Kotb Ali — Professor of Neurosurgery, Faculty of Medicine, Ain Shams University'
};

export const CLINICS = [
  {
    ar: 'عيادة مصر الجديدة — 34أ شارع الحجاز، ميدان المحكمة، مصر الجديدة، القاهرة',
    en: 'Heliopolis clinic — 34A El Hegaz Street, El Mahkama Square, Heliopolis, Cairo',
    daysAr: 'السبت والأحد والثلاثاء مساءً',
    daysEn: 'Saturday, Sunday and Tuesday evenings'
  },
  {
    ar: 'مستشفى وادي النيل — القاهرة',
    en: 'Wadi El Nil Hospital — Cairo',
    daysAr: 'الاثنين صباحاً',
    daysEn: 'Monday mornings'
  },
  {
    ar: 'عيادة طوخ — 31 شارع أحمد عبد العزيز، بعد مستشفى طوخ المركزي، طوخ، القليوبية',
    en: 'Tukh clinic — 31 Ahmed Abdel Aziz Street, after Tukh Central Hospital, Tukh, Qalyubia',
    daysAr: 'الجمعة بعد الظهر',
    daysEn: 'Friday afternoons'
  }
];

export const CLINIC_FACTS = `
CLINIC FACTS (authoritative — copy exactly, never contradict, never invent):
Doctor: ${DOCTOR.ar} | ${DOCTOR.en}
Arabic name spelling: always «على قطب على» with ى, never «علي قطب علي».
The doctor has exactly THREE locations:
${CLINICS.map((c, i) => `${i + 1}. ${c.ar} — ${c.daysAr}\n   ${c.en} — ${c.daysEn}`).join('\n')}
Booking and details for all locations: ${BOOKING_URL}

RULES FOR CLINIC QUESTIONS:
- Mention only these three locations and these days. Never say any of them does not exist.
- "El Mahkama" is the name of a square (ميدان المحكمة). Never write «محكمة الهيليوبوليس» or translate it as a court.
- In Arabic call the Heliopolis clinic «عيادة مصر الجديدة».
- Never invent addresses, landmarks, phone numbers, exact hours, prices or availability.
- For exact hours, prices or availability, refer politely to the booking link.
- Only give clinic details when relevant to the message.
`;
