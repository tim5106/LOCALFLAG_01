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
- [x] Group spots sharing identical coordinates into one selectable marker; repeated clicks cycle through the grouped spots.
- [x] Exclude `EXCLUDE` spots from Discovery and Check-in selection; keep `AREA` spots locked for authentication.
- [x] Use `checkInRadiusM` when provided, otherwise use the shared 30m default consistently in status calculations and copy.
- [ ] Perform real-device HTTPS tests for location permission, denied, inaccurate, and unsupported states. Code-level error messaging is implemented; physical-device verification remains pending.
- [ ] Verify Kakao allowed domains and production-key behavior outside localhost. Missing keys and SDK load failures now use the existing map fallback UI; domain registration still requires external verification.
- [ ] Verify real TourAPI spot IDs through the complete precheck/check-in flow. FE payload mapping and SUCCESS/REVIEW/404/501 handling are implemented; authenticated live verification remains pending.
- [x] Connect My Flag profile, point-ledger, and flag-skin catalog screens to the existing APIs with loading, empty, and auth/error states.
- [x] Add automated coverage for source/fallback API metadata, coordinate and geometry rules, image fallback component usage, and Check-in API edge cases.

## External verification required

- Kakao Developers allowed-domain registration for the development and production URLs.
- HTTPS URL and a physical mobile device for geolocation testing.
- Confirmation of the final business rule for `AREA` spots and the default check-in radius.

## Verification baseline

- `npm run typecheck`: passing at the time of this update.
- `npm test`: passing at the time of this update.
- Build and physical-device verification remain separate checks.
