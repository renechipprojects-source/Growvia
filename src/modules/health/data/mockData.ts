import type { HealthRecord, Vaccination, MedicalVisit, HealthAlert, BMIRecord } from "../types";
import { calcBmi, bmiStatus } from "../utils/format";

export const healthRecords: HealthRecord[] = [
  { id: "H1", student: "Aarav Sharma", admissionNumber: "ADM-2024-001", bloodGroup: "O+", heightCm: 132, weightKg: 30, allergies: "Peanuts", medicalConditions: "—", doctor: "Dr. Mehta", emergencyContact: "+91 98111 22233", lastCheckup: "2026-05-14" },
  { id: "H2", student: "Kiara Patel", admissionNumber: "ADM-2024-002", bloodGroup: "A+", heightCm: 118, weightKg: 22, allergies: "Dust", medicalConditions: "Asthma", doctor: "Dr. Rao", emergencyContact: "+91 98222 33344", lastCheckup: "2026-04-22" },
  { id: "H3", student: "Vivaan Rao", admissionNumber: "ADM-2024-003", bloodGroup: "B+", heightCm: 140, weightKg: 35, allergies: "—", medicalConditions: "—", doctor: "Dr. Mehta", emergencyContact: "+91 98333 44455", lastCheckup: "2026-06-01" },
  { id: "H4", student: "Ishaan Verma", admissionNumber: "ADM-2024-004", bloodGroup: "AB+", heightCm: 128, weightKg: 26, allergies: "Pollen", medicalConditions: "—", doctor: "Dr. Iyer", emergencyContact: "+91 98444 55566", lastCheckup: "2026-05-30" },
  { id: "H5", student: "Anaya Iyer", admissionNumber: "ADM-2024-005", bloodGroup: "O-", heightCm: 110, weightKg: 20, allergies: "—", medicalConditions: "—", doctor: "Dr. Rao", emergencyContact: "+91 98555 66677", lastCheckup: "2026-05-11" },
  { id: "H6", student: "Rohan Menon", admissionNumber: "ADM-2024-006", bloodGroup: "A-", heightCm: 145, weightKg: 40, allergies: "Shellfish", medicalConditions: "Diabetes T1", doctor: "Dr. Mehta", emergencyContact: "+91 98666 77788", lastCheckup: "2026-06-05" },
  { id: "H7", student: "Sara Khan", admissionNumber: "ADM-2024-007", bloodGroup: "B-", heightCm: 130, weightKg: 28, allergies: "—", medicalConditions: "—", doctor: "Dr. Iyer", emergencyContact: "+91 98777 88899", lastCheckup: "2026-04-18" },
  { id: "H8", student: "Diya Nair", admissionNumber: "ADM-2024-008", bloodGroup: "O+", heightCm: 120, weightKg: 24, allergies: "Eggs", medicalConditions: "—", doctor: "Dr. Rao", emergencyContact: "+91 98888 99900", lastCheckup: "2026-05-27" },
  { id: "H9", student: "Arjun Reddy", admissionNumber: "ADM-2024-009", bloodGroup: "AB-", heightCm: 150, weightKg: 45, allergies: "—", medicalConditions: "Epilepsy", doctor: "Dr. Mehta", emergencyContact: "+91 98999 00011", lastCheckup: "2026-06-08" },
  { id: "H10", student: "Meera Shah", admissionNumber: "ADM-2024-010", bloodGroup: "A+", heightCm: 138, weightKg: 33, allergies: "Latex", medicalConditions: "—", doctor: "Dr. Iyer", emergencyContact: "+91 99000 11122", lastCheckup: "2026-05-19" },
];

