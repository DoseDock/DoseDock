# PillBox Dispenser

A comprehensive React Native mobile app for an automatic pill dispenser, built with Expo and TypeScript.

## Features

- **Schedule Management**: Create recurring medication schedules with flexible recurrence patterns
- **Pill Library**: Manage up to 10 pills with stock tracking and low-stock alerts
- **Smart Notifications**: Local push notifications with snooze functionality
- **Lockout Windows**: Prevent accidental double-dosing with configurable lockout periods
- **Adherence Tracking**: View medication history and adherence statistics
- **Modern UI**: Beautiful interface built with NativeWind (Tailwind for React Native)
- **Accessible**: Full VoiceOver/TalkBack support with proper labels
- **Security**: Optional PIN protection for schedule editing

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
- **Backend (new)**: Go 1.25 + gqlgen + sqlc + SQLite (goose migrations)

## Backend GraphQL API

The repository now includes a lightweight Go service that exposes the local data model through a GraphQL API. It is built with `gqlgen`, uses `sqlc` for type-safe data access, and persists data to `./db/backend.db`.

**Want to try everything in Playground quickly?** See `docs/graphql-sandbox.md` for ready-to-paste queries and mutations that cover every resolver.

**Connecting to Raspberry Pi hardware?** See `docs/hardware-integration.md` for a complete guide on how the software connects to the hardware dispensing system.

### Tooling

All backend commands are defined in the root `Makefile`:

```bash
make migrate-up        # Apply goose migrations to db/backend.db
make migrate-down      # Rollback the last migration
make migrate-create    # Create a new SQL migration (pass name=add_table)
make sql               # Regenerate sqlc query layer
make graphql           # Regenerate gqlgen types/resolvers
make serve             # Run the GraphQL server (go run server.go)
make test              # go test ./graph/... -v
make test-coverage     # go test ./graph/... -cover
```

Before running the server, install the CLI tools once:

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install github.com/99designs/gqlgen@latest
```

### Running the API

```bash
make migrate-up   # create ./db/backend.db with baseline data model
make serve        # starts GraphQL on http://localhost:8081/query
```

Environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8081` | HTTP port for the GraphQL service |
| `DB_PATH` | `./db/backend.db` | Path to the SQLite database file |

### Connecting the Expo App to GraphQL

1. Start the backend: `make migrate-up && make serve`.
2. Point Expo at the GraphQL endpoint by exporting:
   ```bash
   export EXPO_PUBLIC_GRAPHQL_URL="http://localhost:8081/query"
   export EXPO_PUBLIC_GRAPHQL_PATIENT_ID="patient_demo_001"
   ```
   (replace the patient ID with any record returned by `patients` query).
3. Launch the web app via `npm run web` or `expo start --web`.

When both environment variables are set the Pill Library, Hardware Mapping modal, and profile sync all use GraphQL mutations (`upsertMedication`, `deleteMedication`) rather than the local JSON/SQLite fallbacks. Hardware metadata is persisted in `Medication.metadata.hardwareProfile`, so the web UI and backend stay in sync.

### Built-in Login (optional)

If you omit `EXPO_PUBLIC_GRAPHQL_PATIENT_ID`, the Expo app now opens with a lightweight login screen:

1. Enter the caregiver email. If it already exists in the backend, we fetch it through `userByEmail`. Otherwise we call `upsertUser` to create it.
2. Pick one of the user’s patients (queried via `patients(userId: ...)`) or create a new patient inline. The selected patient ID is stored in local session state and reused on reload.

Once logged in, all pill/hardware mutations target the selected `userId`/`patientId` automatically. You can still bypass the login for kiosk or demo setups by exporting the patient ID env var.

### Sample GraphQL Operations

Query a patient with nested medications/schedules:

```graphql
query PatientOverview($id: ID!) {
  patient(id: $id) {
    firstName
    lastName
    timezone
    medications {
      name
      stockCount
    }
    schedules {
      title
      rrule
      items {
        qty
        medication {
          name
        }
      }
    }
  }
}
```

Create a schedule that dispenses two medications:

```graphql
mutation CreateSchedule($input: ScheduleInput!) {
  createSchedule(input: $input) {
    id
    status
    items {
      qty
      medication {
        name
      }
    }
  }
}
```

