import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!process.env.SMTP_USER) {
    console.log("[Email] SMTP not configured, skipping:", options.subject);
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "Campus Grid <noreply@campusgrid.edu>",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

export function bookingConfirmationEmail(userName: string, bookingTitle: string, resourceName: string, startTime: string, endTime: string) {
  return {
    subject: `Booking Submitted: ${bookingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Campus Grid - Booking Confirmation</h2>
        <p>Hi ${userName},</p>
        <p>Your booking has been submitted and is pending approval.</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Title:</strong> ${bookingTitle}</p>
          <p><strong>Resource:</strong> ${resourceName}</p>
          <p><strong>Time:</strong> ${startTime} — ${endTime}</p>
          <p><strong>Status:</strong> Pending Approval</p>
        </div>
        <p>You'll be notified once your booking is reviewed.</p>
        <p style="color: #6b7280; font-size: 14px;">— Campus Grid System</p>
      </div>
    `,
  };
}

export function bookingApprovedEmail(userName: string, bookingTitle: string, resourceName: string, comment?: string) {
  return {
    subject: `Booking Approved: ${bookingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Campus Grid - Booking Approved</h2>
        <p>Hi ${userName},</p>
        <p>Your booking <strong>${bookingTitle}</strong> for <strong>${resourceName}</strong> has been approved!</p>
        ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ""}
        <p style="color: #6b7280; font-size: 14px;">— Campus Grid System</p>
      </div>
    `,
  };
}

export function bookingRejectedEmail(userName: string, bookingTitle: string, resourceName: string, comment?: string) {
  return {
    subject: `Booking Rejected: ${bookingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Campus Grid - Booking Rejected</h2>
        <p>Hi ${userName},</p>
        <p>Your booking <strong>${bookingTitle}</strong> for <strong>${resourceName}</strong> has been rejected.</p>
        ${comment ? `<p><strong>Reason:</strong> ${comment}</p>` : ""}
        <p style="color: #6b7280; font-size: 14px;">— Campus Grid System</p>
      </div>
    `,
  };
}

export function waitlistPromotedEmail(userName: string, bookingTitle: string, resourceName: string) {
  return {
    subject: `Waitlist Update: ${bookingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Campus Grid - Waitlist Promotion</h2>
        <p>Hi ${userName},</p>
        <p>Your waitlisted booking <strong>${bookingTitle}</strong> for <strong>${resourceName}</strong> has been promoted! Your booking is now pending approval.</p>
        <p style="color: #6b7280; font-size: 14px;">— Campus Grid System</p>
      </div>
    `,
  };
}

export function bookingCancelledEmail(userName: string, bookingTitle: string, resourceName: string) {
  return {
    subject: `Booking Cancelled: ${bookingTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6b7280;">Campus Grid - Booking Cancelled</h2>
        <p>Hi ${userName},</p>
        <p>Your booking <strong>${bookingTitle}</strong> for <strong>${resourceName}</strong> has been cancelled.</p>
        <p style="color: #6b7280; font-size: 14px;">— Campus Grid System</p>
      </div>
    `,
  };
}
