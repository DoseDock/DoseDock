# PillBox Dispenser

A comprehensive React Native mobile app for an automatic pill dispenser, built with Expo and TypeScript.

## Features

- 📅 **Schedule Management**: Create recurring medication schedules with flexible recurrence patterns
- 💊 **Pill Library**: Manage up to 10 pills with stock tracking and low-stock alerts
- 🔔 **Smart Notifications**: Local push notifications with snooze functionality
- 🔒 **Lockout Windows**: Prevent accidental double-dosing with configurable lockout periods
- 📊 **Adherence Tracking**: View medication history and adherence statistics
- 🎨 **Modern UI**: Beautiful interface built with NativeWind (Tailwind for React Native)
- ♿ **Accessible**: Full VoiceOver/TalkBack support with proper labels
- 🔐 **Security**: Optional PIN protection for schedule editing

## Tech Stack

- **Framework**: Expo 51 + React Native + TypeScript
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **State Management**: Zustand with AsyncStorage persistence
- **Database**: SQLite with repository pattern
- **Forms & Validation**: react-hook-form + Zod
- **Date/Time**: Luxon + RRule for recurrence
- **Notifications**: expo-notifications with background tasks
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint + Prettier

## Project Structure

```
pillbox-dispenser/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── PillChip.tsx
│   │   ├── PillCard.tsx
│   │   ├── DoseGroupCard.tsx
│   │   ├── DeviceStatusBar.tsx
│   │   ├── LargeButton.tsx
│   │   ├── ScreenHeader.tsx
│   │   ├── FormField.tsx
│   │   └── TimeChip.tsx
│   ├── screens/           # Main app screens
│   │   ├── TodayScreen.tsx
│   │   ├── ScheduleScreen.tsx
│   │   ├── ScheduleWizardScreen.tsx
│   │   ├── PillLibraryScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── DispenseAlertScreen.tsx
│   ├── navigation/        # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── store/             # Zustand state stores
│   │   ├── pillStore.ts
│   │   ├── scheduleStore.ts
│   │   ├── todayStore.ts
│   │   └── settingsStore.ts
│   ├── data/              # Database layer
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   ├── migrate.ts
│   │   ├── seed.ts
│   │   └── repositories/
│   │       ├── PillRepository.ts
│   │       ├── ScheduleRepository.ts
│   │       └── EventLogRepository.ts
│   ├── engine/            # Business logic
│   │   └── scheduler.ts   # Pure scheduling functions
│   ├── notifications/     # Notification service
│   │   └── index.ts
│   ├── device/            # Device communication
│   │   └── mockDevice.ts
│   ├── utils/             # Utility functions
│   │   ├── time.ts
│   │   └── validation.ts
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   └── i18n/              # Internationalization
│       └── en.ts
├── App.tsx                # Root component
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
└── README.md
```

## Data Model

### Tables

**pill**
- `id` (TEXT) - Primary key
- `name` (TEXT) - Pill name
- `color` (TEXT) - Hex color code
- `shape` (TEXT) - Pill shape (round, oval, oblong, capsule)
- `cartridge_index` (INTEGER) - Physical cartridge position (0-9)
- `max_daily_dose` (INTEGER) - Maximum pills per day
- `stock_count` (INTEGER) - Current stock level
- `low_stock_threshold` (INTEGER) - Alert threshold
- `created_at` (INTEGER) - Creation timestamp

**schedule**
- `id` (TEXT) - Primary key
- `title` (TEXT) - Optional schedule name
- `lockout_minutes` (INTEGER) - Minimum time between doses
- `snooze_interval_minutes` (INTEGER) - Snooze duration
- `snooze_max` (INTEGER) - Maximum snooze count
- `start_date_iso` (TEXT) - Schedule start date
- `end_date_iso` (TEXT) - Optional end date
- `rrule` (TEXT) - RFC5545 recurrence rule
- `times_json` (TEXT) - JSON array of "HH:mm" times

**schedule_item**
- `id` (TEXT) - Primary key
- `schedule_id` (TEXT) - Foreign key to schedule
- `pill_id` (TEXT) - Foreign key to pill
- `qty` (INTEGER) - Quantity per dose

**event_log**
- `id` (TEXT) - Primary key
- `due_at_iso` (TEXT) - Scheduled time
- `group_label` (TEXT) - Human-readable dose description
- `status` (TEXT) - PENDING, TAKEN, SKIPPED, SNOOZED, FAILED, MISSED
- `acted_at_iso` (TEXT) - Actual action time
- `details_json` (TEXT) - Additional metadata

## Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run database migrations:**
   ```bash
   npm run migrate
   ```

