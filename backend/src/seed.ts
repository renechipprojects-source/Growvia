import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const classes = ["Playgroup", "Nursery", "LKG", "UKG"];
const sections = ["A", "B"];
const houses = ["Red", "Blue", "Green", "Yellow"];

const firstNames = [
  "Aarav", "Ananya", "Vivaan", "Diya", "Aditya", "Vihaan", "Saisha", "Reyansh",
  "Aadhya", "Kabir", "Ishaan", "Anvi", "Arjun", "Myra", "Dhruv", "Riya",
  "Dev", "Kavya", "Atharv", "Prisha", "Aryan", "Ira", "Krishna", "Meera",
  "Avyaan", "Ayaana", "Yug", "Tara", "Samarth", "Anika", "Shaurya", "Navya",
  "Rudran", "Saanvi", "Darsh", "Zoya", "Rudra", "Nisha", "Rohan", "Pari",
  "Ahaan", "Kiara", "Kush", "Nyra", "Agastya", "Aditi", "Bhavin", "Amaira",
  "Rithvik", "Avni"
];

const lastNames = [
  "Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Joshi", "Mehta",
  "Nair", "Reddy", "Rao", "Shah", "Kulkarni", "Deshmukh", "Chopra", "Malhotra",
  "Bhat", "Iyer", "Menon", "Trivedi", "Pandey", "Mishra", "Agarwal", "Saxena"
];

const cities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune"];

console.log("🚀 Starting Growvia ERP Production Data Seeding...");

