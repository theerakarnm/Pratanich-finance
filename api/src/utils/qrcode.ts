import { Jimp } from 'jimp';
import jsQR from 'jsqr';

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
