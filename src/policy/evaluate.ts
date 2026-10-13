export type OfferType = "I" | "F" | "IF";
export type Policy = {
  approved: boolean;
  bMin: number;
  aMin: number;
  plusMin: number;
  selectionBasis: "issued" | "accepted" | "review";
  fSwitch: "blocked" | "category" | "review";
  offCampus: "include" | "exclude" | "review";
  cSwitch: "higher" | "review";
  sameCompany: "allow" | "block" | "review";
};
export type OfferFact = {
  company: string;
  type: OfferType;
  ctc?: number | null;
  acceptance: string;
  source?: string;
  revoked?: boolean;
};
export type Decision = {
  outcome: "ALLOW" | "BLOCK" | "MANUAL_REVIEW";
  reasons: { code: string; message: string; kind: "block" | "review" }[];
};
export const proposedPolicy: Policy = {
  approved: false,
  bMin: 600000,
  aMin: 1000000,
  plusMin: 1600000,
  selectionBasis: "review",
  fSwitch: "review",
  offCampus: "review",
  cSwitch: "review",
  sameCompany: "review",
};
export function category(ctc: number, p: Policy) {
  return ctc >= p.plusMin ? 3 : ctc >= p.aMin ? 2 : ctc >= p.bMin ? 1 : 0;
}
export function evaluate(input: {
  registered: boolean;
  eligibility: string;
  companyEligible: boolean | null;
  driveOpen: boolean;
  offers: OfferFact[];
  target: { company: string; type: OfferType; ctc?: number | null };
  policy: Policy;
  sanctioned: boolean;
  exceptions?: string[];
}): Decision {
  const reasons: Decision["reasons"] = [];
  const add = (
    code: string,
    message: string,
    kind: "block" | "review" = "block",
  ) => reasons.push({ code, message, kind });
  const { policy: p, target: t } = input;
  if (!input.registered)
    add("NOT_REGISTERED", "Active placement registration is required.");
  if (input.eligibility === "ineligible")
    add(
      "INELIGIBLE",
      "Eligibility verification marked this student ineligible.",
    );
  else if (input.eligibility !== "eligible")
    add(
      "VERIFICATION_PENDING",
      "Eligibility verification is pending.",
      "review",
    );
  if (!input.driveOpen)
    add("DRIVE_CLOSED", "The drive is not open for participation.");
  if (input.companyEligible === false)
    add("COMPANY_CRITERIA", "Company eligibility criteria are not met.");
  if (input.companyEligible === null)
    add(
      "CRITERIA_PENDING",
      "Required academic information is missing.",
      "review",
    );
  if (!p.approved)
    add(
      "POLICY_UNAPPROVED",
      "The placement policy has not been approved.",
      "review",
    );
  if (t.type !== "I" && t.ctc == null)
    add(
      "CTC_UNKNOWN",
      "Confirm annual CTC before authorizing this opportunity.",
      "review",
    );
  if (input.sanctioned)
    add("EXCLUDED_DRIVE", "An approved attendance review excludes this drive.");
  let offers = input.offers.filter((o) => !o.revoked);
  if (p.offCampus === "exclude")
    offers = offers.filter((o) => o.source !== "off-campus");
  if (p.offCampus === "review" && offers.some((o) => o.source === "off-campus"))
    add(
      "OFF_CAMPUS_REVIEW",
      "Off-campus offer applicability needs review.",
      "review",
    );
  if (p.selectionBasis === "accepted")
    offers = offers.filter((o) => o.acceptance === "accepted");
  if (p.selectionBasis === "review" && offers.length)
    add(
      "SELECTION_BASIS",
      "The selection event that restricts participation is unresolved.",
      "review",
    );
  for (const o of offers) {
    if (o.type === "IF") {
      if (o.company !== t.company || p.sameCompany === "block")
        add(
          "COMBINED_OFFER",
          "An internship + FTE/PPO selection restricts further participation.",
        );
      else if (p.sameCompany === "review")
        add(
          "SAME_COMPANY",
          "Further participation at the same company needs review.",
          "review",
        );
    }
    if (o.type === "I" && t.type === "I")
      add(
        "INTERNSHIP_REPEAT",
        "A second internship-only role is not permitted.",
      );
    if (o.type === "F" && t.type === "F") {
      if (p.fSwitch === "blocked")
        add("FTE_REPEAT", "A second FTE-only role is not permitted.");
      if (p.fSwitch === "review")
        add(
          "FTE_SWITCH_CONFLICT",
          "FTE-only and salary-switching rules conflict; authority review is required.",
          "review",
        );
    }
    if (o.type === "I") continue;
    if (o.ctc == null) {
      add(
        "CTC_UNKNOWN",
        "Category-dependent switching needs confirmed annual CTC.",
        "review",
      );
      continue;
    }
    const oldCategory = category(o.ctc, p);
    if (oldCategory === 3) {
      add("A_PLUS_EXIT", "A+ selection ends further placement participation.");
      continue;
    }
    if (t.ctc == null) {
      add(
        "CTC_UNKNOWN",
        "Category-dependent switching needs confirmed annual CTC.",
        "review",
      );
      continue;
    }
    const newCategory = category(t.ctc, p);
    if (oldCategory === 2 && newCategory !== 3)
      add("A_TO_PLUS", "An A-category offer can switch only to A+.");
    if (oldCategory === 1 && t.ctc * 2 < o.ctc * 3)
      add(
        "B_MULTIPLIER",
        "The new CTC must be at least 1.5 times the current CTC.",
      );
    if (oldCategory === 0) {
      if (p.cSwitch === "review")
        add(
          "C_SWITCH_REVIEW",
          "C-category progression requires an approved interpretation.",
          "review",
        );
      else if (newCategory <= oldCategory)
        add("C_HIGHER_CATEGORY", "A higher category is required.");
    }
  }
  if (offers.filter((o) => o.type !== "I").length > 1)
    add(
      "MULTIPLE_OFFERS",
      "Multiple FTE offers require a baseline decision.",
      "review",
    );
  const nonOverridable = new Set([
    "NOT_REGISTERED",
    "INELIGIBLE",
    "VERIFICATION_PENDING",
    "DRIVE_CLOSED",
    "COMPANY_CRITERIA",
    "CRITERIA_PENDING",
    "POLICY_UNAPPROVED",
  ]);
  const unique = reasons
    .filter((r, i) => reasons.findIndex((x) => x.code === r.code) === i)
    .filter(
      (r) => nonOverridable.has(r.code) || !input.exceptions?.includes(r.code),
    );
  return {
    outcome: unique.some((r) => r.kind === "block")
      ? "BLOCK"
      : unique.length
        ? "MANUAL_REVIEW"
        : "ALLOW",
    reasons: unique,
  };
}