export const vaccinations: Vaccination[] = [
  { id: "VC1", student: "Aarav Sharma", vaccine: "MMR", dose: "Booster", vaccinationDate: "2026-02-10", nextDueDate: "2027-02-10", hospital: "City Hospital", remarks: "No reaction" },
  { id: "VC2", student: "Kiara Patel", vaccine: "DPT", dose: "5th", vaccinationDate: "2026-01-22", nextDueDate: "2027-01-22", hospital: "Sunrise Clinic", remarks: "Mild fever" },
  { id: "VC3", student: "Vivaan Rao", vaccine: "Polio", dose: "Booster", vaccinationDate: "2025-11-15", nextDueDate: "2026-11-15", hospital: "City Hospital", remarks: "—" },
  { id: "VC4", student: "Ishaan Verma", vaccine: "Hepatitis B", dose: "3rd", vaccinationDate: "2026-03-08", nextDueDate: "2027-03-08", hospital: "Kids Care", remarks: "—" },
  { id: "VC5", student: "Anaya Iyer", vaccine: "Typhoid", dose: "1st", vaccinationDate: "2026-04-01", nextDueDate: "2029-04-01", hospital: "Sunrise Clinic", remarks: "—" },
  { id: "VC6", student: "Rohan Menon", vaccine: "Influenza", dose: "Annual", vaccinationDate: "2026-06-01", nextDueDate: "2027-06-01", hospital: "City Hospital", remarks: "Recommended annually" },
  { id: "VC7", student: "Sara Khan", vaccine: "MMR", dose: "Booster", vaccinationDate: "2026-02-20", nextDueDate: "2027-02-20", hospital: "Kids Care", remarks: "—" },
  { id: "VC8", student: "Diya Nair", vaccine: "DPT", dose: "5th", vaccinationDate: "2026-05-12", nextDueDate: "2027-05-12", hospital: "Sunrise Clinic", remarks: "—" },
  { id: "VC9", student: "Arjun Reddy", vaccine: "Hepatitis A", dose: "2nd", vaccinationDate: "2026-03-15", nextDueDate: "2027-03-15", hospital: "City Hospital", remarks: "—" },
  { id: "VC10", student: "Meera Shah", vaccine: "HPV", dose: "1st", vaccinationDate: "2026-04-25", nextDueDate: "2026-10-25", hospital: "Kids Care", remarks: "Second dose in 6 months" },
];

export const medicalVisits: MedicalVisit[] = [
  { id: "MV1", student: "Aarav Sharma", visitDate: "2026-05-14", complaint: "Fever, headache", diagnosis: "Viral infection", treatment: "Rest, fluids", medicine: "Paracetamol 250mg", doctor: "Dr. Mehta", followUpDate: "2026-05-21" },
  { id: "MV2", student: "Kiara Patel", visitDate: "2026-04-22", complaint: "Wheezing", diagnosis: "Asthma flare", treatment: "Inhaler", medicine: "Salbutamol", doctor: "Dr. Rao", followUpDate: "2026-05-05" },
  { id: "MV3", student: "Vivaan Rao", visitDate: "2026-06-01", complaint: "Minor cut on knee", diagnosis: "Superficial wound", treatment: "Dressing", medicine: "Antiseptic", doctor: "Dr. Mehta", followUpDate: "—" },
  { id: "MV4", student: "Ishaan Verma", visitDate: "2026-05-30", complaint: "Sneezing, runny nose", diagnosis: "Allergic rhinitis", treatment: "Antihistamine", medicine: "Cetirizine 5mg", doctor: "Dr. Iyer", followUpDate: "—" },
  { id: "MV5", student: "Anaya Iyer", visitDate: "2026-05-11", complaint: "Stomach ache", diagnosis: "Indigestion", treatment: "Diet advice", medicine: "ORS", doctor: "Dr. Rao", followUpDate: "—" },
  { id: "MV6", student: "Rohan Menon", visitDate: "2026-06-05", complaint: "High blood sugar", diagnosis: "Diabetes review", treatment: "Insulin adjustment", medicine: "Insulin", doctor: "Dr. Mehta", followUpDate: "2026-06-19" },
  { id: "MV7", student: "Sara Khan", visitDate: "2026-04-18", complaint: "Ear pain", diagnosis: "Otitis media", treatment: "Antibiotics", medicine: "Amoxicillin", doctor: "Dr. Iyer", followUpDate: "2026-04-25" },
  { id: "MV8", student: "Diya Nair", visitDate: "2026-05-27", complaint: "Rash on arms", diagnosis: "Contact dermatitis", treatment: "Topical steroid", medicine: "Hydrocortisone 1%", doctor: "Dr. Rao", followUpDate: "—" },
];

