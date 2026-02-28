/**
 * IIT Jodhpur email pattern detection.
 *
 * Students:  b24ci1010@iitj.ac.in  (b/m/p + 2-digit year + dept code + roll)
 * Dept societies: bds@ee.iitj.ac.in, bds@cie.iitj.ac.in
 * Clubs: shutterbugs@iitj.ac.in, robotics@iitj.ac.in
 * Professors: firstname.lastname@iitj.ac.in  or  name@iitj.ac.in
 */

export type DetectedRole = "STUDENT" | "PROFESSOR" | "CLUB_ADMIN" | "DEPARTMENT_OFFICER" | null;

const IITJ_DOMAIN = "iitj.ac.in";

const STUDENT_RE = /^[bmp]\d{2}[a-z]{2,4}\d{3,5}@iitj\.ac\.in$/i;

export interface EmailDetection {
  role: DetectedRole;
  rollNumber: string | null;
  clubSlugHint: string | null;
  deptSlugHint: string | null;
  isIITJ: boolean;
}

export function detectRoleFromEmail(email: string): EmailDetection {
  const lower = email.toLowerCase().trim();
  const result: EmailDetection = {
    role: null,
    rollNumber: null,
    clubSlugHint: null,
    deptSlugHint: null,
    isIITJ: false,
  };

  if (!lower.endsWith(`@${IITJ_DOMAIN}`)) {
    return result;
  }

  result.isIITJ = true;
  const local = lower.replace(`@${IITJ_DOMAIN}`, "");

  if (STUDENT_RE.test(lower)) {
    result.role = "STUDENT";
    result.rollNumber = local.toUpperCase();
    return result;
  }
  return result;
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case "STUDENT": return "Student";
    case "PROFESSOR": return "Professor / Faculty";
    case "CLUB_ADMIN": return "Club Admin";
    case "CLUB_MANAGER": return "Club Manager";
    case "DEPARTMENT_OFFICER": return "Department Officer";
    default: return role;
  }
}
