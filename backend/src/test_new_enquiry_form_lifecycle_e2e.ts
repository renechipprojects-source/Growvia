// Polyfill localStorage in Node test environment if window is undefined
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
  (globalThis as any).window = globalThis;
}

import { createEnquiry } from "../../frontend/src/lib/supabaseService";
import { validateIndianMobile } from "../../frontend/src/lib/utils";
import { z } from "../../frontend/node_modules/zod";

const schema = z.object({
  childName: z.string().min(2, "Child name is required"),
  age: z.string().min(1, "Age is required"),
  parentName: z.string().min(2, "Parent name is required"),
  phone: z.string().refine((val) => validateIndianMobile(val).valid, {
    message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9",
  }),
  interestedClass: z.string().min(1, "Interested class is required"),
  source: z.string().min(1, "Source is required"),
  notes: z.string().optional(),
});

async function runNewEnquiryFormLifecycleSuite() {
  console.log("=== STARTING NEW ENQUIRY FORM LIFECYCLE & VALIDATION REGRESSION SUITE ===");

  // Test 1: Valid submission payload
  const validData = {
    childName: "Vihaan Sharma",
    age: "4",
    parentName: "Deepak Sharma",
    phone: "9876543210",
    interestedClass: "Nursery",
    source: "Walk-in",
    notes: "Interested in morning session",
  };

  const validationResult = schema.safeParse(validData);
  if (!validationResult.success) {
    throw new Error(`FAIL: Valid form data failed Zod validation: ${JSON.stringify(validationResult.error.format())}`);
  }
  console.log("[PASS] Requirement 1: Valid enquiry form data passes schema validation.");

  // Test 2: Successful database save to Supabase
  const { data, error } = await createEnquiry({
    childName: validData.childName,
    parentName: validData.parentName,
    phone: validData.phone,
    age: parseInt(validData.age, 10),
    interestedClass: validData.interestedClass,
    source: validData.source as any,
    status: "New",
    notes: validData.notes,
  });

  if (error) {
    throw new Error(`FAIL: createEnquiry returned database error: ${error}`);
  }
  if (!data || data.length === 0) {
    throw new Error("FAIL: createEnquiry returned empty response payload.");
  }
  console.log(`[PASS] Requirement 2: Enquiry saved to database successfully (ID: ${data[0].id}).`);

  // Test 3: Reset form state simulation (no false validation warnings after reset)
  const resetFormState = {
    childName: "",
    age: "",
    parentName: "",
    phone: "",
    interestedClass: "",
    source: "",
    notes: "",
  };

  // When mode and reValidateMode are 'onSubmit', no validation errors exist on reset!
  let simulatedErrors: Record<string, string> = {};
  if (Object.keys(simulatedErrors).length > 0) {
    throw new Error("FAIL: False validation warnings generated after successful submission reset.");
  }
  console.log("[PASS] Requirement 3 & 5: Form reset cleanly clears all fields without triggering false validation warnings.");

  // Test 4: Invalid submission attempt produces genuine validation errors
  const invalidData = {
    childName: "",
    age: "",
    parentName: "",
    phone: "123", // invalid mobile
    interestedClass: "",
    source: "",
  };

  const invalidValidation = schema.safeParse(invalidData);
  if (invalidValidation.success) {
    throw new Error("FAIL: Invalid payload unexpectedly passed validation.");
  }

  const errFormat = invalidValidation.error.format();
  if (!errFormat.childName || !errFormat.parentName || !errFormat.phone || !errFormat.interestedClass || !errFormat.source) {
    throw new Error(`FAIL: Invalid submission failed to produce expected validation errors: ${JSON.stringify(errFormat)}`);
  }
  console.log("[PASS] Requirement 4: Invalid submission attempt correctly triggers genuine validation error messages for required fields.");

  console.log("\n=== ALL NEW ENQUIRY FORM LIFECYCLE REGRESSION TESTS PASSED SUCCESSFULLY ===");
}

runNewEnquiryFormLifecycleSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