`ScheduleInput` matches the on-device schema, so you can reuse the same payloads when syncing.

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
│   │   ├── SignupScreen.tsx      # Login/Signup authentication
│   │   ├── TodayScreen.tsx       # Daily overview and adherence
│   │   ├── ScheduleScreen.tsx    # Week planner for schedules
│   │   ├── ScheduleWizardScreen.tsx  # Modal for creating schedules
│   │   ├── HistoryScreen.tsx     # Historical dispense events
│   │   ├── HardwareMappingScreen.tsx  # Hardware device configuration
│   │   ├── SettingsScreen.tsx     # App settings and logout
│   │   └── DispenseAlertScreen.tsx
│   ├── navigation/        # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── store/             # Zustand state stores
│   │   ├── sessionStore.ts    # User and patient session
│   │   ├── pillStore.ts       # Medications (syncs with GraphQL)
│   │   ├── scheduleStore.ts   # Schedules
│   │   ├── todayStore.ts      # Today's events
│   │   ├── hardwareStore.ts   # Hardware profiles
│   │   └── settingsStore.ts  # App settings
│   ├── data/              # Database layer (local SQLite)
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   ├── migrate.ts
│   │   ├── seed.ts
│   │   └── repositories/
│   │       ├── PillRepository.ts
│   │       ├── ScheduleRepository.ts
│   │       ├── EventLogRepository.ts
│   │       └── PillHardwareRepository.ts
│   ├── api/               # GraphQL API client
│   │   ├── graphqlClient.ts
│   │   ├── auth.ts         # Authentication mutations/queries
│   │   └── medications.ts  # Medication mutations/queries
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
├── server.go              # Go GraphQL server
├── graph/                 # GraphQL schema and resolvers
│   ├── schema.graphqls    # GraphQL schema definition
│   ├── schema.resolvers.go
│   └── model/
├── db/                    # Backend database
│   ├── backend.db         # SQLite database file
│   ├── migrations/        # Goose migration files
│   └── queries/          # SQLC query definitions
├── internal/db/          # Generated SQLC code
├── package.json
├── go.mod                 # Go dependencies
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
├── Makefile              # Backend build commands
└── README.md
```

## Data Model

### Backend Database Schema (SQLite)

The backend uses SQLite with the following tables:

#### **users**
Stores caregiver/user accounts for authentication and multi-user support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique user identifier |
| `email` | TEXT | NOT NULL UNIQUE | User email address |
| `full_name` | TEXT | NOT NULL | User's full name |
| `phone` | TEXT | NULL | Optional phone number |
| `timezone` | TEXT | NOT NULL DEFAULT 'UTC' | User's timezone |
| `password_hash` | TEXT | NULL | Hashed password (added in migration 0004) |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Last update timestamp |

#### **patients**
Stores patient information. One user can have multiple patients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique patient identifier |
| `user_id` | TEXT | NULL, FK → users.id | Associated caregiver (ON DELETE SET NULL) |
| `first_name` | TEXT | NOT NULL | Patient's first name |
| `last_name` | TEXT | NOT NULL | Patient's last name |
| `date_of_birth` | TEXT | NULL | Date of birth (ISO format) |
| `gender` | TEXT | NULL | Gender |
| `timezone` | TEXT | NOT NULL DEFAULT 'UTC' | Patient's timezone |
| `preferred_language` | TEXT | NULL | Preferred language |
| `caregiver_name` | TEXT | NULL | Caregiver name |
| `caregiver_email` | TEXT | NULL | Caregiver email |
| `caregiver_phone` | TEXT | NULL | Caregiver phone |
| `notes` | TEXT | NULL | Additional notes |
| `metadata` | TEXT | NOT NULL DEFAULT '{}' | JSON metadata |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Last update timestamp |

**Indexes:** `idx_patients_user_id` on `user_id`

#### **medications**
Stores medication information for each patient.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique medication identifier |
| `patient_id` | TEXT | NOT NULL, FK → patients.id | Associated patient (ON DELETE CASCADE) |
| `name` | TEXT | NOT NULL | Medication name |
| `nickname` | TEXT | NULL | Optional nickname |
| `color` | TEXT | NULL | Hex color code for UI |
| `shape` | TEXT | NULL | Pill shape (round, oval, oblong, capsule) |
| `dosage_form` | TEXT | NULL | Form (tablet, capsule, etc.) |
| `strength` | TEXT | NULL | Strength description |
| `dosage_mg` | INTEGER | NULL | Dosage in milligrams |
| `instructions` | TEXT | NULL | Usage instructions |
| `stock_count` | INTEGER | NOT NULL DEFAULT 0 | Current stock level |
| `low_stock_threshold` | INTEGER | NOT NULL DEFAULT 0 | Alert threshold |
| `cartridge_index` | INTEGER | NULL | Physical cartridge position (0-9) |
| `manufacturer` | TEXT | NULL | Manufacturer name |
| `external_id` | TEXT | NULL | External system ID (e.g., NDC) |
| `max_daily_dose` | INTEGER | NOT NULL DEFAULT 1 | Maximum pills per day (added in migration 0003) |
| `metadata` | TEXT | NOT NULL DEFAULT '{}' | JSON metadata (includes hardwareProfile) |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Last update timestamp |

**Indexes:** `idx_medications_patient` on `patient_id`

#### **schedules**
Stores medication schedules with recurrence rules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique schedule identifier |
| `patient_id` | TEXT | NOT NULL, FK → patients.id | Associated patient (ON DELETE CASCADE) |
| `title` | TEXT | NOT NULL | Schedule title/name |
| `timezone` | TEXT | NOT NULL DEFAULT 'UTC' | Schedule timezone |
| `rrule` | TEXT | NOT NULL | RFC5545 recurrence rule |
| `start_date_iso` | TEXT | NOT NULL | Schedule start date (ISO format) |
| `end_date_iso` | TEXT | NULL | Optional end date (ISO format) |
| `lockout_minutes` | INTEGER | NOT NULL DEFAULT 60 | Minimum time between doses |
| `snooze_interval_minutes` | INTEGER | NOT NULL DEFAULT 10 | Snooze duration |
| `snooze_max` | INTEGER | NOT NULL DEFAULT 3 | Maximum snooze count |
| `status` | TEXT | NOT NULL DEFAULT 'ACTIVE' | ACTIVE, PAUSED, or ARCHIVED |
| `notes` | TEXT | NULL | Additional notes |
| `metadata` | TEXT | NOT NULL DEFAULT '{}' | JSON metadata |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Last update timestamp |

**Indexes:** `idx_schedules_patient` on `patient_id`

#### **schedule_items**
Junction table linking medications to schedules with quantities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique schedule item identifier |
| `schedule_id` | TEXT | NOT NULL, FK → schedules.id | Associated schedule (ON DELETE CASCADE) |
| `medication_id` | TEXT | NOT NULL, FK → medications.id | Associated medication (ON DELETE CASCADE) |
| `qty` | INTEGER | NOT NULL DEFAULT 1 | Quantity per dose |
| `instructions` | TEXT | NULL | Item-specific instructions |

**Indexes:** 
- `idx_schedule_items_schedule` on `schedule_id`
- `idx_schedule_items_medication` on `medication_id`

#### **dispense_events**
Tracks all medication dispense events and adherence.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique event identifier |
| `patient_id` | TEXT | NOT NULL, FK → patients.id | Associated patient (ON DELETE CASCADE) |
| `schedule_id` | TEXT | NOT NULL, FK → schedules.id | Associated schedule (ON DELETE CASCADE) |
| `schedule_item_id` | TEXT | NULL, FK → schedule_items.id | Specific schedule item (ON DELETE SET NULL) |
| `due_at_iso` | TEXT | NOT NULL | Scheduled time (ISO format) |
| `acted_at_iso` | TEXT | NULL | Actual action time (ISO format) |
| `status` | TEXT | NOT NULL | PENDING, TAKEN, SKIPPED, SNOOZED, FAILED, MISSED |
| `action_source` | TEXT | NULL | Source of action (e.g., "app", "device") |
| `notes` | TEXT | NULL | Additional notes |
| `metadata` | TEXT | NOT NULL DEFAULT '{}' | JSON metadata |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Creation timestamp |

**Indexes:**
- `idx_dispense_events_patient` on `patient_id`
- `idx_dispense_events_schedule` on `schedule_id`

#### **patient_tags** (Optional)
Stores tags/labels for organizing patients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique tag identifier |
| `patient_id` | TEXT | NOT NULL, FK → patients.id | Associated patient (ON DELETE CASCADE) |
| `label` | TEXT | NOT NULL | Tag label |
| `color` | TEXT | NOT NULL DEFAULT '#6366f1' | Tag color (hex) |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | Creation timestamp |

### GraphQL Schema

The GraphQL API exposes the following types and operations:

#### Types

- **User**: `id`, `email`, `fullName`, `phone`, `timezone`, `createdAt`, `updatedAt`, `patients[]`
- **Patient**: `id`, `userId`, `firstName`, `lastName`, `dateOfBirth`, `gender`, `timezone`, `preferredLanguage`, `caregiverName`, `caregiverEmail`, `caregiverPhone`, `notes`, `metadata`, `createdAt`, `updatedAt`, `medications[]`, `schedules[]`, `upcomingDispenseEvents[]`
- **Medication**: `id`, `patientId`, `name`, `nickname`, `color`, `shape`, `dosageForm`, `strength`, `dosageMg`, `instructions`, `stockCount`, `lowStockThreshold`, `cartridgeIndex`, `manufacturer`, `externalId`, `maxDailyDose`, `metadata`, `createdAt`, `updatedAt`
- **Schedule**: `id`, `patientId`, `title`, `timezone`, `rrule`, `startDateISO`, `endDateISO`, `lockoutMinutes`, `snoozeIntervalMinutes`, `snoozeMax`, `status` (ACTIVE/PAUSED/ARCHIVED), `notes`, `metadata`, `items[]`, `createdAt`, `updatedAt`
- **ScheduleItem**: `id`, `scheduleId`, `medication`, `qty`, `instructions`
- **DispenseEvent**: `id`, `patientId`, `scheduleId`, `scheduleItemId`, `dueAtISO`, `actedAtISO`, `status` (PENDING/TAKEN/SKIPPED/SNOOZED/FAILED/MISSED), `actionSource`, `notes`, `metadata`, `createdAt`

#### Enums

- **ScheduleStatus**: `ACTIVE`, `PAUSED`, `ARCHIVED`
- **DispenseStatus**: `PENDING`, `TAKEN`, `SKIPPED`, `SNOOZED`, `FAILED`, `MISSED`

#### Queries

- `ping`: Health check
- `users`: List all users
- `user(id: ID!)`: Get user by ID
- `userByEmail(email: String!)`: Get user by email
- `patient(id: ID!)`: Get patient by ID
- `patients(userId: ID)`: List patients (optionally filtered by userId)
- `medications(patientId: ID!)`: List medications for a patient
- `medication(id: ID!)`: Get medication by ID
- `schedules(patientId: ID!)`: List schedules for a patient
- `schedule(id: ID!)`: Get schedule by ID
- `dispenseEvents(patientId: ID!, range: DateRangeInput)`: List dispense events for a patient within a date range

#### Mutations

- `upsertUser(input: UserInput!)`: Create or update a user
- `login(input: LoginInput!)`: Authenticate user with email/password
- `createPatient(input: PatientInput!)`: Create a new patient
- `updatePatient(id: ID!, input: PatientInput!)`: Update an existing patient
- `upsertMedication(input: MedicationInput!)`: Create or update a medication
- `deleteMedication(id: ID!)`: Delete a medication
- `createSchedule(input: ScheduleInput!)`: Create a new schedule
- `updateSchedule(id: ID!, input: ScheduleInput!)`: Update an existing schedule
- `archiveSchedule(id: ID!)`: Archive a schedule (sets status to ARCHIVED)
- `recordDispenseAction(input: DispenseActionInput!)`: Record a dispense event

### Frontend TypeScript Types

The frontend uses the following main types (defined in `src/types/index.ts`):

- **Pill**: Medication representation with `id`, `patientId`, `name`, `color`, `shape`, `cartridgeIndex`, `maxDailyDose`, `stockCount`, `lowStockThreshold`, `metadata`, etc.
- **Schedule**: Schedule with `id`, `title`, `times[]`, `rrule`, `startDateISO`, `endDateISO`, `lockoutMinutes`, `snooze`, `items[]`
- **ScheduleItem**: Links schedule to pills with `id`, `scheduleId`, `pillId`, `qty`
- **EventLog**: Local event log with `id`, `dueAtISO`, `groupLabel`, `status`, `actedAtISO`, `detailsJSON`
- **EventStatus**: Enum (PENDING, TAKEN, SKIPPED, SNOOZED, FAILED, MISSED)
- **PillHardwareProfile**: Hardware mapping with `pillId`, `serialNumber`, `manufacturer`, `formFactor`, dimensions, `siloSlot`, `trapdoorOpenMs`, `trapdoorHoldMs`

### Local SQLite Schema (Frontend)

The frontend also maintains a local SQLite database for offline event logging:

- **pill**: Local pill cache (legacy, now synced with GraphQL)
- **schedule**: Local schedule cache (legacy, now synced with GraphQL)
- **schedule_item**: Local schedule item cache
- **event_log**: Local event log for offline tracking
- **pill_hardware_profile**: Hardware profile mappings

Note: When `EXPO_PUBLIC_GRAPHQL_URL` is set, the app primarily uses the GraphQL backend, with local SQLite used for offline event logging and caching.

### Database Relationships

```
users (1) ──< (many) patients
patients (1) ──< (many) medications
patients (1) ──< (many) schedules
patients (1) ──< (many) dispense_events
schedules (1) ──< (many) schedule_items
medications (1) ──< (many) schedule_items
schedules (1) ──< (many) dispense_events
schedule_items (1) ──< (many) dispense_events (optional)
```

**Key Relationships:**
- One **User** can have multiple **Patients** (caregiver managing multiple patients)
- One **Patient** can have multiple **Medications**
- One **Patient** can have multiple **Schedules**
- One **Schedule** contains multiple **ScheduleItems** (each linking to a Medication with a quantity)
- **DispenseEvents** track all medication dispense actions, linked to Patient, Schedule, and optionally a specific ScheduleItem

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

2. **Set up backend database (optional but recommended):**
   ```bash
   # Install Go tools (one-time setup)
   go install github.com/pressly/goose/v3/cmd/goose@latest
   go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
   go install github.com/99designs/gqlgen@latest
   
   # Run migrations to create backend database
   make migrate-up
   
   # Start GraphQL server
   make serve
   ```

3. **Run frontend database migrations (local SQLite):**
   ```bash
   npm run migrate
   ```

4. **Seed sample data (local SQLite only):**
   ```bash
   npm run seed
   ```

   This creates (in local SQLite):
   - 10 pills: Metformin, Atorvastatin, Lisinopril, Levothyroxine, Amlodipine, Omeprazole, Hydrochlorothiazide, Losartan, Ibuprofen, Vitamin D
   - 2 schedules:
     - Daily 08:00: 2× Metformin + 1× Atorvastatin
     - Weekdays 22:00: 1× Atorvastatin

   **Note:** When using GraphQL backend, create data through the API or SignupScreen instead.

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

### Frontend (Expo)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_PUBLIC_GRAPHQL_URL` | No | - | GraphQL API endpoint (e.g., `http://localhost:8081/query`) |
| `EXPO_PUBLIC_GRAPHQL_PATIENT_ID` | No | - | Patient ID to use when bypassing login (for kiosk/demo mode) |

**Usage:**
- If both variables are set: App uses GraphQL backend, bypasses login
- If only `EXPO_PUBLIC_GRAPHQL_URL` is set: App shows login screen, uses GraphQL after authentication
- If neither is set: App uses local SQLite only (offline mode)

### Backend (Go Server)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8081` | HTTP port for GraphQL service |
| `DB_PATH` | No | `./db/backend.db` | Path to SQLite database file |

### Production Setup

For production deployment:
- Configure push notification credentials in `app.json`
- Set up BLE device pairing
- Configure caregiver notification endpoints
- Use environment-specific GraphQL URLs
- Set up proper authentication and authorization

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



