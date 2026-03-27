const nodemailer = require("nodemailer");
const logger = require("./logger");

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.mailtrap.io",
  port: process.env.MAIL_PORT || 465,
  secure: process.env.MAIL_SECURE === "true" || true,
  auth: {
    user: process.env.MAIL_USER || "your-email@gmail.com",
    pass: process.env.MAIL_PASSWORD || "your-password",
  },
});

/**
 * Send verification email
 */
const sendVerificationEmail = async (email, token) => {
  try {
    const verificationUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/user/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_FROM || "noreply@rbams.com",
      to: email,
      subject: "Email Verification - RBAMS",
      html: `
        <h2>Email Verification</h2>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>Or copy and paste this link:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr />
        <p>If you didn't create this account, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.success(`Verification email sent to ${email}`);
    return true;
  } catch (err) {
    logger.error(`Failed to send verification email: ${err.message}`);
    return false;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, token) => {
  try {
    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_FROM || "noreply@rbams.com",
      to: email,
      subject: "Password Reset - RBAMS",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>Or copy and paste this link:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr />
        <p>If you didn't request a password reset, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.success(`Password reset email sent to ${email}`);
    return true;
  } catch (err) {
    logger.error(`Failed to send password reset email: ${err.message}`);
    return false;
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (name, email) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || "noreply@rbams.com",
      to: email,
      subject: "Welcome to RBAMS",
      html: `
        <h2>Welcome ${name}!</h2>
        <p>Thank you for registering with RBAMS.</p>
        <p>Your account has been created successfully.</p>
        <p>You can now login with your credentials.</p>
        <hr />
        <p>If you have any questions, please contact support.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.success(`Welcome email sent to ${email}`);
    return true;
  } catch (err) {
    logger.error(`Failed to send welcome email: ${err.message}`);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
