// Realistic demo data for the Play School ERP
// Rich dataset: 25–30 students per (class, section) with roll numbers,
// admission numbers, DOB, parent details, houses, attendance records,
// homework submissions, remarks and academic marks. Also supports
// multi-child parents for the parent portal.

export type ClassName = "Playgroup" | "Nursery" | "LKG" | "UKG";
export type Section = "A" | "B";

export interface Student {
  id: string;
  rollNo: number;
  admissionNo: string;
  name: string;
  age: number;
  dob: string;
  className: ClassName;
  section: Section;
  parent: string;
  parentId: string;
  phone: string;
  gender: "Boy" | "Girl";
  house: "Red" | "Blue" | "Green" | "Yellow";
  admissionDate: string;
  feeStatus: "Paid" | "Partial" | "Pending";
  avatar: string;
  attendance: number;
  branch: string;
}

export interface Teacher {
  id: string;
  name: string;
  className: string;
  subject: string;
  email: string;
  phone: string;
  experience: number;
  joined: string;
  avatar: string;
  branch: string;
}

export interface Enquiry {
  id: string;
  childName: string;
  parentName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  gender?: "Boy" | "Girl";
  dob?: string;
  previousSchool?: string;
  age: number;
  interestedClass: string;
  source: "Walk-in" | "Phone" | "WhatsApp" | "Referral";
  status:
    | "New"
    | "Contacted"
    | "Visit Scheduled"
    | "Visit Completed"
    | "Documents Pending"
    | "Admission Approved"
    | "Enrolled";
  createdAt: string;
  followUp?: string;
  notes?: string;
}

export interface Fee {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  amount: number;
  paid: number;
  dueDate: string;
  status: "Paid" | "Partial" | "Pending";
  month: string;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  studentName: string;
  amount: number;
  mode: "Cash" | "UPI" | "Card" | "Bank Transfer";
  date: string;
  collectedBy: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paidTo: string;
}

// ─── Generators ──────────────────────────────────────────────────────────────

const FIRST_BOYS = [
  "Aarav", "Vihaan", "Kabir", "Advait", "Reyansh", "Arjun", "Ved", "Kian", "Ayaan",
  "Ishaan", "Krish", "Dhruv", "Neel", "Aryan", "Aditya", "Rohan", "Yash", "Veer",
  "Shaurya", "Ranveer", "Aarush", "Rudra", "Vivaan", "Atharv", "Shivansh", "Om",
  "Arnav", "Devansh", "Ayush", "Parth",
];
const FIRST_GIRLS = [
  "Diya", "Anaya", "Myra", "Ishani", "Kiara", "Saanvi", "Aisha", "Zara", "Nyra",
  "Tara", "Ira", "Aadya", "Anika", "Riya", "Pari", "Meera", "Sara", "Kavya",
  "Advika", "Navya", "Ahana", "Kyra", "Trisha", "Ananya", "Prisha", "Aria",
  "Reyna", "Sia", "Vanya", "Amaira",
];
const SURNAMES = [
  "Sharma", "Patel", "Gupta", "Reddy", "Singh", "Iyer", "Rao", "Nair", "Kapoor",
  "Menon", "Verma", "Joshi", "Khan", "Das", "Ali", "Bhatt", "Shah", "Malik",
  "Roy", "Mehta", "Chopra", "Kumar", "Agarwal", "Bansal",
];
const PARENT_FIRSTS_M = ["Rahul", "Amit", "Suresh", "Vikram", "Rohit", "Sanjay", "Anil", "Deepak", "Manish", "Ravi"];
const PARENT_FIRSTS_F = ["Neha", "Priya", "Anjali", "Divya", "Meera", "Pooja", "Ritu", "Kavita", "Sneha", "Lakshmi"];

const HOUSES = ["Red", "Blue", "Green", "Yellow"] as const;
const BRANCHES = ["Whitefield", "Koramangala", "Indiranagar"];

const CLASS_AGE: Record<ClassName, number> = { Playgroup: 2, Nursery: 3, LKG: 4, UKG: 5 };

const SECTIONS: Record<ClassName, Section[]> = {
  Playgroup: ["A"],
  Nursery: ["A", "B"],
  LKG: ["A", "B"],
  UKG: ["A", "B"],
};

