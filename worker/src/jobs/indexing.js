/**
 * What Google actually thinks of the pages, from the Search Console API.
 *
 * # Spec: docs/architecture/seo-pipeline.md
 *
 * The BigQuery export already tells the brief how a page performed. It says
 * nothing about whether Google is willing to index it, which is the failure
 * that cost 276 URLs in August 2026: the move to Cloudflare downgraded the
 * trailing-slash redirect from 301 to 307, Google kept the slashless URL and
 * dropped the canonical one, and the first anyone heard of it was a
 * validation-failed email eleven days later.
 *
 * There is no API for the "Page indexing" report itself. There are two that
 * carry the same signal:
 *
 *   - Sitemaps: when Google last downloaded it, and its error and warning
 *     counts. One request.
 *   - URL Inspection: per URL, the verdict, the coverage state and the
 *     canonical Google chose. A canonical that is not the URL asked about is
 *     precisely what a 307 looks like from Google's side. 2,000 a day are
 *     allowed; the brief spends a handful on the pages people actually
 *     landed on, because an indexing problem only costs something where
 *     there was traffic to lose.
 *
 * Silent no-op until the service account in GOOGLE_SA_JSON is added as a
 * user of the Search Console property (Settings, Users and permissions,
 * Restricted is enough). Until then every call is a 403 and the brief simply
 * says nothing, rather than nagging daily about a permission.
 *
 * Runs on the 05:00 trigger and leaves its answer in KV, rather than inside
 * the 04:00 one that sends the brief. The free plan allows 50 subrequests
 * per invocation and that trigger already carries four jobs, one of which
 * (the link sweep) is itself paced at 15 probes for exactly this reason.
 * Nine more could have taken the brief down with it. The brief reads the
 * snapshot instead, one KV get, and a verdict from Google a few hours old is
 * the same verdict.
 */

import { accessToken } from '../bigquery.js'
import { KV_KEY as LANGUAGES_KEY } from './languages.js'

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const API = 'https://searchconsole.googleapis.com'
// Pages inspected per run. Each is one subrequest and the Worker gets 50.
export const INSPECT_LIMIT = 6
// A sitemap Google has not fetched in this long is a sitemap it has lost
// interest in, or one that started answering something other than 200.
export const SITEMAP_STALE_DAYS = 7
// A problem already reported is held this long, then said again if still
// there. Google sits on a fix for days or weeks, and the brief re-reporting
// the same URL every morning until the verdict moves is noise, not a task:
// /fr/blog/ was diagnosed and fixed on 2026-08-22 and the 2026-08-23 brief
// asked for it again unchanged. A page is said again the moment its state
// changes, so this holds only the identical verdict.
export const RENOTIFY_DAYS = 14

/**
 * Paths that are never going to be in Google's index, so asking about one and
 * reporting "url is unknown to google" is noise, not a task. robots.txt keeps
 * /admin out by name; /auth, /my-results, /profile, /groups and the per-test
 * results views are gated or personal SPA views that canonical to the home
 * page, and /witness pages exist only behind a personal invitation token.
 * The 2026-08-23 brief spent a line on /admin because an operator's page
 * views to it put it in the traffic-derived candidate list, and the
 * 2026-08-30 run spent a slot on /new-moon/results the same way. A page
 * dropped here is never inspected, so it can never be reported.
 *
 * /full-moon (the page itself, not just its results view) is here too: it
 * redirects an anonymous visitor to /auth and is deliberately absent from
 * the sitemap (see the note in scripts/generate-sitemap.mjs), so Google's
 * answer for it is "url is unknown to google" forever. Logged-in visitors'
 * page views kept feeding it into the traffic-derived candidate list, and
 * the 2026-09-06 snapshot spent one of the six inspection slots on it.
 */
export const NON_PUBLIC_PATH = /^(?:\/[a-z]{2})?\/(?:admin|auth|my-results|profile|groups|witness|witness-setup|full-moon|(?:new-moon|first-quarter|last-quarter)\/results)(?:\/|$)/

/** Google's verdict strings, shortened for a line in an email. */
const clean = (s) => String(s || '').replace(/_/g, ' ').toLowerCase()

