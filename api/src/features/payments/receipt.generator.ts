// import PDFDocument from "pdfkit";
// import { mkdir } from "fs/promises";
// import { join, dirname } from "path";
// import { writeFile } from "fs/promises";
// import type { TransactionWithDetails } from "./payments.types";
// import logger from "../../core/logger";
// import fs from "fs";

// /**
//  * Receipt Generator Service
//  * Generates PDF receipts for payment transactions
//  */
// export class ReceiptGenerator {
//   private readonly storagePath: string;

//   // --- Constants & Styles ---
//   private COLORS = {
//     primary: "#2563EB", // Modern Blue
//     secondary: "#64748B", // Slate Grey
//     text: "#1E293B", // Dark Slate
//     lightBg: "#F1F5F9", // Very light grey for headers
//     border: "#E2E8F0",
//     success: "#16A34A",
//     white: "#FFFFFF",
//   };

//   private FONTS = {
//     regular: join(import.meta.dir, "../../assets/fonts/Sarabun-Regular.ttf"), // MAKE SURE THIS PATH EXISTS
//     bold: join(import.meta.dir, "../../assets/fonts/Sarabun-Bold.ttf"),       // MAKE SURE THIS PATH EXISTS
//   };

//   constructor(storagePath: string = "./uploads/receipts") {
//     this.storagePath = storagePath;
//   }

//   // --- Helper Functions ---
//   formatCurrency = (amount: string | number) => {
//     const num = typeof amount === "string" ? parseFloat(amount) : amount;
//     return new Intl.NumberFormat("th-TH", {
//       style: "currency",
//       currency: "THB",
//       minimumFractionDigits: 2,
//     }).format(num);
//   };

//   formatDate = (date: Date | string) => {
//     return new Intl.DateTimeFormat("th-TH", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     }).format(new Date(date));
//   };

//   /**
//    * Generate PDF receipt for a payment transaction
//    * @returns Buffer containing PDF data
//    */
//   async generateReceipt(transaction: TransactionWithDetails): Promise<Buffer> {
//     return new Promise((resolve, reject) => {
//       try {
//         // Initialize Document
//         const doc = new PDFDocument({
//           size: "A4",
//           margin: 50,
//           bufferPages: true,
//         });

//         const chunks: Buffer[] = [];
//         doc.on("data", (chunk) => chunks.push(chunk));
//         doc.on("end", () => resolve(Buffer.concat(chunks)));
//         doc.on("error", reject);

//         // --- Register Fonts ---
//         // Fallback to Helvetica if fonts are missing (prevents crash, but Thai won't render)

//         if (fs.existsSync(this.FONTS.regular) && fs.existsSync(this.FONTS.bold)) {
//           console.log('Registering Font');

//           doc.registerFont("ThaiRegular", this.FONTS.regular);
//           doc.registerFont("ThaiBold", this.FONTS.bold);
//         } else {
//           console.warn("Thai fonts not found. Fallback to standard this.fonts.");
//           doc.registerFont("ThaiRegular", "Helvetica");
//           doc.registerFont("ThaiBold", "Helvetica-Bold");
//         }

//         const pageWidth = doc.page.width;
//         const margin = 50;
//         const contentWidth = pageWidth - margin * 2;

//         // ================= HEADER =================
//         // Left Side: Company Logo/Name
//         doc
//           .font("ThaiBold")
//           .fontSize(20)
//           .fillColor(this.COLORS.primary)
//           .text("LOAN SYSTEM", margin, 50); // Replace with your App Name

//         doc
//           .font("ThaiRegular")
//           .fontSize(10)
//           .fillColor(this.COLORS.secondary)
//           .text("123 Financial District, Bangkok 10110", margin, 75)
//           .text("Tax ID: 010555123456", margin, 88);

//         // Right Side: Receipt Label
//         const headerRightX = 400;
//         doc
//           .font("ThaiBold")
//           .fontSize(24)
//           .fillColor(this.COLORS.text)
//           .text("RECEIPT", headerRightX, 50, { align: "right", width: 145 });

