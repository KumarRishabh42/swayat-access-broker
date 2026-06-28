import { CapabilityScope, SubsetCheckResult } from "./types.ts";

// Normalize an action/service/resource token so trivial wording differences
// (case, plural/singular, list-vs-read synonyms) don't cause false denials.
// The deterministic gate stays strict on MEANING, lenient on SPELLING.
function norm(token: string): string {
  let t = token.toLowerCase().trim().replace(/[\s-]+/g, "_");
  t = t.replace(/s$/, ""); // invoices → invoice
  t = t.replace(/^list_/, "read_"); // list_invoice → read_invoice
  t = t.replace(/^get_/, "read_"); // get_invoice → read_invoice
  return t;
}

function actionAllowed(action: string, ceilingActions: string[]): boolean {
  const a = norm(action);
  return ceilingActions.some((c) => norm(c) === a);
}

function resourceAllowed(resource: string, ceilingResources?: string[]): boolean {
  if (!ceilingResources || ceilingResources.length === 0) return true;
  const r = norm(resource);
  return ceilingResources.some((c) => norm(c) === r);
}

export function isSubset(
  proposed: CapabilityScope[],
  personaCeiling: CapabilityScope[]
): SubsetCheckResult {
  const approved: CapabilityScope[] = [];
  const denied: CapabilityScope[] = [];

  for (const p of proposed) {
    const ceiling = personaCeiling.find((c) => norm(c.service) === norm(p.service));

    if (!ceiling) {
      denied.push(p);
      continue;
    }

    const actionsAllowed = p.actions.every((a) =>
      actionAllowed(a, ceiling.actions)
    );

    const resourcesAllowed =
      !p.resources ||
      p.resources.every((r) => resourceAllowed(r, ceiling.resources));

    if (actionsAllowed && resourcesAllowed) {
      approved.push(p);
    } else {
      denied.push(p);
    }
  }

  return {
    approved,
    denied,
    isAllowed: denied.length === 0,
  };
}

export function generateReasoning(
  proposed: CapabilityScope[],
  result: SubsetCheckResult,
  personaCeiling: CapabilityScope[]
): string {
  if (result.isAllowed) {
    return `All requested capabilities are within the persona's ceiling: ${proposed
      .map((c) => `${c.service}:${c.actions.join(",")}`)
      .join("; ")}`;
  }

  const deniedReasons = result.denied.map((d) => {
    const ceiling = personaCeiling.find((c) => c.service === d.service);
    if (!ceiling) {
      return `${d.service} not in persona's allowed services`;
    }
    const deniedActions = d.actions.filter(
      (a) => !ceiling.actions.includes(a)
    );
    if (deniedActions.length > 0) {
      return `${d.service}: actions ${deniedActions.join(", ")} not allowed (allowed: ${ceiling.actions.join(", ")})`;
    }
    return `${d.service}: resource restrictions violated`;
  });

  // Partial: some granted, some denied — describe both sides.
  if (result.approved.length > 0) {
    const granted = result.approved
      .map((c) => `${c.service}:${c.actions.join(",")}`)
      .join("; ");
    return `Partially granted. ✓ Allowed: ${granted}. ✗ Blocked: ${deniedReasons.join("; ")}`;
  }

  return `Denied capabilities: ${deniedReasons.join("; ")}`;
}
