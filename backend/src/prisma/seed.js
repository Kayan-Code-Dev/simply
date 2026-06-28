import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Admin User
  const adminEmail = 'admin@simply.com';
  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        username: 'admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        rank: 'PLATINUM', // Admin gets Platinum status
        isExempt: true,
        wallet: {
          create: {
            balance: 0.00,
            lockedBalance: 0.00,
            totalEarned: 0.00
          }
        }
      }
    });
    console.log(`Admin user created: ${admin.email}`);
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Create Universities
  const universitiesList = [
    'Oxford International University',
    'Cambridge Academic University',
    'Stanford Global Institute',
    'Sorbonne European College',
    'Heidelberg Science University',
    'Tokyo International Academy',
    'Melbourne Global University',
    'Harvard Academic Studies',
    'MIT Tech University'
  ];

  const universities = [];
  for (const name of universitiesList) {
    const uni = await prisma.university.upsert({
      where: { id: universitiesList.indexOf(name) + 1 },
      update: { name },
      create: { name }
    });
    universities.push(uni);
  }
  console.log(`Seeded ${universities.length} universities.`);

  // 3. Create Packages for each University
  // Prices: Bachelor: $4000, Master: $4600, Doctorate: $5200
  const packagesData = [
    { name: 'Bachelor (بكالوريوس)', price: 4000.00 },
    { name: 'Master (ماجستير)', price: 4600.00 },
    { name: 'Doctorate (دكتوراه)', price: 5200.00 }
  ];

  let packageCount = 0;
  for (const uni of universities) {
    for (const pkg of packagesData) {
      // Find or create packages associated with this university
      const nameWithUni = `${pkg.name} - ${uni.name}`;
      const existingPkg = await prisma.package.findFirst({
        where: {
          name: nameWithUni,
          universityId: uni.id
        }
      });

      if (!existingPkg) {
        await prisma.package.create({
          data: {
            name: nameWithUni,
            price: pkg.price,
            universityId: uni.id
          }
        });
        packageCount++;
      }
    }
  }
  console.log(`Seeded ${packageCount} university packages.`);

  // 4. Seed Email Templates
  console.log('Seeding email templates...');
  const baseLayout = (content) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f8fb; color: #2d3748; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 30px; text-align: center; border-bottom: 3px solid #8b5cf6; }
    .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; }
    .header h1 span { color: #8b5cf6; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .content h2 { color: #0f172a; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px; }
    .content p { color: #4a5568; font-size: 16px; margin-bottom: 24px; }
    .info-box { background: #f8fafc; border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 8px; margin: 24px 0; font-family: monospace; font-size: 14px; color: #334155; }
    .info-item { margin-bottom: 8px; }
    .info-item:last-child { margin-bottom: 0; }
    .info-label { font-weight: bold; color: #0f172a; display: inline-block; width: 140px; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; padding: 14px 30px; background-color: #8b5cf6; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); transition: all 0.2s ease; }
    .footer { background: #f8fafc; padding: 25px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: #8b5cf6; text-decoration: none; font-weight: 600; }
    .badge { display: inline-block; padding: 6px 12px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    .highlight { color: #8b5cf6; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SIMPLY<span>.COM</span></h1>
    </div>
    <div class="content">
      \${content}
    </div>
    <div class="footer">
      <p>&copy; 2026 Simply.com. All rights reserved.</p>
      <p>Need support? <a href="mailto:support@simply.com">Contact our Help Center</a></p>
    </div>
  </div>
</body>
</html>`;

  const templatesList = [
    {
      slug: 'welcome',
      name: 'Welcome Member Template',
      subject: 'Welcome to Simply.com Academic Network',
      variables: JSON.stringify(['name', 'email', 'sponsorName']),
      htmlBody: baseLayout(`<h2>Welcome to Simply, {{name}}!</h2>
<p>We are absolutely thrilled to welcome you to the Simply.com Academic Network. Your account has been registered successfully with the email <span class="highlight">{{email}}</span>.</p>
<p>Your sponsor for this journey is <span class="highlight">{{sponsorName}}</span>. They are here to guide you as you start exploring our packages and building your network.</p>
<div class="button-container">
  <a href="http://communityxpro.online/login" class="button">Access Your Dashboard</a>
</div>
<p>If you have any questions, our support team is available 24/7. Let's achieve great things together!</p>`)
    },
    {
      slug: 'account_activation',
      name: 'Account Activation Confirmed',
      subject: 'Your Account is Now Activated!',
      variables: JSON.stringify(['name', 'activationDate']),
      htmlBody: baseLayout(`<h2>Account Activated Successfully!</h2>
<p>Hello {{name}},</p>
<p>Great news! Your Simply.com account is now fully active. You have full access to our academy, packages, network structure, and wallet withdrawals.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Activation Date:</span> {{activationDate}}</div>
  <div class="info-item"><span class="info-label">Account Status:</span> ACTIVE</div>
</div>
<p>You can now purchase educational packages, refer other students, and earn direct/generational commissions.</p>
<div class="button-container">
  <a href="http://communityxpro.online/dashboard" class="button">Go to Dashboard</a>
</div>`)
    },
    {
      slug: 'wallet_otp',
      name: 'Wallet Verification Code OTP',
      subject: 'Simply Security - Wallet OTP Code',
      variables: JSON.stringify(['name', 'otp', 'expiryMinutes']),
      htmlBody: baseLayout(`<h2>Wallet Security verification</h2>
<p>Hello {{name}},</p>
<p>You requested a verification code (OTP) for a financial operation or security setting change on your Simply Wallet.</p>
<div style="background-color: #f1f5f9; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0;">
  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #8b5cf6; font-family: monospace;">{{otp}}</span>
</div>
<p>This code will expire in <span class="highlight">{{expiryMinutes}} minutes</span>. If you did not make this request, please change your account password immediately and contact support.</p>`)
    },
    {
      slug: 'deposit_confirmed',
      name: 'Ledger Deposit Alert',
      subject: 'Deposit Confirmed Successfully',
      variables: JSON.stringify(['name', 'amount', 'date']),
      htmlBody: baseLayout(`<h2>Ledger Deposit Alert</h2>
<p>Hello {{name}},</p>
<p>Your deposit request has been completed and confirmed. The funds have been successfully credited to your wallet balance.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Deposit Amount:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">Confirmation Date:</span> {{date}}</div>
  <div class="info-item"><span class="info-label">Status:</span> COMPLETED</div>
</div>
<div class="button-container">
  <a href="http://communityxpro.online/wallet" class="button">View Wallet Balance</a>
</div>`)
    },
    {
      slug: 'withdrawal_request',
      name: 'Withdrawal Alert (Request)',
      subject: 'New Withdrawal Request Received',
      variables: JSON.stringify(['name', 'amount', 'method']),
      htmlBody: baseLayout(`<h2>Withdrawal Request Processed</h2>
<p>Hello {{name}},</p>
<p>We have received your request to withdraw funds from your Simply Wallet. Your request is currently under review by our finance team.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Withdrawal Amount:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">Payout Method:</span> {{method}}</div>
  <div class="info-item"><span class="info-label">Request Status:</span> PENDING REVIEW</div>
</div>
<p>Withdrawal reviews typically take between 24-48 business hours. You will receive an email confirmation once it is approved.</p>`)
    },
    {
      slug: 'withdrawal_approved',
      name: 'Withdrawal Alert (Approved)',
      subject: 'Your Withdrawal Request is Approved',
      variables: JSON.stringify(['name', 'amount', 'date']),
      htmlBody: baseLayout(`<h2>Withdrawal Approved - Alert</h2>
<p>Hello {{name}},</p>
<p>Your withdrawal request has been approved and processed successfully by our finance department. The funds are on their way to you!</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Withdrawn Amount:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">Payout Date:</span> {{date}}</div>
  <div class="info-item"><span class="info-label">Status:</span> COMPLETED</div>
</div>
<p>If you do not see the funds in your payment provider within 2-3 business days, please reach out to support.</p>`)
    },
    {
      slug: 'withdrawal_rejected',
      name: 'Withdrawal Alert (Rejected)',
      subject: 'Your Withdrawal Request Has Been Rejected',
      variables: JSON.stringify(['name', 'amount', 'reason']),
      htmlBody: baseLayout(`<h2>Withdrawal Request Declined</h2>
<p>Hello {{name}},</p>
<p>Your withdrawal request of <span class="highlight">\\\${{amount}}</span> has been rejected by our finance team due to the following reason:</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; color: #991b1b; font-size: 15px;">
  {{reason}}
</div>
<p>Your funds have been returned to your wallet balance. Please resolve the issue and try requesting again.</p>
<div class="button-container">
  <a href="http://communityxpro.online/wallet" class="button">Go to Wallet</a>
</div>`)
    },
    {
      slug: 'transfer_sent',
      name: 'Transfer Sent Successfully',
      subject: 'Transfer Completed Successfully',
      variables: JSON.stringify(['name', 'amount', 'recipientName']),
      htmlBody: baseLayout(`<h2>Transfer Sent</h2>
<p>Hello {{name}},</p>
<p>You have successfully transferred funds from your wallet to another member's wallet.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Transferred Amount:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">Recipient User:</span> {{recipientName}}</div>
  <div class="info-item"><span class="info-label">Status:</span> COMPLETED</div>
</div>`)
    },
    {
      slug: 'transfer_received',
      name: 'Transfer Received Notification',
      subject: 'You Have Received Funds',
      variables: JSON.stringify(['name', 'amount', 'senderName']),
      htmlBody: baseLayout(`<h2>Funds Received in Wallet</h2>
<p>Hello {{name}},</p>
<p>Good news! You have received a wallet-to-wallet transfer from another member.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Received Amount:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">Sender User:</span> {{senderName}}</div>
  <div class="info-item"><span class="info-label">Status:</span> CREDITED</div>
</div>
<div class="button-container">
  <a href="http://communityxpro.online/wallet" class="button">View Wallet</a>
</div>`)
    },
    {
      slug: 'commission_earned',
      name: 'Commission Earned Notification',
      subject: 'New Commission Received!',
      variables: JSON.stringify(['name', 'amount', 'type', 'fromUser']),
      htmlBody: baseLayout(`<h2>Congratulations! You Earned a Commission</h2>
<p>Hello {{name}},</p>
<p>Your network activity has generated a new commission! A credit has been posted to your Simply wallet.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Commission Amount:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">Commission Type:</span> {{type}}</div>
  <div class="info-item"><span class="info-label">Triggered By:</span> {{fromUser}}</div>
</div>
<p>Keep up the amazing work! Growing your tree leads to greater generational depth rewards.</p>
<div class="button-container">
  <a href="http://communityxpro.online/dashboard" class="button">View Earnings</a>
</div>`)
    },
    {
      slug: 'rank_promotion',
      name: 'Rank Promotion Notification',
      subject: 'Congratulations on Your Rank Promotion!',
      variables: JSON.stringify(['name', 'oldRank', 'newRank']),
      htmlBody: baseLayout(`<h2>🎉 You Have Been Promoted! 🎉</h2>
<p>Hello {{name}},</p>
<p>We are extremely proud to announce that your hard work and leadership have resulted in a rank promotion in the Simply network!</p>
<div style="text-align: center; margin: 30px 0; padding: 20px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 16px;">
  <span style="font-size: 14px; text-transform: uppercase; color: #7c3aed; font-weight: bold; display: block;">Old Rank</span>
  <span style="font-size: 20px; color: #4b5563; text-decoration: line-through; display: block; margin-bottom: 10px;">{{oldRank}}</span>
  <span style="font-size: 14px; text-transform: uppercase; color: #7c3aed; font-weight: bold; display: block;">New Rank</span>
  <span style="font-size: 30px; color: #8b5cf6; font-weight: 800; display: block;">{{newRank}}</span>
</div>
<p>This promotion unlocks new payout caps and eligibility for rank bonus pools. Thank you for being a strong leader in our network!</p>`)
    },
    {
      slug: 'package_purchase',
      name: 'Package Purchase Confirmed',
      subject: 'Educational Package Purchased Successfully',
      variables: JSON.stringify(['name', 'packageName', 'amount', 'university']),
      htmlBody: baseLayout(`<h2>Package Purchase Confirmed</h2>
<p>Hello {{name}},</p>
<p>Thank you for your purchase. Your enrollment in the educational package has been confirmed. You now have full access to study materials.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Package Name:</span> {{packageName}}</div>
  <div class="info-item"><span class="info-label">Amount Paid:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">University Partner:</span> {{university}}</div>
</div>
<div class="button-container">
  <a href="http://communityxpro.online/packages" class="button">Start Learning</a>
</div>`)
    },
    {
      slug: 'epin_created',
      name: 'E-Pin Generated Alert',
      subject: 'Your E-Pin Has Been Generated',
      variables: JSON.stringify(['name', 'pinCode', 'amount']),
      htmlBody: baseLayout(`<h2>E-Pin Token Created</h2>
<p>Hello {{name}},</p>
<p>You have successfully generated an E-Pin voucher token. You can share this token or use it for account activation/package purchases.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">E-Pin Voucher Code:</span> <span style="font-size: 18px; font-weight: bold; color: #8b5cf6;">{{pinCode}}</span></div>
  <div class="info-item"><span class="info-label">Token Value:</span> \\\${{amount}}</div>
  <div class="info-item"><span class="info-label">Status:</span> ACTIVE</div>
</div>
<p>Please secure this code. Anyone with access to the code can redeem its monetary value on the platform.</p>`)
    },
    {
      slug: 'kyc_submitted',
      name: 'KYC Document Received Notification',
      subject: 'KYC Verification Documents Submitted',
      variables: JSON.stringify(['name', 'date']),
      htmlBody: baseLayout(`<h2>KYC Documents Submitted</h2>
<p>Hello {{name}},</p>
<p>We have successfully received your identity verification documents (KYC). Our compliance officers are reviewing the files.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Submission Date:</span> {{date}}</div>
  <div class="info-item"><span class="info-label">Review Status:</span> PENDING COMPLIANCE</div>
</div>
<p>Reviews are completed within 24-48 business hours. We will email you immediately once compliance renders a decision.</p>`)
    },
    {
      slug: 'kyc_approved',
      name: 'KYC Approved Notification',
      subject: 'KYC Verification Approved',
      variables: JSON.stringify(['name']),
      htmlBody: baseLayout(`<h2>KYC Verification Approved!</h2>
<p>Hello {{name}},</p>
<p>Congratulations! Your identity documents have been approved by our compliance team. Your account is now fully verified.</p>
<div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0; color: #065f46; font-size: 15px;">
  Identity Verification Status: <strong>VERIFIED</strong>
</div>
<p>This lifts all compliance limitations on your account, and you can now proceed with withdrawals and transfers without limits.</p>`)
    },
    {
      slug: 'kyc_rejected',
      name: 'KYC Rejected Notification',
      subject: 'KYC Verification Rejected',
      variables: JSON.stringify(['name', 'reason']),
      htmlBody: baseLayout(`<h2>KYC Verification Rejected</h2>
<p>Hello {{name}},</p>
<p>We regret to inform you that your identity documents (KYC) were rejected by our compliance team due to the following reason:</p>
<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; color: #991b1b; font-size: 15px;">
  {{reason}}
</div>
<p>Please visit the KYC section in your dashboard to re-upload clear and valid documents.</p>
<div class="button-container">
  <a href="http://communityxpro.online/kyc" class="button">Submit KYC Again</a>
</div>`)
    },
    {
      slug: 'ticket_created',
      name: 'Support Ticket Created Alert',
      subject: 'Support Ticket Created - ID: {{ticketId}}',
      variables: JSON.stringify(['name', 'ticketId', 'subject']),
      htmlBody: baseLayout(`<h2>Support Ticket Created</h2>
<p>Hello {{name}},</p>
<p>We have successfully opened a support ticket for your request. Our client relationship team will get back to you shortly.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Ticket ID:</span> {{ticketId}}</div>
  <div class="info-item"><span class="info-label">Subject:</span> {{subject}}</div>
  <div class="info-item"><span class="info-label">Status:</span> OPEN</div>
</div>
<p>You can track the progress of this ticket or reply directly in your Support Tickets center.</p>`)
    },
    {
      slug: 'ticket_reply',
      name: 'New Support Reply Alert',
      subject: 'New Response to Ticket - ID: {{ticketId}}',
      variables: JSON.stringify(['name', 'ticketId', 'message']),
      htmlBody: baseLayout(`<h2>New Support Ticket Reply</h2>
<p>Hello {{name}},</p>
<p>A support representative has responded to your support ticket <span class="highlight">{{ticketId}}</span>.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 25px 0;">
  <span style="font-weight: bold; color: #0f172a; display: block; margin-bottom: 8px;">Support Agent Reply:</span>
  <p style="margin: 0; color: #334155; font-style: italic;">"{{message}}"</p>
</div>
<div class="button-container">
  <a href="http://communityxpro.online/support" class="button">View Conversation</a>
</div>`)
    },
    {
      slug: 'password_reset',
      name: 'Password Reset Request',
      subject: 'Reset Your Account Password',
      variables: JSON.stringify(['name', 'resetLink']),
      htmlBody: baseLayout(`<h2>Password Reset Request</h2>
<p>Hello {{name}},</p>
<p>You requested a link to reset your password. Please click the button below to set a new password for your Simply account.</p>
<div class="button-container">
  <a href="{{resetLink}}" class="button">Reset Password</a>
</div>
<p>If you did not request this, you can ignore this email. Your password will remain unchanged.</p>`)
    },
    {
      slug: 'wallet_pin_changed',
      name: 'Wallet PIN Change Notification',
      subject: 'Your Wallet Security PIN Has Been Changed',
      variables: JSON.stringify(['name', 'date']),
      htmlBody: baseLayout(`<h2>Wallet Security PIN Updated</h2>
<p>Hello {{name}},</p>
<p>Your Wallet Security PIN has been updated. If this change was made by you, no further action is required.</p>
<div class="info-box">
  <div class="info-item"><span class="info-label">Change Date:</span> {{date}}</div>
  <div class="info-item"><span class="info-label">Security Event:</span> WALLET PIN UPDATED</div>
</div>
<p>If you did NOT change your PIN, please contact support and freeze your account immediately to prevent unauthorized transactions.</p>`)
    }
  ];

  for (const tpl of templatesList) {
    await prisma.emailTemplate.upsert({
      where: { slug: tpl.slug },
      update: {
        name: tpl.name,
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        variables: tpl.variables
      },
      create: {
        slug: tpl.slug,
        name: tpl.name,
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        variables: tpl.variables
      }
    });
  }
  console.log(`Upserted ${templatesList.length} email templates.`);

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
