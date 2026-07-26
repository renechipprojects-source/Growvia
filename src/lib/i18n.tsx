import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Add a new language by appending its code below and providing a dictionary in `DICTS`.
// Every UI string in the Parent module is looked up via `t("key")`. Missing keys fall
// back to English, then to the key itself.
export type Lang = "en" | "ta";

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "ta", label: "தமிழ் (Tamil)", short: "த" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // App / brand
  "app.sunshine": "Sunshine",
  "app.parent": "Parent Portal",
  "app.close": "Close",

  // Bottom nav & top bar
  "nav.home": "Home",
  "nav.child": "My Child",
  "nav.diary": "Diary",
  "nav.fees": "Fees",
  "nav.more": "More",
  "nav.attendance": "Attendance",
  "nav.homework": "Homework",
  "nav.gallery": "Gallery",
  "nav.circulars": "Circulars",
  "nav.messages": "Messages",
  "nav.leave": "Leave Request",
  "nav.notifications": "Notifications",
  "nav.language": "Language",
  "nav.logout": "Logout",

  // Common actions
  "action.markRead": "Mark as read",
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.submit": "Submit",
  "action.upload": "Upload",
  "action.remove": "Remove",
  "action.viewAll": "View all",
  "action.select": "Select",

  // Common labels & status
  "label.viewing": "Viewing",
  "label.age": "Age",
  "label.roll": "Roll",
  "label.house": "House",
  "label.currentChild": "Current child",
  "label.yourChildren": "Your children",
  "status.paid": "Paid",
  "status.partial": "Partial",
  "status.pending": "Pending",
  "status.approved": "Approved",
  "status.rejected": "Rejected",
  "status.present": "Present",
  "status.absent": "Absent",
  "status.completed": "Completed",
  "status.high": "High",
  "gender.boy": "Boy",
  "gender.girl": "Girl",
  "className.Playgroup": "Playgroup",
  "className.Nursery": "Nursery",
  "className.LKG": "LKG",
  "className.UKG": "UKG",

  // Dashboard
  "dash.hello": "Hi",
  "dash.myLittleOne": "My little one",
  "dash.attendance": "Attendance",
  "dash.homework": "Homework",
  "dash.homeworkActive": "Active",
  "dash.todaysDiary": "Today's Diary",
  "dash.todaysDiaryJustNow": "Just now",
  "dash.feeDue": "Fee Due",
  "dash.feeDueSub": "Jul 31",
  "dash.recentPhotos": "Recent Photos",
  "dash.skills": "Skills progress",
  "dash.viewAll": "View all",
  "dash.homeworkNone": "No homework yet.",
  "dash.skill.language": "Language",
  "dash.skill.motor": "Motor Skills",
  "dash.skill.social": "Social",
  "dash.skill.creativity": "Creativity",

  // My Child
  "child.title": "My Child",
  "child.subtitle": "Everything about {name}.",
  "child.profile": "Profile",
  "child.studentId": "Student ID",
  "child.birthday": "Birthday · Jun 12",
  "child.teacher": "Teacher · Miss Anjali",
  "child.parent": "Parent",
  "child.emergency": "Emergency contacts",
  "child.father": "Father",
  "child.mother": "Mother",

  // Attendance
  "att.title": "Attendance",
  "att.termSuffix": "% this term",
  "att.present": "Present",
  "att.absent": "Absent",
  "att.percent": "Attendance %",
  "att.total": "Total days",
  "att.thisMonth": "This month",
  "att.presentLegend": "Present",
  "att.absentLegend": "Absent/Holiday",
  "att.daily": "Daily records",
  "att.dayN": "Day {n}",

  // Homework
  "hw.title": "Homework",
  "hw.subtitle": "Fun things to do together at home.",
  "hw.viewOnly": "View only — please contact your teacher for changes.",
  "hw.active": "Active",
  "hw.matchOne": "{n} match",
  "hw.matchMany": "{n} matches",
  "hw.noMatch": "No homework matches your search.",
  "hw.due": "Due {date}",

  // Diary
  "diary.title": "Daily Diary",
  "diary.subtitle": "Little updates, straight from class.",
  "diary.recent": "Recent",

  // Gallery
  "gallery.title": "Photo Gallery",
  "gallery.subtitle": "Precious moments, saved forever.",
  "gallery.fromClass": "From class",

  // Messages
  "msg.title": "Messages",
  "msg.subtitle": "Updates from {name}'s teacher and the school.",
  "msg.inbox": "Inbox · {n}",
  "msg.search": "Search messages…",
  "msg.empty": "No messages for {name} yet.",
  "msg.readonly": "Read-only inbox — please contact the school office for any queries.",

  // Fees
  "fees.title": "Fees",
  "fees.subtitle": "View-only. Please pay at the school office.",
  "fees.due": "Due this month",
  "fees.dueMeta": "{name} · {class} · Jul 31",
  "fees.payOffice": "Please visit the office to make payment.",
  "fees.history": "History",

  // Leave
  "leave.title": "Leave Request",
  "leave.subtitle": "Submit a leave request to your class teacher.",
  "leave.student": "Student",
  "leave.from": "Leave from",
  "leave.to": "Leave to",
  "leave.reason": "Reason",
  "leave.description": "Description (optional)",
  "leave.certificate": "Medical certificate (optional)",
  "leave.certificateHint": "PDF or image up to 5 MB. You may submit without one.",
  "leave.medicalCert": "Medical certificate (optional)",
  "leave.medicalNote": "Attach a scan or photo. It will be saved to the student's health record.",
  "leave.submit": "Submit request",
  "leave.submitted": "Leave request sent",
  "leave.recent": "Recent requests",
  "leave.none": "No leave requests yet.",
  "leave.success": "Leave request submitted",
  "leave.required": "Required",
  "leave.reasonMin": "Please add a reason",
  "leave.selectReason": "Select a reason",
  "leave.reason.Sick": "Sick",
  "leave.reason.Family Function": "Family Function",
  "leave.reason.Travel": "Travel",
  "leave.reason.Other": "Other",
};

