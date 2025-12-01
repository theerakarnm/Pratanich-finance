import PDFDocument from "pdfkit";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { writeFile } from "fs/promises";
import type { TransactionWithDetails } from "./payments.types";
import logger from "../../core/logger";

/**
 * Receipt Generator Service
 * Generates PDF receipts for payment transactions
 */
export class ReceiptGenerator {
  private readonly storagePath: string;

  constructor(storagePath: string = "/uploads/receipts") {
    this.storagePath = storagePath;
  }

  /**
   * Generate PDF receipt for a payment transaction
   * @returns Buffer containing PDF data
   */
  async generateReceipt(transaction: TransactionWithDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 50,
        });

        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Header - Company Branding
        doc
          .fontSize(24)
          .font("Helvetica-Bold")
          .text("Payment Receipt", { align: "center" });

        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .font("Helvetica")
          .text("Loan Management System", { align: "center" });

        doc.moveDown(1);

        // Horizontal line
        doc
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke();

        doc.moveDown(1);

        // Transaction Information Section
        doc.fontSize(14).font("Helvetica-Bold").text("Transaction Details");
        doc.moveDown(0.5);

        const leftColumn = 50;
        const rightColumn = 300;
        let currentY = doc.y;

        // Transaction Reference ID
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Transaction Reference:", leftColumn, currentY);
        doc.font("Helvetica");
        doc.text(transaction.transaction.transaction_ref_id, rightColumn, currentY);
        currentY += 20;

        // Payment Date
        doc.font("Helvetica-Bold");
        doc.text("Payment Date:", leftColumn, currentY);
        doc.font("Helvetica");
        doc.text(
          new Date(transaction.transaction.payment_date).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          rightColumn,
          currentY
        );
        currentY += 20;

        // Payment Method
        if (transaction.transaction.payment_method) {
          doc.font("Helvetica-Bold");
          doc.text("Payment Method:", leftColumn, currentY);
          doc.font("Helvetica");
          doc.text(transaction.transaction.payment_method, rightColumn, currentY);
          currentY += 20;
        }

        doc.moveDown(1.5);

        // Client Information Section
        doc.fontSize(14).font("Helvetica-Bold").text("Client Information");
        doc.moveDown(0.5);

        currentY = doc.y;

        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Client Name:", leftColumn, currentY);
        doc.font("Helvetica");
        doc.text(
          `${transaction.client.first_name} ${transaction.client.last_name}`,
          rightColumn,
          currentY
        );
        currentY += 20;

        doc.font("Helvetica-Bold");
        doc.text("Citizen ID:", leftColumn, currentY);
        doc.font("Helvetica");
        doc.text(transaction.client.citizen_id || "N/A", rightColumn, currentY);
        currentY += 20;

        doc.moveDown(1.5);

        // Loan Information Section
        doc.fontSize(14).font("Helvetica-Bold").text("Loan Contract Details");
        doc.moveDown(0.5);

        currentY = doc.y;

        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Contract Number:", leftColumn, currentY);
        doc.font("Helvetica");
        doc.text(transaction.loan.contract_number, rightColumn, currentY);
        currentY += 20;

        doc.font("Helvetica-Bold");
        doc.text("Loan Status:", leftColumn, currentY);
        doc.font("Helvetica");
        doc.text(transaction.loan.contract_status, rightColumn, currentY);
        currentY += 20;

        doc.moveDown(1.5);

        // Payment Allocation Section
        doc.fontSize(14).font("Helvetica-Bold").text("Payment Allocation");
        doc.moveDown(0.5);

        currentY = doc.y;

        // Total Amount
        doc.fontSize(12).font("Helvetica-Bold");
        doc.text("Total Payment Amount:", leftColumn, currentY);
        doc.text(
          `฿${parseFloat(transaction.transaction.amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          rightColumn,
          currentY
        );
        currentY += 25;

        // Allocation Breakdown
        doc.fontSize(10).font("Helvetica");

        // To Penalties
        doc.text("Applied to Penalties:", leftColumn + 20, currentY);
        doc.text(
          `฿${parseFloat(transaction.transaction.amount_to_penalties).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          rightColumn,
          currentY
        );
        currentY += 18;

        // To Interest
        doc.text("Applied to Interest:", leftColumn + 20, currentY);
        doc.text(
          `฿${parseFloat(transaction.transaction.amount_to_interest).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          rightColumn,
          currentY
        );
        currentY += 18;

        // To Principal
        doc.text("Applied to Principal:", leftColumn + 20, currentY);
        doc.text(
          `฿${parseFloat(transaction.transaction.amount_to_principal).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          rightColumn,
          currentY
        );
        currentY += 25;

        doc.moveDown(1);

        // Balance Information Section
        doc.fontSize(14).font("Helvetica-Bold").text("Balance After Payment");
        doc.moveDown(0.5);

        currentY = doc.y;

        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Outstanding Balance:", leftColumn, currentY);
        doc.text(
          `฿${parseFloat(transaction.transaction.balance_after).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          rightColumn,
          currentY
        );
        currentY += 20;

        doc.text("Principal Remaining:", leftColumn, currentY);
        doc.text(
          `฿${parseFloat(transaction.transaction.principal_remaining).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          rightColumn,
          currentY
        );

        doc.moveDown(2);

        // Footer
        doc
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke();

        doc.moveDown(0.5);

        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Generated on ${new Date().toLocaleString("th-TH")}`,
            { align: "center" }
          );

        doc.text("This is a computer-generated receipt and does not require a signature.", {
          align: "center",
        });

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Save receipt to file system
   * @returns Relative file path
   */
  async saveReceipt(transactionId: string, pdfBuffer: Buffer): Promise<string> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");

      // Create relative path
      const relativePath = join(year, month, `${transactionId}.pdf`);
      const fullPath = join(this.storagePath, relativePath);

      // Ensure directory exists
      await mkdir(dirname(fullPath), { recursive: true });

      // Write file
      await writeFile(fullPath, pdfBuffer);

      logger.info(
        {
          transactionId,
          path: relativePath,
        },
        "Receipt saved successfully"
      );

      // Return relative path for database storage
      return `receipts/${relativePath}`;
    } catch (error) {
      logger.error(
        {
          transactionId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "Failed to save receipt"
      );
      throw error;
    }
  }
}
