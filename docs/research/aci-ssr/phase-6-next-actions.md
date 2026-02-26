# Phase 6: Next Actions & Experiments

**Date**: 2026-02-26

---

## Immediate Next Steps (This Week)

### Experiment 1: Data Granularity Validation (2 hours)

**Goal**: Confirm ACI returns full upstream API responses, not summaries.

```bash
# 1. Sign up at platform.aci.dev
# 2. Get API key
# 3. Install SDK
pip install aci-sdk

# 4. Run test script
```

```python
import json
from aci import ACI

client = ACI(api_key="YOUR_KEY")

# Test: GitHub PRs (compare to what our github.tool.ts fetches)
result = client.functions.execute(
    function_name="GITHUB__LIST_PULL_REQUESTS",
    function_input={
        "owner": "beinglayman",
        "repo": "ProfessionalSide",
        "state": "all",
        "per_page": 5
    },
    linked_account_owner_id="test-user-1"
)
print(json.dumps(result, indent=2, default=str))

# Check: does it have title, body, user.login, created_at, head.ref,
#         requested_reviewers, additions, deletions?

# Test: Linear issues (new tool — what does it return?)
result = client.functions.execute(
    function_name="LINEAR__LIST_ISSUES",
    function_input={"first": 5},
    linked_account_owner_id="test-user-1"
)
print(json.dumps(result, indent=2, default=str))
```

**Pass criteria**:
- [ ] GitHub PRs: `title`, `body`, `user.login`, `created_at`, `head.ref`, `requested_reviewers` all present
- [ ] Linear issues: `identifier`, `title`, `description`, `assignee`, `state`, `createdAt` all present
- [ ] No truncation of body/description fields
- [ ] Pagination works (cursor or page parameter)

### Experiment 2: OAuth UX Check (1 hour)

**Goal**: See what the user experiences when connecting Linear via ACI.

```python
# Get authorization URL
auth_url = client.auth.get_authorization_url(
    app_name="LINEAR",
    linked_account_owner_id="test-user-1",
    scopes=["read"]
)
print(auth_url)
# Open in browser — what does the consent screen show?
# Does it say "ACI.dev" or can we customize?
```

**Pass criteria**:
- [ ] OAuth flow completes successfully
- [ ] Consent screen is acceptable (user understands what they're authorizing)
- [ ] Tokens stored on ACI side (subsequent API calls work without re-auth)

### Experiment 3: Latency Benchmark (30 min)

```python
import time

# Direct GitHub API call
start = time.time()
# ... use octokit or requests to call GitHub API directly
direct_time = time.time() - start

# ACI GitHub API call
start = time.time()
result = client.functions.execute("GITHUB__LIST_PULL_REQUESTS", {...}, "test-user-1")
aci_time = time.time() - start

print(f"Direct: {direct_time:.2f}s, ACI: {aci_time:.2f}s, Overhead: {aci_time - direct_time:.2f}s")
```

**Pass criteria**:
- [ ] ACI overhead < 500ms per call
- [ ] For batch sync (multiple pages), total overhead < 2x direct

---

## Decision Gate

After experiments, answer:

| Question | Answer | Action |
|----------|--------|--------|
| Data quality sufficient? | Yes → proceed | No → evaluate Nango or bespoke |
| OAuth UX acceptable? | Yes → proceed | No → self-host ACI for custom branding |
| Latency acceptable? | Yes → managed cloud | No → self-host for same-network calls |
| All three pass? | → Start Phase 1 (Linear) | Any fail → re-evaluate approach |

---

## Tool Expansion Roadmap (If Gate Passes)

```
Week 1-2: Phase 0 (Foundation) + Phase 1 (Linear)
  └── ACI client setup
  └── Linear adapter + signal extractor + context adapter
  └── Integration page UI for Linear
  └── End-to-end sync test

Week 3-4: Phase 2 (GitLab)
  └── GitLab adapter (MRs, issues, commits)
  └── GitLab ref patterns in ref-extractor
  └── Cross-platform clustering test (GitLab ↔ GitHub)

Week 5-6: Phase 3 (Notion + Azure DevOps)
  └── Notion adapter (page edits as activities)
  └── Azure DevOps adapter (work items, PRs, builds)
  └── AB#123 ref pattern

Week 7-8: Phase 4 (Asana + Shortcut)
  └── Lower priority tools
  └── Broader PM tool coverage

Week 9+: Evaluate & Iterate
  └── User feedback on new tools
  └── Clustering quality review
  └── Career story quality with expanded data
  └── Consider migrating existing tools to ACI (only if proven)
```

---

## Backlog: Future Considerations

### If ACI Proves Valuable

1. **Migrate fetch-only tools to ACI** — Slack, Outlook, Teams, Figma, Zoom, OneNote currently have fetchers but no transformers. Could rebuild on ACI with less code.
2. **Webhooks via ACI** — If ACI supports webhooks/SSE, enable real-time sync instead of polling.
3. **Self-host ACI** — When user base grows or data residency matters.
4. **Write operations** — ACI supports write (create issues, send messages). Future: "Create Jira ticket from career story" or "Share to Slack".

### If ACI Doesn't Work Out

1. **Nango** — More mature auth layer, but no meta-functions. More plumbing code.
2. **Composio** — Managed AI agent integration. Less open-source flexibility.
3. **Continue bespoke** — Slower but full control. ~2 weeks per tool.

---

## Open Questions for Follow-Up

1. **ACI TypeScript SDK maturity** — Is the TS SDK production-ready or should we use HTTP directly?
2. **ACI webhook support** — Can ACI push events to us instead of us polling?
3. **ACI user mapping** — How does `linked_account_owner_id` map to our `userId`? Can we use our UUIDs directly?
4. **ACI function versioning** — Do function names/schemas change between ACI versions? How to pin?
5. **ACI self-host resource requirements** — CPU/RAM for the Docker stack? Can it run on our existing infra?

---

## References

All sources documented in [Phase 2: Source Map](./phase-2-source-map.md).

### Key Links
- ACI Platform: https://platform.aci.dev
- ACI Docs: https://www.aci.dev/docs/
- ACI Tools Catalog: https://www.aci.dev/tools
- ACI Python SDK: https://github.com/aipotheosis-labs/aci-python-sdk
- ACI GitHub: https://github.com/aipotheosis-labs/aci
- Inchronicle sync pipeline: `backend/src/services/mcp/`
