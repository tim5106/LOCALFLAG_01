# Frontend implementation status

Updated: 2026-09-11

This document records the frontend status against the week 1 and week 2 MVP requirements.

## Completed in code

- [x] Discovery loads Jongno spots through `GET /api/v1/spots`.
- [x] Kakao map displays tourism spot markers.
- [x] Spot selection displays place information and image fallback behavior.
- [x] Loading, empty, API error, and map fallback states exist.
- [x] Check-in uses browser geolocation and displays the user location.
- [x] Check-in distance is calculated from the real GPS position.
- [x] Check-in marker states support `LOCKED`, `AVAILABLE`, `PENDING`, and `COMPLETED`.
- [x] `/check-in/test` supports virtual location and marker state testing.
- [x] Precheck and check-in API client types and defensive error handling exist.

## Remaining frontend work

- [x] Show `meta.source` clearly in development to distinguish TourAPI data from fallback data.
- [x] Handle empty, broken, and `http` image URLs with a shared fallback component; real mobile verification remains pending.
- [ ] Decide and implement the UX for spots sharing identical coordinates.
- [ ] Apply explicit `POINT`, `AREA`, and `EXCLUDE` display and check-in rules.
- [ ] Confirm the final check-in radius policy and apply it consistently to all copy and screens.
- [ ] Perform real-device HTTPS tests for location permission, denied, inaccurate, and unsupported states.
- [ ] Verify Kakao allowed domains and production-key behavior outside localhost.
- [ ] Verify real TourAPI spot IDs through the complete precheck/check-in flow.
- [ ] Verify My Flag and point-ledger screens against the real API.
- [ ] Add automated coverage for source display, image failures, area rules, and check-in edge cases.

## External verification required

- Kakao Developers allowed-domain registration for the development and production URLs.
- HTTPS URL and a physical mobile device for geolocation testing.
- Confirmation of the final business rule for `AREA` spots and the default check-in radius.

## Verification baseline

- `npm run typecheck`: passing at the time of this update.
- `npm test`: passing at the time of this update.
- Build and physical-device verification remain separate checks.
