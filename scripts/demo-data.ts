import { mkdir, writeFile } from "node:fs/promises";
import { courses, type RecordData } from "../src/lib/domain";
import { evaluate, type Policy } from "../src/policy/evaluate";

export function demoData(now = new Date()) {
  const date = (days: number) => new Date(+now + days * 86400000).toISOString();
  const id = (group: number, n: number) =>
    `de${group.toString(16).padStart(6, "0")}${n.toString(16).padStart(16, "0")}`;
  const rows: Record<string, RecordData[]> = {};
  const add = (slug: string, data: RecordData) =>
    (rows[slug] ||= []).push({
      ...data,
      createdAt: date(-20),
      updatedAt: date(0),
    });
  const policy: Policy = {
    approved: true,
    bMin: 600000,
    aMin: 1000000,
    plusMin: 1600000,
    selectionBasis: "accepted",
    fSwitch: "category",
    offCampus: "review",
    cSwitch: "higher",
    sameCompany: "review",
  };
  add("policy-versions", {
    id: id(1, 1),
    name: "DEMO ONLY · Hackathon policy",
    ...policy,
    approvalReference: "DEMO-SIMULATION-NOT-INSTITUTIONAL-APPROVAL",
    notes: "Fictional simulation settings; not official institutional policy.",
  });
  add("placement-sessions", {
    id: id(2, 1),
    name: "DEMO · Hackathon placement season",
    startsAt: date(-90),
    endsAt: date(180),
    policy: id(1, 1),
  });
  const names = [
    "Aarav Mehta",
    "Diya Rao",
    "Kabir Shah",
    "Ananya Sen",
    "Ishaan Nair",
    "Meera Joshi",
    "Rohan Das",
    "Sara Kapoor",
    "Vivaan Jain",
    "Aditi Bose",
    "Arjun Menon",
    "Tara Iyer",
    "Neel Verma",
    "Kavya Sethi",
    "Reyansh Roy",
    "Zoya Khan",
    "Dev Patel",
    "Myra Kulkarni",
    "Advik Sinha",
    "Siya Bhat",
    "Yash Arora",
    "Nisha Paul",
    "Veer Saxena",
    "Avni Desai",
    "Om Malhotra",
    "Riya Dutta",
    "Kunal Vyas",
    "Ira Thomas",
    "Pranav Sood",
    "Leela Varma",
  ];
  names.forEach((name, i) => {
    const student = id(3, i + 1);
    add("students", {
      id: student,
      placementID: `DEMO-2027-${String(i + 1).padStart(3, "0")}`,
      name,
      email: `student${i + 1}@placement-demo.example`,
      mobile: "",
      course: courses[i % courses.length],
      batch: i % 3 ? "2025–2027" : "2023–2027",
      archived: false,
    });
    add("registrations", {
      id: id(4, i + 1),
      student,
      session: id(2, 1),
      key: `${student}:${id(2, 1)}`,
      status: i === 29 ? "not-registered" : "registered",
      eligibility: i === 28 ? "ineligible" : i >= 25 ? "pending" : "eligible",
      cgpa: i === 28 ? 5.8 : Number((7.1 + (i % 9) * 0.3).toFixed(1)),
      backlogs: i === 28 ? 2 : 0,
      revision: 0,
      notes: "Synthetic hackathon record.",
    });
  });
  const companyNames = [
    "Demo CipherNest",
    "Demo VectorLeaf",
    "Demo SentinelArc",
    "Demo CloudHarbor",
    "Demo TraceForge",
    "Demo QuantumVale",
    "Demo DataLantern",
    "Demo SecureSprout",
  ];
  companyNames.forEach((name, i) =>
    add("companies", {
      id: id(5, i + 1),
      name,
      industry: [
        "Cybersecurity",
        "AI & Analytics",
        "Digital Forensics",
        "Cloud Engineering",
      ][i % 4],
      website: `https://company${i + 1}.example`,
    }),
  );
  const specs: [string, "I" | "F" | "IF", number | null, number][] = [
    ["Security Analyst · Category B", "F", 800000, 0],
    ["ML Engineer · Category A", "F", 1200000, 0],
    ["Threat Researcher · Category A+", "F", 1800000, 0],
    ["Cloud Intern", "I", null, 25000],
    ["Forensics Internship + PPO", "IF", 1000000, 30000],
    ["Platform Internship + confirmed FTE", "IF", 1400000, 35000],
    ["Data Analyst · Category C", "F", 500000, 0],
    ["Security Engineer · CTC awaiting confirmation", "F", null, 0],
    ["Junior Analyst · Category B", "F", 900000, 0],
    ["Archived Recruitment Round", "F", 700000, 0],
  ];
  specs.forEach(([title, type, ctc, stipend], i) =>
    add("drives", {
      id: id(6, i + 1),
      title: `DEMO · ${title}`,
      company: id(5, (i % 8) + 1),
      session: id(2, 1),
      type,
      status: i === 9 ? "closed" : "open",
      ctc,
      stipend,
      stipendPeriod: "monthly",
      courses: [...courses],
      minCGPA: 6.5,
      maxBacklogs: 0,
      deadline: date(i === 9 ? -3 : 30),
      notes: "Fictional demonstration opportunity.",
    }),
  );
  const decision = (studentIndex: number, driveIndex: number) => {
    const reg = rows.registrations[studentIndex];
    const drive = rows.drives[driveIndex];
    return evaluate({
      registered: reg.status === "registered",
      eligibility: String(reg.eligibility),
      companyEligible: Number(reg.cgpa) >= 6.5 && reg.backlogs === 0,
      driveOpen: drive.status === "open",
      offers: [],
      target: {
        company: String(drive.company),
        type: specs[driveIndex][1],
        ctc: specs[driveIndex][2],
      },
      policy,
      sanctioned: false,
    });
  };
  let appIndex = 0;
  function application(
    studentIndex: number,
    driveIndex: number,
    status: string,
  ) {
    const s = rows.students[studentIndex],
      d = rows.drives[driveIndex];
    const result = decision(studentIndex, driveIndex);
    add("applications", {
      id: id(7, ++appIndex),
      student: s.id,
      drive: d.id,
      company: d.company,
      session: id(2, 1),
      key: `${s.id}:${d.id}`,
      status:
        result.outcome === "MANUAL_REVIEW"
          ? "review"
          : result.outcome === "BLOCK"
            ? "rejected"
            : status,
      decision: result,
      policy: id(1, 1),
      candidateName: s.name,
      candidateCourse: s.course,
    });
  }
  const offerDrives = [0, 1, 2, 3, 4, 5, 6, 0, 1, 3, 4, 5, 0, 1, 6];
  offerDrives.forEach((driveIndex, i) => {
    application(i, driveIndex, "selected");
    const drive = rows.drives[driveIndex],
      student = id(3, i + 1);
    const acceptance =
      i < 10
        ? "accepted"
        : i < 12
          ? "pending"
          : i === 12
            ? "declined"
            : i === 13
              ? "expired"
              : "pending";
    add("offers", {
      id: id(8, i + 1),
      student,
      session: id(2, 1),
      company: drive.company,
      drive: drive.id,
      campusKey: `${student}:${drive.id}`,
      source: "campus",
      type: drive.type,
      ctc: drive.ctc,
      stipend: drive.stipend,
      stipendPeriod: "monthly",
      combinedOutcome: driveIndex === 5 ? "fte" : "ppo",
      issuedAt: date(i === 10 || i === 11 ? -0.1 : -10),
      deadline: date(i === 10 || i === 11 ? 0.9 : -9),
      acceptance,
      ppo: driveIndex === 4 ? "pending" : "not-applicable",
      joining: i < 4 ? "joined" : "pending",
      noc:
        drive.type === "F" ? "not-applicable" : i < 7 ? "approved" : "pending",
      revoked: false,
      revision: 0,
      decision: decision(i, driveIndex),
      notes: "Fictional offer; timestamps illustrate lifecycle states.",
    });
  });
  for (let i = 15; i < 30; i++)
    application(
      i,
      i === 25 ? 7 : i % 7,
      ["submitted", "shortlisted", "selected", "rejected"][i % 4],
    );
  for (let i = 0; i < 4; i++)
    add("activities", {
      id: id(9, i + 1),
      title: `DEMO · ${["Security briefing", "ML aptitude round", "Threat research interview", "Cloud presentation"][i]}`,
      drive: id(6, i + 1),
      startsAt: date(-4 + i),
      type: ["talk", "test", "interview", "presentation"][i],
    });
  for (let i = 0; i < 20; i++) {
    const student = id(3, i + 1),
      activity = id(9, (i % 4) + 1);
    add("attendance", {
      id: id(10, i + 1),
      student,
      activity,
      key: `${student}:${activity}`,
      status:
        i === 16 || i === 17 ? "absent" : i === 18 ? "excused" : "present",
      notes: "Synthetic attendance record.",
    });
  }
  [16, 17].forEach((i, n) =>
    add("review-cases", {
      id: id(11, n + 1),
      student: id(3, i + 1),
      session: id(2, 1),
      drive: id(6, (i % 4) + 1),
      kind: "absence",
      status: "pending",
      notes: "Demo absence requires human review. No automatic sanction.",
      ruleCodes: [],
      excludedDrives: [],
    }),
  );
  add("review-cases", {
    id: id(11, 3),
    student: id(3, 26),
    session: id(2, 1),
    drive: id(6, 8),
    kind: "policy-conflict",
    status: "pending",
    notes:
      "Verify academics and obtain annual CTC before authorizing this application.",
    ruleCodes: ["VERIFICATION_PENDING", "CTC_UNKNOWN"],
    excludedDrives: [],
  });
  // Dependency order is also the Compass import order.
  return Object.fromEntries(
    [
      "policy-versions",
      "placement-sessions",
      "students",
      "companies",
      "drives",
      "registrations",
      "applications",
      "offers",
      "activities",
      "attendance",
      "review-cases",
    ].map((slug) => [slug, rows[slug]]),
  );
}

