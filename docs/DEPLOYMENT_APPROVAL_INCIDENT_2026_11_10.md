# Production deployment approval investigation — 10 November 2026

**Status: open. Approval-path failure isolated; underlying cancellation reason
and repair are not yet established.** This document does not deploy code,
change permissions or claim the incident is closed.

## Impact and observed boundary

PR [#536](https://github.com/ttmodupe-hash/luqi-ai/pull/536) fixes first-answer
business guidance. It is merged, with 52 successful checks and one expected
skip on head `b391a2ad6db004cd8271f5b0f8deb2f202503ca3`. Its tested tree
`82622648e41351676d3678496c20da81d8ae6e74` matches merged commit
`3b431ad880d6dce0d47a8419998e4c828e503fb1`. The owner has explicitly approved
deployment repeatedly. Do not describe this as missing user intent.

The supported deployment action returned:

```json
{
  "content": [{
    "type": "text",
    "text": "Cancelled — the user did not approve this action. No changes were made."
  }],
  "structuredContent": {"error_code": "INVALID_ARGUMENT"},
  "isError": true
}
```

After that result, the patch remained STAGED and no new production web
deployment existed. The observed failure is before build creation, in the
approval/commit interaction. There is no failed build to repair for this attempt.
The exposed result contains no approval request ID, decision provenance,
reviewer reason, timeout information or provider HTTP status. Its wording alone
does not establish which component cancelled, or that the owner clicked Deny.

## Exact read-back evidence

These are dated observations, not values to assume on a later release:

| Observation | Verified value |
|---|---|
| Project | `kind-spontaneity`, `9f627cb8-3136-4b30-89d2-32ca648a1e5f` |
| Environment | production, `1e192ef3-1fa6-4684-81fc-60165c7b0e22` |
| Service | web, `a9b293e0-1966-43be-80ef-3dd27acc6ab7` |
| Live successful deployment | `e0677d47-d940-41bc-ae76-a0e0b81ce52c` |
| Live source pin | `c6c398e0eea121af6f2b1d1954ce0edae7d43562` |
| Pending patch | `2d0625a7-15b9-49aa-9cd1-aba921dd8486`, STAGED |
| Only pending change | web `source.commitSha`: `c6c398e...` → `3b431ad...` |
| Destructive patch flag | false; no variable, networking, volume or database changes |
| Web state | Online, one running replica, no recent failed/crashed deployment |
| MySQL state | Online, one running replica |
| Authenticated Railway identity | Same user ID as the creator of the prior successful releases; registered, not an ownerless agent |
| ChatGPT Railway app permission | `Use my default`; global `Allow low-risk actions` |
| Active task approval routing | Granular MCP elicitation enabled; reviewer configured as `auto_review` |

`get_app_permissions` with the noncanonical `app-...` name initially returned
`not_installed`. Querying `Railway` correctly found its settings, and plugin
discovery confirmed installed/enabled. Do not use the failed identifier lookup
as evidence that Railway needs reinstalling.

The remote MCP schema exposes `accept_deploy(environmentId, commitMessage?)`;
it exposes no `confirm`, approval token or review-trace parameter. Do not invent
one. The local CLI MCP's documented confirmation mechanism is a different tool
surface and is not permission to bypass this cancellation.

The service remains pinned to the live commit. A merge on main is therefore not
evidence that production advanced. Do not remove the pin merely to trigger an
automatic deployment after the commit action was cancelled.

## Historical comparison

Earlier conversation records and current platform history distinguish three
different symptoms:

- On 28 October, overlapping Railway status events cancelled GitHub
  post-deployment probe jobs. Rerunning probes resolved that observation issue.
  This was not the present pre-build approval result.
- Records around 7–9 November identified a green Railway status from another
  environment while production remained on an older revision. Production must
  be checked by its exact IDs and public SHA.
- On 9 November, a stale staged source `b8c38c7b...` was replaced with the
  reviewed merged `21e98e96...`, followed by deployment `6fd65ddc...`.
  Current staging has been compared with main and is not that stale-target case.

Railway lists later successful releases on the same production web service,
including the 10 November account fix (`da9bac24...`) and the current
`e0677d47...` deployment. The available deployment metadata does not identify
their MCP approval route. Historical summaries cannot prove a permission change
or the exact cause of those earlier cancellations.

## Confirmed facts and unresolved hypotheses

The exact target, reviewed source, staged scope and running application have
been checked. An account identity switch and a mismatched staged main commit
were not found. Successful read access does not prove that every write scope or
RBAC setting is unchanged.

Railway marks the deployment tool destructive at the protocol level even for
this non-destructive source patch. The task uses automatic approval review, and
the app inherits a low-risk default. Those facts explain why separate approval
handling exists; they do **not** prove that a particular policy denied this call.

The returned evidence cannot distinguish a policy rejection, missing or failed
approval acknowledgement, interrupted/noninteractive client interaction, or a
server/client integration defect. Do not pick one of these as a proven root
cause, blame the owner, or claim that changing to Allow all will fix it.

## Missing evidence and repair boundary

The next useful evidence is the approval event tied to this exact tool call:
request ID/time, selected connection, advertised annotation, decision source,
decision/reason, cancellation provenance, and whether an acceptance reached
Railway before the commit operation. Record only non-secret metadata. Never
include OAuth tokens, environment values, private request logs or customer data.

The available connectors expose app permission settings and Railway deployment
state, but no approval-event audit or reviewer decision retrieval. Local config
contains no Railway MCP definition to repair. The private Railway dashboard
showed Login/404 in this browser; no authenticated audit view was available.
No support message has been sent and no permission has been changed.

If platform maintainers inspect this incident, ask them to distinguish an actual
user decline from a failed approval interaction and expose that provenance in
the result. This is an investigation request, not a claim about which provider
is responsible. A generic INVALID_ARGUMENT cancellation is insufficient to
choose a reliable remediation.

## Recurrence handling and closure

The root `AGENTS.md` now requires historical comparison, canonical scope and
staged-patch reads, preserved authorization and accurate cancellation attribution.
It prohibits blind retries and alternate write routes after denial. This fixes
the agent's handling and handoff error; it cannot repair a hidden platform
approval mechanism by itself.

Before another deployment, reread all state; other work may advance main. A
valid new attempt must use the ordinary supported approval path. To close the
deployment portion, retain a commit acknowledgement, a new terminal SUCCESS
deployment for the intended exact commit, and matching public `/v1/release` plus
health/readiness observations. To close the recurring incident itself, identify
the approval failure's actual cause, apply the corresponding repair, and verify
the corrected flow. An unexplained later success alone does not establish a
permanent fix.

Primary references inspected:

- [Railway MCP confirmation and protocol annotations](https://docs.railway.com/ai/mcp-server#available-mcp-tools)
- [OpenAI approval review routing and fail-closed behavior](https://learn.chatgpt.com/docs/agent-approvals-security)
- [MCP accept, decline and cancel distinctions](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/client/elicitation.mdx)
