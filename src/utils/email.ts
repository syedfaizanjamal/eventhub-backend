import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER || 'test_user',
      pass: process.env.SMTP_PASSWORD || 'test_pass',
    },
  });
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@eventhub.com',
      to: email,
      subject: 'Welcome to EventHub!',
      text: `Hello ${name},\n\nWelcome to EventHub! We are excited to have you on board.`,
    });
  } catch (error) {
    console.warn('Development warning: Failed to send welcome email.', error);
  }
};

export const sendBookingConfirmationEmail = async (
  email: string,
  name: string,
  event: any,
  booking: any
) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@eventhub.com',
      to: email,
      subject: `Booking Confirmation: ${event.title}`,
      text: `Hello ${name},\n\nYour booking for "${event.title}" has been confirmed.\n\nDetails:\nDate: ${new Date(event.date).toLocaleString()}\nLocation: ${event.location}\nQuantity: ${booking.quantity}\nTotal Amount: ${booking.totalAmount}\nBooking ID: ${booking.id}\n\nThank you for using EventHub!`,
    });
  } catch (error) {
    console.warn('Development warning: Failed to send booking confirmation email.', error);
  }
};

export const sendBookingCancellationEmail = async (
  email: string,
  name: string,
  event: any,
  booking: any
) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@eventhub.com',
      to: email,
      subject: `Booking Cancelled: ${event.title}`,
      text: `Hello ${name},\n\nYour booking for "${event.title}" has been successfully cancelled.\n\nDetails:\nQuantity: ${booking.quantity}\nBooking ID: ${booking.id}\n\nWe hope to see you at another event soon!`,
    });
  } catch (error) {
    console.warn('Development warning: Failed to send booking cancellation email.', error);
  }
};
