import type { MeetingAttendanceRow } from "@/lib/database.types";

export interface QuorumResult {
  required: number;
  counted: number;
  present: number;
  virtualPresent: number;
  met: boolean;
}

/**
 * Rule 26 quorum, computed live from attendance.
 *   required = ceil(activeEcCount * quorum_fraction)
 *   counted  = present in person; virtual counts too only when
 *              compliance_config.virtual_counts_for_quorum is true.
 */
export function computeQuorum(
  attendance: Pick<MeetingAttendanceRow, "status" | "attendance_mode">[],
  activeEcCount: number,
  opts: { quorumFraction: number; virtualCountsForQuorum: boolean },
): QuorumResult {
  const present = attendance.filter((a) => a.status === "present");
  const inPerson = present.filter((a) => a.attendance_mode === "in_person").length;
  const virtualPresent = present.length - inPerson;
  const counted = opts.virtualCountsForQuorum ? present.length : inPerson;
  const required = Math.max(
    1,
    Math.ceil(activeEcCount * opts.quorumFraction),
  );
  return {
    required,
    counted,
    present: present.length,
    virtualPresent,
    met: counted >= required,
  };
}