// Deterministic pseudo-random so builds are stable.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

let studentCounter = 1000;
let householdCounter = 500;

export interface Household {
  id: string;
  fatherName: string;
  motherName: string;
  primaryContact: string; // parent shown as "parent" on the student
  phone: string;
  email: string;
  address: string;
  childrenIds: string[];
}

const HOUSEHOLDS: Household[] = [];

function generateStudent(
  className: ClassName,
  section: Section,
  rollNo: number,
  household: Household,
  gender: "Boy" | "Girl",
  seedRand: () => number,
): Student {
  const firstPool = gender === "Boy" ? FIRST_BOYS : FIRST_GIRLS;
  const surname = household.fatherName.split(" ").slice(-1)[0];
  const first = firstPool[Math.floor(seedRand() * firstPool.length)];
  const name = `${first} ${surname}`;
  const id = `STU${++studentCounter}`;
  const admissionNo = `SUN/26-${(2000 + studentCounter).toString().slice(-4)}`;
  const age = CLASS_AGE[className];
  const birthMonth = 1 + Math.floor(seedRand() * 12);
  const birthDay = 1 + Math.floor(seedRand() * 27);
  const birthYear = 2026 - age;
  const dob = `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
  const feeStatus = (["Paid", "Paid", "Paid", "Partial", "Pending"] as const)[
    Math.floor(seedRand() * 5)
  ];
  const attendance = 72 + Math.floor(seedRand() * 26); // 72-97%
  return {
    id,
    rollNo,
    admissionNo,
    name,
    age,
    dob,
    className,
    section,
    parent: household.primaryContact,
    parentId: household.id,
    phone: household.phone,
    gender,
    house: HOUSES[rollNo % 4],
    admissionDate: `2025-0${(rollNo % 9) + 1}-1${rollNo % 9}`,
    feeStatus,
    avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name + id)}`,
    attendance,
    branch: BRANCHES[rollNo % 3],
  };
}

function makeHousehold(seedRand: () => number): Household {
  const surname = SURNAMES[Math.floor(seedRand() * SURNAMES.length)];
  const father = `${PARENT_FIRSTS_M[Math.floor(seedRand() * PARENT_FIRSTS_M.length)]} ${surname}`;
  const mother = `${PARENT_FIRSTS_F[Math.floor(seedRand() * PARENT_FIRSTS_F.length)]} ${surname}`;
  const primary = seedRand() > 0.4 ? mother : father;
  const id = `HH${++householdCounter}`;
  const phone = `+91 9${Math.floor(100000000 + seedRand() * 899999999)}`.slice(0, 14);
  return {
    id,
    fatherName: father,
    motherName: mother,
    primaryContact: primary,
    phone,
    email: `${surname.toLowerCase()}.${id.toLowerCase()}@sunshine-parents.com`,
    address: `Flat ${Math.floor(seedRand() * 400) + 1}, ${BRANCHES[Math.floor(seedRand() * BRANCHES.length)]}, Bengaluru`,
    childrenIds: [],
  };
}

// Generate students per section
const rand = rng(42);
const generatedStudents: Student[] = [];
const CLASSES: ClassName[] = ["Playgroup", "Nursery", "LKG", "UKG"];

for (const cn of CLASSES) {
  for (const sec of SECTIONS[cn]) {
    const count = 25 + Math.floor(rand() * 8); // 25-32 students per section
    for (let i = 0; i < count; i++) {
      // 30% chance to reuse a household (siblings), else new
      let household: Household;
      if (HOUSEHOLDS.length > 0 && rand() < 0.15) {
        household = HOUSEHOLDS[Math.floor(rand() * HOUSEHOLDS.length)];
      } else {
        household = makeHousehold(rand);
        HOUSEHOLDS.push(household);
      }
      const gender = rand() > 0.5 ? "Boy" : "Girl";
      const student = generateStudent(cn, sec, i + 1, household, gender, rand);
      household.childrenIds.push(student.id);
      generatedStudents.push(student);
    }
  }
}

export const STUDENTS: Student[] = generatedStudents;
export const PARENT_HOUSEHOLDS: Household[] = HOUSEHOLDS;

