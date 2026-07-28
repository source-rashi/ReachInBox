import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendResult {
  messageId: string;
  etherealUrl: string | null;
}

export async function sendEmail(
  from: string,
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html: body,
  });

  const etherealUrl = nodemailer.getTestMessageUrl(info) || null;

  return {
    messageId: info.messageId,
    etherealUrl: typeof etherealUrl === 'string' ? etherealUrl : null,
  };
}
