# Changelog

All notable release changes for `Anime BT Batch Downloader` are tracked here. GitHub Release pages should reuse the matching version section from this file.

## 1.2.0

### Added

- Added the `bangumi.moe` source adapter to the source registry, content-page integration, and batch resolution flow so the extension now supports all 4 documented BT sources. (`c48d977`)

### Tests

- Added unit, component, and Playwright coverage for `bangumi.moe` list/search-page handling and related source registration behavior. (`c48d977`)

### Changed

- Simplified the options page copy so qBittorrent connection setup guidance is shorter and easier to scan. (`3012c4a`)

### Included Commits

- `c48d977` `feat: add bangumimoe support`
- `3012c4a` `refactor: simplify options page copy`

## 1.1.0

- Added the `acg.rip` source adapter and per-source delivery modes so torrent-first sites can skip unnecessary magnet handling.
- Refreshed the options workspace and floating batch panel for a clearer batch-download workflow.
- Updated the extension branding to the speedline icon set and refreshed UI controls with SCSS module styling and `react-icons`.
- Strengthened automated coverage across unit, component, and Playwright extension flows before the 1.1.0 release.

## 1.0.0

- Introduced the first packaged release of the extension for batching anime BT downloads into `qBittorrent WebUI`.
- Shipped supported source adapters for `kisssub.org` and `dongmanhuayuan.com`, with detail-page fallback extraction when a list page does not expose a usable download link.
- Added the floating batch-selection workflow with deduplication and optional per-batch save path override.
- Added the extension options UI for configuring and testing the qBittorrent WebUI connection.
