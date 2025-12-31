# Evidence Pack v2 — Tribunal-Grade Design Specification

**Status:** Production Design Decision  
**Version:** 2.0  
**Last Updated:** December 2024

---

## Task 1: Gold-Standard Issue Section Example

The following demonstrates how a single issue should appear in a tribunal-ready Evidence Pack. This is the benchmark all issue sections must meet.

---

### ISSUE #1: Bathroom Tap — Persistent Leak

| Field | Value |
|-------|-------|
| **Location** | Main Bathroom, Ground Floor |
| **Severity** | High — Active water damage risk |
| **First Reported** | 15 October 2024 |
| **Status** | Unresolved (78 days as of generation) |
| **Landlord/Agent Response** | No substantive action recorded |

---

#### Summary of Issue

On 15 October 2024, the tenant identified a persistent leak from the bathroom tap that could not be stopped by normal operation. The leak resulted in water pooling on the bathroom floor and potential damage to surrounding fixtures. The tenant documented the issue with photographic evidence and reported it to the property manager via the approved communication channel (email).

As of the date of this pack's generation, no repair has been completed. The tenant has sent three documented follow-up communications. One acknowledgement was received; no scheduled repair date has been provided.

---

#### Chronological Record

| Date | Event | Type | Reference |
|------|-------|------|-----------|
| 15 Oct 2024 | Leak identified and photographed | Evidence | E-001 |
| 15 Oct 2024 | Initial report sent to property manager via email | Communication | C-001 |
| 18 Oct 2024 | Acknowledgement received: "We will arrange a plumber" | Communication | C-002 |
| 29 Oct 2024 | Follow-up sent: No plumber contact received | Communication | C-003 |
| 12 Nov 2024 | Second follow-up sent | Communication | C-004 |
| 15 Nov 2024 | Additional photos taken showing worsening condition | Evidence | E-002 |
| 28 Nov 2024 | Third follow-up sent requesting written timeline | Communication | C-005 |
| 31 Dec 2024 | **No further response recorded** | — | — |

---

#### Evidence Summary

| ID | Type | Date Captured | Relevance | Integrity |
|----|------|---------------|-----------|-----------|
| E-001 | Photo | 15 Oct 2024 | Documents initial condition of leak and water pooling | SHA-256 verified |
| E-002 | Photo | 15 Nov 2024 | Documents worsening condition after 30 days without repair | SHA-256 verified |

**Evidence Purpose:** These items establish the initial state of the defect, the date it was identified, and demonstrate deterioration over time in the absence of repair action.

---

#### Communications Summary

| ID | Date | Direction | Channel | Summary | Response Status |
|----|------|-----------|---------|---------|-----------------|
| C-001 | 15 Oct 2024 | Tenant → Agent | Email | Reported leak, attached photo, requested urgent repair | Acknowledged |
| C-002 | 18 Oct 2024 | Agent → Tenant | Email | "We will arrange a plumber to attend" | — |
| C-003 | 29 Oct 2024 | Tenant → Agent | Email | Follow-up: No plumber contact, requesting update | No response |
| C-004 | 12 Nov 2024 | Tenant → Agent | Email | Second follow-up, issue persisting | No response |
| C-005 | 28 Nov 2024 | Tenant → Agent | Email | Third follow-up, requesting written repair timeline | No response |

**Communication Pattern:** Tenant initiated contact on 4 occasions over 44 days. Agent provided 1 acknowledgement with no follow-through. 3 tenant messages received no response.

---

#### Documentation Gaps (This Issue)

The following items would strengthen this issue's documentation but are not currently recorded:

- [ ] Written record of any verbal conversations regarding this issue
- [ ] Plumber's contact details or booking reference (if any were provided)
- [ ] Receipts for any temporary mitigation measures taken by tenant
- [ ] Video evidence showing active water flow

**Note:** The absence of these items does not invalidate the documented evidence. This section identifies opportunities to strengthen the record if further documentation becomes available.

---

