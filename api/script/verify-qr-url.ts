
import { generatePromptPayQrUrl } from '../src/utils/qrcode';

// Mock process.env.PP_PERSONAL_ID if not set (for testing purposes only)
if (!process.env.PP_PERSONAL_ID) {
  console.warn('PP_PERSONAL_ID not set in environment, using dummy value for test');
  process.env.PP_PERSONAL_ID = '0812345678';
}

const amount = 100.50;
const url = generatePromptPayQrUrl(amount);

console.log('Generated PromptPay QR Code URL:');
console.log(url);

// Check if URL is valid structure
if (url.startsWith('http://localhost:3000/api/asset/prompt_pay_qr?data=')) {
  console.log('SUCCESS: URL structure is valid.');
} else {
  console.error('ERROR: URL structure is invalid.');
  process.exit(1);
}
