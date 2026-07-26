export type Student = {
  id: string;
  admissionNo: string;
  name: string;
  gender: "Male" | "Female";
  className: string;
  section: string;
  rollNo: number;
  dob: string;
  bloodGroup: string;
  address: string;
  parent: { name: string; phone: string; email: string; occupation: string };
  academic: { term: string; average: number; rank: number; remarks: string };
  attendance: { present: number; absent: number; late: number; total: number };
  teacherRemarks: string;
  avatarSeed: string;
};

export type Teacher = {
  id: string;
  empId: string;
  name: string;
  subject: string;
  qualification: string;
  phone: string;
  email: string;
  experience: number;
  classesAssigned: string[];
  status: "Active" | "On Leave";
};

export type ClassInfo = {
  id: string;
  name: string;
  section: string;
  classTeacher: string;
  strength: number;
  room: string;
};

export type StaffAttendance = {
  id: string;
  name: string;
  department: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  status: "Present" | "Absent" | "Half Day" | "Leave";
};

export type StudentAttendanceRow = {
  id: string;
  name: string;
  className: string;
  section: string;
  status: "P" | "A" | "L";
};

export type Circular = {
  id: string;
  title: string;
  subject: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  attachment?: string;
  publishDate: string;
  expiryDate: string;
  recipients: RecipientRole[];
  status: "Draft" | "Scheduled" | "Published" | "Archived";
  createdAt: string;
  history: { at: string; action: string }[];
};

export type RecipientRole = "Admin" | "Teachers" | "Office Staff" | "Parents";
export const ALL_RECIPIENTS: RecipientRole[] = ["Admin", "Teachers", "Office Staff", "Parents"];

export type EventAudience = "Admin" | "Office Staff" | "Teachers" | "Parents";
export const ALL_EVENT_AUDIENCES: EventAudience[] = ["Admin", "Office Staff", "Teachers", "Parents"];

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  type: "Academic" | "Cultural" | "Sports" | "Holiday" | "Meeting";
  audience: EventAudience[];
  image?: string;
};

export type LeaveRequest = {
  id: string;
  applicant: string;
  role: "Teacher" | "Staff";
  from: string;
  to: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Ananya", "Diya", "Aadhya", "Kiara", "Myra", "Anika", "Pari", "Riya", "Saanvi", "Aarohi"];
const lastNames = ["Sharma", "Verma", "Iyer", "Reddy", "Patel", "Gupta", "Nair", "Kapoor", "Menon", "Rao"];
const sections = ["A", "B", "C"];
const classes = ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2"];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

export const students: Student[] = [];

export const teachers: Teacher[] = [];

export const classesList: ClassInfo[] = classes.flatMap((c, ci) =>
  sections.map((s, si) => ({
    id: `CLS-${ci}-${si}`,
    name: c,
    section: s,
    classTeacher: "Unassigned",
    strength: 0,
    room: `Room ${101 + ci * 3 + si}`,
  })),
);

export const staffAttendance: StaffAttendance[] = [];
export const studentAttendance: StudentAttendanceRow[] = [];

export const eventsList: EventItem[] = [];

export const initialCirculars: Circular[] = [];

export const leaveRequests: LeaveRequest[] = [];

export const notifications: { id: string; text: string; time: string; type: string }[] = [];

export const recentActivities: { id: string; student: string; activity: string; time: string }[] = [];
