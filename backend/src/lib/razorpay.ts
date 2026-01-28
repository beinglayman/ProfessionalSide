import Razorpay from 'razorpay';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set — Razorpay features will be unavailable');
}

export const razorpay: InstanceType<typeof Razorpay> | null =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
