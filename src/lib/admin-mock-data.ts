// Centralized mock data for TinySteps Play School ERP

export const classes = ["Play Group", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2"] as const;
export type ClassName = (typeof classes)[number];

export type Status = "Active" | "Inactive" | "Pending" | "Graduated";

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
  "Ishaan", "Shaurya", "Ananya", "Aadhya", "Kiara", "Diya", "Pari", "Anaya",
  "Myra", "Aarohi", "Anika", "Navya", "Zara", "Ira", "Riya", "Aisha",
];
const lastNames = [
  "Sharma", "Verma", "Iyer", "Patel", "Reddy", "Nair", "Kapoor", "Malhotra",
  "Gupta", "Singh", "Khan", "Chatterjee", "Banerjee", "Bose", "Menon", "Rao",
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

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

export const students: Student[] = Array.from({ length: 40 }).map((_, i) => {
  const cName = pick(classes, i);
  const sec = i % 2 === 0 ? "A" : "B";
  const fn = pick(firstNames, i);
  const ln = pick(lastNames, i);
  const name = `${fn} ${ln}`;
  const id = `STU${1001 + i}`;
  return {
    id,
    admissionNo: `SUN/26-${1000 + i}`,
    name,
    gender: i % 2 === 0 ? "Male" : "Female",
    dob: `2022-0${(i % 9) + 1}-1${i % 9}`,
    age: cName === "Play Group" ? 2 : cName === "Nursery" ? 3 : cName === "LKG" ? 4 : 5,
    className: cName,
    section: sec,
    parent: `Mr. & Mrs. ${ln}`,
    phone: `+91 98765 ${10000 + i}`,
    address: "Bengaluru",
    status: "Active",
    feesStatus: i % 3 === 0 ? "Paid" : i % 3 === 1 ? "Partial" : "Due",
    joinedOn: "2025-06-01",
    bloodGroup: pick(["O+", "A+", "B+", "AB+"], i),
    allergies: i % 5 === 0 ? ["Dust"] : [],
    avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
  };
});

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

export const parents: Parent[] = students.slice(0, 15).map((s, i) => ({
  id: `PAR-${501 + i}`,
  name: s.parent,
  email: `${s.name.toLowerCase().replace(/\s+/g, ".")}@sunshine-parents.com`,
  phone: s.phone,
  occupation: pick(["Software Engineer", "Business Owner", "Doctor", "Architect", "Manager"], i),
  children: [s.name],
  preferredChannel: pick(["WhatsApp", "Email", "SMS"], i),
  emergencyContact: s.phone,
  avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(s.parent)}`,
}));

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

export const staff: Staff[] = [
  { id: "STF-01", name: "Ananya Sen", role: "Teacher", className: "Play Group", qualification: "B.Ed (Montessori)", phone: "+91 98765 43210", email: "ananya.sen@sunshine.edu", joinedOn: "2023-06-01", salary: 35000, status: "Active", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-02", name: "Sneha Kulkarni", role: "Teacher", className: "Play Group", qualification: "Nursery Teacher Training", phone: "+91 98765 43211", email: "sneha.k@sunshine.edu", joinedOn: "2024-01-15", salary: 32000, status: "Active", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-03", name: "Miss Priya Sharma", role: "Teacher", className: "Nursery", qualification: "M.A. English, B.Ed", phone: "+91 98765 43212", email: "priya.sharma@sunshine.edu", joinedOn: "2022-08-10", salary: 38000, status: "Active", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-04", name: "Sunita Sharma", role: "Teacher", className: "Nursery", qualification: "B.A., NTT", phone: "+91 98765 43213", email: "sunita.s@sunshine.edu", joinedOn: "2024-05-01", salary: 33000, status: "Active", avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-05", name: "Meera Nair", role: "Teacher", className: "LKG", qualification: "B.Sc., B.Ed", phone: "+91 98765 43214", email: "meera.nair@sunshine.edu", joinedOn: "2021-04-12", salary: 40000, status: "Active", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-06", name: "Kavita Reddy", role: "Teacher", className: "LKG", qualification: "B.A. Fine Arts", phone: "+91 98765 43215", email: "kavita.reddy@sunshine.edu", joinedOn: "2023-09-20", salary: 34000, status: "Active", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-07", name: "Rajesh Kumar", role: "Teacher", className: "UKG", qualification: "M.Sc., B.Ed", phone: "+91 98765 43216", email: "rajesh.kumar@sunshine.edu", joinedOn: "2020-02-15", salary: 42000, status: "Active", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-08", name: "Vikram Verma", role: "Teacher", className: "UKG", qualification: "B.P.Ed, B.Ed", phone: "+91 98765 43217", email: "vikram.verma@sunshine.edu", joinedOn: "2023-01-10", salary: 36000, status: "Active", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" },
  { id: "STF-09", name: "Ramesh Caretaker", role: "Caretaker", qualification: "Secondary School", phone: "+91 98765 43218", email: "ramesh@sunshine.edu", joinedOn: "2022-01-01", salary: 18000, status: "Active", avatar: "" },
  { id: "STF-10", name: "Sunita Helper", role: "Helper", qualification: "Primary School", phone: "+91 98765 43219", email: "sunita.helper@sunshine.edu", joinedOn: "2023-03-01", salary: 15000, status: "Active", avatar: "" },
];

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

export const payments: Payment[] = students.slice(0, 15).map((s, i) => ({
  id: `PAY-${101 + i}`,
  studentId: s.id,
  studentName: s.name,
  amount: s.className === "Play Group" ? 8500 : s.className === "Nursery" ? 9500 : 10500,
  method: pick(["UPI", "Cash", "Card", "Bank Transfer"], i),
  date: `2026-07-${String((i % 25) + 1).padStart(2, "0")}`,
  status: i % 4 === 0 ? "Pending" : "Success",
  invoice: `INV-2026-${1000 + i}`,
}));

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

export const activities: Activity[] = [
  { id: "ACT-01", className: "Play Group", topic: "Finger Painting & Color Fun", category: "Art", teacher: "Ananya Sen", date: "2026-07-25", notes: "Kids mixed primary colors with enthusiasm." },
  { id: "ACT-02", className: "Nursery", topic: "Puppet Story: The Lion & The Mouse", category: "Story", teacher: "Miss Priya Sharma", date: "2026-07-24", notes: "Excellent listening and participation." },
  { id: "ACT-03", className: "LKG", topic: "Clay Sculpting & Geometric Shapes", category: "Craft", teacher: "Meera Nair", date: "2026-07-23", notes: "Created clay spheres and cubes." },
  { id: "ACT-04", className: "UKG", topic: "Alphabet & Number Treasure Hunt", category: "Learning", teacher: "Rajesh Kumar", date: "2026-07-22", notes: "High energy team building activity." },
  { id: "ACT-05", className: "Nursery", topic: "Outdoor Sandpit & Giant Bubbles", category: "Outdoor", teacher: "Sunita Sharma", date: "2026-07-21", notes: "Motor skills exercise in playground." },
];

export interface AttendanceRow {
  studentId: string;
  studentName: string;
  className: ClassName;
  status: "Present" | "Absent" | "Late" | "Leave";
  inTime?: string;
  outTime?: string;
}

export const attendanceToday: AttendanceRow[] = students.slice(0, 20).map((s, i) => ({
  studentId: s.id,
  studentName: s.name,
  className: s.className,
  status: i % 7 === 0 ? "Absent" : i % 9 === 0 ? "Late" : "Present",
  inTime: i % 7 === 0 ? undefined : "08:45 AM",
  outTime: i % 7 === 0 ? undefined : "01:30 PM",
}));

export const vehicles = [
  { id: "V-01", number: "KA-05-AB-1234", driver: "Ramesh K.", capacity: 24, route: "Route A - HSR", status: "Active" },
  { id: "V-02", number: "KA-05-CD-5678", driver: "Suresh M.", capacity: 20, route: "Route B - Koramangala", status: "Active" },
  { id: "V-03", number: "KA-05-EF-9101", driver: "Mahesh P.", capacity: 24, route: "Route C - Indiranagar", status: "Maintenance" },
  { id: "V-04", number: "KA-05-GH-1122", driver: "Ganesh V.", capacity: 18, route: "Route D - Whitefield", status: "Active" },
];

export const routes = [
  { id: "R-A", name: "Route A - HSR", stops: 8, students: 18, vehicle: "KA-05-AB-1234", pickupStart: "07:30" },
  { id: "R-B", name: "Route B - Koramangala", stops: 6, students: 15, vehicle: "KA-05-CD-5678", pickupStart: "07:45" },
  { id: "R-C", name: "Route C - Indiranagar", stops: 7, students: 20, vehicle: "KA-05-EF-9101", pickupStart: "07:20" },
  { id: "R-D", name: "Route D - Whitefield", stops: 5, students: 12, vehicle: "KA-05-GH-1122", pickupStart: "07:15" },
];

export const events = [
  { id: "E-1", title: "Annual Day 2025", type: "Annual Day", date: "2025-12-18", location: "Main Hall", status: "Upcoming" },
  { id: "E-2", title: "Sports Day", type: "Sports Day", date: "2025-12-05", location: "Ground", status: "Upcoming" },
  { id: "E-3", title: "Parent-Teacher Meet", type: "Parent Meeting", date: "2025-11-28", location: "Classrooms", status: "Upcoming" },
  { id: "E-4", title: "Zoo Trip", type: "Trip", date: "2025-11-22", location: "Bannerghatta", status: "Upcoming" },
  { id: "E-5", title: "Diwali Celebration", type: "Celebration", date: "2025-10-30", location: "Playground", status: "Completed" },
  { id: "E-6", title: "Storytelling Week", type: "Activity", date: "2025-11-10", location: "Library", status: "Completed" },
];

export const inventory = [
  { id: "I-01", item: "Lego Blocks Large Set", category: "Toys", qty: 12, min: 5, unit: "sets", updated: "2025-11-01" },
  { id: "I-02", item: "Picture Story Books", category: "Books", qty: 84, min: 40, unit: "pcs", updated: "2025-10-20" },
  { id: "I-03", item: "Child Chairs", category: "Furniture", qty: 60, min: 40, unit: "pcs", updated: "2025-09-15" },
  { id: "I-04", item: "Crayons Box", category: "Stationery", qty: 4, min: 20, unit: "boxes", updated: "2025-11-05" },
  { id: "I-05", item: "Chart Papers", category: "Stationery", qty: 120, min: 50, unit: "sheets", updated: "2025-10-28" },
  { id: "I-06", item: "Building Blocks", category: "Learning Materials", qty: 8, min: 6, unit: "sets", updated: "2025-11-02" },
  { id: "I-07", item: "Wooden Puzzles", category: "Learning Materials", qty: 3, min: 10, unit: "pcs", updated: "2025-11-04" },
  { id: "I-08", item: "Sketch Pens", category: "Stationery", qty: 45, min: 30, unit: "packs", updated: "2025-10-30" },
];

export const notifications = [
  { id: "N-1", title: "Fee reminder sent to 12 parents", time: "10 min ago", type: "fee" },
  { id: "N-2", title: "New admission: Aarohi Sharma", time: "1 hr ago", type: "admission" },
  { id: "N-3", title: "Nap tracker updated for Nursery A", time: "2 hr ago", type: "activity" },
  { id: "N-4", title: "Vehicle V-03 sent for maintenance", time: "4 hr ago", type: "transport" },
  { id: "N-5", title: "Diwali celebration photos uploaded", time: "Yesterday", type: "event" },
];

export const announcements = [
  { id: "A-1", title: "School closed on 14 Nov for Children's Day event", audience: "All Parents", date: "2025-11-10", channel: "Email + SMS" },
  { id: "A-2", title: "Winter uniform mandatory from Dec 1", audience: "All Parents", date: "2025-11-08", channel: "WhatsApp" },
  { id: "A-3", title: "PTM scheduled for LKG & UKG on Nov 28", audience: "LKG, UKG", date: "2025-11-05", channel: "Email" },
];

export const messages = [
  { id: "M-1", from: "Priya Sharma", subject: "Regarding Aarav's lunch box", preview: "Please ensure he finishes his fruits...", time: "9:12 AM", unread: true },
  { id: "M-2", from: "Rahul Verma", subject: "Pickup change for tomorrow", preview: "My mother will pick up Vihaan...", time: "8:40 AM", unread: true },
  { id: "M-3", from: "Ms. Kavita", subject: "Nursery B activity update", preview: "Great participation in art class today...", time: "Yesterday", unread: false },
  { id: "M-4", from: "Anjali Iyer", subject: "Fee receipt request", preview: "Kindly share the receipt for Nov...", time: "Yesterday", unread: false },
];

export const meals = students.slice(0, 12).map((s, i) => ({
  studentId: s.id,
  student: s.name,
  breakfast: i % 4 === 0 ? "Skipped" : "Full",
  lunch: i % 5 === 0 ? "Half" : "Full",
  snacks: "Full",
  milk: i % 3 === 0 ? "Full" : "Half",
  notes: i % 6 === 0 ? "Preferred fruits" : "-",
}));

export const naps = students.slice(0, 12).map((s, i) => ({
  studentId: s.id,
  student: s.name,
  start: `13:${String(0 + (i % 15)).padStart(2, "0")}`,
  end: `14:${String(30 + (i % 20)).padStart(2, "0")}`,
  duration: `${1 + (i % 2)}h ${20 + (i % 30)}m`,
  notes: i % 4 === 0 ? "Slept peacefully" : "-",
}));

export const medicalRecords = students.slice(0, 14).map((s, i) => ({
  studentId: s.id,
  student: s.name,
  bloodGroup: s.bloodGroup,
  vaccinations: i % 3 === 0 ? "Up to date" : "1 due",
  allergies: s.allergies.join(", ") || "None",
  lastChecked: `2025-10-${String((i % 27) + 1).padStart(2, "0")}`,
  doctor: pick(["Dr. Menon", "Dr. Rao", "Dr. Kapoor"], i),
}));

export const pickupHistory = students.slice(0, 16).map((s, i) => ({
  studentId: s.id,
  student: s.name,
  pickupBy: pick(["Mother", "Father", "Grandparent", "Authorized Guardian"], i),
  time: `15:${String(0 + (i % 45)).padStart(2, "0")}`,
  otp: String(1000 + (i * 137) % 9000),
  status: i % 8 === 0 ? "Late" : "On Time",
  date: "2025-11-14",
}));

export const users = [
  { id: "U-1", name: "Meera Iyer", email: "meera@tinysteps.edu", role: "Super Admin", lastActive: "2 min ago", status: "Active" },
  { id: "U-2", name: "Rohit Sharma", email: "rohit@tinysteps.edu", role: "Admin", lastActive: "1 hr ago", status: "Active" },
  { id: "U-3", name: "Kavita Rao", email: "kavita@tinysteps.edu", role: "Teacher", lastActive: "Today", status: "Active" },
  { id: "U-4", name: "Anjali Nair", email: "anjali@tinysteps.edu", role: "Accountant", lastActive: "Yesterday", status: "Active" },
  { id: "U-5", name: "Suresh M.", email: "suresh@tinysteps.edu", role: "Transport Manager", lastActive: "3 days ago", status: "Inactive" },
];

export const activityLog = Array.from({ length: 12 }).map((_, i) => ({
  id: `L-${i + 1}`,
  user: pick(users, i).name,
  action: pick(
    ["Updated fee structure", "Marked attendance", "Added new student", "Sent bulk announcement", "Generated report", "Updated vehicle routes"],
    i,
  ),
  time: `${(i + 1) * 2} hr ago`,
}));

// Chart data
export const feeCollectionSeries = [
  { month: "May", collected: 320000, expected: 400000 },
  { month: "Jun", collected: 380000, expected: 410000 },
  { month: "Jul", collected: 420000, expected: 430000 },
  { month: "Aug", collected: 410000, expected: 440000 },
  { month: "Sep", collected: 470000, expected: 460000 },
  { month: "Oct", collected: 495000, expected: 480000 },
  { month: "Nov", collected: 520000, expected: 500000 },
];

export const attendanceTrend = [
  { day: "Mon", present: 178, absent: 22 },
  { day: "Tue", present: 184, absent: 16 },
  { day: "Wed", present: 172, absent: 28 },
  { day: "Thu", present: 189, absent: 11 },
  { day: "Fri", present: 181, absent: 19 },
  { day: "Sat", present: 165, absent: 35 },
];

export const admissionsTrend = [
  { month: "May", value: 6 },
  { month: "Jun", value: 12 },
  { month: "Jul", value: 22 },
  { month: "Aug", value: 18 },
  { month: "Sep", value: 9 },
  { month: "Oct", value: 14 },
  { month: "Nov", value: 20 },
];

export const classStrength = classes.map((c) => ({
  name: c,
  value: students.filter((s) => s.className === c).length,
}));

export const upcomingBirthdays = students.slice(0, 6).map((s, i) => ({
  id: s.id,
  name: s.name,
  className: s.className,
  age: s.age + 1,
  date: `Nov ${18 + i}`,
  avatar: s.avatar,
}));
