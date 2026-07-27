export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";

export type HealthRecord = {
  id: string;
  student: string;
  admissionNumber: string;
  bloodGroup: BloodGroup;
  heightCm: number;
  weightKg: number;
  allergies: string;
  medicalConditions: string;
  doctor: string;
  emergencyContact: string;
  lastCheckup: string;
};

export type Vaccination = {
  id: string;
  student: string;
  vaccine: string;
  dose: string;
  vaccinationDate: string;
  nextDueDate: string;
  hospital: string;
  remarks: string;
};

export type MedicalVisit = {
  id: string;
  student: string;
  visitDate: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  medicine: string;
  doctor: string;
  followUpDate: string;
};

export type HealthAlert = {
  id: string;
  student: string;
  category: "Allergy" | "Chronic Disease" | "Emergency Note" | "Special Care";
  detail: string;
  severity: "Critical" | "Monitoring" | "Resolved";
  updated: string;
};

export type BMIRecord = {
  id: string;
  student: string;
  className: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  status: "Underweight" | "Normal" | "Overweight" | "Obese";
  measuredOn: string;
  history: { date: string; heightCm: number; weightKg: number; bmi: number }[];
};
