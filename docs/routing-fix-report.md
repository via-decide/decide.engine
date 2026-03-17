# Routing Fix Report

## Scope
Checked routing behavior for:
- Main website UI router (`router.js` + homepage navigation flow).
- Subpage/deep-link behavior for Cloudflare/GitHub Pages style URLs.
- Route-table consistency against `_redirects`.

## Fixes Applied

### 1) GitHub Pages base-path safe navigation in `router.js`
**Problem:** Full-page navigation used root-absolute URLs like `/alchemist`, which break when hosted under a repo subpath like `/decide.engine-tools/`.

**Fix:** Added base-path helpers and routed all generated navigation URLs through them.
- Added `_BASE_PATH`, `_withBase(path)`, `_stripBase(pathname)`.
- Updated `resolveURL()` to generate base-aware URLs.
- Updated fallback back-link navigation to use base-aware home URL.
- Updated pathname SPA fallback to strip base-path and restore canonical URL with base prefix.

### 2) Removed duplicate router method definitions
**Problem:** `bindBackLinks()` and `bindIframeBridge()` were each defined twice in the same object; earlier definitions were shadowed by later ones, making behavior harder to reason about.

**Fix:** Removed the shadowed duplicate block so there is one active implementation for each method.

## Validation Results

### Router syntax
- `node --check router.js` ✅ (no syntax errors)

### Route map consistency
- Router entries parsed: **82**
- Router entries pointing to missing files: **0**
- Router canonical URLs missing in `_redirects`: **0**
- `_redirects` slugs not represented as canonical router URLs: **15**
  - These are mostly alias-only or wildcard-oriented slugs and not all are expected to be canonical router URLs.

### Subpage link risk scan (root-absolute hrefs)
Found **71** root-absolute `href="/..."` links across **18** root HTML files.
This is a deployment risk on GitHub Pages subpath hosting if router interception does not occur before navigation.

Top files by count:
- `ONDC-demo.html` (9)
- `index.html` (7)
- `discounts.html` (6)
- `viadecide-public-beta.html` (5)
- `ondc-for-bharat.html` (5)

## Recommended Next Pass (non-breaking)
1. Convert root-absolute internal links in content pages to router-aware links (`data-router`) or relative links.
2. Standardize fallback button handlers in HTML from `location.assign('/slug')` to `VDRouter.go('slug')` with a safe relative fallback.
3. Add a lightweight CI audit script to fail when new root-absolute internal links are introduced.

## Binary Files
No binary files were added or modified in this fix.
