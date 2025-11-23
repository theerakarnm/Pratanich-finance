import { generatePromptPayQR } from '../src/libs/promptpay';

console.log(generatePromptPayQR({
  target: "0631236001",
  amount: 10.5,
  refKey: "ORDER123",
}));