// Helpers
export function studentsBy(className: ClassName, section?: Section): Student[] {
  return STUDENTS.filter((s) => s.className === className && (!section || s.section === section));
}

export function getHousehold(id: string): Household | undefined {
  return HOUSEHOLDS.find((h) => h.id === id);
}

export function getStudentById(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id);
}

// ─── Teachers ────────────────────────────────────────────────────────────────

export const TEACHERS: Teacher[] = [
  {
    id: "TCH-001",
    name: "Ananya Sen",
    className: "Playgroup A",
    subject: "Early Childhood & Sensory Play",
    email: "ananya.sen@sunshineschool.edu",
    phone: "+91 98765 43210",
    experience: 5,
    joined: "2023-06-01",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80",
    branch: "Whitefield",
  },
  {
    id: "TCH-002",
    name: "Sneha Kulkarni",
    className: "Playgroup B",
    subject: "Montessori & Toddler Care",
    email: "sneha.k@sunshineschool.edu",
    phone: "+91 98765 43211",
    experience: 4,
    joined: "2024-01-15",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80",
    branch: "Koramangala",
  },
  {
    id: "TCH-003",
    name: "Miss Priya Sharma",
    className: "Nursery A",
    subject: "Phonics & English Rhymes",
    email: "priya.sharma@sunshineschool.edu",
    phone: "+91 98765 43212",
    experience: 6,
    joined: "2022-08-10",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80",
    branch: "Whitefield",
  },
  {
    id: "TCH-004",
    name: "Sunita Sharma",
    className: "Nursery B",
    subject: "Storytelling & Expressive Arts",
    email: "sunita.s@sunshineschool.edu",
    phone: "+91 98765 43213",
    experience: 3,
    joined: "2024-05-01",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=120&q=80",
    branch: "Indiranagar",
  },
  {
    id: "TCH-005",
    name: "Meera Nair",
    className: "LKG A",
    subject: "Numeracy & Language Arts",
    email: "meera.nair@sunshineschool.edu",
    phone: "+91 98765 43214",
    experience: 7,
    joined: "2021-04-12",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    branch: "Koramangala",
  },
  {
    id: "TCH-006",
    name: "Kavita Reddy",
    className: "LKG B",
    subject: "Environmental Studies & Craft",
    email: "kavita.reddy@sunshineschool.edu",
    phone: "+91 98765 43215",
    experience: 4,
    joined: "2023-09-20",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80",
    branch: "Whitefield",
  },
  {
    id: "TCH-007",
    name: "Rajesh Kumar",
    className: "UKG A",
    subject: "Mathematics & Logic",
    email: "rajesh.kumar@sunshineschool.edu",
    phone: "+91 98765 43216",
    experience: 8,
    joined: "2020-02-15",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    branch: "Indiranagar",
  },
  {
    id: "TCH-008",
    name: "Vikram Verma",
    className: "UKG B",
    subject: "General Knowledge & Sports",
    email: "vikram.verma@sunshineschool.edu",
    phone: "+91 98765 43217",
    experience: 5,
    joined: "2023-01-10",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    branch: "Whitefield",
  },
];

// ─── Attendance records (per student per day, last 30 days) ─────────────────

export interface AttendanceRecord {
  studentId: string;
  date: string;
  status: "Present" | "Absent" | "Leave" | "Late";
}

const attRand = rng(7);
export const ATTENDANCE_RECORDS: AttendanceRecord[] = [];

export function todayAttendanceFor(className: ClassName, section?: Section) {
  const list = studentsBy(className, section);
  return { list, recs: [] as AttendanceRecord[] };
}

// ─── Homework & submissions ──────────────────────────────────────────────────

export interface HomeworkItem {
  id: number;
  className: ClassName;
  section?: Section;
  title: string;
  subject: string;
  assignedDate: string;
  due: string;
  teacher: string;
  status: "Pending" | "Completed";
  submitted: number;
  total: number;
  reviewed: number;
}

