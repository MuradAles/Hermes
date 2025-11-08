# Product Requirements Document: Automated Weather Monitoring & Flight Rescheduling

## Introduction/Overview

This feature enhances Flight Schedule Pro with automated weather monitoring, real-time email notifications, intelligent rescheduling capabilities, and a comprehensive admin dashboard. The system will automatically check weather conditions hourly for all upcoming flights, notify students when conditions become unsafe, provide AI-powered rescheduling options, and give administrators visibility into all flight operations.

**Problem Statement:** Currently, weather is only checked at flight creation time. If conditions change after booking, students aren't notified and may show up for unsafe flights. Additionally, there's no way to reschedule flights or track historical flight changes.

**Solution:** Implement automated hourly weather monitoring with email notifications, a two-option rescheduling system (manual or AI-assisted), and an admin dashboard showing all flight statuses.

## Goals

1. **Automate Weather Monitoring:** Check weather every hour for all upcoming flights and detect safety status changes
2. **Proactive Notifications:** Email students immediately when their flight becomes unsafe due to weather changes
3. **Streamline Rescheduling:** Provide both manual and AI-assisted rescheduling options with full flexibility
4. **Comprehensive Tracking:** Maintain complete history of all bookings, cancellations, and rescheduling actions
5. **Administrative Oversight:** Enable administrators to monitor all flight operations from a central dashboard
6. **Refine Training Levels:** Implement a clearer 4-level training system with color-based weather restrictions

## User Stories

### Student User Stories
- As a student pilot, I want to receive an email notification when my flight becomes unsafe due to weather changes, so I can reschedule before traveling to the airport
- As a student, I want to reschedule my flight by either picking a new time myself or getting AI suggestions, so I have flexibility in how I plan
- As a student, I want to be able to change both the time and destination when rescheduling, so I can adapt my training plan
- As a Level 3 student, I want the system to allow me to fly in yellow weather conditions, so I can build experience in marginal weather
- As a Level 4 student, I want to fly in all weather conditions (including red), so I can complete advanced training

### Administrator User Stories
- As an administrator, I want to see all active flights with their safety status on a dashboard, so I can monitor overall operations
- As an administrator, I want to view all rescheduled flights with their history, so I can understand scheduling patterns
- As an administrator, I want to see canceled flights, so I can track cancellation rates and reasons
- As an administrator, I want to manually trigger weather checks, so I can force updates when needed

## Functional Requirements

### 1. Training Level System Refinement
1.1. The system must support 4 training levels with the following specific weather minimums:
   - **Level 1 (Beginner):** 
     - Visibility: > 5 miles
     - Winds: < 10 knots
     - Conditions: Clear skies only
     - Color: GREEN only
   - **Level 2 (Advanced Beginner):**
     - Visibility: > 4 miles
     - Winds: < 15 knots
     - Conditions: Clear to scattered clouds
     - Color: GREEN only
   - **Level 3 (Intermediate):**
     - Visibility: > 3 miles
     - Ceiling: > 1000 feet
     - Winds: < 20 knots
     - Conditions: VFR (Visual Flight Rules)
     - Color: GREEN or YELLOW
   - **Level 4 (Advanced/Instrument Rated):**
     - Visibility: Any (IMC acceptable)
     - Ceiling: Any
     - Winds: < 30 knots
     - Conditions: IMC acceptable, but NO thunderstorms or icing
     - Color: GREEN, YELLOW, or RED (unless thunderstorms/icing)

1.2. The color coding system must work as follows:
   - **GREEN:** Weather meets all requirements for the student's level (safe)
   - **YELLOW:** Weather is marginal but acceptable for Level 3+ students
   - **RED:** Weather is dangerous or only acceptable for Level 4 students

1.3. The User interface must be updated to use "Level 1", "Level 2", "Level 3", "Level 4" labels instead of pilot certification names

1.4. The weather safety assessment logic must evaluate each waypoint's weather conditions against these specific minimums

1.5. The system must check for thunderstorms (using weather condition codes) and icing conditions (temperature + precipitation)

### 2. Automated Weather Monitoring
2.1. A Cloud Function must run every 1 hour automatically (Firebase Scheduled Function)

2.2. The function must query all flights with status "scheduled" and departure time in the future

2.3. For each flight, the system must:
   - Recalculate the flight path with waypoints
   - Fetch current/forecast weather at all waypoints
   - Assess safety based on the student's training level
   - Determine the overall safety status (GREEN/YELLOW/RED)

2.4. The system must compare the new safety status with the previously stored status

2.5. If the status has changed (e.g., GREEN → RED or RED → GREEN), the system must:
   - Update the flight document in Firestore with the new weather data
   - Trigger an email notification to the student
   - Log the status change with timestamp

