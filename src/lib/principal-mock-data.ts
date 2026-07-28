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

export const students: Student[] = Array.from({ length: 30 }).map((_, i) => {
  const fn = pick(firstNames, i);
  const ln = pick(lastNames, i);
  const name = `${fn} ${ln}`;
  const id = `STU-${101 + i}`;
  const cName = pick(classes, i);
  const sec = pick(sections, i);
  return {
    id,
    admissionNo: `SUN-2026-${1000 + i}`,
    name,
    gender: i % 2 === 0 ? "Male" : "Female",
    className: cName,
    section: sec,
    rollNo: (i % 10) + 1,
    dob: `2022-0${(i % 9) + 1}-15`,
    bloodGroup: pick(["O+", "A+", "B+", "AB+"], i),
    address: "Bengaluru",
    parent: {
      name: `Mr. & Mrs. ${ln}`,
      phone: `+91 98765 ${10000 + i}`,
      email: `${ln.toLowerCase()}@sunshine-parents.com`,
      occupation: pick(["Software Engineer", "Doctor", "Architect", "Business"], i),
    },
    academic: { term: "Term 1", average: 85 + (i % 12), rank: (i % 5) + 1, remarks: "Excellent participation" },
    attendance: { present: 90 + (i % 8), absent: i % 4, late: i % 2, total: 100 },
    teacherRemarks: "Active in classroom activities and storytelling.",
    avatarSeed: name,
  };
});

export const teachers: Teacher[] = [
  { id: "TCH-001", empId: "TCH-001", name: "Ananya Sen", subject: "Early Childhood", qualification: "B.Ed", phone: "+91 98765 43210", email: "ananya.sen@sunshineschool.edu", experience: 5, classesAssigned: ["Playgroup A"], status: "Active" },
  { id: "TCH-002", empId: "TCH-002", name: "Sneha Kulkarni", subject: "Montessori", qualification: "NTT", phone: "+91 98765 43211", email: "sneha.k@sunshineschool.edu", experience: 4, classesAssigned: ["Playgroup B"], status: "Active" },
  { id: "TCH-003", empId: "TCH-003", name: "Miss Priya Sharma", subject: "Phonics & English", qualification: "M.A. B.Ed", phone: "+91 98765 43212", email: "priya.sharma@sunshineschool.edu", experience: 6, classesAssigned: ["Nursery A"], status: "Active" },
  { id: "TCH-004", empId: "TCH-004", name: "Sunita Sharma", subject: "Storytelling", qualification: "B.A. B.Ed", phone: "+91 98765 43213", email: "sunita.s@sunshineschool.edu", experience: 3, classesAssigned: ["Nursery B"], status: "Active" },
  { id: "TCH-005", empId: "TCH-005", name: "Meera Nair", subject: "Mathematics", qualification: "B.Sc. B.Ed", phone: "+91 98765 43214", email: "meera.nair@sunshineschool.edu", experience: 7, classesAssigned: ["LKG A"], status: "Active" },
  { id: "TCH-006", empId: "TCH-006", name: "Kavita Reddy", subject: "EVS & Art", qualification: "B.A. Fine Arts", phone: "+91 98765 43215", email: "kavita.reddy@sunshineschool.edu", experience: 4, classesAssigned: ["LKG B"], status: "Active" },
  { id: "TCH-007", empId: "TCH-007", name: "Rajesh Kumar", subject: "Maths & Logic", qualification: "M.Sc. B.Ed", phone: "+91 98765 43216", email: "rajesh.kumar@sunshineschool.edu", experience: 8, classesAssigned: ["UKG A"], status: "Active" },
  { id: "TCH-008", empId: "TCH-008", name: "Vikram Verma", subject: "G.K. & Sports", qualification: "B.P.Ed", phone: "+91 98765 43217", email: "vikram.verma@sunshineschool.edu", experience: 5, classesAssigned: ["UKG B"], status: "Active" },
];

export const classesList: ClassInfo[] = [
  { id: "CLS-1", name: "Playgroup", section: "A", classTeacher: "Ananya Sen", strength: 10, room: "Room 101" },
  { id: "CLS-2", name: "Playgroup", section: "B", classTeacher: "Sneha Kulkarni", strength: 10, room: "Room 102" },
  { id: "CLS-3", name: "Nursery", section: "A", classTeacher: "Miss Priya Sharma", strength: 10, room: "Room 103" },
  { id: "CLS-4", name: "Nursery", section: "B", classTeacher: "Sunita Sharma", strength: 10, room: "Room 104" },
  { id: "CLS-5", name: "LKG", section: "A", classTeacher: "Meera Nair", strength: 10, room: "Room 105" },
  { id: "CLS-6", name: "LKG", section: "B", classTeacher: "Kavita Reddy", strength: 10, room: "Room 106" },
  { id: "CLS-7", name: "UKG", section: "A", classTeacher: "Rajesh Kumar", strength: 10, room: "Room 107" },
  { id: "CLS-8", name: "UKG", section: "B", classTeacher: "Vikram Verma", strength: 10, room: "Room 108" },
];