#### Issue Assessment

| Metric | Status |
|--------|--------|
| Initial reporting documented | ✓ Yes |
| Photographic evidence attached | ✓ Yes |
| Follow-up communications logged | ✓ Yes (3) |
| Response from landlord/agent | Partial (1 acknowledgement, no action) |
| Resolution achieved | ✗ No |
| Days since first report | 78 |

---

## Task 2: Evidence Pack PDF v2 Template Structure

### Document Header (Every Page)

```
┌─────────────────────────────────────────────────────────────────┐
│ EVIDENCE PACK                                                    │
│ [Property Address]                                               │
│ Generated: [Date] at [Time]          Pack ID: [UUID-short]       │
│ Page [X] of [Y]                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Section 1: Pack Overview (Page 1)

**Purpose:** Give any reviewer immediate context and credibility signals in under 30 seconds.

```
┌─────────────────────────────────────────────────────────────────┐
│                         PACK OVERVIEW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PACK READINESS:  ████████░░  STRONG (87%)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Issues Documented:        3                             │    │
│  │  Evidence Items:           12                            │    │
│  │  Communications Logged:    18                            │    │
│  │  Date Range:               15 Oct 2024 – 31 Dec 2024     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  RISK SUMMARY                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  ⚠ 1 High-severity issue unresolved (78+ days)                  │
│  ⚠ 2 Issues with no landlord/agent response                     │
│  ○ All evidence items integrity-verified                        │
│                                                                  │
│  DOCUMENTATION COMPLETENESS                                      │
│  ─────────────────────────────────────────────────────────────  │
│  Evidence attached to issues:     ████████████  100%            │
│  Communications logged:           ████████░░░░   67%            │
│  Response received:               ████░░░░░░░░   33%            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Content:**
- Pack Readiness Score with visual indicator (Strong/Moderate/Weak/High-Risk)
- Summary statistics (issues, evidence, communications)
- Risk flags (urgent items, statutory exposure, unresolved high-severity)
- Documentation completeness meters

---

### Section 2: Property & Tenancy Context (Page 2)

**Purpose:** Establish jurisdiction, parties, and tenancy facts.

**Content:**
- Property address
- State/Territory (for tribunal reference)
- Tenancy start date
- Parties (tenant identifier only — no personal details of landlord)
- Pack generation metadata (date, time, app version)

**Tribunal Reference Box:**
```
┌─────────────────────────────────────────────────────────────────┐
│  FOR REFERENCE ONLY — NOT LEGAL ADVICE                          │
│  Relevant tribunal: [e.g., VCAT / NCAT / QCAT]                  │
│  Relevant regulator: [e.g., Consumer Affairs Victoria]          │
│  This information is provided for reference only. Consult       │
│  your local Tenants' Union or legal professional for advice.    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Section 3: Executive Summary (Page 3)

**Purpose:** One-page summary a tribunal member can read in 60 seconds.

**Content:**
- Brief narrative (3-4 sentences) of the tenancy situation
- Table of all issues with status, severity, days open
- Key dates and escalation points
- Overall documentation assessment

**Format:**
```
EXECUTIVE SUMMARY

This pack documents [X] issues reported between [start date] and 
[end date] at the above property. Of these, [Y] remain unresolved 
as of the pack generation date. The tenant has initiated [Z] 
documented communications; [N] have received no response.

┌──────────────────────────────────────────────────────────────┐
│ Issue                  │ Severity │ Status     │ Days Open   │
├──────────────────────────────────────────────────────────────┤
│ Bathroom Tap Leak      │ High     │ Unresolved │ 78          │
│ Air Conditioning Unit  │ Urgent   │ Unresolved │ 45          │
│ Front Door Lock        │ Medium   │ Resolved   │ 12          │
└──────────────────────────────────────────────────────────────┘
```

---

### Section 4: Master Timeline (Pages 4-5)

**Purpose:** Show the complete chronology of events across ALL issues.

**Format:**
```
MASTER TIMELINE OF EVENTS

