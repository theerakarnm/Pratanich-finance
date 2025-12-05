import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import generatePayload from 'promptpay-qr';

export const readQRCode = async (imageBuffer: Buffer): Promise<string | null> => {
  try {
    const image = await Jimp.read(imageBuffer);
    const { data, width, height } = image.bitmap;
    const code = jsQR(new Uint8ClampedArray(data), width, height);

    if (code) {
      return code.data;
    }

    return null;
  } catch (error) {
    console.error('Error reading QR code:', error);
    return null;
  }
};

export const generatePromptPayQrUrl = (amount: number): string => {
  const payload = generatePayload(process.env.PP_PERSONAL_ID || '', { amount });
  const timestamp = Math.floor(Date.now() / 1000);
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/asset/prompt_pay_qr?data=${encodeURIComponent(payload)}&timestamp=${timestamp}`;
};
