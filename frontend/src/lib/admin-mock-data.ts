// Clean types and zeroed-out data structures for Sunshine Play School ERP

export const classes = ["Play Group", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] as const;
export type ClassName = (typeof classes)[number];

export type Status = "Active" | "Inactive" | "Pending" | "Graduated";

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  gender: "Male" | "Female";
  dob: string;
  age: number;
  className: ClassName;
  section: "A" | "B";
  parent: string;
  phone: string;
  address: string;
  status: Status;
  feesStatus: "Paid" | "Partial" | "Due";
  joinedOn: string;
  bloodGroup: string;
  allergies: string[];
  avatar: string;
}

export const students: Student[] = [];

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  occupation: string;
  children: string[];
  preferredChannel: "Email" | "SMS" | "WhatsApp";
  emergencyContact: string;
  avatar: string;
}

export const parents: Parent[] = [];

export interface Staff {
  id: string;
  name: string;
  role: "Teacher" | "Caretaker" | "Helper" | "Admin";
  className?: ClassName;
  qualification: string;
  phone: string;
  email: string;
  joinedOn: string;
  salary: number;
  status: "Active" | "On Leave";
  avatar: string;
}

export const staff: Staff[] = [];

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  method: "Cash" | "UPI" | "Card" | "Bank Transfer";
  date: string;
  status: "Success" | "Pending" | "Failed";
  invoice: string;
}

export const payments: Payment[] = [];

export const feeStructure = [
  { className: "Play Group", tuition: 18000, transport: 6000, meals: 4500, activity: 2000 },
  { className: "Nursery", tuition: 22000, transport: 6000, meals: 4500, activity: 2500 },
  { className: "LKG", tuition: 28000, transport: 6500, meals: 5000, activity: 3000 },
  { className: "UKG", tuition: 32000, transport: 6500, meals: 5000, activity: 3500 },
] as const;

export interface Activity {
  id: string;
  className: ClassName;
  topic: string;
  category: "Rhyme" | "Story" | "Art" | "Craft" | "Outdoor" | "Learning";
  teacher: string;
  date: string;
  notes: string;
}

export const activities: Activity[] = [];

export interface AttendanceRow {
  studentId: string;
  studentName: string;
  className: ClassName;
  status: "Present" | "Absent" | "Late" | "Leave";
  inTime?: string;
  outTime?: string;
}

export const attendanceToday: AttendanceRow[] = [];
export const vehicles: any[] = [];
export const routes: any[] = [];
export const events: any[] = [];
export const inventory: any[] = [];
export const notifications: any[] = [];
export const announcements: any[] = [];
export const messages: any[] = [];
export const meals: any[] = [];
export const naps: any[] = [];
export const medicalRecords: any[] = [];
export const pickupHistory: any[] = [];
export const users: any[] = [];
export const activityLog: any[] = [];
export const feeCollectionSeries: any[] = [];
export const attendanceTrend: any[] = [];
export const admissionsTrend: any[] = [];
export const classStrength: any[] = [];
export const upcomingBirthdays: any[] = [];
