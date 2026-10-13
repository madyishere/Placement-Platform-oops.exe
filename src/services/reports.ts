import { type Actor, type RecordData, idOf, salaryAllowed } from "@/lib/domain";
export function summarize(
  students: RecordData[],
  registrations: RecordData[],
  offers: RecordData[],
  user: Actor,
) {
  const hasFTE = (o: RecordData) =>
    o.type === "F" ||
    (o.type === "IF" && (o.combinedOutcome === "fte" || o.ppo === "accepted"));
  const registered = new Set(
    registrations
      .filter((r) => r.status === "registered")
      .map((r) => idOf(r.student)),
  );
  const eligible = new Set(
    registrations
      .filter((r) => r.status === "registered" && r.eligibility === "eligible")
      .map((r) => idOf(r.student)),
  );
  const ineligible = new Set(
    registrations
      .filter((r) => r.eligibility === "ineligible")
      .map((r) => idOf(r.student)),
  );
  const qualified = offers.filter(
    (o) => o.acceptance === "accepted" && !o.revoked,
  );
  const placed = new Set(qualified.map((o) => idOf(o.student)));
  const highest = new Map<string, number>();
  for (const o of qualified)
    if (hasFTE(o) && typeof o.ctc === "number")
      highest.set(
        idOf(o.student),
        Math.max(highest.get(idOf(o.student)) || 0, o.ctc),
      );
  const amounts = [...highest.values()].sort((a, b) => a - b);
  const canSalary =
    salaryAllowed(user) && (user.role !== "coordinator" || amounts.length >= 5);
  const average = amounts.length
    ? amounts.reduce((a, b) => a + b, 0) / amounts.length
    : null;
  const median = amounts.length
    ? (amounts[Math.floor((amounts.length - 1) / 2)] +
        amounts[Math.floor(amounts.length / 2)]) /
      2
    : null;
  let internships = 0,
    fte = 0,
    combined = 0;
  for (const id of placed) {
    const set = qualified.filter((o) => idOf(o.student) === id);
    const i = set.some((o) => o.type === "I" || o.type === "IF"),
      f = set.some(hasFTE);
    if (i && f) combined++;
    else if (f) fte++;
    else if (i) internships++;
  }
  return {
    registeredPlaced: [...registered].filter((id) => placed.has(id)).length,
    students: students.length,
    registered: registered.size,
    eligible: eligible.size,
    ineligible: ineligible.size,
    pendingVerification: registrations.filter(
      (r) => r.eligibility === "pending",
    ).length,
    placed: placed.size,
    unplaced: [...registered].filter((id) => !placed.has(id)).length,
    totalOffers: offers.length,
    internships,
    fte,
    combined,
    pendingAcceptance: offers.filter(
      (o) =>
        !o.revoked &&
        o.acceptance === "pending" &&
        Date.parse(String(o.deadline)) > Date.now(),
    ).length,
    overdue: offers.filter(
      (o) =>
        !o.revoked &&
        o.acceptance === "pending" &&
        Date.parse(String(o.deadline)) <= Date.now(),
    ).length,
    highest: canSalary && amounts.length ? amounts.at(-1)! : null,
    average: canSalary ? average : null,
    median: canSalary ? median : null,
    salarySample: canSalary ? amounts.length : null,
    unknownCTC: canSalary
      ? qualified.filter((o) => hasFTE(o) && o.ctc == null).length
      : null,
    courseOutcomes: [...new Set(students.map((s) => String(s.course)))].map(
      (course) => {
        const ids = students
          .filter((s) => s.course === course)
          .map((s) => s.id);
        return {
          course,
          registered: ids.filter((id) => registered.has(id)).length,
          placed: ids.filter((id) => registered.has(id) && placed.has(id))
            .length,
        };
      },
    ),
    batchOutcomes: [...new Set(students.map((s) => String(s.batch)))].map(
      (batch) => {
        const ids = students.filter((s) => s.batch === batch).map((s) => s.id);
        return {
          batch,
          registered: ids.filter((id) => registered.has(id)).length,
          placed: ids.filter((id) => registered.has(id) && placed.has(id))
            .length,
        };
      },
    ),
    companyOutcomes: [...new Set(offers.map((o) => idOf(o.company)))].map(
      (company) => ({
        company,
        offers: offers.filter((o) => idOf(o.company) === company).length,
        accepted: qualified.filter((o) => idOf(o.company) === company).length,
      }),
    ),
    stipendSummary: ["monthly", "weekly", "total"].map((period) => {
      const samples = qualified
        .filter(
          (o) =>
            o.type !== "F" &&
            o.stipendPeriod === period &&
            typeof o.stipend === "number",
        )
        .map((o) => Number(o.stipend));
      const visible =
        salaryAllowed(user) &&
        (user.role !== "coordinator" || samples.length >= 5);
      return {
        period,
        count: visible ? samples.length : null,
        average:
          visible && samples.length
            ? samples.reduce((sum, n) => sum + n, 0) / samples.length
            : null,
      };
    }),
    pendingJoining: qualified.filter((o) => o.joining === "pending").length,
    pendingNOC: offers.filter((o) => !o.revoked && o.noc === "pending").length,
    asOf: new Date().toISOString(),
  };
}