This timeline combines all evidence and communications across all 
issues in chronological order. It demonstrates tenant effort and 
response patterns over the documented period.

Date        │ Event                                    │ Issue      │ Ref
────────────┼──────────────────────────────────────────┼────────────┼─────
15 Oct 2024 │ ● EVIDENCE: Photo of bathroom leak       │ Tap Leak   │ E-001
15 Oct 2024 │ → SENT: Initial report to agent          │ Tap Leak   │ C-001
18 Oct 2024 │ ← RECEIVED: Acknowledgement from agent   │ Tap Leak   │ C-002
22 Oct 2024 │ ● EVIDENCE: Photo of AC unit damage      │ Air Con    │ E-003
22 Oct 2024 │ → SENT: Report of AC issue               │ Air Con    │ C-006
29 Oct 2024 │ → SENT: Follow-up on tap leak            │ Tap Leak   │ C-003
            │   ⚠ NO RESPONSE                          │            │
...

RESPONSE PATTERN ANALYSIS
─────────────────────────
Tenant-initiated communications:  18
Agent/landlord responses:          4
Average response time:            3.2 days (where response received)
Communications without response:  14 (78%)
```

---

### Section 5: Issue Detail Sections (Pages 6+)

**Purpose:** Deep-dive on each issue using the gold-standard format from Task 1.

Each issue gets:
- Issue header with key facts table
- Summary paragraph
- Chronological record table
- Evidence summary with integrity indicators
- Communications summary with response status
- Documentation gaps checklist
- Issue assessment scorecard

---

### Section 6: Evidence Inventory (Appendix A)

**Purpose:** Complete index of all evidence with integrity verification.

**Format:**
```
EVIDENCE INVENTORY

All evidence items in this pack are integrity-verified using SHA-256 
cryptographic hashing. The hash recorded at upload can be compared 
against the original file to verify it has not been modified.

┌────────────────────────────────────────────────────────────────────┐
│ ID    │ Type    │ Captured    │ Uploaded    │ Issue       │ Hash   │
├────────────────────────────────────────────────────────────────────┤
│ E-001 │ Photo   │ 15 Oct 2024 │ 15 Oct 2024 │ Tap Leak    │ a3f2...│
│ E-002 │ Photo   │ 15 Nov 2024 │ 15 Nov 2024 │ Tap Leak    │ 7c91...│
│ E-003 │ Photo   │ 22 Oct 2024 │ 22 Oct 2024 │ Air Con     │ e4b8...│
│ E-004 │ PDF     │ 01 Sep 2024 │ 01 Sep 2024 │ General     │ 12d4...│
└────────────────────────────────────────────────────────────────────┘

INTEGRITY STATEMENT
All files were hashed at the time of upload using SHA-256. These hashes 
can be independently verified against the original files.
```

---

### Section 7: Communications Log (Appendix B)

**Purpose:** Complete record of all landlord/agent communications.

**Format:**
```
COMMUNICATIONS LOG

┌─────────────────────────────────────────────────────────────────────┐
│ ID    │ Date        │ Dir │ Channel │ Summary              │ Status │
├─────────────────────────────────────────────────────────────────────┤
│ C-001 │ 15 Oct 2024 │ OUT │ Email   │ Initial leak report  │ Ack'd  │
│ C-002 │ 18 Oct 2024 │ IN  │ Email   │ "Will arrange plum..." │ —     │
│ C-003 │ 29 Oct 2024 │ OUT │ Email   │ Follow-up: no contact│ None   │
└─────────────────────────────────────────────────────────────────────┘

LEGEND
─────
Dir: OUT = Tenant → Agent/Landlord | IN = Agent/Landlord → Tenant
Status: Ack'd = Acknowledged | None = No response received
```

---

### Section 8: Documentation Gaps (Appendix C)

**Purpose:** Explicit statement of what is NOT documented.

**This section is critical for credibility. It shows awareness of limitations.**

**Format:**
```
DOCUMENTATION GAPS