async function seed() {
  // 1. Seed Staff Members for every Class & Section
  const staffList: any[] = [];
  let staffCounter = 101;

  for (const c of classes) {
    for (const s of sections) {
      const teacherId = `TCH-SEED-${staffCounter}`;
      const loginId = `TCHSEED${staffCounter}`;
      const name = `Teacher ${c} ${s}`;
      const email = `teacher.seed.${c.toLowerCase()}.${s.toLowerCase()}${staffCounter}@growvia.edu`;

      staffList.push({
        id: teacherId,
        login_id: loginId,
        email: email,
        full_name: `Prof. ${firstNames[staffCounter % firstNames.length]} ${lastNames[staffCounter % lastNames.length]}`,
        role: "teacher",
        status: "active",
        mobile: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        employee_id: `EMP-SEED-${staffCounter}`,
        class_name: c,
        section: s,
        subject: c === "Playgroup" || c === "Nursery" ? "General & Play" : c === "LKG" ? "English & Math" : "Phonics & EVS",
        designation: `Class Teacher (${c} ${s})`,
        experience: Math.floor(Math.random() * 8) + 3,
        branch: "Main Branch"
      });
      staffCounter++;
    }
  }

  console.log(`📌 Seeding ${staffList.length} Teachers across all classes...`);
  const { error: staffErr } = await supabase.from("gv_users").upsert(staffList, { onConflict: "id" });
  if (staffErr) console.error("Staff seeding error:", staffErr);
  else console.log("✅ Teachers successfully seeded into Supabase gv_users!");

  // 2. Seed 100 Students with complete records
  const studentList: any[] = [];
  const parentList: any[] = [];
  const feeList: any[] = [];

  let studentIdCounter = 5001;

  for (let i = 0; i < 100; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const fullName = `${fn} ${ln}`;
    const className = classes[Math.floor(i / 25) % classes.length];
    const section = sections[i % 2];
    const house = houses[i % houses.length];
    const gender = i % 2 === 0 ? "Boy" : "Girl";
    
    // DOB between 2019 and 2022
    const birthYear = 2019 + (i % 3);
    const birthMonth = String((i % 12) + 1).padStart(2, '0');
    const birthDay = String((i % 28) + 1).padStart(2, '0');
    const dob = `${birthYear}-${birthMonth}-${birthDay}`;

    const studentId = `STU-SEED-${studentIdCounter}`;
    const loginId = `STUSEED${studentIdCounter}`;
    const admissionNo = `ADM2024SEED${studentIdCounter}`;
    const parentName = `Mr. ${lastNames[(i + 1) % lastNames.length]} ${ln}`;
    const parentId = `PAR-SEED-${studentIdCounter}`;
    const parentLoginId = `PARSEED${studentIdCounter}`;
    const mobile = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;

    const feeStatus = i % 4 === 0 ? "Paid" : i % 4 === 1 ? "Partial" : "Pending";
    const attendancePct = Number((88 + (i % 12) + Math.random()).toFixed(1));

    // Student profile
    studentList.push({
      id: studentId,
      login_id: loginId,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${studentIdCounter}@growvia.edu`,
      full_name: fullName,
      role: "student",
      status: "active",
      mobile: mobile,
      date_of_birth: dob,
      gender: gender,
      address: `${10 + i} Sunshine Heights, ${cities[i % cities.length]}`,
      admission_no: admissionNo,
      class_name: className,
      section: section,
      house: house,
      parent_name: parentName,
      parent_id: parentId,
      fee_status: feeStatus,
      attendance_pct: attendancePct,
      branch: "Main Branch"
    });

    // Parent login credential profile
    parentList.push({
      id: parentId,
      login_id: parentLoginId,
      email: `parent.seed.${studentIdCounter}@growvia.edu`,
      full_name: parentName,
      role: "parent",
      status: "active",
      mobile: mobile,
      address: `${10 + i} Sunshine Heights, ${cities[i % cities.length]}`,
      branch: "Main Branch"
    });

    // Student Fee record in gv_fees_payments
    const tuitionAmount = className === "Playgroup" ? 12000 : className === "Nursery" ? 15000 : className === "LKG" ? 18000 : 20000;
    const paidAmount = feeStatus === "Paid" ? tuitionAmount : feeStatus === "Partial" ? tuitionAmount / 2 : 0;
    const balanceAmount = tuitionAmount - paidAmount;

    feeList.push({
      id: `FP-SEED-${studentIdCounter}`,
      record_type: "fee_schedule",
      student_id: studentId,
      student_name: fullName,
      class_name: className,
      fee_type: "Term 1 Tuition Fee",
      academic_year: "2024-2025",
      installment: "Term 1",
      amount_due: tuitionAmount,
      amount_paid: paidAmount,
      balance: balanceAmount,
      payment_date: "2024-07-15",
      payment_method: feeStatus === "Paid" ? "Online Transfer" : feeStatus === "Partial" ? "UPI" : "Cash",
      receipt_number: `REC-2024-SEED-${studentIdCounter}`,
      status: feeStatus
    });

    studentIdCounter++;
  }

  console.log(`📌 Seeding 100 Students into Supabase gv_users...`);
  const { error: studentErr } = await supabase.from("gv_users").upsert(studentList, { onConflict: "id" });
  if (studentErr) console.error("Student seeding error:", studentErr);
  else console.log("✅ 100 Students successfully seeded into Supabase!");

  console.log(`📌 Seeding 100 Parent Credentials into Supabase gv_users...`);
  const { error: parentErr } = await supabase.from("gv_users").upsert(parentList, { onConflict: "id" });
  if (parentErr) console.error("Parent seeding error:", parentErr);
  else console.log("✅ 100 Parent credentials successfully seeded into Supabase!");

  console.log(`📌 Seeding 100 Student Fee Bills into Supabase gv_fees_payments...`);
  const { error: feeErr } = await supabase.from("gv_fees_payments").upsert(feeList, { onConflict: "id" });
  if (feeErr) console.error("Fee seeding error:", feeErr);
  else console.log("✅ 100 Student Fee Bills successfully seeded into Supabase!");

  console.log("🎉 All 100 Students, Teachers, Parent Credentials, and Fee Bills are live in Supabase!");
}

seed().catch(console.error);