export const staffAttendance: StaffAttendance[] = teachers.map((t, i) => ({
  id: t.id,
  name: t.name,
  department: "Teaching",
  checkIn: "08:30 AM",
  checkOut: "03:30 PM",
  workingHours: "7 hrs",
  status: i === 3 ? "Leave" : "Present",
}));

export const studentAttendance: StudentAttendanceRow[] = students.map((s, i) => ({
  id: s.id,
  name: s.name,
  className: s.className,
  section: s.section,
  status: i % 6 === 0 ? "A" : i % 8 === 0 ? "L" : "P",
}));

export const eventsList: EventItem[] = [
  { id: "EVT-1", title: "Annual Sports Meet 2026", description: "Track & field events for all classes", date: "2026-08-15", time: "09:00 AM", location: "School Playground", type: "Sports", audience: ["Parents", "Teachers", "Admin"] },
  { id: "EVT-2", title: "Grand Science & Art Fair", description: "Interactive exhibits by UKG & LKG students", date: "2026-08-22", time: "10:00 AM", location: "Auditorium", type: "Cultural", audience: ["Parents", "Teachers"] },
  { id: "EVT-3", title: "Independence Day Parade", description: "Flag hoisting & patriotic performances", date: "2026-08-15", time: "08:00 AM", location: "Front Lawn", type: "Holiday", audience: ["Parents", "Teachers", "Office Staff", "Admin"] },
  { id: "EVT-4", title: "Parent Teacher Meeting (PTM)", description: "Term 1 progress report cards distribution", date: "2026-08-29", time: "09:30 AM", location: "Respective Classrooms", type: "Meeting", audience: ["Parents", "Teachers"] },
  { id: "EVT-5", title: "Grandparents Day Celebration", description: "Special tea gathering and music show", date: "2026-09-05", time: "11:00 AM", location: "Main Hall", type: "Cultural", audience: ["Parents", "Teachers"] },
];

export const initialCirculars: Circular[] = [
  {
    id: "CIRC-101",
    title: "Independence Day Parade & Dress Code Circular",
    subject: "Celebration Guidelines",
    description: "All students from Nursery to UKG are requested to wear white ethnic clothes for the Independence Day assembly on August 15th.",
    priority: "High",
    publishDate: "2026-07-28",
    expiryDate: "2026-08-16",
    recipients: ["Parents", "Teachers", "Office Staff"],
    status: "Published",
    createdAt: "2026-07-28",
    history: [{ at: "2026-07-28 09:00 AM", action: "Published by Principal" }],
  },
  {
    id: "CIRC-102",
    title: "Monsoon Health & Raincoat Notice",
    subject: "Student Wellness",
    description: "Please pack an extra pair of labeled clothes and rainwear for your children during the rainy season.",
    priority: "Medium",
    publishDate: "2026-07-26",
    expiryDate: "2026-08-30",
    recipients: ["Parents"],
    status: "Published",
    createdAt: "2026-07-26",
    history: [{ at: "2026-07-26 10:30 AM", action: "Published by Principal" }],
  },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "LV-101", applicant: "Sunita Sharma", role: "Teacher", from: "2026-07-29", to: "2026-07-30", reason: "Medical Appointment", status: "Pending" },
  { id: "LV-102", applicant: "Ananya Sen", role: "Teacher", from: "2026-08-02", to: "2026-08-03", reason: "Personal Work", status: "Approved" },
];

export const notifications = [
  { id: "N-1", text: "Circular published to Parents & Teachers", time: "10 min ago", type: "circular" },
  { id: "N-2", text: "New leave request received from Sunita Sharma", time: "1 hr ago", type: "leave" },
  { id: "N-3", text: "Fee payment receipt #SUN-REC-006 generated", time: "2 hrs ago", type: "fee" },
];

export const recentActivities = [
  { id: "ACT-1", student: "Aarav Sharma", activity: "Completed Finger Painting session", time: "30 min ago" },
  { id: "ACT-2", student: "Kiara Patel", activity: "Submitted Phonics Worksheet", time: "1 hr ago" },
  { id: "ACT-3", student: "Vivaan Rao", activity: "Attended Clay Sculpting Workshop", time: "2 hrs ago" },
];