This section identifies information that would strengthen this pack 
but is not currently documented. The absence of this information does 
not invalidate the evidence presented; it represents opportunities for 
additional documentation if circumstances allow.

MISSING ACROSS ALL ISSUES
─────────────────────────
□ Condition report from tenancy start (not uploaded)
□ Lease agreement (not uploaded)

ISSUE-SPECIFIC GAPS
───────────────────
Bathroom Tap Leak:
  □ Video evidence of active leak
  □ Record of verbal conversations (if any occurred)
  □ Plumber contact details or booking reference

Air Conditioning Unit:
  □ Temperature readings during malfunction
  □ Written record of any inspection visits

NOTED LIMITATIONS
─────────────────
• This pack contains only information entered by the user into 
  Tenant Buddy. It may not reflect all communications or events.
• Evidence dates are based on user input; metadata verification 
  is not performed.
• This document does not include landlord/agent's perspective 
  or documentation.
```

---

### Section 9: About This Document (Final Page)

**Purpose:** Metadata, disclaimers, and generation details.

**Content:**
```
ABOUT THIS EVIDENCE PACK

Generated by:     Tenant Buddy (v2.x.x)
Generated on:     31 December 2024 at 14:32:15 AEDT
Pack ID:          EP-2024-xxxx-xxxx
Checksum:         SHA-256: [full hash of PDF]

IMPORTANT NOTICES

1. NOT LEGAL ADVICE
   This document is a record-keeping tool only. It does not constitute 
   legal advice, assess your rights, or predict any outcome. Consult 
   a qualified professional or your local Tenants' Union for advice.

2. USER-ENTERED INFORMATION
   All information in this pack was entered by the user. Tenant Buddy 
   does not verify the accuracy of descriptions, dates, or claims.

3. EVIDENCE INTEGRITY
   SHA-256 hashes are calculated at upload time. These verify that 
   files have not been modified since upload, not that the content 
   is accurate or authentic.

4. COMPLETENESS
   This pack reflects data in the system at generation time. It may 
   not include all relevant information about the tenancy or issues.

