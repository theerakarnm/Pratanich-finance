import { Hono } from 'hono';
import { ResponseBuilder } from '../../core/response';
import { logger } from '../../core/logger';
import { PaymentDomain } from './payments.domain';
import { PaymentRepository } from './payments.repository';
import { PaymentMatchingService, type SlipOKWebhookPayload } from './payment-matching.service';
import { PendingPaymentsRepository } from './pending-payments.repository';
import { PaymentMatchingError } from './payments.errors';

const paymentWebhookRoutes = new Hono();

// Initialize services
const paymentDomain = new PaymentDomain();
const paymentRepository = new PaymentRepository();
const matchingService = new PaymentMatchingService();
const pendingPaymentsRepository = new PendingPaymentsRepository();

/**
 * SlipOK Webhook Handler
 * POST /api/webhooks/slipok
 * 
 * Receives verified payment data from SlipOK and processes it
 */
paymentWebhookRoutes.post('/slipok', async (c) => {
  try {
    // Parse SlipOK webhook payload
    const body = await c.req.json() as any;
    
    // SlipOK may send data wrapped in a 'data' field or directly
    const slipokData: SlipOKWebhookPayload = body.data || body;
    
    logger.info(
      {
        transRef: slipokData.transRef,
        amount: slipokData.amount,
        transDate: slipokData.transDate,
        transTime: slipokData.transTime,
        success: slipokData.success,
      },
      'Received SlipOK webhook'
    );

    // Validate required fields
    if (!slipokData.transRef || !slipokData.amount || !slipokData.success) {
      logger.warn({ slipokData }, 'Invalid SlipOK webhook payload: missing required fields or verification failed');
      return ResponseBuilder.error(c, 'Invalid webhook payload: missing required fields or verification failed', 400);
    }

    // Step 1: Check for duplicate transaction
    const existingTransaction = await paymentRepository.findByTransactionRef(slipokData.transRef);
    
    if (existingTransaction) {
      logger.info(
        { transRef: slipokData.transRef, transactionId: existingTransaction.id },
        'Duplicate transaction detected - already processed'
      );
      // Return 200 OK for idempotency - already processed
      return ResponseBuilder.success(c, {
        message: 'Transaction already processed',
        transactionId: existingTransaction.id,
      });
    }

    // Step 2: Try to match payment to a loan contract
    let loan;
    try {
      loan = await matchingService.findLoanForPayment(slipokData);
      
      logger.info(
        {
          transRef: slipokData.transRef,
          loanId: loan.id,
          contractNumber: loan.contract_number,
        },
        'Payment matched to loan contract'
      );
    } catch (error) {
      // Payment matching failed - store in pending_payments
      if (error instanceof PaymentMatchingError) {
        logger.warn(
          {
            transRef: slipokData.transRef,
            amount: slipokData.amount,
            error: error.message,
          },
          'Payment matching failed - storing as pending payment'
        );

        // Parse date and time from SlipOK format
        const paymentDate = parseSlipOKDateTime(slipokData.transDate, slipokData.transTime);

        // Store in pending_payments table
        const pendingPayment = await pendingPaymentsRepository.create({
          transaction_ref_id: slipokData.transRef,
          amount: slipokData.amount.toString(),
          payment_date: paymentDate,
          sender_info: slipokData.sender,
          receiver_info: slipokData.receiver,
          bank_info: {
            sendingBank: slipokData.sendingBank,
            receivingBank: slipokData.receivingBank,
          },
          status: 'Unmatched',
        });

        logger.info(
          { pendingPaymentId: pendingPayment.id, transRef: slipokData.transRef },
          'Pending payment created'
        );

        // TODO: Send LINE alert to admin
        // This would require an admin LINE user ID or group ID in config
        // For now, we just log it
        logger.warn(
          {
            pendingPaymentId: pendingPayment.id,
            transRef: slipokData.transRef,
            amount: slipokData.amount,
            sender: slipokData.sender.displayName,
          },
          'ADMIN ALERT: Unmatched payment requires manual review'
        );

        // Return 200 OK to SlipOK - we've received and stored the payment
        return ResponseBuilder.success(c, {
          message: 'Payment received but could not be matched - stored for manual review',
          pendingPaymentId: pendingPayment.id,
        });
      }

      // Unexpected error
      throw error;
    }

    // Step 3: Process the payment
    const paymentDate = parseSlipOKDateTime(slipokData.transDate, slipokData.transTime);
    
    const result = await paymentDomain.processPayment({
      transactionRefId: slipokData.transRef,
      loanId: loan.id,
      amount: slipokData.amount,
      paymentDate,
      paymentMethod: 'Bank Transfer',
      paymentSource: slipokData.sendingBank,
      notes: `SlipOK webhook payment. Sender: ${slipokData.sender.displayName}`,
    });

    logger.info(
      {
        transRef: slipokData.transRef,
        transactionId: result.transactionId,
        loanId: loan.id,
        amount: slipokData.amount,
        allocation: result.allocation,
        newStatus: result.newStatus,
      },
      'Payment processed successfully via webhook'
    );

    // Return 200 OK to SlipOK
    return ResponseBuilder.success(c, {
      message: 'Payment processed successfully',
      transactionId: result.transactionId,
      allocation: result.allocation,
      balanceAfter: result.balanceAfter,
    });

  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to process SlipOK webhook'
    );

    // Still return 200 OK to SlipOK to prevent retries
    // The error is logged and can be investigated
    return ResponseBuilder.success(c, {
      message: 'Webhook received but processing failed - logged for investigation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Parse SlipOK date and time strings into a Date object
 * @param dateStr - Format: DD/MM/YYYY
 * @param timeStr - Format: HH:MM:SS
 * @returns Date object in UTC
 */
function parseSlipOKDateTime(dateStr: string, timeStr: string): Date {
  // Parse DD/MM/YYYY
  const [day, month, year] = dateStr.split('/').map(Number);
  
  // Parse HH:MM:SS
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  
  // Create date in local timezone then convert to UTC
  // Note: month is 0-indexed in JavaScript Date
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  
  return date;
}

export default paymentWebhookRoutes;