export const HOMEWORK: HomeworkItem[] = [
  { id: 1, className: "Nursery", section: "A", title: "Trace Capital Letters A to E", subject: "English", assignedDate: "2026-07-26", due: "2026-07-29", teacher: "Miss Priya Sharma", status: "Pending", submitted: 8, total: 10, reviewed: 6 },
  { id: 2, className: "LKG", section: "A", title: "Count & Match Numbers 1 to 10", subject: "Mathematics", assignedDate: "2026-07-25", due: "2026-07-28", teacher: "Meera Nair", status: "Completed", submitted: 10, total: 10, reviewed: 10 },
  { id: 3, className: "Playgroup", section: "A", title: "Color the Apple & Banana Worksheet", subject: "Art & Colors", assignedDate: "2026-07-27", due: "2026-07-30", teacher: "Ananya Sen", status: "Pending", submitted: 6, total: 10, reviewed: 4 },
  { id: 4, className: "UKG", section: "A", title: "Draw & Label Four Seasons Chart", subject: "General Science", assignedDate: "2026-07-26", due: "2026-07-29", teacher: "Rajesh Kumar", status: "Pending", submitted: 9, total: 10, reviewed: 7 },
  { id: 5, className: "UKG", section: "B", title: "Hindi Vowels (Swar) Practice Sheet", subject: "Hindi", assignedDate: "2026-07-24", due: "2026-07-27", teacher: "Vikram Verma", status: "Completed", submitted: 10, total: 10, reviewed: 10 },
  { id: 6, className: "Nursery", section: "B", title: "My Family Picture Coloring Worksheet", subject: "EVS", assignedDate: "2026-07-27", due: "2026-07-30", teacher: "Sunita Sharma", status: "Pending", submitted: 7, total: 10, reviewed: 5 },
  { id: 7, className: "LKG", section: "B", title: "Phonics Sound & Object Matching", subject: "Phonics", assignedDate: "2026-07-25", due: "2026-07-28", teacher: "Kavita Reddy", status: "Pending", submitted: 8, total: 10, reviewed: 6 },
  { id: 8, className: "Playgroup", section: "B", title: "Paste Cotton Balls on Sheep Outline", subject: "Craft Activity", assignedDate: "2026-07-26", due: "2026-07-29", teacher: "Sneha Kulkarni", status: "Pending", submitted: 5, total: 10, reviewed: 3 },
  { id: 9, className: "UKG", section: "A", title: "2-Digit Addition with Pictures", subject: "Maths", assignedDate: "2026-07-27", due: "2026-07-30", teacher: "Rajesh Kumar", status: "Pending", submitted: 7, total: 10, reviewed: 4 },
  { id: 10, className: "Nursery", section: "A", title: "Recite 'Baa Baa Black Sheep' at home", subject: "Rhymes", assignedDate: "2026-07-26", due: "2026-07-28", teacher: "Miss Priya Sharma", status: "Completed", submitted: 10, total: 10, reviewed: 10 },
];

// ─── Remarks ────────────────────────────────────────────────────────────────

export interface Remark {
  id: string;
  studentId: string;
  type: "Behaviour" | "Academic" | "Parent Meeting" | "General";
  note: string;
  by: string;
  date: string;
}

export const REMARKS: Remark[] = [];

// ─── Subject marks / Academics ──────────────────────────────────────────────

export interface SubjectMark {
  studentId: string;
  subject: string;
  assessment: string;
  score: number;
  outOf: number;
  date: string;
}

export const SUBJECT_MARKS: SubjectMark[] = [];

// ─── Class Activities ───────────────────────────────────────────────────────

