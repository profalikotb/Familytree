// Single source of truth for clinic facts used by SmartReply prompts.
// Edit here only; every prompt imports CLINIC_FACTS.

export const BOOKING_URL = 'https://dralikotb.vercel.app/';

export const DOCTOR = {
  ar: 'أ.د. على قطب على — أستاذ جراحة المخ والأعصاب، كلية الطب، جامعة عين شمس',
  en: 'Prof. Ali Kotb Ali — Professor of Neurosurgery, Faculty of Medicine, Ain Shams University'
};

export const CLINICS = [
  {
    ar: 'عيادة مصر الجديدة — شارع الحجاز، مصر الجديدة، القاهرة',
    en: 'Heliopolis (Masr El Gedida) clinic — El Hegaz Street, Heliopolis, Cairo',
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
    ar: 'عيادة طوخ — طوخ، القليوبية',
    en: 'Toukh clinic — Toukh, Qalyubia',
    daysAr: 'الجمعة بعد الظهر',
    daysEn: 'Friday afternoons'
  }
];

export const CLINIC_FACTS = `
CLINIC FACTS (authoritative — use exactly, never contradict, never invent):
Doctor: ${DOCTOR.ar} | ${DOCTOR.en}
Arabic name spelling: always «على قطب على» with ى, never «علي».
The doctor has exactly THREE locations:
${CLINICS.map((c, i) => `${i + 1}. ${c.ar} — ${c.daysAr} | ${c.en} — ${c.daysEn}`).join('\n')}
Booking and details: ${BOOKING_URL}

RULES FOR CLINIC QUESTIONS:
- Mention only these three locations and these days. Never deny that any of them exists.
- Never invent addresses, landmarks, building names, phone numbers, exact hours or prices.
- If asked for exact hours, prices or availability not listed here, refer politely to the booking link.
- Write the Heliopolis clinic as «مصر الجديدة» in Arabic.
`;