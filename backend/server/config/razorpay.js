// server/config/razorpay.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import Razorpay from 'razorpay';

// resolve this file's directory and explicitly load ../.env (server/.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load server/.env (one level up from config/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// debug: show where dotenv looked and whether keys are present (temporary)
console.log('Razorpay config: cwd=', process.cwd(), 'configDir=', __dirname);
console.log('RAZORPAY_TEST_KEY_ID present?', !!process.env.RAZORPAY_TEST_KEY_ID);
console.log('RAZORPAY_TEST_KEY_SECRET present?', !!process.env.RAZORPAY_TEST_KEY_SECRET);
console.log('RAZORPAY_MODE=', process.env.RAZORPAY_MODE);

const isTest = process.env.RAZORPAY_MODE === 'test';
const key_id = isTest ? process.env.RAZORPAY_TEST_KEY_ID : process.env.RAZORPAY_LIVE_KEY_ID;
const key_secret = isTest ? process.env.RAZORPAY_TEST_KEY_SECRET : process.env.RAZORPAY_LIVE_KEY_SECRET;

if (!key_id || !key_secret) {
  console.error('Missing Razorpay env vars', { key_id: !!key_id, key_secret: !!key_secret });
  throw new Error('Missing Razorpay env vars. Check server/.env and variable names.');
}

export default new Razorpay({ key_id, key_secret });
