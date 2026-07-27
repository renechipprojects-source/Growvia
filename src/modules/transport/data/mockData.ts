import type { Vehicle, Route, Driver, Allocation, Maintenance, TransportFee } from "../types";

export const vehicles: Vehicle[] = [
  { id: "V1", number: "MH-12-AB-1023", name: "Sunshine 1", type: "Bus", capacity: 42, driver: "Ravi Kumar", route: "Route A - North", status: "Active", lastService: "2026-05-12", nextService: "2026-08-12" },
  { id: "V2", number: "MH-12-CD-2210", name: "Sunshine 2", type: "Bus", capacity: 40, driver: "Suresh Patil", route: "Route B - South", status: "Active", lastService: "2026-04-02", nextService: "2026-07-02" },
  { id: "V3", number: "MH-12-EE-3319", name: "Little Star", type: "Van", capacity: 18, driver: "Anil Yadav", route: "Route C - East", status: "Maintenance", lastService: "2026-06-01", nextService: "2026-07-15" },
  { id: "V4", number: "MH-12-FF-4402", name: "Bluebird", type: "Mini Bus", capacity: 24, driver: "Deepak Joshi", route: "Route D - West", status: "Active", lastService: "2026-03-18", nextService: "2026-06-18" },
  { id: "V5", number: "MH-12-GG-5518", name: "Comet", type: "Bus", capacity: 42, driver: "Vinod Rao", route: "Route E - Central", status: "Inactive", lastService: "2026-01-22", nextService: "2026-07-22" },
  { id: "V6", number: "MH-12-HH-6690", name: "Meteor", type: "Van", capacity: 16, driver: "Kiran Shah", route: "Route F - Suburb", status: "Active", lastService: "2026-05-30", nextService: "2026-08-30" },
  { id: "V7", number: "MH-12-II-7712", name: "Explorer", type: "Bus", capacity: 45, driver: "Manish Verma", route: "Route G - Ring", status: "Active", lastService: "2026-05-05", nextService: "2026-08-05" },
  { id: "V8", number: "MH-12-JJ-8823", name: "Voyager", type: "Mini Bus", capacity: 22, driver: "Rakesh Nair", route: "Route H - Bypass", status: "Active", lastService: "2026-04-19", nextService: "2026-07-19" },
  { id: "V9", number: "MH-12-KK-9934", name: "Pioneer", type: "Van", capacity: 18, driver: "Sanjay Iyer", route: "Route I - Old City", status: "Maintenance", lastService: "2026-06-10", nextService: "2026-07-25" },
  { id: "V10", number: "MH-12-LL-1145", name: "Skyline", type: "Bus", capacity: 42, driver: "Prakash Reddy", route: "Route J - Uptown", status: "Active", lastService: "2026-05-25", nextService: "2026-08-25" },
];

export const routes: Route[] = [
  { id: "R1", name: "Route A - North", pickupPoints: ["Green Park", "MG Road", "Hill View"], dropPoints: ["Green Park", "MG Road", "Hill View"], distanceKm: 18, vehicle: "MH-12-AB-1023", driver: "Ravi Kumar", students: 38, status: "Active" },
  { id: "R2", name: "Route B - South", pickupPoints: ["Lake View", "River Side", "Market Sq"], dropPoints: ["Lake View", "River Side", "Market Sq"], distanceKm: 22, vehicle: "MH-12-CD-2210", driver: "Suresh Patil", students: 35, status: "Active" },
  { id: "R3", name: "Route C - East", pickupPoints: ["Sunrise Colony", "Palm Ave"], dropPoints: ["Sunrise Colony", "Palm Ave"], distanceKm: 12, vehicle: "MH-12-EE-3319", driver: "Anil Yadav", students: 16, status: "Active" },
  { id: "R4", name: "Route D - West", pickupPoints: ["Sunset Rd", "Central Park", "Old Mill"], dropPoints: ["Sunset Rd", "Central Park", "Old Mill"], distanceKm: 20, vehicle: "MH-12-FF-4402", driver: "Deepak Joshi", students: 22, status: "Active" },
  { id: "R5", name: "Route E - Central", pickupPoints: ["City Center", "Main Bazar"], dropPoints: ["City Center", "Main Bazar"], distanceKm: 8, vehicle: "MH-12-GG-5518", driver: "Vinod Rao", students: 28, status: "Inactive" },
  { id: "R6", name: "Route F - Suburb", pickupPoints: ["Rose Colony", "Tulip Estate"], dropPoints: ["Rose Colony", "Tulip Estate"], distanceKm: 15, vehicle: "MH-12-HH-6690", driver: "Kiran Shah", students: 15, status: "Active" },
  { id: "R7", name: "Route G - Ring", pickupPoints: ["Ring Rd N", "Ring Rd S", "Ring Rd E"], dropPoints: ["Ring Rd N", "Ring Rd S", "Ring Rd E"], distanceKm: 25, vehicle: "MH-12-II-7712", driver: "Manish Verma", students: 40, status: "Active" },
  { id: "R8", name: "Route H - Bypass", pickupPoints: ["Bypass A", "Bypass B"], dropPoints: ["Bypass A", "Bypass B"], distanceKm: 19, vehicle: "MH-12-JJ-8823", driver: "Rakesh Nair", students: 20, status: "Active" },
];

