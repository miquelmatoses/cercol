# Content review ledger

One row per article-language pair that has been through a wave review. The
daily brief proposes candidates ranked by exposure ("Content wave" section,
built by `gatherWave` in `worker/src/jobs/daily.js`, which fetches this
file and drops any pair in the table reviewed in the last 8 weeks before
capping the list); the daily maintainer routine skips reviewed pairs again
itself (the fetch can fail, and then the list arrives unfiltered), reviews
the rest, and appends its row here in the same pull request as the fixes.

The unit is the pair, not the article: `es · how-to-read` and `da ·
how-to-read` are different work with different defects. English pairs get the
non-linguistic half of the review only (indexing, position, CTR, CTA,
internal links); translated pairs also get a native-speaker pass against the
language's glossary in `docs/policies/glossary.<lang>.md`.

Verdicts: `clean` (nothing to fix), `fixed` (defects corrected, listed in the
PR and the issue comment), `needs-operator` (something only the operator can
decide; say what in the notes).

Nothing is unpublished on the basis of this ledger. An article that fails to
perform for lack of interest costs nothing; one that fails because of defects
gets fixed, in exposure order.

| Date | Lang | Slug | Verdict | Notes |
|---|---|---|---|---|
| 2026-08-25 | en | gender-and-personality-what-big-five-research-says | clean | Copy, links and CTA sound; CTR (1/1528 at pos 8.4) below positional expectation but no defect found to pin it on |
| 2026-08-25 | en | personality-and-procrastination-what-research-says | clean | Copy, links and CTA sound; CTR (1/1137 at pos 7.9) low for the position, copy not clearly at fault |
| 2026-08-25 | en | critiques-of-big-five-what-critics-say | fixed | One vocabulary defect in body ("observers" in the Mischel passage, banned term) corrected in D1; CTR healthy (10/527 at pos 9.7) |
| 2026-08-25 | en | big-five-personality-across-cultures-what-research-shows | fixed | Closing CTA linked the home page as an absolute URL instead of the instrument; now routes to /first-quarter. Position 13.6, zero clicks within noise |
| 2026-08-25 | en | what-is-a-facet-in-personality-psychology | fixed | One vocabulary defect in body ("observer data" for the Witness comparison) corrected in D1; links and CTA sound |
| 2026-08-26 | en | history-of-the-big-five-from-allport-to-goldberg | fixed | Closing CTA linked the home page as an absolute URL instead of an instrument; now routes to /first-quarter. Self-referential Further-reading row (mislabelled, no matching article exists) removed. "Observer ratings" in the convergent-evidence list names the method in cited studies, legitimate per glossary |
| 2026-08-26 | en | personality-and-motivation-what-drives-each-big-five-profile | clean | Copy, links and CTA sound; own conversion section routes to /first-quarter; 3 clicks on 359 impressions at position 10.4 is within positional expectation |
| 2026-08-26 | fr | what-is-a-facet-in-personality-psychology | fixed | 24 sentence-level corrections in D1: non-word "genuinement" (x2), one meaning change in a link title, "dessin" for pattern, calqued verb "scorer" (x3), untranslated stat label and two untranslated list rows, canonical instrument name, assorted calques. FAQ section present in EN source is absent in FR (omission, not correction; left for a translation pass). Indexed per today's snapshot, position 6.6 |
| 2026-09-01 | es | how-to-read-a-big-five-personality-report | fixed | 21 sentence-level corrections in D1 from a native-speaker review: false friends ("medido", "sobria" for sobering), anglicism "accionable" (x2), calqued clefts and word order, facet name "Sentido del deber", instrument names per glossary, register break véase→consulta (x5). Both sentences claiming Full Moon is a one-time payment corrected to free (pricing policy 2026-08-23). Title lengthened to carry "informe de personalidad" per the Spanish query pattern. Healthy CTR (5/230 at pos 6.9), outperforms its EN sibling |
| 2026-09-01 | en | personality-of-entrepreneurs-what-research-says | fixed | Closing CTA linked the home page as an absolute URL instead of an instrument; now routes to /first-quarter. "Observe" is verb usage, legitimate. 1 click on 223 impressions at position 9.7 is within positional expectation |
| 2026-09-01 | en | personality-and-job-fit-how-to-think-about-person-environment-fit | fixed | Closing CTA linked the home page as an absolute URL; now routes to /first-quarter. Copy and internal links otherwise sound; 0 clicks on 218 impressions at position 7.9 is at the noise edge, no copy defect found to pin it on |
| 2026-09-01 | en | does-personality-composition-predict-team-performance | fixed | Closing CTA linked the home page as an absolute URL; now routes to /first-quarter. Copy and internal links otherwise sound |
| 2026-09-01 | en | personality-of-successful-ceos-what-research-says | clean | CTA already routes to /first-quarter; copy, links and structure sound; 1 click on 171 impressions at position 8.7 within positional expectation |
| 2026-09-02 | en | personality-and-job-fit-how-to-think-about-person-environment-fit | clean | Copy, links and CTA sound; 0 clicks on 226 impressions at position 7.7 is below positional expectation but no defect found to pin it on |
| 2026-09-02 | en | personality-of-entrepreneurs-what-research-says | fixed | Closing CTA linked /roles as an absolute URL; now relative. Duplicate italic Further-reading line above the list is harmless and left; stat cards style values with inline hex, a corpus-wide pattern (23 posts) noted for the operator |
| 2026-09-02 | en | does-personality-composition-predict-team-performance | fixed | Title was H2, so the page rendered no H1; "of.19" missing a space; absolute /instruments URL made relative; stat-card label said "meta-analytic studies reviewed" where the article itself cites one meta-analysis of 60 studies. Unsourced r = 0.27 stat card left for the operator |
| 2026-09-02 | en | personality-of-successful-ceos-what-research-says | fixed | Table row on low Neuroticism named the reversed pole ("high Depth can indicate resilience"); now "low Depth". Absolute /roles URL made relative |
| 2026-09-02 | en | how-to-read-a-big-five-personality-report | fixed | Two false pay-once sentences (Full Moon as "a one-time payment") corrected to the free wording per docs/policies/pricing.md; "≈.20" missing a space. ES sibling out-clicks EN (5/233 vs 0/166 at the same position) with no EN defect found to explain it |
| 2026-09-03 | en | social-desirability-bias-personality-tests | fixed | Two missing spaces before decimal correlations ("from.30 to.50", "of.25–.45") and two absolute self-links in the closing CTA (instruments, science) made relative, in D1. Links and CTA otherwise sound; 0 clicks on 160 impressions at position 8.3 is under the zero-click floor (199), so silence is expected |
| 2026-09-03 | en | software-engineer-personality-what-research-shows | fixed | Absolute self-link in the closing CTA (/roles) made relative in D1. Left for the operator: an unattributed first-person blockquote (lone-genius section) with no source, and unsourced stat cards, one of which ("Low E: below-population average") contradicts the article's own comparison table ("near population average"); relabelling numbers is not correction territory |
| 2026-09-04 | de | critiques-of-big-five-what-critics-say | fixed | 19 sentence-level corrections in D1 from a native-speaker review: 5 non-native constructions ("wiegt ... ab" for assessing strength, items that "miteinander schwankten" for kovariieren, an ungrammatical relative clause), 5 calques ("Sinn bilden", "Bogen des Lebens", "Linse" as metaphor), 4 meaning drifts ("Ihre Werte" where test scores are meant, pejorative "grobe Dimensionen"), the invented instrument name "Das Erste Viertel" replaced with the glossary form, and 5 internal-link titles carrying the non-term "Persönlichkeitswissenschaft" corrected to "Persönlichkeitsforschung" (the target articles' own de titles still carry the term until their waves). Healthy CTR (3/169 at pos 5.9); da sibling inspected healthy today, de not inspected. Stat cards use inline hex (corpus-wide pattern noted 09-02) |
| 2026-09-06 | en | best-free-personality-tests-for-teams-2026 | fixed | Three false paid claims about Full Moon (the Free-to-use block, the ranking-table cell, the closing CTA's "free to new accounts during the open beta") corrected to the free wording per docs/policies/pricing.md; four absolute self-links made relative and the closing CTA now routes to /first-quarter. Engagement healthy (16 reads, 2 conversions); 1 click on 102 impressions at position 11.4 is within positional expectation. Stat cards use inline hex (corpus-wide pattern noted 09-02) |
| 2026-09-06 | es | what-is-agreeableness-the-cooperative-dimension | fixed | 45 sentence-level corrections in D1 from a native-speaker review: "(agreeableness)" repeated 41 times against the glossary's first-mention rule (now once), SVG diagram labels translated against the glossary rule that labels stay English (restored), six facet-table labels left in English (now Spanish with English on first mention), false friends ("contestar" for contest, "acomodación"), calques ("caído por las grietas", "sirven una función", "se experimentan como"), LatAm forms ("costo", "promedio") in an es-ES corpus, register breaks ("contrate", "Nótese", véase → consulta), two untranslated Further-reading entries, CTA absolute self-links made relative and routed to /first-quarter; description calque ("El cuadro Big Five completo") fixed. 0 clicks on 84 impressions at position 9.8 is within positional expectation |
| 2026-09-06 | en | personality-and-learning-styles-what-research-supports | fixed | Closing CTA linked the home page as an absolute URL; now routes to /first-quarter. Meta description grammar defect ("Learning styles (VAK, MBTI) is debunked, but Big Five predicts") corrected. 0 clicks on 79 impressions at position 11.2 is within positional expectation |

## Translation passes

Cross-cutting work outside the wave cadence. Not one row per pair above,
because a pass is one review protocol applied to many pairs at once; the
pairs it touched are listed here so the wave knows they carry the section.

**2026-08-29 — the missing FAQ sections.** The 2026-08-26 FR facet row above
noted the EN "Common questions" section absent in FR and left it for a
translation pass. The omission turned out to be systemic: of the six EN
articles carrying a FAQ (creativity, forced-choice, gender, motivation,
procrastination, facet), every translation lacked it except three Catalan
ones — 27 missing pairs (fr/es/de/da × 6, ca × creativity, forced-choice,
motivation). All 27 were translated from the EN source, passed a
native-speaker review per language (corrections in every language, mostly
calques plus a handful of meaning drifts; before/after in the PR),
and appended in D1 with a targeted idempotent UPDATE, verified by re-reading:
exactly one FAQ heading per pair, 30/30 including the pre-existing Catalan
three. `src/utils/faq-schema.js` detects questions by shape, so the new
sections emit FAQPage JSON-LD from the next prerender.