//         doc
//           .font("ThaiRegular")
//           .fontSize(10)
//           .fillColor(this.COLORS.secondary)
//           .text(`NO: ${transaction.transaction.transaction_ref_id}`, headerRightX, 80, { align: "right", width: 145 })
//           .text(`DATE: ${this.formatDate(transaction.transaction.payment_date)}`, headerRightX, 95, { align: "right", width: 145 });

//         // Divider
//         doc
//           .moveDown(2)
//           .strokeColor(this.COLORS.border)
//           .lineWidth(1)
//           .moveTo(margin, 120)
//           .lineTo(pageWidth - margin, 120)
//           .stroke();

//         // ================= INFO GRID (Client & Contract) =================
//         const startY = 140;
//         const colWidth = contentWidth / 2 - 10;

//         // Col 1: Bill To (Client)
//         doc.font("ThaiBold").fontSize(12).fillColor(this.COLORS.text).text("RECEIVED FROM", margin, startY);

//         doc.font("ThaiRegular").fontSize(10).fillColor(this.COLORS.secondary);
//         let currentY = startY + 20;

//         doc.text(`${transaction.client.title_name} ${transaction.client.first_name} ${transaction.client.last_name}`, margin, currentY);
//         currentY += 15;
//         doc.text(`ID: ${transaction.client.citizen_id}`, margin, currentY);
//         currentY += 15;
//         if (transaction.client.mobile_number) {
//           doc.text(`Tel: ${transaction.client.mobile_number}`, margin, currentY);
//         }

//         // Col 2: Contract Details
//         const col2X = margin + colWidth + 20;
//         doc.font("ThaiBold").fontSize(12).fillColor(this.COLORS.text).text("PAYMENT FOR", col2X, startY);

//         doc.font("ThaiRegular").fontSize(10).fillColor(this.COLORS.secondary);
//         currentY = startY + 20;

//         doc.text(`Contract No: ${transaction.loan.contract_number}`, col2X, currentY);
//         currentY += 15;
//         doc.text(`Loan Type: ${transaction.loan.loan_type}`, col2X, currentY);
//         currentY += 15;
//         doc.text(`Method: ${transaction.transaction.payment_method || 'N/A'}`, col2X, currentY);

//         // ================= PAYMENT SUMMARY BOX =================
//         const boxTop = 230;
//         const boxHeight = 50;

//         // Draw colored background box
//         doc
//           .rect(margin, boxTop, contentWidth, boxHeight)
//           .fill(this.COLORS.lightBg);

//         // Label
//         doc
//           .font("ThaiBold")
//           .fontSize(12)
//           .fillColor(this.COLORS.text)
//           .text("TOTAL AMOUNT PAID", margin + 20, boxTop + 18);

//         // Amount (Right aligned)
//         doc
//           .font("ThaiBold")
//           .fontSize(18)
//           .fillColor(this.COLORS.primary)
//           .text(
//             this.formatCurrency(transaction.transaction.amount),
//             margin,
//             boxTop + 15,
//             { align: "right", width: contentWidth - 20 }
//           );

//         // ================= BREAKDOWN TABLE =================
//         let tableY = 310;

//         // Table Header
//         doc.rect(margin, tableY, contentWidth, 25).fill(this.COLORS.text);
//         doc.font("ThaiBold").fontSize(10).fillColor(this.COLORS.white);

//         doc.text("DESCRIPTION", margin + 15, tableY + 7);
//         doc.text("AMOUNT", margin, tableY + 7, { align: "right", width: contentWidth - 15 });

//         // Table Rows
//         tableY += 25;
//         const rowHeight = 30;

//         const items = [
//           { label: "Principal Payment (ชำระเงินต้น)", value: transaction.transaction.amount_to_principal },
//           { label: "Interest Payment (ชำระดอกเบี้ย)", value: transaction.transaction.amount_to_interest },
//           { label: "Penalty Payment (ชำระค่าปรับ)", value: transaction.transaction.amount_to_penalties },
//         ];