export const drivers: Driver[] = [
  { id: "D1", name: "Ravi Kumar", employeeId: "EMP-101", mobile: "+91 98200 11111", license: "DL-0420110001234", licenseExpiry: "2028-03-15", vehicle: "MH-12-AB-1023", route: "Route A - North", status: "Active" },
  { id: "D2", name: "Suresh Patil", employeeId: "EMP-102", mobile: "+91 98200 22222", license: "DL-0420110002345", licenseExpiry: "2027-11-02", vehicle: "MH-12-CD-2210", route: "Route B - South", status: "Active" },
  { id: "D3", name: "Anil Yadav", employeeId: "EMP-103", mobile: "+91 98200 33333", license: "DL-0420110003456", licenseExpiry: "2026-09-12", vehicle: "MH-12-EE-3319", route: "Route C - East", status: "On Leave" },
  { id: "D4", name: "Deepak Joshi", employeeId: "EMP-104", mobile: "+91 98200 44444", license: "DL-0420110004567", licenseExpiry: "2029-01-20", vehicle: "MH-12-FF-4402", route: "Route D - West", status: "Active" },
  { id: "D5", name: "Vinod Rao", employeeId: "EMP-105", mobile: "+91 98200 55555", license: "DL-0420110005678", licenseExpiry: "2027-05-18", vehicle: "MH-12-GG-5518", route: "Route E - Central", status: "Inactive" },
  { id: "D6", name: "Kiran Shah", employeeId: "EMP-106", mobile: "+91 98200 66666", license: "DL-0420110006789", licenseExpiry: "2028-08-30", vehicle: "MH-12-HH-6690", route: "Route F - Suburb", status: "Active" },
  { id: "D7", name: "Manish Verma", employeeId: "EMP-107", mobile: "+91 98200 77777", license: "DL-0420110007890", licenseExpiry: "2029-02-14", vehicle: "MH-12-II-7712", route: "Route G - Ring", status: "Active" },
  { id: "D8", name: "Rakesh Nair", employeeId: "EMP-108", mobile: "+91 98200 88888", license: "DL-0420110008901", licenseExpiry: "2027-07-07", vehicle: "MH-12-JJ-8823", route: "Route H - Bypass", status: "Active" },
];

export const allocations: Allocation[] = [
  { id: "A1", student: "Aarav Sharma", className: "Grade 5", section: "A", route: "Route A - North", pickupPoint: "Green Park", dropPoint: "Green Park", vehicle: "MH-12-AB-1023", driver: "Ravi Kumar", monthlyFee: 1800 },
  { id: "A2", student: "Kiara Patel", className: "Grade 3", section: "B", route: "Route B - South", pickupPoint: "Lake View", dropPoint: "Lake View", vehicle: "MH-12-CD-2210", driver: "Suresh Patil", monthlyFee: 2000 },
  { id: "A3", student: "Vivaan Rao", className: "Grade 6", section: "A", route: "Route C - East", pickupPoint: "Palm Ave", dropPoint: "Palm Ave", vehicle: "MH-12-EE-3319", driver: "Anil Yadav", monthlyFee: 1500 },
  { id: "A4", student: "Ishaan Verma", className: "Grade 4", section: "C", route: "Route D - West", pickupPoint: "Sunset Rd", dropPoint: "Sunset Rd", vehicle: "MH-12-FF-4402", driver: "Deepak Joshi", monthlyFee: 1900 },
  { id: "A5", student: "Anaya Iyer", className: "Grade 2", section: "A", route: "Route A - North", pickupPoint: "MG Road", dropPoint: "MG Road", vehicle: "MH-12-AB-1023", driver: "Ravi Kumar", monthlyFee: 1800 },
  { id: "A6", student: "Rohan Menon", className: "Grade 7", section: "B", route: "Route G - Ring", pickupPoint: "Ring Rd N", dropPoint: "Ring Rd N", vehicle: "MH-12-II-7712", driver: "Manish Verma", monthlyFee: 2200 },
  { id: "A7", student: "Sara Khan", className: "Grade 5", section: "B", route: "Route F - Suburb", pickupPoint: "Rose Colony", dropPoint: "Rose Colony", vehicle: "MH-12-HH-6690", driver: "Kiran Shah", monthlyFee: 1700 },
  { id: "A8", student: "Diya Nair", className: "Grade 3", section: "A", route: "Route H - Bypass", pickupPoint: "Bypass A", dropPoint: "Bypass A", vehicle: "MH-12-JJ-8823", driver: "Rakesh Nair", monthlyFee: 1900 },
  { id: "A9", student: "Arjun Reddy", className: "Grade 8", section: "A", route: "Route B - South", pickupPoint: "Market Sq", dropPoint: "Market Sq", vehicle: "MH-12-CD-2210", driver: "Suresh Patil", monthlyFee: 2000 },
  { id: "A10", student: "Meera Shah", className: "Grade 6", section: "C", route: "Route D - West", pickupPoint: "Central Park", dropPoint: "Central Park", vehicle: "MH-12-FF-4402", driver: "Deepak Joshi", monthlyFee: 1900 },
];