2.6. The system must process flights efficiently to stay within API rate limits

### 3. Email Notification System
3.1. When a flight's safety status changes to unsafe (YELLOW or RED for students not qualified), the system must send an email notification

3.2. The email must include:
   - Flight details (departure airport, destination airport, date/time)
   - A message indicating the flight needs rescheduling due to weather
   - A link to the website (dashboard)

3.3. Email format example:
```
Subject: Weather Alert: Your Flight Needs Rescheduling

Your flight from [Departure] to [Destination] on [Date] at [Time] needs to be rescheduled due to weather conditions.

Please visit: [Website URL]
```

3.4. Emails must be sent using Firebase Cloud Functions (via Nodemailer or similar)

3.5. The system must not send duplicate emails for the same status change

### 4. Flight Rescheduling Feature
4.1. Each flight card must display a "Reschedule" button when the flight status is "scheduled"

4.2. When the user clicks "Reschedule", the system must show two options:
   - **Option A:** "Pick New Time" - Manual rescheduling
   - **Option B:** "Get AI Suggestions" - AI-assisted rescheduling

4.3. **Option A - Manual Rescheduling:**
   - Display a form pre-filled with current flight details
   - Allow the user to change departure airport, destination airport, date, and time
   - Run weather check on the new flight plan
   - If safe, create new flight and mark old flight as "rescheduled"
   - If unsafe, show warning and let user decide to proceed or change again

4.4. **Option B - AI-Assisted Rescheduling:**
   - Send current flight details and weather constraints to AI service
   - AI generates 3 alternative time suggestions (same day or next few days)
   - Display 3 options with weather status for each
   - User selects one option
   - Create new flight with selected option
   - Mark old flight as "rescheduled"

4.5. When a flight is rescheduled:
   - Create a NEW flight document in Firestore with status "scheduled"
   - Update the OLD flight document with status "rescheduled"
   - Add a reference field linking old flight to new flight (for history tracking)
   - Add a "rescheduledAt" timestamp to the old flight
   - The old flight should be hidden from the main flight list view
   - The old flight should remain visible in the admin dashboard

4.6. Students must be able to reschedule a flight multiple times (each creates a new flight)

### 5. Admin Dashboard (`/admin`)
5.1. Create a new route `/admin` accessible without authentication (hidden URL)

5.2. The dashboard must display three sections/tabs:
   - **Active Flights:** All flights with status "scheduled" or "completed"
   - **Rescheduled Flights:** All flights with status "rescheduled"
   - **Canceled Flights:** All flights with status "canceled"

5.3. For each flight, display:
   - Student name and training level
   - Departure and destination airports
   - Date and time
   - Current safety status (color-coded: GREEN/YELLOW/RED)
   - Flight status (scheduled/completed/rescheduled/canceled)
   - Timestamps (created, updated, rescheduled, canceled)

5.4. The dashboard must show flights from ALL users (not filtered by authentication)

5.5. The dashboard must include a "Refresh Weather" button that manually triggers weather checks for all active flights

5.6. For rescheduled flights, display a link/reference to the new flight that replaced it

5.7. The dashboard must be sortable by date, status, and safety level

5.8. The dashboard must show real-time updates using Firestore listeners

### 6. Flight Status Updates
6.1. Add new flight status values to the Flight type:
   - "scheduled" - Active upcoming flight
   - "completed" - Past flight that occurred
   - "canceled" - Deleted by user
   - "rescheduled" - Old version of a rescheduled flight (hidden from main view)

6.2. The main dashboard flight list must only show flights with status "scheduled"

6.3. The flight history/details view should indicate if a flight was rescheduled and link to the new flight

## Non-Goals (Out of Scope)

