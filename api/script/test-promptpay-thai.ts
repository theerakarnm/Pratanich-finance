// import { billPayment, } from 'promptparse/generate'

// try {

//   const payload = billPayment({
//     billerId: '0105568129362',
//     amount: 10.0,
//     ref1: 'INV12345',
//   })
//   console.log(payload);
// } catch (error) {
//   console.error(error);
// }

import generatePayload from 'promptpay-qr'

try {
  const payload = generatePayload('1508600004024', {
    amount: 10.5
  })
  console.log(payload);
} catch (error) {
  console.error(error);
}