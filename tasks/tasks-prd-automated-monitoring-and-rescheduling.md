# Task List: Automated Weather Monitoring & Flight Rescheduling

## Relevant Files

- `src/types/User.ts` - Update TrainingLevel type to Level 1-4
- `src/types/Flight.ts` - Add new status types and rescheduling fields
- `src/types/Weather.ts` - Add weather minimum types and color status
- `src/services/weatherService.ts` - Update safety assessment logic with specific minimums
- `src/services/flightService.ts` - Add rescheduleFlight and getAllFlights functions
- `src/services/emailService.ts` - NEW - Email notification service (or add to functions)
- `src/hooks/useFlights.ts` - Add rescheduling functionality
- `src/components/flights/FlightCard.tsx` - Add Reschedule button
- `src/components/flights/RescheduleModal.tsx` - NEW - Rescheduling UI modal
- `src/components/flights/RescheduleOptions.tsx` - NEW - AI suggestions display
- `src/components/admin/AdminDashboard.tsx` - NEW - Admin page component
- `src/components/admin/FlightTable.tsx` - NEW - Flight list table for admin
- `src/App.tsx` - Add /admin route
- `functions/src/index.ts` - Add scheduled weather monitoring function
- `functions/src/weatherMonitor.ts` - NEW - Hourly weather check logic
- `functions/src/emailNotification.ts` - NEW - Email sending logic
- `functions/package.json` - Add nodemailer dependency
- `firestore.rules` - Update rules for new status fields
- `firebase.json` - Configure scheduled function

### Notes

- Unit tests should typically be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests
- This feature builds on existing infrastructure (Firebase, weatherService, aiService)
- Scheduled functions require Firebase Blaze plan (pay-as-you-go)

## Tasks

- [x] 1.0 Update Training Level System to 4-Level Model with Specific Weather Minimums
  - [x] 1.1 Update `src/types/User.ts` TrainingLevel type to "level-1" | "level-2" | "level-3" | "level-4"
  - [x] 1.2 Create weather minimum constants in `src/types/Weather.ts` for each level (visibility, winds, ceiling)
  - [x] 1.3 Add thunderstorm and icing detection types to Weather.ts
  - [x] 1.4 Update `src/services/weatherService.ts` safety assessment logic to use specific weather minimums
  - [x] 1.5 Implement thunderstorm detection (check weather.weather[0].id for codes 200-299)
  - [x] 1.6 Implement icing detection (temp < 32°F + precipitation present)
  - [x] 1.7 Update color status calculation (GREEN/YELLOW/RED) based on training level
  - [x] 1.8 Update Login/Register components to use Level 1-4 dropdown instead of certification names
  - [ ] 1.9 Update existing user documents in Firestore (migration script or manual) - TODO: Manual migration
  - [ ] 1.10 Test safety logic with different weather scenarios for each level - TODO: Testing phase

- [x] 2.0 Implement Automated Hourly Weather Monitoring (Cloud Function)
  - [x] 2.1 Create `functions/src/weatherMonitor.ts` module for monitoring logic
  - [x] 2.2 Implement function to query all "scheduled" flights with future departure times
  - [x] 2.3 Implement weather recheck logic (reuse existing weatherService pattern)
  - [x] 2.4 Add status comparison logic (compare new vs stored lastSafetyStatus)
  - [x] 2.5 Implement Firestore update when status changes (update weatherData, lastSafetyStatus, weatherCheckedAt)
  - [x] 2.6 Add scheduled function trigger in `functions/src/index.ts` using `functions.pubsub.schedule('every 1 hours')`
  - [x] 2.7 Add error handling and logging for monitoring function
  - [x] 2.8 Implement batch processing if needed (limit to 50 flights per execution)
  - [x] 2.9 Add retry logic for failed weather API calls
  - [ ] 2.10 Test scheduled function locally using Firebase Emulator Suite - TODO: Testing phase

- [x] 3.0 Build In-App Notification System (Changed from Email)
  - [x] 3.1 Added needsRescheduling flag to Flight type (replaces email)
  - [x] 3.2 Weather alert banner implemented in FlightCard component
  - [x] 3.3 Pulsing animation for weather alerts
  - [x] 3.4 Weather monitoring sets needsRescheduling flag when status changes to unsafe
  - [x] 3.5 Notification dismissed when flight is rescheduled
  - [x] 3.6 Real-time updates via Firestore listeners (instant notifications)

