# Pricing and Monetization Design

**Status:** Decisions captured from the 2026-04-28 strategy conversation.
Source of truth for Q3 2026 ("The Business") implementation.

**Anchor docs:**
- Roadmap: `docs/2026-04-19-inchronicle-roadmap-recalibrated.md` (Q3
  theme: "Prove people pay")
- Profile design: `docs/2026-04-22-profile-rebuild-design.md`

---

## Context

Inchronicle's moat is the data accumulated from continuous capture across
years of a user's career. The five-years-back retrieval scenario is the
headline value, and it only exists if users log everything during the long
windows when they don't yet have a use case. That constraint inverts how
most SaaS thinks about pricing.

Most SaaS gates capture and lets retrieval be cheap. Inchronicle has to do
the opposite: capture is subsidized completely; the high-stakes moments of
use are where willingness-to-pay is highest, and that's where revenue lives.

This is closer to TurboTax than to Notion. The product is most valuable in
specific moments (review, promotion, interview, layoff) and the pricing
should meet users at those moments rather than asking for a year-round
relationship the user doesn't yet feel.

---

## Core principle

> **Capture is free forever. Consumption is monetized.**

Every restriction on the free tier is a restriction on the moat. Marketing
should make this principle visible: "your career is yours. We just help
you remember it."

---

## The decision

| Tier | Price | Shape |
|---|---|---|
| Free | $0 | Continuous capture, generous use |
| Pro | $10 / month or ~$79 / year | Unlimited use of polished outputs |
| Teams | TBD (Q4 2026 onward) | Per-seat, B2B motion |
| Enterprise | TBD (2027) | Custom; SSO, compliance, admin |

This document covers Free + Pro. Teams + Enterprise pricing is deferred
until a real team is hand-onboarded as a case study.

---

## Free vs Pro tier (full specification)

| Feature | Free | Pro |
|---|---|---|
| Tool integrations | All 9, unlimited | All 9, unlimited |
| Activities captured | Unlimited, forever | Unlimited, forever |
| Auto-generated story drafts | Unlimited | Unlimited |
| **Published stories** | **3 / month** | Unlimited |
| **Narratives** | **1 / month** | Unlimited |
| **Co-sign requests** | **Unlimited** | **Unlimited** |
| Public chronicle (profile sharing) | **Always free** | Always free |
| Read + edit own stories | Always free | Always free |
| Single-story export (plain PDF / text) | Free | Free |
| **Raw data export (GDPR)** | **Always free** | **Always free** |
| Polished promotion packets | No | Yes |
| Polished resume / role-tailored exports | No | Yes |
| Bulk re-derivation / batch interview mode | No | Yes |

---

## Three settled refinements

### 1. Disambiguate "story": draft vs published

A draft story is auto-generated from clustered activities. A published
story is the user-curated artifact made shareable. The cap applies only
to **published** stories. Activities, drafts, and auto-generated
suggestions remain unlimited.

The pricing page must say this explicitly:

> Activities captured: unlimited, free, forever.
> Auto-generated draft stories: unlimited, free, forever.
> Published stories (saved + shareable): 3 per month free, unlimited on Pro.

Without this distinction, a user with a productive month sees the engine
generate 8 drafts and concludes "the free tier is a teaser." That kills
the capture habit.

### 2. Read-back when downgrading is always free

A user pays $10/month for six months, builds 24 published stories, then
cancels. They retain:

- **Read** all their stories: free, forever.
- **Edit** existing stories: free, forever.
- **Single-story export** (PDF, copy): free, forever.
- **Raw data export** (GDPR JSON / CSV): free, forever.
- **Publish new stories**: hits the 3/month cap.
- **Generate new narratives**: hits the 1/month cap.
- **Polished outputs** (promotion packet, role-tailored): blocked.

If downgrading locks people out of their own evidence, the product
contradicts the credibility pitch. The data has to feel like the user's,
always.

### 3. Co-sign requests are unlimited on Free + Pro

Two reasons:

- **Co-sign is the story.** Validation is what makes a published story
  credible. Charging per co-sign request is charging per "complete the
  thing you already paid for."
- **It is the user-acquisition channel.** Every co-sign invite to a
  non-user is a potential signup at zero CAC. Throttling it works
  against the growth loop the network depends on.

Spam abuse is mitigated server-side (rate spikes, identical message
bodies, inviting non-existent users), not via a UI counter on legitimate
users.

---

## GDPR and bulk data export

The raw-data export must be **free** in all tiers. Two reasons:

**Legal.** GDPR Article 20 (Right to Data Portability) plus Article
12(5) explicitly require the export be provided "free of charge." The
only exception is "manifestly unfounded or excessive" requests, which
means abuse, not regular use. UK GDPR mirrors this. CCPA in California
requires free access twice a year. Brazil's LGPD similar. A flat paywall
on data download fails this test in any EU member state.

**Brand.** Independent of the law: "you have to pay to leave" is the
worst possible word-of-mouth for a trust-and-credibility product. It is
inconsistent with the entire pitch.

The clean line is sharp:

| What | Free? | Why |
|---|---|---|
| Raw data export (JSON / CSV of activities, stories, profile) | **Yes, always** | GDPR Art. 20 + brand. |
| Single-story export (plain PDF / text) | Yes, always | Part of "use what you wrote." |
| **Polished promotion packet** (curated multi-story PDF, branded layout) | Pro | Derivative *work*, not the underlying data. |
| **Polished resume / role-tailored exports** | Pro | Format and curation are the value. |
| **Bulk re-derivation** (regenerate all stories with new prompt, batch interview-prep mode) | Pro | LLM compute cost + clear consumption boundary. |

The data is yours, the artifacts we build with it are ours to charge
for.

---

## Implementation surface

The raw-data export should live in:

> Settings → Privacy → Download my data

This is where most apps put it; it's the path users discover when they
search "GDPR export inchronicle" or follow a privacy regulator's
guidance. The button should produce a structured, machine-readable
download (JSON + CSV) of activities, drafts, published stories,
narratives, profile, and validations.

---

## Open question for later

Subscription captures recurring revenue but has lower conversion at the
high-intent moment. A Performance Review Pack at $29 one-time has higher
conversion the night before someone's self-assessment is due.

Once usage data exists, run a parallel A/B: same free tier, one cohort
sees "$10/month unlimited" and the other sees "$29 unlock for review
season." Measure paid sign-ups and revenue during November/December.

Ship subscription first. Add per-moment SKUs later as a complement, not
a replacement.

---

## Marketing line

> **"Free to remember. Pay when it counts."**

Or, more aggressive:

> **"Capturing is free, forever. Use it like a notebook. Pay only when
> you turn it into something."**

Either frames the model honestly and primes the user for the
moments-based value of the polished outputs rather than a Notion-style
monthly relationship.