export const relationshipFields = new Set([
  "student",
  "session",
  "company",
  "drive",
  "activity",
  "policy",
]);
export async function exportDemo() {
  const data = demoData();
  await mkdir("demo-data/collections", { recursive: true });
  for (const [slug, rows] of Object.entries(data)) {
    const documents = rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => {
          if (key === "id") return ["_id", { $oid: value }];
          if (relationshipFields.has(key)) return [key, { $oid: value }];
          if (
            typeof value === "string" &&
            /^(createdAt|updatedAt|startsAt|endsAt|deadline|issuedAt|expiresAt)$/.test(
              key,
            )
          )
            return [key, { $date: value }];
          return [key, value];
        }),
      ),
    );
    await writeFile(
      `demo-data/collections/${slug}.json`,
      JSON.stringify(documents, null, 2) + "\n",
    );
  }
  const headers = ["placementID", "name", "email", "mobile", "course", "batch"];
  const csv = [headers, ...data.students.map((s) => headers.map((h) => s[h]))]
    .map((row) =>
      row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
  await writeFile("demo-data/students.csv", csv + "\r\n");
  await writeFile(
    "demo-data/manifest.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        fictional: true,
        collections: Object.fromEntries(
          Object.entries(data).map(([slug, rows]) => [slug, rows.length]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Generated fictional dataset in demo-data/.");
}