- [x] 4.0 Create Flight Rescheduling Feature (Manual + AI-Assisted)
  - [x] 4.1 Add "Reschedule" button to `src/components/flights/FlightCard.tsx`
  - [x] 4.2 Create `src/components/flights/RescheduleModal.tsx` component with two-option layout
  - [x] 4.3 Implement "Option A: Pick New Time" - manual reschedule form
  - [x] 4.4 Allow editing of all fields (departure, destination, date, time) in manual reschedule
  - [x] 4.5 Implement "Option B: Get AI Suggestions" - call AI service for 3 alternatives
  - [x] 4.6 AI suggestions displayed as cards within RescheduleModal
  - [x] 4.7 AI service already supports time-based reschedule suggestions
  - [x] 4.8 Implement `rescheduleFlight()` in `src/services/flightService.ts`
  - [x] 4.9 Reschedule logic: create new flight, update old flight status to "rescheduled", link via IDs
  - [x] 4.10 Add rescheduledFrom, rescheduledTo, rescheduledAt fields to Flight type
  - [x] 4.11 Update useFlights hook to expose rescheduleFlight function
  - [x] 4.12 Hide rescheduled flights from main dashboard view (filter status !== "rescheduled")
  - [ ] 4.13 Test both manual and AI-assisted rescheduling workflows - TODO: Testing phase

- [x] 5.0 Build Admin Dashboard (`/admin` Route)
  - [x] 5.1 Create `src/components/admin/AdminDashboard.tsx` main component
  - [x] 5.2 Implement three-tab layout (Active, Rescheduled, Canceled)
  - [x] 5.3 Table component integrated into AdminDashboard (single component approach)
  - [x] 5.4 Implement `subscribeToAllFlights()` in flightService.ts (query all flights)
  - [x] 5.5 Add Firestore real-time listener for all flights in admin
  - [x] 5.6 Display flight details: student name, level, airports, date/time, status, safety color
  - [x] 5.7 Basic table layout (sortable columns not implemented - future enhancement)
  - [x] 5.8 Add "Refresh Weather" button that manually triggers weather checks
  - [x] 5.9 Show flight status and reschedule alerts (full history tracking available in data)
  - [x] 5.10 Add route `/admin` in `src/App.tsx` (no auth guard, just hidden URL)
  - [x] 5.11 Style admin dashboard with table/grid layout and color-coded status badges
  - [ ] 5.12 Test admin dashboard with multiple users' flights - TODO: Testing phase

- [x] 6.0 Update Flight Status System and Data Model
  - [x] 6.1 Update Flight type in `src/types/Flight.ts` to add new status: "rescheduled"
  - [x] 6.2 Add fields to Flight type: rescheduledFrom, rescheduledTo (both string | null)
  - [x] 6.3 Add fields: rescheduledAt (Date | null), weatherCheckedAt (Date | null)
  - [x] 6.4 Add field: lastSafetyStatus (string for GREEN/YELLOW/RED)
  - [x] 6.5 Add field: needsRescheduling (boolean) for in-app notifications
  - [x] 6.6 Update Firestore security rules to allow reading all flights when authenticated
  - [x] 6.7 Weather alert banner shows when needsRescheduling is true
  - [x] 6.8 Update dashboard filter to exclude status "rescheduled" from main view
  - [ ] 6.9 Add helper function to mark flights as "completed" when departure time has passed - TODO: Future enhancement
  - [ ] 6.10 Test all status transitions - TODO: Testing phase

- [ ] 7.0 Testing and Deployment
  - [ ] 7.1 Test training level system with all 4 levels and various weather conditions
  - [ ] 7.2 Test scheduled function execution (use Firebase Emulator or deploy to staging)
  - [ ] 7.3 Test email delivery with multiple scenarios (status changes, retries)
  - [ ] 7.4 Test manual rescheduling workflow (change time, change destination)
  - [ ] 7.5 Test AI-assisted rescheduling (3 suggestions, selection, creation)
  - [ ] 7.6 Test admin dashboard with 10+ flights from multiple users
  - [ ] 7.7 Test edge cases (reschedule multiple times, cancel rescheduled flight)
  - [ ] 7.8 Deploy updated Cloud Functions: `firebase deploy --only functions`
  - [ ] 7.9 Deploy frontend: `npm run build && firebase deploy --only hosting`
  - [ ] 7.10 Monitor scheduled function logs for 24 hours to ensure it runs correctly
  - [ ] 7.11 Verify API usage stays within limits (OpenWeatherMap < 1000 calls/day)
  - [ ] 7.12 Create documentation for admin dashboard usage

