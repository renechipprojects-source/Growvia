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

export const STUDENTS: Student[] = [];
export const PARENT_HOUSEHOLDS: Household[] = [];

// Helpers
export function studentsBy(className: ClassName, section?: Section): Student[] {
  return [];
}

export function getHousehold(id: string): Household | undefined {
  return undefined;
}

export function getStudentById(id: string): Student | undefined {
  return undefined;
}

// ─── Teachers ────────────────────────────────────────────────────────────────

export const TEACHERS: Teacher[] = [];

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

export interface Remark {
  id: string;
  studentId: string;
  type: "Behaviour" | "Academic" | "Parent Meeting" | "General";
  note: string;
  by: string;
  date: string;
}

export interface SubjectMark {
  studentId: string;
  subject: string;
  assessment: string;
  score: number;
  outOf: number;
  date: string;
}

export const HOMEWORK: HomeworkItem[] = [];
export const REMARKS: Remark[] = [];
export const SUBJECT_MARKS: SubjectMark[] = [];
export const ACTIVITIES: { id: number; title: string; className: string; date: string; cover: string; category: string }[] = [];
export const FEES: Fee[] = [];
export const RECEIPTS: Receipt[] = [];
export const EXPENSES: Expense[] = [];
export const ENQUIRIES: Enquiry[] = [];
export const REVENUE_MONTHLY: any[] = [];
export const BRANCH_STATS: any[] = [];
export const CLASS_DIST: any[] = [];
export const ANNOUNCEMENTS: any[] = [];
export const EVENTS: any[] = [];
export const DIARY: any[] = [];
export const ATTENDANCE_TREND: any[] = [];
export const BIRTHDAYS: any[] = [];
export const GALLERY: string[] = [];

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

export const MESSAGES: Message[] = [];
