# Email Notifications Implementation Tasks

## Overview
Implement email notification system for weather alerts. Two main features:
1. **Automatic Notifications**: Send emails when hourly weather check detects dangerous conditions
2. **Manual Notifications**: Admin can send weather alerts to specific students from admin dashboard

## Technical Approach
- **Email Service**: Use Nodemailer with Gmail SMTP (free, uses existing Gmail account)
- **Alternative**: SendGrid (100 emails/day free tier) if Gmail doesn't work
- **Trigger**: Firebase Cloud Functions (already have hourly monitoring)
- **Storage**: User emails already in Firestore `users` collection

---

## Task 1: Set Up Email Service Infrastructure

### 1.1 Install Email Dependencies
- [x] Add `nodemailer` and `@types/nodemailer` to `functions/package.json`
- [x] Run `npm install` in functions directory

### 1.2 Create Email Service Module
- [x] Create `functions/src/emailService.ts`
- [x] Implement email configuration (SMTP settings)
- [x] Create `sendWeatherAlertEmail()` function
- [x] Add email template with flight details, weather info, and dashboard link
- [x] Add error handling and logging

### 1.3 Configure Environment Variables
- [x] Add Gmail app password to `.env` file in functions directory
- [x] Add email configuration to environment variables:
  - [x] `GMAIL_USER` (sender email) - ✅ Set: enigmaboxe@gmail.com
  - [x] `GMAIL_APP_PASSWORD` (Gmail app password) - ✅ Set
  - [ ] `DASHBOARD_URL` (link to dashboard) - Optional, defaults to production URL

### 1.4 Test Email Service
- [x] Create test function to send test email (`sendTestEmail()` in emailService.ts)
- [ ] Verify email delivery works (can test after integration)
- [x] Test email template rendering (HTML template created)

---

## Task 2: Automatic Email Notifications (Hourly Weather Check)

### 2.1 Update Weather Monitor to Send Emails
- [x] Modify `functions/src/weatherMonitor.ts`
- [x] When status changes to unsafe (RED or YELLOW for level-1/2):
  - [x] Fetch user email from Firestore `users` collection
  - [x] Call `sendWeatherAlertEmail()` with flight and user details
  - [x] Log email sent status
  - [x] Handle errors gracefully (don't break weather check if email fails)

### 2.2 Prevent Duplicate Emails
- [x] Add `emailSentAt` timestamp to flight document when email is sent
- [x] Only send email if status changed AND no email sent in last 24 hours
- [x] Update flight document with email sent timestamp

### 2.3 Email Content
- [ ] Include flight details (departure, arrival, date/time)
- [ ] Include weather safety status and score
- [ ] Include link to dashboard to reschedule
- [ ] Include training level context (why it's unsafe for them)

---

## Task 3: Manual Email Notifications (Admin Dashboard)

### 3.1 Create Admin Email Function
- [x] Create `functions/src/index.ts` function `sendNotificationsToStudents`
- [x] Accept parameters: `flightIds` (array) - sends to students for selected flights
- [x] Fetch user emails from Firestore for provided flight IDs
- [x] Send email to each student
- [x] Return success/failure status

### 3.2 Add Admin UI Component
- [x] Update `src/components/admin/AdminDashboard.tsx`
- [x] Add "Send Notification" button/action
- [x] Use existing student selection (checkboxes)
- [x] Call Cloud Function to send emails
- [x] Show success/error toast notifications

### 3.3 Admin Email Interface
- [ ] List all students with their flights
- [ ] Show which flights have weather alerts
- [ ] Allow bulk selection (select all, select by training level)
- [ ] Preview email before sending
- [ ] Show email send history/logs

---

## Task 4: Email Templates & Styling

### 4.1 Create HTML Email Template
- [ ] Design responsive email template
- [ ] Include Flight Schedule Pro branding
- [ ] Use inline CSS (email client compatibility)
- [ ] Include clear call-to-action button (link to dashboard)

### 4.2 Email Template Variables
- [ ] Student name
- [ ] Flight details (departure → arrival, date/time)
- [ ] Weather status (Safe/Marginal/Dangerous)
- [ ] Safety score
- [ ] Training level context
- [ ] Dashboard link
- [ ] Reschedule link (pre-filled with flight ID)

### 4.3 Email Template Variants
- [ ] Dangerous weather alert template
- [ ] Marginal weather warning template
- [ ] Admin-sent custom message template

---

## Task 5: Error Handling & Logging

### 5.1 Email Error Handling
- [ ] Handle SMTP connection errors
- [ ] Handle invalid email addresses
- [ ] Handle rate limiting (Gmail: 500 emails/day)
- [ ] Retry logic for transient failures
- [ ] Fallback to in-app notification if email fails

### 5.2 Email Logging
- [ ] Log all email send attempts to Firestore `email_logs` collection
- [ ] Track: recipient, flight ID, status (sent/failed), timestamp, error message
- [ ] Create admin view to see email history

### 5.3 Monitoring & Alerts
- [ ] Monitor email send success rate
- [ ] Alert if email service is down
- [ ] Track email delivery (if using SendGrid with webhooks)

---

## Task 6: Testing & Deployment

### 6.1 Local Testing
- [ ] Test email sending with Firebase emulator
- [ ] Test automatic notifications with test flights
- [ ] Test admin manual notifications
- [ ] Verify email template rendering in different email clients

### 6.2 Production Deployment
- [ ] Deploy email service function
- [ ] Configure production environment variables
- [ ] Test with real Gmail account
- [ ] Monitor email delivery in production

### 6.3 Documentation
- [ ] Document email setup process
- [ ] Document Gmail app password creation
- [ ] Document environment variables
- [ ] Update README with email notification features

---

## Implementation Notes

### Gmail Setup (if using Gmail SMTP)
1. Enable 2-factor authentication on Gmail account
2. Generate App Password: Google Account → Security → 2-Step Verification → App Passwords
3. Use app password (not regular password) in environment variables

### Alternative: SendGrid Setup
1. Create SendGrid account (free tier: 100 emails/day)
2. Create API key
3. Use SendGrid API instead of SMTP
4. Better deliverability and analytics

### Email Rate Limits
- **Gmail SMTP**: 500 emails/day (free account)
- **SendGrid**: 100 emails/day (free tier)
- **Consider**: Upgrade to paid tier if needed

### Database Schema Updates
- Add `emailSentAt` field to `flights` collection
- Create `email_logs` collection for tracking

---

## Success Criteria
- ✅ Automatic emails sent when weather becomes dangerous
- ✅ No duplicate emails (max 1 per 24 hours per flight)
- ✅ Admin can send manual alerts to selected students
- ✅ Email template is professional and includes all necessary info
- ✅ Error handling prevents system failures
- ✅ Email logs are tracked for debugging

---

## Next Steps
Start with **Task 1** - Set up the email service infrastructure first, then move to automatic notifications, then admin manual notifications.


