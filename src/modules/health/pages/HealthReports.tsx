import { FileText, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { healthRecords, vaccinations, medicalVisits, healthAlerts, bmiRecords } from "../data/mockData";

type ReportType = "student" | "class" | "school";

export function HealthReportsPage() {
  const [type, setType] = useState<ReportType>("student");
  const [student, setStudent] = useState(healthRecords[0].student);
  const [className, setClassName] = useState(bmiRecords[0].className);
  const [generated, setGenerated] = useState(false);

  const studentRecord = healthRecords.find((r) => r.student === student);
  const studentVax = vaccinations.filter((v) => v.student === student);
  const studentVisits = medicalVisits.filter((v) => v.student === student);
  const studentBmi = bmiRecords.find((b) => b.student === student);
  const classBmi = bmiRecords.filter((b) => b.className === className);
  const classes = Array.from(new Set(bmiRecords.map((b) => b.className)));

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Health Reports" description="Generate student, class and school-wide health reports." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={healthRecords.length} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Vaccination Records" value={vaccinations.length} tone="info" icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Medical Visits" value={medicalVisits.length} tone="warning" icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Active Alerts" value={healthAlerts.filter((a) => a.severity !== "Resolved").length} tone="danger" icon={<FileText className="h-5 w-5" />} />
      </div>

      <Card className="mt-6 rounded-2xl">
        <CardHeader><CardTitle>Generate Report</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Report Type</label>
            <Select value={type} onValueChange={(v) => { setType(v as ReportType); setGenerated(false); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student Report</SelectItem>
                <SelectItem value="class">Class Report</SelectItem>
                <SelectItem value="school">School Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "student" && (
            <div className="min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Student</label>
              <Select value={student} onValueChange={(v) => { setStudent(v); setGenerated(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {healthRecords.map((r) => <SelectItem key={r.id} value={r.student}>{r.student}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "class" && (
            <div className="min-w-[180px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Class</label>
              <Select value={className} onValueChange={(v) => { setClassName(v); setGenerated(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => setGenerated(true)}><FileText className="mr-2 h-4 w-4" />Generate</Button>
          {generated && <Button variant="outline"><Download className="mr-2 h-4 w-4" />Download PDF</Button>}
        </CardContent>
      </Card>

      {generated && (
        <Card className="mt-6 rounded-2xl">
          <CardHeader>
            <CardTitle>
              {type === "student" && `Student Report — ${student}`}
              {type === "class" && `Class Report — ${className}`}
              {type === "school" && "School-wide Health Report"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {type === "student" && studentRecord && (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><span className="text-muted-foreground">Admission No:</span> <span className="font-mono">{studentRecord.admissionNumber}</span></div>
                  <div><span className="text-muted-foreground">Blood Group:</span> {studentRecord.bloodGroup}</div>
                  <div><span className="text-muted-foreground">Height:</span> {studentRecord.heightCm} cm</div>
                  <div><span className="text-muted-foreground">Weight:</span> {studentRecord.weightKg} kg</div>
                  <div><span className="text-muted-foreground">Doctor:</span> {studentRecord.doctor}</div>
                  <div><span className="text-muted-foreground">Emergency:</span> {studentRecord.emergencyContact}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Allergies:</span> {studentRecord.allergies}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Conditions:</span> {studentRecord.medicalConditions}</div>
                </div>
                <div>
                  <div className="mb-1 font-medium">Vaccinations ({studentVax.length})</div>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {studentVax.map((v) => <li key={v.id}>{v.vaccine} · {v.dose} · {v.vaccinationDate}</li>)}
                    {studentVax.length === 0 && <li>No records</li>}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 font-medium">Medical Visits ({studentVisits.length})</div>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {studentVisits.map((v) => <li key={v.id}>{v.visitDate} · {v.complaint} → {v.diagnosis}</li>)}
                    {studentVisits.length === 0 && <li>No visits recorded</li>}
                  </ul>
                </div>
                {studentBmi && (
                  <div>
                    <div className="mb-1 font-medium">BMI</div>
                    <div className="text-muted-foreground">Current BMI {studentBmi.bmi} ({studentBmi.status})</div>
                  </div>
                )}
              </>
            )}
            {type === "class" && (
              <div>
                <div className="mb-2 font-medium">BMI Summary — {className}</div>
                <ul className="space-y-1">
                  {classBmi.map((b) => (
                    <li key={b.id} className="flex justify-between border-b py-1">
                      <span>{b.student}</span>
                      <span className="text-muted-foreground">BMI {b.bmi} · {b.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {type === "school" && (
              <div className="grid gap-3 md:grid-cols-2">
                <div><span className="text-muted-foreground">Total Students:</span> {healthRecords.length}</div>
                <div><span className="text-muted-foreground">Total Vaccinations:</span> {vaccinations.length}</div>
                <div><span className="text-muted-foreground">Total Medical Visits:</span> {medicalVisits.length}</div>
                <div><span className="text-muted-foreground">Active Alerts:</span> {healthAlerts.filter((a) => a.severity !== "Resolved").length}</div>
                <div><span className="text-muted-foreground">Normal BMI:</span> {bmiRecords.filter((b) => b.status === "Normal").length}</div>
                <div><span className="text-muted-foreground">Obese:</span> {bmiRecords.filter((b) => b.status === "Obese").length}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
