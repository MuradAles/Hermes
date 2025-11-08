import * as nodemailer from "nodemailer";
import * as logger from "firebase-functions/logger";

/**
 * Email service for sending weather alerts
 * Uses Gmail SMTP with App Password authentication
 */

interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Create Nodemailer transporter configured for Gmail SMTP
 */
function createTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    throw new Error(
      "Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
    );
  }

  // Remove spaces from App Password (Gmail App Passwords can have spaces)
  const cleanPassword = gmailPassword.replace(/\s/g, "");

  // Validate App Password format (should be 16 characters)
  if (cleanPassword.length !== 16) {
    logger.error(
      `Invalid Gmail App Password format. Expected 16 characters, got ${cleanPassword.length}. ` +
      `Please generate a new App Password from: https://myaccount.google.com/apppasswords`
    );
    throw new Error(
      `Invalid Gmail App Password format. Expected 16 characters, got ${cleanPassword.length}. ` +
      `Please check your GMAIL_APP_PASSWORD environment variable.`
    );
  }

  logger.info(`Creating email transporter for ${gmailUser} (password length: ${cleanPassword.length})`);

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: cleanPassword, // This should be a Gmail App Password, not regular password
    },
  });
}

/**
 * Send weather alert email to a user
 */
export async function sendWeatherAlertEmail(
  userEmail: string,
  userName: string,
  flightDetails: {
    flightId: string;
    departure: string;
    arrival: string;
    scheduledTime: string;
    safetyStatus: string;
    safetyScore: number;
    issues: string[];
    trainingLevel: string;
  },
  dashboardUrl: string = "https://hermes-path.web.app"
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const {safetyStatus, safetyScore, issues, departure, arrival, scheduledTime, trainingLevel, flightId} = flightDetails;

    // Determine email subject and color based on safety status
    let statusColor = "#10b981"; // Green
    let statusText = "Safe";
    let urgencyText = "";

    if (safetyStatus === "dangerous") {
      statusColor = "#ef4444"; // Red
      statusText = "DANGEROUS";
      urgencyText = "⚠️ URGENT: ";
    } else if (safetyStatus === "marginal") {
      statusColor = "#f59e0b"; // Yellow
      statusText = "MARGINAL";
      urgencyText = "⚠️ WARNING: ";
    }

    // Format scheduled time
    const scheduledDate = new Date(scheduledTime);
    const formattedTime = scheduledDate.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Create HTML email template
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weather Alert - Flight Schedule Pro</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Flight Schedule Pro</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">Weather Alert Notification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${userName || "there"},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${urgencyText}We've detected weather conditions that may affect your scheduled flight.
              </p>
              
              <!-- Flight Details Card -->
              <div style="background-color: #f9fafb; border-left: 4px solid ${statusColor}; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">Flight Details</h2>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Route:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${departure} → ${arrival}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Scheduled:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Training Level:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${formatTrainingLevel(trainingLevel)}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Safety Status -->
              <div style="background-color: ${statusColor}15; border: 2px solid ${statusColor}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <div style="margin-bottom: 10px;">
                  <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                    ${statusText}
                  </span>
                </div>
                <p style="margin: 10px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">
                  Safety Score: ${safetyScore}%
                </p>
              </div>
              
              <!-- Weather Issues -->
              ${issues.length > 0 ? `
              <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px; font-weight: 600;">Weather Concerns:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                  ${issues.map((issue) => `<li style="margin-bottom: 8px;">${issue}</li>`).join("")}
                </ul>
              </div>
              ` : ""}
              
              <!-- Call to Action -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}/dashboard?flight=${flightId}" 
                   style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                  View Flight & Reschedule
                </a>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
                This is an automated notification from Flight Schedule Pro.<br>
                Weather conditions are monitored hourly and may change.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} Flight Schedule Pro. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions: EmailConfig = {
      from: `"Flight Schedule Pro" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `${urgencyText}Weather Alert: ${departure} → ${arrival} (${statusText})`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${userEmail}`, {
      messageId: info.messageId,
      flightId,
    });

    return true;
  } catch (error: any) {
    logger.error(`Failed to send email to ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Format training level for display
 */
function formatTrainingLevel(level: string): string {
  const levels: Record<string, string> = {
    "level-1": "Student Pilot",
    "level-2": "Private Pilot",
    "level-3": "Commercial Pilot",
    "level-4": "Instrument Rated",
    "Student Pilot": "Student Pilot",
    "Private Pilot": "Private Pilot",
    "Commercial Pilot": "Commercial Pilot",
    "Instrument Rated": "Instrument Rated",
  };
  return levels[level] || level;
}

/**
 * Test email function (for development)
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Flight Schedule Pro" <${process.env.GMAIL_USER}>`,
      to,
      subject: "Test Email - Flight Schedule Pro",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from Flight Schedule Pro email service.</p>
        <p>If you received this, your email configuration is working correctly!</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Test email sent successfully to ${to}`, {
      messageId: info.messageId,
    });

    return true;
  } catch (error: any) {
    logger.error(`Failed to send test email to ${to}:`, error);
    throw error;
  }
}

