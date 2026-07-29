import {
  notify,
  listForRole,
  unreadCountForRole,
  NotificationService
} from "./src/lib/notifications.ts";

console.log("=== NOTIFICATION CENTER ROLE FILTERING AUDIT ===\n");

// Clear existing in-memory state or seed
// Emit test notifications across various modules
notify({ title: "Circular 1", description: "All School Circular", module: "announcement", roles: ["parent", "teacher", "office", "principal", "super-admin"] });
notify({ title: "Fee Payment", description: "Fee payment received", module: "fees", roles: ["office", "principal", "super-admin", "parent"] });
notify({ title: "Admission Enquiry", description: "New student enquiry", module: "admissions", roles: ["office", "principal", "super-admin"] });
notify({ title: "Leave Request", description: "Parent requested leave", module: "leave", roles: ["teacher"] });
notify({ title: "Leave Response", description: "Teacher approved leave", module: "leave", roles: ["parent"] });
notify({ title: "Parent Message", description: "Message from Parent", module: "messages", roles: ["teacher"] });
notify({ title: "Teacher Message", description: "Message from Teacher", module: "messages", roles: ["parent"] });

const roles = ["principal", "super-admin", "office", "teacher", "parent"];

roles.forEach((r) => {
  const notifs = listForRole(r);
  const modules = [...new Set(notifs.map(n => n.module))];
  console.log(`Role [${r.toUpperCase()}]:`);
  console.log(`  - Total Visible Notifications: ${notifs.length}`);
  console.log(`  - Modules Present: ${modules.join(", ") || "None"}`);
  console.log(`  - Unread Count: ${unreadCountForRole(r)}`);
  
  if (r === "principal" || r === "super-admin" || r === "office") {
    const invalid = modules.filter(m => m !== "announcement");
    if (invalid.length > 0) console.error(`  ❌ FAIL: Operational modules found for ${r}:`, invalid);
    else console.log(`  ✅ PASS: Only Circulars (announcement) present for ${r}`);
  } else if (r === "teacher") {
    const invalid = modules.filter(m => !["announcement", "leave", "messages"].includes(m));
    if (invalid.length > 0) console.error(`  ❌ FAIL: Invalid modules found for teacher:`, invalid);
    else console.log(`  ✅ PASS: Only Circulars, Leave Requests & Parent Messages present for Teacher`);
  } else if (r === "parent") {
    const invalid = modules.filter(m => !["announcement", "leave", "messages"].includes(m));
    if (invalid.length > 0) console.error(`  ❌ FAIL: Invalid modules found for parent:`, invalid);
    else console.log(`  ✅ PASS: Only Circulars, Leave Decisions & Teacher Messages present for Parent`);
  }
  console.log("");
});

console.log("=== NOTIFICATION CENTER ROLE FILTERING AUDIT COMPLETE ===");
