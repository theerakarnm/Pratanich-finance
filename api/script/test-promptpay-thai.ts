import { generatePromptPayQR } from '../src/libs/promptpay';

try {
  const qr = generatePromptPayQR({
    target: "1508600004024",
    amount: 10.5,
    refKey: "OD2132191239",
  });
  console.log("QR Generated:", qr);
} catch (e) {
  console.error(e);
}
