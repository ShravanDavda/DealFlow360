import dotenv from "dotenv";

dotenv.config();

const BREVO_API_URL =
  "https://api.brevo.com/v3/smtp/email";

export const sendPasswordResetOtp = async ({
  email,
  otp,
}) => {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [
        {
          email,
        },
      ],
      subject: "Password Reset OTP",
      htmlContent: `
        <div>
          <h2>Password Reset Request</h2>

          <p>Your password reset OTP is:</p>

          <h1>${otp}</h1>

          <p>
            This OTP is valid for 10 minutes.
          </p>

          <p>
            Do not share this OTP with anyone.
          </p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error("Brevo email delivery failed.");
  }

  return true;
};

export const sendCustomerActivationEmail = async ({
  email,
  companyName,
  activationCode,
  expiresAt,
}) => {
  try {
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
      return { emailSent: false };
    }
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME,
        },
        to: [
          {
            email,
          },
        ],
        subject: "Activate your DealFlow360 Account",
        htmlContent: `
          <div>
            <h2>Welcome to DealFlow360</h2>
            <p>Your activation code is: <strong>${activationCode}</strong></p>
          </div>
        `,
      }),
    });
    return { emailSent: response.ok };
  } catch (error) {
    return { emailSent: false };
  }
};