3. **Seed sample data:**
   ```bash
   npm run seed
   ```

   This creates:
   - 10 pills: Metformin, Atorvastatin, Lisinopril, Levothyroxine, Amlodipine, Omeprazole, Hydrochlorothiazide, Losartan, Ibuprofen, Vitamin D
   - 2 schedules:
     - Daily 08:00: 2× Metformin + 1× Atorvastatin
     - Weekdays 22:00: 1× Atorvastatin

### Running the App

```bash
# Start Expo development server
npm run dev

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## Notifications

The app uses local notifications via `expo-notifications`. 

### Setup

1. Permissions are requested on first launch
2. Notifications are scheduled for the next 7 days
3. Tap a notification to open the app
4. Snooze notifications reschedule for N minutes later

### Testing Notifications

To test notifications:

1. Create a schedule with a time 1-2 minutes in the future
2. Wait for the notification to appear
3. Tap it to open the dispense alert
4. Test Dispense, Snooze, and Skip actions

**Example: Create a test notification**

```typescript
import { RRule } from 'rrule';
import { DateTime } from 'luxon';

// Create schedule for 2 minutes from now
const now = DateTime.now();
const testTime = now.plus({ minutes: 2 });

const rrule = new RRule({
  freq: RRule.DAILY,
  dtstart: now.startOf('day').toJSDate(),
});

await scheduleRepository.create({
  title: 'Test Notification',
  times: [testTime.toFormat('HH:mm')],
  rrule: rrule.toString(),
  startDateISO: now.toISO(),
  lockoutMinutes: 5,
  snooze: { intervalMinutes: 10, maxSnoozes: 3 },
  items: [{ pillId: 'your-pill-id', qty: 1 }],
});
```

## Code Examples

### Creating an RRULE for Weekdays at 22:00

```typescript
import { RRule } from 'rrule';
import { DateTime } from 'luxon';

const rrule = new RRule({
  freq: RRule.WEEKLY,
  byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
  dtstart: DateTime.now().startOf('day').toJSDate(),
});

console.log(rrule.toString());
// Output: DTSTART:20240101T000000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
```

### Expanding RRULE into Next 5 Occurrences

```typescript
import { expandOccurrences } from '@engine/scheduler';
import { DateTime } from 'luxon';

const schedule = {
  id: 'schedule-1',
  times: ['22:00'],
  rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  startDateISO: DateTime.now().toISO(),
  lockoutMinutes: 60,
  snooze: { intervalMinutes: 10, maxSnoozes: 3 },
  items: [{ pillId: 'pill-1', qty: 1 }],
};

const now = DateTime.now();
const rangeEnd = now.plus({ weeks: 1 });

const occurrences = expandOccurrences(
  schedule,
  now.toISO(),
  rangeEnd.toISO()
);

console.log('Next 5 occurrences:');
occurrences.slice(0, 5).forEach((dt) => {
  console.log(dt.toFormat('EEE MMM dd, yyyy @ h:mm a'));
});

// Output:
// Mon Jan 01, 2024 @ 10:00 PM
// Tue Jan 02, 2024 @ 10:00 PM
// Wed Jan 03, 2024 @ 10:00 PM
// Thu Jan 04, 2024 @ 10:00 PM
// Fri Jan 05, 2024 @ 10:00 PM
```

## Environment Configuration

No environment variables are required for basic operation. The app uses local SQLite and mock device communication.

For production:
- Configure push notification credentials in `app.json`
- Set up BLE device pairing
- Configure caregiver notification endpoints

## Accessibility

The app is fully accessible with:
- VoiceOver/TalkBack labels on all interactive elements
- Large touch targets (minimum 44×44 points)
- Dynamic font size support
- High contrast colors
- Semantic HTML roles

## Future Enhancements

- [ ] Real BLE device integration
- [ ] Cloud sync for multi-device support
- [ ] Caregiver dashboard web app
- [ ] Photo pill identification
- [ ] Medication interaction warnings
- [ ] Insurance/refill reminders
- [ ] Voice control integration
- [ ] Wear OS / watchOS companion app

## Troubleshooting

### Database issues
```bash
# Reset and reseed database
npm run migrate
npm run seed
```

### Notification issues
- Check permissions in device Settings > Notifications
- Ensure device is not in Do Not Disturb mode
- Check Expo logs for scheduling errors

### Build issues
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
expo start --clear
```

## License

MIT

## Support

For issues or questions, please open a GitHub issue or contact support.

---

**Note**: This app uses a mock device API. Replace `mockDevice.ts` with real BLE communication for production use.

