/**
 * Server-computed queue position/wait estimate — never client-supplied
 * (docs/api.md section 4 principle 4). `minutesPerPerson` is an operational
 * heuristic, not a measured or confirmed clinic throughput figure (unlike the
 * clinical scoring formulas in docs/api.md section 45, which are UNKNOWN and
 * intentionally unimplemented, this is a low-stakes ops estimate safe to
 * default and revise later without a Product/Clinical decision gate).
 */
const MINUTES_PER_PERSON_AHEAD = 8;

export function estimateQueuePosition(peopleAhead: number): {
  peopleAhead: number;
  estimatedWaitMinutes: number;
} {
  return { peopleAhead, estimatedWaitMinutes: peopleAhead * MINUTES_PER_PERSON_AHEAD };
}