async function scFetch(tok, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json', ...(init.headers || {}) },
  })
  if (!res.ok) throw new Error(`search console ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

/**
 * Inspect a handful of pages and read the sitemap's own health.
 *
 * @param {string[]} paths site-relative paths, most important first
 */
export async function gatherIndexing(env, paths = [], { now = Date.now() } = {}) {
  if (!env.GOOGLE_SA_JSON) return { pending: true }
  const site = env.GSC_SITE_URL || 'sc-domain:cercol.team'
  const origin = env.FRONTEND_URL || 'https://cercol.team'
  try {
    const tok = await accessToken(env, SCOPE)
    const out = { site, problems: [], sitemap: null, inspected: [] }

    const list = await scFetch(tok, `/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`)
    const sm = (list.sitemap || [])[0]
    if (sm) {
      const age = sm.lastDownloaded ? Math.floor((now - Date.parse(sm.lastDownloaded)) / 86400e3) : null
      out.sitemap = { path: sm.path, errors: Number(sm.errors || 0), warnings: Number(sm.warnings || 0), ageDays: age }
    }

    // Unique, canonical (trailing slash) forms of the pages that had traffic,
    // minus the ones Google is never going to index (see NON_PUBLIC_PATH).
    const seen = new Set()
    const urls = []
    for (const p of paths) {
      if (NON_PUBLIC_PATH.test(p)) continue
      const url = `${origin}${p.endsWith('/') ? p : `${p}/`}`
      if (seen.has(url)) continue
      seen.add(url)
      urls.push(url)
      if (urls.length >= INSPECT_LIMIT) break
    }
    out.inspected = urls

    for (const url of urls) {
      const r = await scFetch(tok, '/v1/urlInspection/index:inspect', {
        method: 'POST',
        body: JSON.stringify({ inspectionUrl: url, siteUrl: site }),
      })
      const s = r.inspectionResult?.indexStatusResult || {}
      // A canonical Google picked that is not the URL asked about means the
      // page is not the one competing in search, whatever the verdict says.
      const wrongCanonical = s.googleCanonical && s.googleCanonical.replace(/\/$/, '') !== url.replace(/\/$/, '')
      if (s.verdict === 'PASS' && !wrongCanonical) continue
      out.problems.push({
        url,
        state: clean(s.coverageState) || clean(s.verdict) || 'unknown',
        googleCanonical: wrongCanonical ? s.googleCanonical : null,
      })
    }
    return out
  } catch (e) {
    return { pending: true, error: e.message }
  }
}

export const KV_KEY = 'seo:indexing'
// The memory of what has already been reported, kept apart from the snapshot
// on purpose. The snapshot expires in three days so that a dead job makes the
// brief say nothing rather than repeat a three-week-old verdict as if it were
// this morning's; the memory has to outlive RENOTIFY_DAYS or the hold it
// implements quietly stops holding. One key cannot have both lifetimes.
export const REPORTED_KEY = 'seo:indexing:reported'
export const REPORTED_TTL_DAYS = RENOTIFY_DAYS + 7
// When each URL was last actually asked about, whatever Google answered.
// The reported memory above only remembers problems, so a gap URL that came
// back healthy (PASS) was forgotten by the next morning and competed for a
// slot again, while gap URLs still waiting for their first verdict lost
// theirs: on 2026-08-30 three brand-new gaps took all three slots and the
// three gaps the briefs of 08-27 to 08-29 had already sent the operator to
// Search Console for had still never been inspected.
export const INSPECTED_KEY = 'seo:indexing:inspected'

/**
 * The problems not reported recently, and the reported-set to store back.
 * Same arrangement as freshGaps in jobs/languages.js: report once, hold for
 * RENOTIFY_DAYS, forget what resolved so a recurrence reads as news.
 *
 * The key carries the state and the canonical, so a page whose verdict moves
 * (discovered to crawled, or a canonical Google changed its mind about) is
 * news and is said again at once. Only a page that was actually inspected
 * this run can be forgotten: the inspection budget rotates with traffic, and
 * a page merely not asked about today has not been fixed.
 */
export function freshProblems(problems, reported = {}, { now = Date.now(), renotifyDays = RENOTIFY_DAYS, inspected = [] } = {}) {
  const key = (p) => `${p.url}|${p.state}|${p.googleCanonical || ''}`
  const next = { ...reported }
  const fresh = []
  for (const p of problems) {
    const k = key(p)
    const last = next[k] ? Date.parse(next[k]) : 0
    if (now - last < renotifyDays * 86400e3) continue
    next[k] = new Date(now).toISOString()
    fresh.push(p)
  }
  const live = new Set(problems.map(key))
  const asked = new Set(inspected)
  for (const k of Object.keys(next)) {
    if (asked.has(k.slice(0, k.indexOf('|'))) && !live.has(k)) delete next[k]
  }
  return { fresh, reported: next }
}

/**
 * The gap paths worth spending inspection slots on today. The gap list is
 * sorted by expected impressions and that order is stable, so slicing its
 * head would pin the budget to the same URLs every morning: on 2026-08-27
 * and 2026-08-28 the brief reported a fresh gap whose URL the inspector
 * never asked about, because the top three gaps already had their verdicts
 * held under RENOTIFY_DAYS. Fresh gaps (the ones the next brief will carry)
 * go first, and a URL inspected inside the hold, whatever Google answered,
 * gives up its slot to one without a verdict. Holding only reported
 * problems was not enough: a gap URL that came back healthy re-took its
 * slot the next morning, ahead of gaps never asked about at all.
 */
export function gapInspectionPaths(snapshot, reported = {}, { now = Date.now(), renotifyDays = RENOTIFY_DAYS, limit = Math.floor(INSPECT_LIMIT / 2), origin = 'https://cercol.team', inspectedAt = {} } = {}) {
  const held = new Set()
  for (const [k, at] of Object.entries(reported)) {
    if (now - Date.parse(at) < renotifyDays * 86400e3) held.add(k.slice(0, k.indexOf('|')))
  }
  for (const [url, at] of Object.entries(inspectedAt)) {
    if (now - Date.parse(at) < renotifyDays * 86400e3) held.add(url)
  }
  const seen = new Set()
  const out = []
  for (const g of [...(snapshot?.fresh || []), ...(snapshot?.gaps || [])]) {
    const path = `/${g.lang}/blog/${g.slug}/`
    if (seen.has(path)) continue
    seen.add(path)
    if (held.has(`${origin}${path}`)) continue
    out.push(path)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Gather and leave the snapshot in KV for the next brief to read. The pages
 * worth inspecting are the ones that had traffic: one D1 query, rather than
 * making the caller pass them in and pay for it inside its own budget.
 */
export async function runIndexing(env) {
  // The language-gap job runs first and leaves the versions that took no
  // impressions at all. Those are where "is this even indexed" is an open
  // question, so they go to the front: a page with traffic is plainly
  // indexed, and asking Google about it confirms what we already know. Half
  // the budget at most, so a long gap list cannot crowd out the home page.
  const gaps = env.NORMS ? await env.NORMS.get(LANGUAGES_KEY, 'json') : null
  const prev = env.NORMS ? await env.NORMS.get(REPORTED_KEY, 'json') : null
  const inspectedAt = (env.NORMS ? await env.NORMS.get(INSPECTED_KEY, 'json') : null) || {}
  const gapPaths = gapInspectionPaths(gaps, prev || {}, { origin: env.FRONTEND_URL || 'https://cercol.team', inspectedAt })
  const since = new Date(Date.now() - 2 * 86400e3).toISOString()
  const { results } = await env.DB.prepare(
    `SELECT path, COUNT(*) AS n FROM events
      WHERE name='page_view' AND path IS NOT NULL AND created_at >= ?
      GROUP BY path ORDER BY n DESC LIMIT ?`
  ).bind(since, INSPECT_LIMIT).all()
  const out = await gatherIndexing(env, ['/', ...gapPaths, ...results.map((r) => r.path)])
  // A pending run (permission missing, API down) keeps yesterday's memory:
  // wiping it would make the next good run re-report everything as news.
  const { fresh, reported } = out.pending
    ? { fresh: [], reported: prev || {} }
    : freshProblems(out.problems, prev, { inspected: out.inspected })
  if (env.NORMS) {
    await env.NORMS.put(KV_KEY, JSON.stringify({ ...out, fresh, at: new Date().toISOString() }), { expirationTtl: 3 * 86400 })
    await env.NORMS.put(REPORTED_KEY, JSON.stringify(reported), { expirationTtl: REPORTED_TTL_DAYS * 86400 })
    if (!out.pending) {
      // Stamp this run's inspections and drop stamps too old to hold
      // anything, so the map cannot grow without bound.
      const nowIso = new Date().toISOString()
      const keep = Object.fromEntries(Object.entries(inspectedAt).filter(([, at]) => Date.now() - Date.parse(at) < REPORTED_TTL_DAYS * 86400e3))
      for (const url of out.inspected || []) keep[url] = nowIso
      await env.NORMS.put(INSPECTED_KEY, JSON.stringify(keep), { expirationTtl: REPORTED_TTL_DAYS * 86400 })
    }
  }
  return { pending: !!out.pending, error: out.error || null, problems: out.problems?.length || 0, fresh: fresh.length }
}

/** The lines the brief should act on, most costly first. Empty when healthy.
 * A URL in omit is left out because another line already carries its verdict
 * (the language-gap line, see languageActions in jobs/languages.js). */
export function indexingActions(ix, { omit = [] } = {}) {
  if (!ix || ix.pending) return []
  const out = []
  // fresh is the problems not already reported in the last RENOTIFY_DAYS;
  // a snapshot from before the memory existed carries only problems.
  for (const p of ix.fresh || ix.problems) {
    if (omit.includes(p.url)) continue
    out.push(p.googleCanonical
      ? `Google indexes ${p.googleCanonical} instead of ${p.url} (${p.state}). Whatever points at the second one is spending its authority on a URL that is not in the index.`
      : `${p.url} is not indexed: ${p.state}.`)
  }
  const sm = ix.sitemap
  if (sm && sm.errors > 0) out.push(`The sitemap ${sm.path} has ${sm.errors} error(s) in Search Console.`)
  if (sm && sm.ageDays != null && sm.ageDays >= SITEMAP_STALE_DAYS) {
    out.push(`Google last downloaded ${sm.path} ${sm.ageDays} days ago. It fetches a healthy sitemap far more often than that.`)
  }
  return out
}
