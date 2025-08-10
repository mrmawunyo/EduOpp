import nodemailer from 'nodemailer';
import { generatePresignedUrl } from './replitOSS';

// Email transporter configuration
const createTransporter = () => {
  // For development, use SMTP settings
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

interface EmailAttachment {
  filename: string;
  path: string;
}

interface ApplicationFormEmailData {
  studentEmail: string;
  studentName: string;
  opportunityTitle: string;
  documents: Array<{
    fileName: string;
    objectName: string;
  }>;
}

export async function sendApplicationFormsEmail(data: ApplicationFormEmailData): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    // Generate pre-signed URLs for documents (valid for 7 days)
    const documentLinks = await Promise.all(
      data.documents.map(async (doc) => {
        const url = await generatePresignedUrl(doc.objectName, 7 * 24 * 60 * 60); // 7 days
        return {
          name: doc.fileName,
          url: url
        };
      })
    );

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Application Forms for ${data.opportunityTitle}</h2>
        
        <p>Dear ${data.studentName},</p>
        
        <p>Thank you for your interest in <strong>${data.opportunityTitle}</strong>. Please find the application forms attached below:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Application Forms:</h3>
          <ul style="list-style-type: none; padding: 0;">
            ${documentLinks.map(doc => `
              <li style="margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #007bff;">
                <a href="${doc.url}" style="text-decoration: none; color: #007bff; font-weight: bold;">${doc.name}</a>
                <br>
                <small style="color: #666;">Click to download</small>
              </li>
            `).join('')}
          </ul>
        </div>
        
        <p><strong>Important:</strong> These download links will expire in 7 days. Please download the forms promptly.</p>
        
        <p>If you have any questions about the application process, please contact your teacher or school administration.</p>
        
        <p>Best regards,<br>
        Career Opportunities Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent automatically. Please do not reply to this email address.
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: data.studentEmail,
      subject: `Application Forms - ${data.opportunityTitle}`,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    console.log(`Application forms email sent to ${data.studentEmail}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export async function sendApplicationFormNotification(
  teacherEmail: string,
  teacherName: string,
  studentName: string,
  studentEmail: string,
  opportunityTitle: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Application Form Request</h2>
        
        <p>Dear ${teacherName},</p>
        
        <p>A student has requested application forms for one of your opportunities:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Request Details:</h3>
          <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
          <p><strong>Opportunity:</strong> ${opportunityTitle}</p>
          <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>The application forms have been automatically sent to the student's email address.</p>
        
        <p>Best regards,<br>
        Career Opportunities System</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: teacherEmail,
      subject: `Application Form Request - ${opportunityTitle}`,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to teacher ${teacherEmail}`);
    return true;
  } catch (error) {
    console.error('Teacher notification email error:', error);
    return false;
  }
}