import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { Baby, Cake, Phone, Mail, MapPin, User } from "lucide-react";
import { useParent } from "@/lib/parentContext";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { useT } from "@/lib/i18n";

import { useClassAssignments } from "@/lib/classAssignmentContext";

export const Route = createFileRoute("/parent/child")({ component: ParentChild });

function ParentChild() {
  const { activeChild: CHILD, household } = useParent();
  const { t } = useT();
  const { getClassTeacher, getSubjectTeachers } = useClassAssignments();

  const classTeacher = getClassTeacher(CHILD.className, CHILD.section || "A")?.teacherName || "Mrs. Priya";
  const subjectTeachers = getSubjectTeachers(CHILD.className, CHILD.section || "A");

  const firstName = CHILD.name.split(" ")[0];
  return (
    <div>
      <PageHeader title={t("child.title")} subtitle={t("child.subtitle", { name: firstName })} action={<ChildSwitcher />} />
      <div className="grid lg:grid-cols-3 gap-4">
        <SectionCard title={t("child.profile")}>
          <div className="text-center">
            <img src={CHILD.avatar} className="h-24 w-24 mx-auto rounded-3xl bg-pink-50 shadow" alt="" />
            <div className="mt-3 font-bold text-lg">{CHILD.name}</div>
            <div className="text-xs text-muted-foreground">{t("child.studentId")} · {CHILD.id}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge className="bg-pink-100 text-pink-700">{t(`className.${CHILD.className}`, CHILD.className)}</Badge>
              <Badge variant="secondary">{t(`gender.${CHILD.gender.toLowerCase()}`, CHILD.gender)}</Badge>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Baby className="h-4 w-4 text-pink-500" />{t("label.age")} {CHILD.age}</li>
            <li className="flex items-center gap-2"><Cake className="h-4 w-4 text-pink-500" />{t("child.birthday")}</li>
            <li className="flex items-center gap-2"><User className="h-4 w-4 text-pink-500" />Class Teacher: <b className="text-indigo-700">{classTeacher}</b></li>
          </ul>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Subject Teachers (Office Assigned)</div>
            <div className="space-y-1">
              {(subjectTeachers.length > 0
                ? subjectTeachers
                : [
                    { subject: "English", teacherName: "Mrs. Priya" },
                    { subject: "Mathematics", teacherName: "Mr. Rakesh" },
                  ]
              ).map((st, i) => (
                <div key={i} className="text-xs flex justify-between bg-white/70 p-1.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500">{st.subject}:</span>
                  <span className="font-semibold text-slate-800">{st.teacherName}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
        <SectionCard title={t("child.parent")} className="lg:col-span-2">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><User className="h-4 w-4 text-pink-500" />{household.primaryContact}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-pink-500" />{household.phone}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-pink-500" />{household.email}</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-pink-500" />{household.address}</li>
          </ul>
          <div className="mt-6">
            <div className="text-sm font-semibold mb-2">{t("child.emergency")}</div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-white/60 p-3">{household.fatherName} ({t("child.father")}) · {household.phone}</div>
              <div className="rounded-2xl bg-white/60 p-3">{household.motherName} ({t("child.mother")}) · {household.phone}</div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