export const ACTIVITIES: { id: number; title: string; className: string; date: string; cover: string; category: string }[] = [
  { id: 1, title: "Finger Painting & Color Mixing Fun", className: "Playgroup A", date: "2026-07-25", cover: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=400&q=80", category: "Art & Expression" },
  { id: 2, title: "Puppet Storytelling: The Lion and the Mouse", className: "Nursery A", date: "2026-07-24", cover: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80", category: "Language Development" },
  { id: 3, title: "Clay Sculpting & Geometric Shapes", className: "LKG A", date: "2026-07-23", cover: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=400&q=80", category: "Fine Motor Skills" },
  { id: 4, title: "Building Blocks Tower Challenge", className: "Playgroup B", date: "2026-07-22", cover: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=400&q=80", category: "Spatial Logic" },
  { id: 5, title: "Nursery Rhymes Sing-Along Session", className: "Nursery B", date: "2026-07-21", cover: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=400&q=80", category: "Music & Rhythm" },
  { id: 6, title: "Outdoor Sandpit & Giant Bubble Play", className: "Nursery A", date: "2026-07-20", cover: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80", category: "Outdoor Recreation" },
  { id: 7, title: "Planting Saplings & Botanical Exploration", className: "LKG B", date: "2026-07-19", cover: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=400&q=80", category: "Nature Studies" },
  { id: 8, title: "Alphabet Treasure Hunt in Classroom", className: "UKG A", date: "2026-07-18", cover: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80", category: "Interactive Learning" },
  { id: 9, title: "Kids Yoga & Breathing Balance", className: "UKG B", date: "2026-07-17", cover: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=400&q=80", category: "Wellness & Exercise" },
  { id: 10, title: "Origami Paper Folding Workshop", className: "LKG A", date: "2026-07-16", cover: "https://images.unsplash.com/photo-1522881193457-37ae97c905bf?auto=format&fit=crop&w=400&q=80", category: "Craft Skills" },
];

// ─── Fees ────────────────────────────────────────────────────────────────────

export const FEES: Fee[] = [
  { id: "F-101", studentId: "STU1001", studentName: "Aarav Sharma", className: "Playgroup A", amount: 8500, paid: 8500, dueDate: "2026-07-10", status: "Paid", month: "July 2026" },
  { id: "F-102", studentId: "STU1002", studentName: "Kiara Patel", className: "Nursery A", amount: 9500, paid: 5000, dueDate: "2026-07-10", status: "Partial", month: "July 2026" },
  { id: "F-103", studentId: "STU1003", studentName: "Vivaan Rao", className: "LKG A", amount: 10500, paid: 0, dueDate: "2026-07-15", status: "Pending", month: "July 2026" },
  { id: "F-104", studentId: "STU1004", studentName: "Ishaan Verma", className: "UKG A", amount: 10500, paid: 10500, dueDate: "2026-07-15", status: "Paid", month: "July 2026" },
  { id: "F-105", studentId: "STU1005", studentName: "Anaya Iyer", className: "Playgroup B", amount: 8500, paid: 8500, dueDate: "2026-07-10", status: "Paid", month: "July 2026" },
  { id: "F-106", studentId: "STU1006", studentName: "Rohan Menon", className: "Nursery B", amount: 9500, paid: 4000, dueDate: "2026-07-10", status: "Partial", month: "July 2026" },
  { id: "F-107", studentId: "STU1007", studentName: "Sara Khan", className: "LKG B", amount: 10500, paid: 0, dueDate: "2026-07-15", status: "Pending", month: "July 2026" },
  { id: "F-108", studentId: "STU1008", studentName: "Diya Nair", className: "UKG B", amount: 10500, paid: 10500, dueDate: "2026-07-10", status: "Paid", month: "July 2026" },
  { id: "F-109", studentId: "STU1009", studentName: "Kabir Gupta", className: "Playgroup A", amount: 8500, paid: 8500, dueDate: "2026-07-10", status: "Paid", month: "July 2026" },
  { id: "F-110", studentId: "STU1010", studentName: "Myra Kapoor", className: "Nursery A", amount: 9500, paid: 9500, dueDate: "2026-07-10", status: "Paid", month: "July 2026" },
];

export const RECEIPTS: Receipt[] = [
  { id: "REC-2001", receiptNo: "SUN-REC-001", studentName: "Aarav Sharma", amount: 8500, mode: "UPI", date: "2026-07-05", collectedBy: "Office Staff" },
  { id: "REC-2002", receiptNo: "SUN-REC-002", studentName: "Kiara Patel", amount: 5000, mode: "Cash", date: "2026-07-06", collectedBy: "Office Staff" },
  { id: "REC-2003", receiptNo: "SUN-REC-003", studentName: "Anaya Iyer", amount: 8500, mode: "Card", date: "2026-07-08", collectedBy: "Office Staff" },
  { id: "REC-2004", receiptNo: "SUN-REC-004", studentName: "Diya Nair", amount: 10500, mode: "Bank Transfer", date: "2026-07-09", collectedBy: "Office Staff" },
  { id: "REC-2005", receiptNo: "SUN-REC-005", studentName: "Kabir Gupta", amount: 8500, mode: "UPI", date: "2026-07-10", collectedBy: "Office Staff" },
  { id: "REC-2006", receiptNo: "SUN-REC-006", studentName: "Myra Kapoor", amount: 9500, mode: "UPI", date: "2026-07-11", collectedBy: "Office Staff" },
];

export const EXPENSES: Expense[] = [
  { id: "EXP-501", category: "Stationery & Art Supplies", description: "Crayons, Finger Paints & Craft Papers", amount: 12500, date: "2026-07-10", paidTo: "Metro Stationery Suppliers" },
  { id: "EXP-502", category: "Toys & Play Equipment", description: "Lego Building Blocks & Soft Toys Set", amount: 18000, date: "2026-07-12", paidTo: "JoyToys India Pvt Ltd" },
  { id: "EXP-503", category: "First Aid & Hygiene", description: "Dettol, Bandages, Sanitizers & Tissues", amount: 4500, date: "2026-07-15", paidTo: "Apollo Pharmacy" },
  { id: "EXP-504", category: "Event Supplies", description: "Decorations & Banners for Sports Meet", amount: 8500, date: "2026-07-18", paidTo: "PartyCrafters Event Agency" },
  { id: "EXP-505", category: "Snacks & Refreshments", description: "Fresh Fruits & Organic Juices for Kids", amount: 15000, date: "2026-07-22", paidTo: "GreenGrocers Fresh" },
];

export const ENQUIRIES: Enquiry[] = [
  { id: "ENQ-1001", childName: "Rudra Sen", parentName: "Anupam Sen", phone: "+91 98111 22233", email: "anupam.sen@gmail.com", interestedClass: "Nursery", source: "Walk-in", status: "Visit Scheduled", createdAt: "2026-07-20", age: 3, gender: "Boy", address: "Koramangala, Bengaluru" },
  { id: "ENQ-1002", childName: "Aadhya Menon", parentName: "Siddharth Menon", phone: "+91 98222 33344", email: "siddharth.m@yahoo.com", interestedClass: "Playgroup", source: "WhatsApp", status: "Contacted", createdAt: "2026-07-21", age: 2, gender: "Girl", address: "Indiranagar, Bengaluru" },
  { id: "ENQ-1003", childName: "Kabir Malhotra", parentName: "Vikram Malhotra", phone: "+91 98333 44455", email: "v.malhotra@hotmail.com", interestedClass: "LKG", source: "Referral", status: "Admission Approved", createdAt: "2026-07-22", age: 4, gender: "Boy", address: "Whitefield, Bengaluru" },
  { id: "ENQ-1004", childName: "Kyra Gupta", parentName: "Aakash Gupta", phone: "+91 98444 55566", email: "aakash.gupta@gmail.com", interestedClass: "UKG", source: "Phone", status: "Documents Pending", createdAt: "2026-07-23", age: 5, gender: "Girl", address: "HSR Layout, Bengaluru" },
  { id: "ENQ-1005", childName: "Devansh Rao", parentName: "Karthik Rao", phone: "+91 98555 66677", email: "karthik.rao@outlook.com", interestedClass: "Nursery", source: "Walk-in", status: "Enrolled", createdAt: "2026-07-24", age: 3, gender: "Boy", address: "Jayanagar, Bengaluru" },
  { id: "ENQ-1006", childName: "Reyna Kapoor", parentName: "Sameer Kapoor", phone: "+91 98666 77788", email: "sameer.k@gmail.com", interestedClass: "Playgroup", source: "WhatsApp", status: "New", createdAt: "2026-07-25", age: 2, gender: "Girl", address: "Bellandur, Bengaluru" },
  { id: "ENQ-1007", childName: "Aarush Joshi", parentName: "Nitin Joshi", phone: "+91 98777 88899", email: "nitin.j@gmail.com", interestedClass: "LKG", source: "Phone", status: "Visit Completed", createdAt: "2026-07-26", age: 4, gender: "Boy", address: "Electronic City, Bengaluru" },
  { id: "ENQ-1008", childName: "Amaira Shah", parentName: "Parag Shah", phone: "+91 98888 99900", email: "parag.shah@gmail.com", interestedClass: "UKG", source: "Referral", status: "Admission Approved", createdAt: "2026-07-27", age: 5, gender: "Girl", address: "Sarjapur Road, Bengaluru" },
  { id: "ENQ-1009", childName: "Kian Reddy", parentName: "Venkatesh Reddy", phone: "+91 98999 00011", email: "v.reddy@gmail.com", interestedClass: "Nursery", source: "Walk-in", status: "New", createdAt: "2026-07-28", age: 3, gender: "Boy", address: "Marathahalli, Bengaluru" },
  { id: "ENQ-1010", childName: "Aria Banerjee", parentName: "Sourav Banerjee", phone: "+91 98000 11122", email: "sourav.b@gmail.com", interestedClass: "LKG", source: "WhatsApp", status: "Contacted", createdAt: "2026-07-28", age: 4, gender: "Girl", address: "JP Nagar, Bengaluru" },
];

// ─── Aggregates ──────────────────────────────────────────────────────────────

export const REVENUE_MONTHLY = [
  { month: "May", revenue: 320000, admissions: 8 },
  { month: "Jun", revenue: 380000, admissions: 14 },
  { month: "Jul", revenue: 450000, admissions: 20 },
  { month: "Aug", revenue: 490000, admissions: 18 },
  { month: "Sep", revenue: 520000, admissions: 22 },
];

export const BRANCH_STATS = [
  { branch: "Whitefield", students: 35, teachers: 4, revenue: 210000 },
  { branch: "Koramangala", students: 28, teachers: 3, revenue: 165000 },
  { branch: "Indiranagar", students: 25, teachers: 3, revenue: 145000 },
];

export const CLASS_DIST = [
  { name: "Playgroup", value: 20, color: "#f97316" },
  { name: "Nursery", value: 20, color: "#06b6d4" },
  { name: "LKG", value: 20, color: "#8b5cf6" },
  { name: "UKG", value: 20, color: "#10b981" },
];

export const ANNOUNCEMENTS = [
  { id: 1, title: "School closed on 15 Aug for Independence Day event", date: "2026-08-10", body: "Please ensure students arrive in proper white uniform for the parade." },
  { id: 2, title: "Winter uniform mandatory from 1st November", date: "2026-08-08", body: "Winter sweaters and blazers are now available at the school store." },
  { id: 3, title: "PTM scheduled for Nursery, LKG & UKG on Saturday", date: "2026-08-05", body: "Parents can collect progress report cards between 9 AM and 1 PM." },
  { id: 4, title: "Annual Health & Dental Checkup Drive", date: "2026-08-02", body: "School pediatrician will conduct routine checkups for all classes." },
  { id: 5, title: "Monsoon Safety Guidelines & Raincoats Notice", date: "2026-07-28", body: "Kindly send an extra pair of labeled clothing in your child's bag." },
];

export const EVENTS = [
  { id: 1, title: "Annual Sports Meet 2026", date: "2026-08-15", type: "Sports Day", color: "bg-amber-500" },
  { id: 2, title: "Grand Science & Art Exhibition", date: "2026-08-22", type: "Exhibition", color: "bg-purple-500" },
  { id: 3, title: "Fancy Dress & Rhyme Competition", date: "2026-08-29", type: "Competition", color: "bg-pink-500" },
  { id: 4, title: "Independence Day Cultural Parade", date: "2026-08-15", type: "Celebration", color: "bg-orange-500" },
  { id: 5, title: "Grandparents Day Tea Gathering", date: "2026-09-05", type: "Family Event", color: "bg-emerald-500" },
  { id: 6, title: "Monsoon Plant Plantation Drive", date: "2026-09-12", type: "Environmental", color: "bg-green-500" },
  { id: 7, title: "Rhymes & Music Fest 2026", date: "2026-09-19", type: "Cultural", color: "bg-blue-500" },
  { id: 8, title: "Parent Teacher Interactive Meeting (PTM)", date: "2026-09-26", type: "Academic", color: "bg-rose-500" },
  { id: 9, title: "Diwali Lantern & Diya Making Workshop", date: "2026-10-15", type: "Workshop", color: "bg-amber-600" },
  { id: 10, title: "Winter Fun Fair & Magic Show", date: "2026-11-20", type: "Carnival", color: "bg-sky-500" },
];

export const DIARY = [
  { id: 1, date: "2026-07-28", note: "Aarav enjoyed finger painting today and ate full lunch. Participated actively in story hour.", mood: "Happy 😊" },
  { id: 2, date: "2026-07-27", note: "Learned letter tracing and sang rhymes with the class. Slept peacefully during afternoon nap.", mood: "Cheerfully Playful 🌟" },
  { id: 3, date: "2026-07-26", note: "Participated in clay modeling. Showed great interest in building colorful towers.", mood: "Creative 🎨" },
  { id: 4, date: "2026-07-25", note: "Completed numbers count worksheet with 100% accuracy. Well done!", mood: "Proud ⭐" },
  { id: 5, date: "2026-07-24", note: "Enjoyed outdoor sandpit play with friends. Very cooperative during snack time.", mood: "Energetic ⚡" },
];

export const ATTENDANCE_TREND = [
  { day: "Mon", present: 76 },
  { day: "Tue", present: 78 },
  { day: "Wed", present: 74 },
  { day: "Thu", present: 79 },
  { day: "Fri", present: 77 },
];

export const BIRTHDAYS = [
  { name: "Aarav Sharma", className: "Playgroup A", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Aarav", date: "Today 🎉" },
  { name: "Kiara Patel", className: "Nursery A", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Kiara", date: "Tomorrow" },
  { name: "Vivaan Rao", className: "LKG A", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Vivaan", date: "30 July" },
  { name: "Anaya Iyer", className: "UKG A", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Anaya", date: "2 August" },
  { name: "Ishaan Verma", className: "Nursery B", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Ishaan", date: "5 August" },
];

export const GALLERY = [
  "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=600&q=80",
];

// ─── Messages (student-based) ───────────────────────────────────────────────

export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  studentId: string;
  toParentId: string;
  subject: string;
  body: string;
  time: string;
  priority: "Normal" | "High";
  read: boolean;
  direction: "outgoing" | "incoming";
}

export const MESSAGES: Message[] = [
  {
    id: "MSG-101",
    fromId: "TCH-003",
    fromName: "Miss Priya Sharma (Teacher)",
    studentId: "STU1001",
    toParentId: "HH501",
    subject: "Regarding Aarav's Great Progress in Phonics",
    body: "Dear Parent, Aarav has been showing wonderful participation in tracing capital letters and rhyming sessions this week!",
    time: "10:30 AM",
    priority: "Normal",
    read: false,
    direction: "incoming",
  },
  {
    id: "MSG-102",
    fromId: "USR-OFFICE",
    fromName: "Office Staff",
    studentId: "STU1002",
    toParentId: "HH502",
    subject: "July Term Fee Receipt & Balance Update",
    body: "Dear Parent, we have received partial payment of ₹5,000 for Kiara's July fee. Receipt #SUN-REC-002 has been generated.",
    time: "09:15 AM",
    priority: "High",
    read: true,
    direction: "incoming",
  },
  {
    id: "MSG-103",
    fromId: "TCH-005",
    fromName: "Meera Nair (Teacher)",
    studentId: "STU1003",
    toParentId: "HH503",
    subject: "Count & Match Mathematics Homework Completed",
    body: "Vivaan completed his counting worksheet with 100% accuracy today. Keep up the encouragement!",
    time: "Yesterday",
    priority: "Normal",
    read: true,
    direction: "incoming",
  },
  {
    id: "MSG-104",
    fromId: "USR-PRINCIPAL",
    fromName: "Principal's Office",
    studentId: "STU1004",
    toParentId: "HH504",
    subject: "Invitation: Annual Day Cultural Parade & Sports Meet",
    body: "We invite all parents to join us for our upcoming Annual Sports Meet and Cultural Performance on August 15th.",
    time: "2 days ago",
    priority: "Normal",
    read: true,
    direction: "incoming",
  },
];
