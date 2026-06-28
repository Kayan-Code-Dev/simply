import nodemailer from 'nodemailer';
import prisma from '../prisma.js';

export async function sendOtpEmail(email, otp) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`\n==========================================`);
  console.log(`[OTP Verification Code for ${email}]: ${otp}`);
  console.log(`==========================================\n`);

  let transporter;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } else {
    // Fallback: Ethereal dynamic test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (err) {
      console.warn('Failed to create Ethereal account, email sending bypassed.', err.message);
      return; // Bypassed
    }
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SITE_NAME || 'Simply.com'}" <no-reply@simply.com>`,
      to: email,
      subject: 'Wallet Security Verification Code',
      text: `Your wallet security verification OTP code is: ${otp}. This code is valid for 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #12131a; color: #ffffff; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1e202f;">
          <h2 style="color: #8b5cf6; text-align: center;">Simply Wallet Security</h2>
          <hr style="border: 0; border-top: 1px solid #1e202f; margin: 20px 0;">
          <p style="font-size: 14px; color: #a0aec0;">You requested a verification code to set or change your Wallet Security PIN.</p>
          <div style="background-color: #1a1c28; border: 1px solid #2d3047; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ffffff; font-family: monospace;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #718096; text-align: center;">This code will expire in 10 minutes. If you did not make this request, please ignore this email.</p>
        </div>
      `
    });

    if (!host) {
      console.log('Ethereal Email sent: %s', info.messageId);
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

export async function sendTemplatedEmail(templateSlug, recipientEmail, variables = {}) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`\n==========================================`);
  console.log(`[Sending Templated Email (${templateSlug}) to ${recipientEmail}]`);
  console.log(`==========================================\n`);

  let template;
  try {
    template = await prisma.emailTemplate.findUnique({
      where: { slug: templateSlug }
    });
  } catch (err) {
    console.error('Failed to query email template from db:', err.message);
  }

  if (!template) {
    console.warn(`Email template with slug "${templateSlug}" not found in DB.`);
    return;
  }

  if (!template.isActive) {
    console.log(`Email template with slug "${templateSlug}" is inactive. Bypassing send.`);
    return;
  }

  let subject = template.subject;
  let html = template.htmlBody;

  // Replace placeholders like {{name}}, {{amount}}, etc.
  Object.keys(variables).forEach((key) => {
    const value = variables[key] !== undefined && variables[key] !== null ? variables[key] : '';
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    subject = subject.replace(regex, value);
    html = html.replace(regex, value);
  });

  let transporter;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } else {
    // Fallback: Ethereal dynamic test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (err) {
      console.warn('Failed to create Ethereal account, email sending bypassed.', err.message);
      return;
    }
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SITE_NAME || 'Simply.com'}" <no-reply@simply.com>`,
      to: recipientEmail,
      subject: subject,
      html: html
    });

    if (!host) {
      console.log('Ethereal Email sent: %s', info.messageId);
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('Error sending templated email:', err);
  }
}
