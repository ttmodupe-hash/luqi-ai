# LUQI release work

Read `docs/RELEASE_VERIFICATION.md` and
`docs/DEPLOYMENT_APPROVAL_INCIDENT_2026_11_10.md` before production release work.
The incident is an open investigation, not evidence that deployment is repaired.

## Authorization and deployment evidence

- Preserve the user's explicit approval for the reviewed action. Do not ask for
  the same chat approval repeatedly. An approval in chat does not let an agent
  forge a separate protocol acknowledgement or override a denied action.
- Resolve the exact project, production environment, web service, current main
  commit, reviewed CI tree, live successful deployment and complete staged patch
  before a write. Other work can advance main; do not deploy an older candidate
  over a newer successful release or carry unrelated staged changes.
- Do not equate a green Railway badge with this production service. Preview and
  other environments can publish the same status context. Require matching
  project, environment, service and full commit SHA.
- Record the attempted operation and the actual result separately. Staged,
  triggered, BUILDING, SUCCESS and a verified public revision are distinct facts.
  Require terminal SUCCESS and matching `/v1/release` before reporting deployed.

## A cancelled or denied deployment

- A generic "the user did not approve" tool error is not proof that the person
  declined. Preserve the error and identify the observed failure boundary. Do
  not call it a build failure or an automatic-review rejection without evidence.
- Read the patch, deployment list and current service state after an ambiguous
  result. Compare with the last successful release and the historical incident.
  Inspect app permissions by the canonical name `Railway`; an unresolved plugin
  identifier can misleadingly return `not_installed`.
- App settings, protocol confirmation and automatic approval review are
  separate controls. A low-risk default alone does not establish why a specific
  action was cancelled. Request/decision IDs, provenance and the actual reason
  are needed to attribute a cancellation.
- Do not loop on the same deployment or ask the user to repeat "Approved" as a
  purported fix. Retry only with new authorization or evidence relevant to the
  blocker, using the supported approval flow and fresh scope reads. Do not use
  another write route, change permission settings, remove a source pin, or start
  another agent to get around a denial.
- Keep investigating read-only when blocked. Record confirmed facts, hypotheses
  and inaccessible evidence separately, plus the specific remaining repair.
  Do not report an unresolved platform issue as permanently fixed.

Keep budgets, provider switches, credentials, customer records and infrastructure
unchanged unless the corresponding change is expressly authorized. Source and
documentation fixes do not close unrelated recovery or commercial-launch gates.
