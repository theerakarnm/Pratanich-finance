// CRC16-CCITT (0x1021) implementation
// Initial: 0xFFFF, Polynomial: 0x1021, No XOR Out
function crc16ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  // Return as uppercase hex, padded to 4 chars
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// TLV Helper: Tag-Length-Value
function formatTLV(tag: string, value: string): string {
  const length = Buffer.byteLength(value, "utf8").toString().padStart(2, "0");
  return `${tag}${length}${value}`;
}

// Helper to sanitize and format target (Phone vs Tax ID)
function formatTarget(target: string): string {
  const cleanTarget = target.replace(/[^0-9]/g, ""); // Remove dashes/spaces

  // Case 1: Mobile Number (e.g., 0812345678 -> 0066812345678)
  // Logic: Starts with 0 and length is 10
  if (cleanTarget.startsWith("0") && cleanTarget.length === 10) {
    return "0066" + cleanTarget.substring(1);
  }

  // Case 2: Citizen ID / Tax ID / E-Wallet (Usually 13-15 digits)
  // Passed as-is for ID/Tax types
  if (cleanTarget.length >= 13) {
    return cleanTarget;
  }

  throw new Error(
    "Invalid target format. Must be a 10-digit mobile or 13-digit Tax/Citizen ID."
  );
}

interface PromptPayOptions {
  target: string; // Phone (08...) or TaxID (13 digits)
  amount: number;
  refKey?: string; // Optional reference
}

export function generatePromptPayQR({
  target,
  amount,
  refKey,
}: PromptPayOptions): string {
  // 1. Payload Format Indicator
  let payload = formatTLV("00", "01");

  // 2. Point of Initiation Method
  // 11 = Static (no amount), 12 = Dynamic (with amount)
  // Since we are passing an amount, we usually use 12.
  payload += formatTLV("01", amount > 0 ? "12" : "11");

  // 3. Merchant Account Information (Tag 29 for Credit Transfer)
  const promptPayAID = "A000000677010111";
  const targetFormatted = formatTarget(target);
  const merchantInfo =
    formatTLV("00", promptPayAID) + formatTLV("01", targetFormatted);
  payload += formatTLV("29", merchantInfo);

  // 4. Currency Code (764 = THB)
  payload += formatTLV("53", "764");

  // 5. Transaction Amount (Optional if 0)
  if (amount > 0) {
    // Format to 2 decimals (e.g. 100.50)
    const amountStr = amount.toFixed(2);
    payload += formatTLV("54", amountStr);
  }

  // 6. Country Code
  payload += formatTLV("58", "TH");

  // 7. Merchant Name (Required, but often ignored by app. Dummy is fine.)
  payload += formatTLV("59", "NA");

  // 8. Merchant City (Required. Dummy is fine.)
  payload += formatTLV("60", "BK");

  // 9. Additional Data Field (Tag 62) - The Reference Key
  if (refKey) {
    // Subtag 05 is "Reference Label"
    // Subtag 07 is "Terminal Label"
    // We put the refKey in both to ensure compatibility with various banking apps.
    let refPayload = formatTLV("05", refKey);
    refPayload += formatTLV("07", refKey);
    payload += formatTLV("62", refPayload);
  }

  // 10. CRC (Tag 63)
  // We append '6304' to the string, calculate CRC of that whole string,
  // and append the result.
  const payloadWithCrcTag = payload + "6304";
  const checksum = crc16ccitt(payloadWithCrcTag);

  return payloadWithCrcTag + checksum;
}