//         doc.font("ThaiRegular").fontSize(10).fillColor(this.COLORS.text);

//         items.forEach((item, index) => {
//           // Skip 0 amounts to keep receipt clean? Optional. 
//           // Keeping it for now to show full breakdown.

//           // Alternating row color
//           if (index % 2 !== 0) {
//             doc.rect(margin, tableY, contentWidth, rowHeight).fill(this.COLORS.lightBg);
//             doc.fillColor(this.COLORS.text); // Reset fill color after bg
//           }

//           // Label
//           doc.text(item.label, margin + 15, tableY + 10);

//           // Value
//           doc.text(this.formatCurrency(item.value), margin, tableY + 10, {
//             align: "right",
//             width: contentWidth - 15
//           });

//           // Bottom border
//           doc
//             .moveTo(margin, tableY + rowHeight)
//             .lineTo(pageWidth - margin, tableY + rowHeight)
//             .strokeColor(this.COLORS.border)
//             .lineWidth(0.5)
//             .stroke();

//           tableY += rowHeight;
//         });

//         // ================= BALANCE SECTION =================
//         tableY += 20;

//         const balanceBoxWidth = 200;
//         const balanceBoxX = pageWidth - margin - balanceBoxWidth;

//         doc.font("ThaiBold").fontSize(10).fillColor(this.COLORS.secondary);
//         doc.text("Outstanding Balance:", balanceBoxX, tableY, { width: 100, align: 'left' });
//         doc.fillColor(this.COLORS.text).text(this.formatCurrency(transaction.transaction.balance_after), balanceBoxX + 100, tableY, { width: 100, align: 'right' });

//         tableY += 15;
//         doc.font("ThaiBold").fillColor(this.COLORS.secondary);
//         doc.text("Principal Remaining:", balanceBoxX, tableY, { width: 100, align: 'left' });
//         doc.fillColor(this.COLORS.text).text(this.formatCurrency(transaction.transaction.principal_remaining), balanceBoxX + 100, tableY, { width: 100, align: 'right' });

//         // ================= FOOTER =================
//         const footerY = 750; // Near bottom of A4

//         doc
//           .moveTo(margin, footerY)
//           .lineTo(pageWidth - margin, footerY)
//           .strokeColor(this.COLORS.border)
//           .lineWidth(1)
//           .stroke();

//         doc
//           .font("ThaiRegular")
//           .fontSize(8)
//           .fillColor(this.COLORS.secondary)
//           .text(
//             "This receipt is computer generated and valid without a signature.",
//             margin,
//             footerY + 10,
//             { align: "center", width: contentWidth }
//           );

//         doc.text(
//           `Generated by Loan Management System | Ref: ${transaction.transaction.id}`,
//           margin,
//           footerY + 22,
//           { align: "center", width: contentWidth }
//         );

//         doc.end();
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   /**
//    * Save receipt to file system
//    * @returns Relative file path
//    */
//   async saveReceipt(transactionId: string, pdfBuffer: Buffer): Promise<string> {
//     try {
//       const now = new Date();
//       const year = now.getFullYear().toString();
//       const month = (now.getMonth() + 1).toString().padStart(2, "0");

//       // Create relative path
//       const relativePath = join(year, month, `${transactionId}.pdf`);
//       const fullPath = join(this.storagePath, relativePath);

//       // Ensure directory exists
//       await mkdir(dirname(fullPath), { recursive: true });

//       // Write file
//       await writeFile(fullPath, pdfBuffer);

//       logger.info(
//         {
//           transactionId,
//           path: relativePath,
//         },
//         "Receipt saved successfully"
//       );

//       // Return relative path for database storage
//       return `receipts/${relativePath}`;
//     } catch (error) {
//       logger.error(
//         {
//           transactionId,
//           error: error instanceof Error ? error.message : "Unknown error",
//         },
//         "Failed to save receipt"
//       );
//       throw error;
//     }
//   }
// }