- SMS notifications (email only for v1)
- Push notifications to mobile devices
- Automatic cancellation of unsafe flights (only notify, user decides)
- Instructor availability checking
- Aircraft availability tracking
- Multi-student conflict detection when rescheduling
- Predictive weather forecasting beyond 5 days
- Historical weather analytics dashboard
- Automatic rescheduling without user confirmation
- Calendar integration (Google Calendar, Outlook)
- Custom notification preferences (user can't customize email frequency)
- Mobile app for admin dashboard
- Role-based access control (admin vs student roles)

## Design Considerations

### UI/UX Requirements
1. **Reschedule Button:** Should be prominently displayed on flight cards, styled similar to existing buttons
2. **Reschedule Modal:** Two-option choice should be clear with visual distinction
3. **AI Suggestions Display:** Three options displayed as cards with weather status indicators
4. **Admin Dashboard:** Clean table/grid layout with color-coded status badges
5. **Email Design:** Plain text emails (simple and reliable delivery)

### Color Coding Consistency
- GREEN: Safe to fly for this training level
- YELLOW: Marginal conditions (only Level 3+ can fly)
- RED: Dangerous conditions (only Level 4 can fly)
- Use existing CSS color variables for consistency

## Technical Considerations

### Backend Architecture
1. **Firebase Scheduled Function:** 
   - Use `functions.pubsub.schedule('every 1 hours')` for hourly execution
   - Function runs in Cloud Functions v2 with Node.js 20
   - Should handle errors gracefully and log execution status

2. **Email Service:**
   - Use Nodemailer with Gmail SMTP or SendGrid
   - Store email configuration in environment variables
   - Implement retry logic for failed emails
   - Log all sent emails for debugging

3. **Firestore Data Structure:**
   - Add `status` field to Flight documents: "scheduled" | "completed" | "canceled" | "rescheduled"
   - Add `rescheduledFrom` field: Reference to old flight ID (if this is a rescheduled flight)
   - Add `rescheduledTo` field: Reference to new flight ID (if this was rescheduled)
   - Add `rescheduledAt` field: Timestamp when flight was rescheduled
   - Add `weatherCheckedAt` field: Timestamp of last weather check
   - Add `lastSafetyStatus` field: Last known safety status for comparison

4. **API Rate Limits:**
   - OpenWeatherMap: 1,000 calls/day limit
   - Need to optimize: Process flights in batches if necessary
   - Cache weather data for waypoints checked in same batch
   - Consider checking only flights within next 48 hours to reduce API calls

5. **Performance:**
   - Scheduled function should complete within 9 minutes (Cloud Functions timeout)
   - If many flights, process in batches of 50 flights per execution
   - Use Promise.all() for parallel weather checks where possible

### Security Considerations
1. Admin dashboard has no authentication (acceptable for MVP as it's a hidden URL)
2. Email sending should validate recipient email addresses
3. Firestore security rules must allow scheduled functions to read/write all flights
4. Ensure scheduled function has proper IAM permissions

### Integration Points
1. Existing `weatherService.ts` can be reused for weather checks
2. Existing `aiService.ts` can be enhanced for rescheduling suggestions
3. Existing `flightService.ts` needs new functions: `rescheduleFlight()`, `getAllFlights()` (for admin)
4. New service needed: `emailService.ts` or add to Cloud Functions

## Success Metrics

### Functional Success
- Scheduled function runs successfully every hour without errors
- Emails are delivered within 5 minutes of status change detection
- Rescheduling workflow completes in < 10 seconds
- Admin dashboard loads in < 2 seconds with all flight data

### User Experience Success
- Students receive timely notifications before traveling to airport
- Rescheduling process is intuitive and completes in < 3 clicks
- AI suggestions are relevant and consider weather constraints
- Admin can monitor all operations from a single page

### Technical Success
- Stay within OpenWeatherMap API limits (< 1,000 calls/day)
- Cloud Function execution time < 5 minutes on average
- Zero duplicate email notifications
- 100% of status changes are detected and logged

## Open Questions

1. ~~Should Level 2 have different restrictions than Level 1?~~ **RESOLVED:** Both Level 1 and 2 only fly GREEN
2. ~~What email service to use?~~ **DECISION NEEDED:** Nodemailer with Gmail or SendGrid?
3. ~~Should admin be able to cancel flights on behalf of students?~~ **RESOLVED:** No, admin is view-only for MVP
4. **How far in advance should we check weather?** (e.g., only flights within next 48 hours vs all future flights?)
5. **Should we send a reminder email X hours before flight even if weather is good?** (e.g., 24-hour reminder)
6. **Should completed flights be automatically marked as "completed" after departure time passes?**
7. **Email sender address:** What "From" address should appear in emails?
8. **Should students be able to reschedule already-rescheduled flights?** (i.e., chain of rescheduling)

## Implementation Notes

### Development Approach
1. Start with training level system update (foundation for all other features)
2. Implement scheduled weather monitoring function
3. Add email notification system
4. Build rescheduling UI and logic
5. Create admin dashboard
6. Test end-to-end workflow
7. Deploy and monitor

### Testing Strategy
- Unit tests for weather status comparison logic
- Integration tests for scheduled function
- Manual testing of email delivery
- End-to-end testing of rescheduling workflow
- Load testing with multiple flights to ensure performance

### Rollout Plan
1. Deploy scheduled function but keep it disabled initially
2. Test email system with test user accounts
3. Test rescheduling with sample flights
4. Enable scheduled function and monitor logs
5. Gradually increase monitoring frequency if performance allows