export const maintenance: Maintenance[] = [
  { id: "M1", vehicle: "MH-12-AB-1023", serviceDate: "2026-05-12", serviceType: "Full Service", vendor: "Kumar Motors", cost: 12500, nextServiceDate: "2026-08-12", notes: "Oil change, brake pads" },
  { id: "M2", vehicle: "MH-12-CD-2210", serviceDate: "2026-04-02", serviceType: "Tire Rotation", vendor: "City Tyres", cost: 3200, nextServiceDate: "2026-07-02", notes: "Rotated 4 tyres" },
  { id: "M3", vehicle: "MH-12-EE-3319", serviceDate: "2026-06-01", serviceType: "Engine Repair", vendor: "Ganesh Garage", cost: 22000, nextServiceDate: "2026-07-15", notes: "Timing belt replaced" },
  { id: "M4", vehicle: "MH-12-FF-4402", serviceDate: "2026-03-18", serviceType: "AC Service", vendor: "CoolCare", cost: 4500, nextServiceDate: "2026-06-18", notes: "Gas refill" },
  { id: "M5", vehicle: "MH-12-KK-9934", serviceDate: "2026-06-10", serviceType: "Brake Overhaul", vendor: "Kumar Motors", cost: 9500, nextServiceDate: "2026-07-25", notes: "New brake discs" },
  { id: "M6", vehicle: "MH-12-II-7712", serviceDate: "2026-05-05", serviceType: "Battery Change", vendor: "Amaron Store", cost: 8200, nextServiceDate: "2026-08-05", notes: "Installed new battery" },
];

export const transportFees: TransportFee[] = [
  { id: "TF1", student: "Aarav Sharma", route: "Route A - North", monthlyFee: 1800, paid: 10800, pending: 0, status: "Paid" },
  { id: "TF2", student: "Kiara Patel", route: "Route B - South", monthlyFee: 2000, paid: 8000, pending: 4000, status: "Partial" },
  { id: "TF3", student: "Vivaan Rao", route: "Route C - East", monthlyFee: 1500, paid: 0, pending: 9000, status: "Due" },
  { id: "TF4", student: "Ishaan Verma", route: "Route D - West", monthlyFee: 1900, paid: 11400, pending: 0, status: "Paid" },
  { id: "TF5", student: "Anaya Iyer", route: "Route A - North", monthlyFee: 1800, paid: 5400, pending: 5400, status: "Partial" },
  { id: "TF6", student: "Rohan Menon", route: "Route G - Ring", monthlyFee: 2200, paid: 13200, pending: 0, status: "Paid" },
  { id: "TF7", student: "Sara Khan", route: "Route F - Suburb", monthlyFee: 1700, paid: 0, pending: 10200, status: "Due" },
  { id: "TF8", student: "Diya Nair", route: "Route H - Bypass", monthlyFee: 1900, paid: 7600, pending: 3800, status: "Partial" },
  { id: "TF9", student: "Arjun Reddy", route: "Route B - South", monthlyFee: 2000, paid: 12000, pending: 0, status: "Paid" },
  { id: "TF10", student: "Meera Shah", route: "Route D - West", monthlyFee: 1900, paid: 11400, pending: 0, status: "Paid" },
];