For questions about this document: support@tenantbuddy.com.au
```

---

## Task 3: Competitive Moat Analysis

### What Tenant Buddy Does That Competitors Don't

| Capability | Typical "Export PDF" | Tenant Buddy Evidence Pack |
|------------|---------------------|---------------------------|
| **Structure** | Flat list of uploads | Tribunal-aware sections with clear hierarchy |
| **Integrity** | None | SHA-256 hashing with verification statement |
| **Completeness** | Assumes complete | Explicit documentation gaps section |
| **Timeline** | Upload date only | Dual timeline: event date + capture date |
| **Communications** | Not tracked | Full log with direction and response status |
| **Assessment** | None | Pack readiness scoring with rationale |
| **Gaps** | Hidden | Explicitly stated — builds credibility |
| **Response tracking** | None | Communication patterns analysed |
| **Tribunal awareness** | None | Jurisdiction reference, neutral tone |

### How Integrity Signals Build Trust

**1. SHA-256 Hashing**
- Every file hashed at upload
- Hash displayed in evidence inventory
- Statement: "These hashes can be independently verified"
- **Signal:** "This evidence hasn't been tampered with since capture"

**2. Explicit Timestamps**
- Separate "Date Captured" vs "Date Uploaded"
- Upload delay flagged if significant
- **Signal:** "We distinguish between when it happened and when it was recorded"

**3. Documentation Gaps Section**
- Proactively states what's missing
- Per-issue and pack-wide gaps
- **Signal:** "We're not hiding limitations — we're acknowledging them"

**4. Response Pattern Analysis**
- Communications counted by direction
- Response rate calculated
- Non-responses explicitly marked
- **Signal:** "The timeline speaks for itself"

**5. Pack Readiness Score**
- Objective criteria (evidence count, communication logging, severity coverage)
- Visual indicator (Strong/Moderate/Weak/High-Risk)
- **Signal:** "We'll tell you if this pack is ready for tribunal or not"

### Positioning: Defensive Documentation System

**Core Narrative:**
> "Tenant Buddy is not a convenience tool. It's a defensive documentation system that helps you build a tribunal-ready record — or shows you exactly why you're not ready yet."

**Key Differentiators:**
1. **Proactive** — Guides what to document, not just where to upload
2. **Honest** — Shows gaps, not just strengths
3. **Structured** — Tribunal-aware format, not generic export
4. **Verifiable** — Cryptographic integrity, not just timestamps
5. **Protective** — Readiness gating prevents weak submissions

**Competitor Comparison:**
- **Generic note apps:** No structure, no integrity, no guidance
- **Property management portals:** Landlord-controlled, not tenant-owned
- **Legal document tools:** Expensive, complex, overkill for most tenants
- **Other tenant apps:** PDF export is afterthought, not core feature

### Free vs Pro Feature Split

| Feature | Free | Plus | Pro |
|---------|------|------|-----|
| **Issue logging** | 3 issues | 10 issues | Unlimited |
| **Evidence uploads** | 10 items | 50 items | Unlimited |
| **Communications log** | ✓ | ✓ | ✓ |
| **Evidence Pack generation** | 1/month | 5/month | Unlimited |
| **Pack Readiness score** | Shown | Shown | Shown |
| **Readiness gating** | Hard block if <40% | Warning if <60% | Advisory only |
| **Documentation gaps** | Summary only | Full list | Full + suggestions |
| **Watermark** | "Generated by Tenant Buddy" | Smaller watermark | No watermark |
| **Pack history** | Last pack only | 3 months | 12 months |
| **Timeline export** | None | PDF only | PDF + CSV |
| **Integrity verification page** | Basic | Full | Full + QR code |
| **Priority support** | Community | Email (48h) | Email (24h) |

### Moat Mechanics

**1. Data Lock-in (Positive)**
- Evidence, communications, timelines — all in one place
- Leaving means losing structured history
- Export gives data, but not the presentation layer

**2. Trust Accumulation**
- Each successful tribunal use builds reputation
- "The app that helped me win" testimonials
- Word-of-mouth in tenant communities

**3. Readiness Gating as Quality Control**
- Free users can't generate weak packs
- This protects Tenant Buddy's reputation
- "If you're generating a pack with us, it's credible"

**4. Network Effects (Future)**
- Tenants share pack formats with advocates
- Advocates recommend Tenant Buddy
- Tribunal familiarity with format builds trust

**5. Continuous Improvement Flywheel**
- User feedback on what tribunals want
- Pack format evolves based on outcomes
- Competitors can't copy institutional knowledge

---

## Implementation Priority

### Phase 1: Pack Readiness & Structure (Now)
- [ ] Implement Pack Readiness scoring in PDF
- [ ] Add Master Timeline section
- [ ] Add Documentation Gaps section
- [ ] Add Integrity Verification page

### Phase 2: Enhanced Credibility (Next)
- [ ] Communication response tracking (direction, status)
- [ ] Response pattern analysis
- [ ] Dual timestamp display (captured vs uploaded)
- [ ] Executive Summary page

### Phase 3: Moat Features (Future)
- [ ] Readiness gating by plan
- [ ] Pack history and versioning
- [ ] QR code verification
- [ ] Advocate/advisor notes (Pro)

---

## Summary

The Evidence Pack is not a feature — it's the product. Everything else in Tenant Buddy exists to feed into this artifact. The pack must be:

1. **Credible** — Structure, integrity signals, explicit limitations
2. **Scannable** — Executive summary, visual indicators, clear hierarchy
3. **Complete** — Everything needed in one document
4. **Honest** — Gaps stated, not hidden
5. **Protective** — Readiness gating prevents embarrassment

This is how Tenant Buddy becomes the system tenants trust when things go wrong — not a note-taking app, but a documentation system that's ready when they need it.

