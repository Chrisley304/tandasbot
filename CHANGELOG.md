# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.1.0] - 2026-07-14

### Fixed

- Update provider version to be obtained from `.env` file instead of hardcoded in the codebase.

## [4.0.4] - 2026-07-11

### Fixed
- Fixed bug with user permission check in hbo max flow that was preventing admin user to resend the tanda reminders.

## [4.0.3] - 2026-05-26

### Added
- Added `.env` key to change the Gemini model name without changing the codebase.

## [4.0.2] - 2026-04-19

### Fixed
- Fixed typo bug with user permission check in hbo max flow that was preventing users from using the hbo max functions.

## [4.0.1] - 2026-04-09

### Fixed
- Fixed bug with hbo max properties naming cause platform name change.

## [4.0.0] - 2026-03-22

### Added
- Changed builderbot provider baileys dependency to @builderbot/provider-baileys.
- Added AI functionality to the bot, now you can ask the bot anything you want and it will answer you using Gemini model.
- Migrate Rollup to tsup to simplify the build process and fix some issues with Rollup.

## [3.0.3] - 2025-12-27

### Fixed

- Changed builderbot provider baileys dependency to aurik3-builderbot-baileys-custom.

## [3.0.2] - 2025-12-16

### Fixed

- Update builderbot dependencies to the latest version to fix issues with the bot.

## [3.0.1] - 2025-11-19

### Fixed
- Fixed bug with user permission check in general flow that was preventing users from accessing the bot.

## [3.0.0] - 2025-11-26

### Added
- Added voucher photo upload functionality to Notion DB, now you can watch the voucher directly from Notion.

### Fixed
- Fixed problems with Notion new API requirements
- Fixed problems with Baileys library by updating to the latest version.

### Changed
- Refactor TypeScript types of Notion API responses to simplify their usage.
- Refactor some code to make it cleaner and more maintainable.

## [2.3.4] - 2025-10-23

### Fixed
- Fixed typing errors with Notion API by migrating the Notion API code to JavaScript.

## [2.3.3] - 2025-10-23

### Fixed
- Fixed bug with baileys dependency causing the bot to crash on startup by updating to the latest version.

## [2.3.2] - 2025-06-14

### Updated
- Updated bot dependencies to the latest versions.

## [2.3.1] - 2025-04-23

### Fixed
- Changed online status message timer from 15 seconds to 90 seconds, this is to avoid an error while re-sign in if the session breaks.

## [2.3.0] - 2025-03-15

### Added
- Added the ability to resend the daily tandas reminders, this is useful when the bot is down and the reminders are not sent.
- The bot now sends a message to the admin when is online.

## [2.2.0] - 2025-03-01

### Added
- Added see last expenses flow to the bot, now the admin can see the last expenses added to the bot.

## [2.1.2] - 2025-02-26

### Fixed
- Fixed bug with notion query on user search with phone number, the filter property was changed to contains instead of equals.

## [2.1.1] - 2025-02-19

### Fixed
- Added missing youtube premium flows to flows index file.

## [2.1.0] - 2025-02-19

### Added
- Added Youtube Premium tanda with it related flows and info to the user type.

## [2.0.3] - 2025-02-16

### Fixed
- Added missing permission to ADMIN on payment info flow.

## [2.0.2] - 2025-02-16

### Changed
- Changed Christian's payment information with NU bank account.

## [2.0.1] - 2025-02-16

### Fixed
- Fixed wrong bot process name on the deployment update script.

## [2.0.0] - 2025-02-16

### Added
- Added expenses functionality to the bot, now the admin can see their expenses by month and add new ones.

### Changed
- Refactored the notion utils file into a directory with multiple files.
- Refactored the date utils from misc file into a separate datetimes file.
- Add a admin permission to the tandas rules flows

### Fixed
- Fixed bug with the remaining amount in the tandas on the tandas status flow.

## [1.1.2] - 2025-02-14

### Fixed
- Fixed bug with the days between payments calculation on tandas payment reminder daily schedule.

### Added
- Added pino logger to the project.

## [1.1.1] - 2025-02-08

### Changed

- Changed tandas status messages adding how much payments are left or letting now when is the next payment.

### Fixed

- Fixed a typo on the Notion add payment body that was causing an error on the request.

## [1.1.0] - 2025-02-08

### Added

- Added deployment configuration with github webhook configuration.

### Fixed

- Fixed bug with empty flow file.
- Fixed bug with missing dependency.

## [1.0.0] - 2025-02-08

### Added

- Initial release with tandas functionality.
- Added send message to groups and personal user.