const ta: Dict = {
  "app.sunshine": "சன்ஷைன்",
  "app.parent": "பெற்றோர் போர்டல்",
  "app.close": "மூடு",

  "nav.home": "முகப்பு",
  "nav.child": "என் குழந்தை",
  "nav.diary": "நாட்குறிப்பு",
  "nav.fees": "கட்டணம்",
  "nav.more": "மேலும்",
  "nav.attendance": "வருகை",
  "nav.homework": "வீட்டுப்பாடம்",
  "nav.gallery": "புகைப்பட தொகுப்பு",
  "nav.circulars": "சுற்றறிக்கைகள்",
  "nav.messages": "செய்திகள்",
  "nav.leave": "விடுப்பு விண்ணப்பம்",
  "nav.notifications": "அறிவிப்புகள்",
  "nav.language": "மொழி",
  "nav.logout": "வெளியேறு",

  "action.markRead": "படித்ததாக குறிக்கவும்",
  "action.save": "சேமி",
  "action.cancel": "ரத்து",
  "action.submit": "சமர்ப்பி",
  "action.upload": "பதிவேற்று",
  "action.remove": "நீக்கு",
  "action.viewAll": "அனைத்தையும் காண",
  "action.select": "தேர்வு செய்யவும்",

  "label.viewing": "பார்க்கிறீர்கள்",
  "label.age": "வயது",
  "label.roll": "எண்",
  "label.house": "இல்லம்",
  "label.currentChild": "தற்போதைய குழந்தை",
  "label.yourChildren": "உங்கள் குழந்தைகள்",
  "status.paid": "செலுத்தப்பட்டது",
  "status.partial": "பகுதி",
  "status.pending": "நிலுவை",
  "status.approved": "அனுமதிக்கப்பட்டது",
  "status.rejected": "மறுக்கப்பட்டது",
  "status.present": "வருகை",
  "status.absent": "இல்லை",
  "status.completed": "முடிந்தது",
  "status.high": "முக்கியம்",
  "gender.boy": "ஆண்",
  "gender.girl": "பெண்",
  "className.Playgroup": "பிளேகுரூப்",
  "className.Nursery": "நர்சரி",
  "className.LKG": "எல்.கே.ஜி",
  "className.UKG": "யூ.கே.ஜி",

  "dash.hello": "வணக்கம்",
  "dash.myLittleOne": "என் அன்பே",
  "dash.attendance": "வருகை",
  "dash.homework": "வீட்டுப்பாடம்",
  "dash.homeworkActive": "செயலில் உள்ளது",
  "dash.todaysDiary": "இன்றைய நாட்குறிப்பு",
  "dash.todaysDiaryJustNow": "இப்போது",
  "dash.feeDue": "செலுத்த வேண்டிய கட்டணம்",
  "dash.feeDueSub": "ஜூலை 31",
  "dash.recentPhotos": "சமீபத்திய புகைப்படங்கள்",
  "dash.skills": "திறன் முன்னேற்றம்",
  "dash.viewAll": "அனைத்தையும் காண",
  "dash.homeworkNone": "வீட்டுப்பாடம் எதுவும் இல்லை.",
  "dash.skill.language": "மொழி",
  "dash.skill.motor": "உடல் திறன்",
  "dash.skill.social": "சமூகம்",
  "dash.skill.creativity": "படைப்பாற்றல்",

  "child.title": "என் குழந்தை",
  "child.subtitle": "{name} பற்றிய அனைத்தும்.",
  "child.profile": "சுயவிவரம்",
  "child.studentId": "மாணவர் அடையாள எண்",
  "child.birthday": "பிறந்தநாள் · ஜூன் 12",
  "child.teacher": "ஆசிரியர் · மிஸ் அஞ்சலி",
  "child.parent": "பெற்றோர்",
  "child.emergency": "அவசர தொடர்புகள்",
  "child.father": "தந்தை",
  "child.mother": "தாய்",

  "att.title": "வருகை",
  "att.termSuffix": "% இந்த பருவம்",
  "att.present": "வருகை",
  "att.absent": "இல்லை",
  "att.percent": "வருகை சதவீதம்",
  "att.total": "மொத்த நாட்கள்",
  "att.thisMonth": "இந்த மாதம்",
  "att.presentLegend": "வருகை",
  "att.absentLegend": "இல்லை/விடுமுறை",
  "att.daily": "தினசரி பதிவுகள்",
  "att.dayN": "நாள் {n}",

  "hw.title": "வீட்டுப்பாடம்",
  "hw.subtitle": "வீட்டில் ஒன்றாக செய்யக்கூடிய வேடிக்கை.",
  "hw.viewOnly": "பார்க்க மட்டுமே — மாற்றங்களுக்கு ஆசிரியரை தொடர்பு கொள்ளவும்.",
  "hw.active": "செயலில் உள்ளது",
  "hw.matchOne": "{n} பொருத்தம்",
  "hw.matchMany": "{n} பொருத்தங்கள்",
  "hw.noMatch": "தேடலுக்கு பொருந்தும் வீட்டுப்பாடம் இல்லை.",
  "hw.due": "காலக்கெடு {date}",

  "diary.title": "தினசரி நாட்குறிப்பு",
  "diary.subtitle": "வகுப்பிலிருந்து சிறு புதுப்பிப்புகள்.",
  "diary.recent": "சமீபத்தியவை",

  "gallery.title": "புகைப்பட தொகுப்பு",
  "gallery.subtitle": "இனிமையான தருணங்கள், என்றென்றும் பாதுகாக்கப்பட்டவை.",
  "gallery.fromClass": "வகுப்பிலிருந்து",

  "msg.title": "செய்திகள்",
  "msg.subtitle": "{name} இன் ஆசிரியர் மற்றும் பள்ளியிடமிருந்து புதுப்பிப்புகள்.",
  "msg.inbox": "உள்பெட்டி · {n}",
  "msg.search": "செய்திகளைத் தேடு…",
  "msg.empty": "{name} க்கு இன்னும் செய்திகள் இல்லை.",
  "msg.readonly": "படிக்க மட்டுமே உள்பெட்டி — வினவல்களுக்கு பள்ளி அலுவலகத்தை தொடர்பு கொள்ளவும்.",

  "fees.title": "கட்டணம்",
  "fees.subtitle": "பார்க்க மட்டுமே. பள்ளி அலுவலகத்தில் செலுத்தவும்.",
  "fees.due": "இந்த மாத கட்டணம்",
  "fees.dueMeta": "{name} · {class} · ஜூலை 31",
  "fees.payOffice": "செலுத்த அலுவலகத்திற்குச் செல்லவும்.",
  "fees.history": "வரலாறு",

  "leave.title": "விடுப்பு விண்ணப்பம்",
  "leave.subtitle": "உங்கள் வகுப்பு ஆசிரியருக்கு விடுப்பு விண்ணப்பம் அனுப்பவும்.",
  "leave.student": "மாணவர்",
  "leave.from": "விடுப்பு தொடக்கம்",
  "leave.to": "விடுப்பு முடிவு",
  "leave.reason": "காரணம்",
  "leave.description": "விளக்கம் (விரும்பினால்)",
  "leave.certificate": "மருத்துவ சான்றிதழ் (விரும்பினால்)",
  "leave.certificateHint": "PDF அல்லது படம், 5 MB வரை. இல்லாமலும் சமர்ப்பிக்கலாம்.",
  "leave.medicalCert": "மருத்துவ சான்றிதழ் (விரும்பினால்)",
  "leave.medicalNote": "ஸ்கேன் அல்லது புகைப்படம் இணைக்கவும். மாணவரின் சுகாதார பதிவில் சேமிக்கப்படும்.",
  "leave.submit": "விண்ணப்பம் சமர்ப்பிக்க",
  "leave.submitted": "விடுப்பு விண்ணப்பம் அனுப்பப்பட்டது",
  "leave.recent": "சமீபத்திய விண்ணப்பங்கள்",
  "leave.none": "இதுவரை விடுப்பு விண்ணப்பம் இல்லை.",
  "leave.success": "விடுப்பு விண்ணப்பம் சமர்ப்பிக்கப்பட்டது",
  "leave.required": "தேவை",
  "leave.reasonMin": "காரணத்தை உள்ளிடவும்",
  "leave.selectReason": "காரணத்தை தேர்வு செய்யவும்",
  "leave.reason.Sick": "உடல்நலக்குறைவு",
  "leave.reason.Family Function": "குடும்ப நிகழ்ச்சி",
  "leave.reason.Travel": "பயணம்",
  "leave.reason.Other": "மற்றவை",
};

const DICTS: Record<Lang, Dict> = { en, ta };

function format(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallbackOrVars?: string | Record<string, string | number>, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nState | null>(null);
const KEY = "sunshine.parent.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(KEY);
      if (stored === "en" || stored === "ta") return stored;
    }
    return "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, l);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, fallbackOrVars?: string | Record<string, string | number>, vars?: Record<string, string | number>) => {
      const fallback = typeof fallbackOrVars === "string" ? fallbackOrVars : undefined;
      const v = typeof fallbackOrVars === "object" ? fallbackOrVars : vars;
      const raw = DICTS[lang][key] ?? DICTS.en[key] ?? fallback ?? key;
      return format(raw, v);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. SSR)
    return {
      lang: "en" as Lang,
      setLang: () => {},
      t: (k: string, f?: string | Record<string, string | number>, v?: Record<string, string | number>) => {
        const fallback = typeof f === "string" ? f : undefined;
        const vars = typeof f === "object" ? f : v;
        return format(en[k] ?? fallback ?? k, vars);
      },
    };
  }
  return ctx;
}
