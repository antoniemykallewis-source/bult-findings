# BULT / Findings + recommendations

A public, screenshot-led strategy webpage by Vessel Archive for Alex Bult. Evidence and research checked 24 October 2026.

## Hosting and scope

Static GitHub Pages site with relative paths. No build step or third-party runtime dependency is required. No analytics, forms that send data, account access or backend. Calculators run in the visitor's browser and do not save inputs.

## Two different models

The first-renewal scenario uses the observed $69 first order and $89 renewal, editable per-order costs, an assumed paid-renewal share by an explicit cutoff, a chosen reserve and non-media acquisition costs. Its result is a conditional planning budget, not BULT's actual CAC or a promised ad cost.

The separate long-term stress test preserves the constant-churn recurrence. It uses the $89 renewal as a monthly proxy, excludes the introductory shipment and costs outside gross margin, and uses an illustrative 3:1 comparison. It is not a forecast or safe-spend limit. The $130 default is an assumption, not BULT data.

## Evidence

All 16 original proof PNGs are retained byte-for-byte. Two additional PageSpeed screenshots document the storefront's mobile lab results. Lab tests and site-wide real-user data are labeled separately. Review/advertising samples are not complete or representative inventories.

## Experience and accessibility

Real Vessel and BULT brand assets, CSS-only 3D depth, no video/WebGL payload, lazy evidence images, keyboard-friendly proof dialog, native disclosures, focus return and reduced-motion support. Small screens do not use hover tilt. Invalid calculator inputs clear old results.

Asset provenance is in assets/ASSET-SOURCES.txt. Source/build/test files are kept outside the public directory.