export const healthAlerts: HealthAlert[] = [
  { id: "AL1", student: "Aarav Sharma", category: "Allergy", detail: "Severe peanut allergy — EpiPen in nurse's office", severity: "Critical", updated: "2026-05-14" },
  { id: "AL2", student: "Kiara Patel", category: "Chronic Disease", detail: "Asthma — inhaler always with student", severity: "Monitoring", updated: "2026-04-22" },
  { id: "AL3", student: "Rohan Menon", category: "Chronic Disease", detail: "Type 1 Diabetes — insulin schedule maintained by nurse", severity: "Critical", updated: "2026-06-05" },
  { id: "AL4", student: "Arjun Reddy", category: "Emergency Note", detail: "Epilepsy — see emergency protocol in file", severity: "Critical", updated: "2026-06-08" },
  { id: "AL5", student: "Diya Nair", category: "Allergy", detail: "Egg allergy — check meals from kitchen", severity: "Monitoring", updated: "2026-05-27" },
  { id: "AL6", student: "Ishaan Verma", category: "Special Care", detail: "Seasonal allergies — antihistamine as needed", severity: "Monitoring", updated: "2026-05-30" },
  { id: "AL7", student: "Meera Shah", category: "Allergy", detail: "Latex allergy — use non-latex gloves", severity: "Monitoring", updated: "2026-05-19" },
  { id: "AL8", student: "Sara Khan", category: "Special Care", detail: "Recovering from ear infection", severity: "Resolved", updated: "2026-05-02" },
];

function mk(id: string, student: string, className: string, h: number, w: number, date: string, hist: [string, number, number][]): BMIRecord {
  const bmi = calcBmi(h, w);
  return {
    id, student, className,
    heightCm: h, weightKg: w, bmi, status: bmiStatus(bmi), measuredOn: date,
    history: hist.map(([d, hh, ww]) => ({ date: d, heightCm: hh, weightKg: ww, bmi: calcBmi(hh, ww) })),
  };
}

export const bmiRecords: BMIRecord[] = [
  mk("B1", "Aarav Sharma", "Grade 5", 132, 30, "2026-05-14", [["2025-05-01", 126, 27], ["2025-11-01", 129, 28], ["2026-05-14", 132, 30]]),
  mk("B2", "Kiara Patel", "Grade 3", 118, 22, "2026-04-22", [["2025-04-01", 112, 20], ["2025-10-01", 115, 21], ["2026-04-22", 118, 22]]),
  mk("B3", "Vivaan Rao", "Grade 6", 140, 35, "2026-06-01", [["2025-06-01", 134, 32], ["2025-12-01", 137, 33], ["2026-06-01", 140, 35]]),
  mk("B4", "Ishaan Verma", "Grade 4", 128, 26, "2026-05-30", [["2025-05-30", 122, 24], ["2025-11-30", 125, 25], ["2026-05-30", 128, 26]]),
  mk("B5", "Anaya Iyer", "Grade 2", 110, 20, "2026-05-11", [["2025-05-11", 105, 18], ["2025-11-11", 108, 19], ["2026-05-11", 110, 20]]),
  mk("B6", "Rohan Menon", "Grade 7", 145, 52, "2026-06-05", [["2025-06-05", 139, 45], ["2025-12-05", 142, 48], ["2026-06-05", 145, 52]]),
  mk("B7", "Sara Khan", "Grade 5", 130, 28, "2026-04-18", [["2025-04-18", 124, 26], ["2025-10-18", 127, 27], ["2026-04-18", 130, 28]]),
  mk("B8", "Diya Nair", "Grade 3", 120, 24, "2026-05-27", [["2025-05-27", 114, 22], ["2025-11-27", 117, 23], ["2026-05-27", 120, 24]]),
  mk("B9", "Arjun Reddy", "Grade 8", 150, 45, "2026-06-08", [["2025-06-08", 144, 41], ["2025-12-08", 147, 43], ["2026-06-08", 150, 45]]),
  mk("B10", "Meera Shah", "Grade 6", 138, 33, "2026-05-19", [["2025-11-19", 135, 31], ["2026-05-19", 138, 33]]),
];
