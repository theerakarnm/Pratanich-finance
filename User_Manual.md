# User Manual: Pratanich Finance System

## Introduction
Welcome to the **Pratanich Finance System**. This comprehensive web application is designed to help you efficiently manage your lending business. It streamlines the process of tracking loans, managing client information, and calculating payments.

**Key Benefits:**
- **Centralized Data:** Keep all client and loan records in one secure place.
- **Automated Calculations:** Automatically calculate monthly installments, interest, and payment schedules.
- **LINE Integration:** Communicate directly with clients through automated LINE notifications for bills and due dates.
- **Real-time Overview:** Monitor your business health with a dynamic dashboard showing total loans and outstanding balances.

---

## Getting Started

### 1. Prerequisites
- A computer with a modern web browser (Google Chrome, Microsoft Edge, or Safari).
- An internet connection.
- Your Administrator credentials (Email and Password).

### 2. Logging In
To access the system, you must log in with your staff account.

1.  Navigate to the web portal URL in your browser.
2.  You will see the **"ระบบผู้ดูแล" (Admin System)** login page.
3.  Enter your **Email** (e.g., `admin@example.com`) in the email field.
4.  Enter your **Password** in the password field.
5.  Click the **"เข้าสู่ระบบ" (Log In)** button.
    - *Note:* If you click the button and nothing happens, ensure you are connected to the internet.

---

## Core Features

### 1. Dashboard (Overview)
Upon logging in, you arrive at the **Dashboard**. This is your command center.

**What you see:**
- **Financial Stats:** Cards showing *Total Clients*, *Total Loans*, *Total Outstanding Balance*, and *Today's Transactions*.
- **Charts:**
    - **Loan Trends:** A bar chart showing lending activity over time.
    - **Transaction Volume:** A line chart showing the number of transactions processed.

**How to use it:**
- Review these numbers daily to understand the health of your portfolio.
- Use the detailed charts to spot trends (e.g., is lending increasing this month?).

### 2. Client Management
You can add new borrowers or update existing information.

#### **Create a New Client**
1.  Click on **"Clients" (ลูกค้า)** in the side navigation menu (if available) or navigate to the Client Management page.
2.  Click the **"Create Client"** button.
3.  Fill in the **Client Form**:
    - **Citizen ID (เลขบัตรประชาชน):** Enter the 13-digit ID number.
    - **Title (คำนำหน้า):** Select Mr., Mrs., or Ms. from the dropdown.
    - **Name (ชื่อ) & Surname (นามสกุล):** Enter the client's full name.
    - **Date of Birth (วันเกิด):** Select the date from the calendar.
    - **Mobile Number (เบอร์โทรศัพท์):** Enter a valid 10-digit number.
    - **Email:** (Optional) Enter the client's email address.
4.  Click **"สร้างลูกค้า" (Create Client)** to save.

#### **Edit a Client**
- Navigate to the client list, find the client, and click the "Edit" button to update their information.

### 3. Loan Contract Management
This is where you create and monitor contracts.

#### **Create a New Loan Contract**
1.  Navigate to the **Loan Contracts** section.
2.  Click **"Create Contract"** (or similar).
3.  **Borrower Info:**
    - **Client:** Search for the client by *Name* or *Citizen ID* in the dropdown.
    - **Contract Number:** Enter your internal reference number (e.g., LN2023110001).
    - **Status:** Set to "Active" (Normal), "Closed" (Paid), or "Overdue".
4.  **Financial Terms:**
    - **Principal (ยอดเงินต้น):** Enter the loaned amount.
    - **Interest Rate (อัตราดอกเบี้ย):** Enter the annual percentage (%).
    - **Term (ระยะเวลา):** Enter the number of months.
    - **Installment (ยอดผ่อนชำระ):** Enter the monthly payment amount (or let the system help calculate).
5.  **Schedule:**
    - **Start Date:** When the loan begins.
    - **End Date:** When the loan ends.
    - **Due Day:** The day of the month payments are due (1-31).
6.  Click **"✨ สร้างสัญญา" (Create Contract)** to finalize.

#### **View Loan Details & Payment Schedule**
Click on any contract number to view its details.
- **Summary Cards:** See at a glance the Total Paid, Remaining Balance, and Next Due Date.
- **Payment Schedule Table:** A detailed list of every installment:
    - **Due Date:** When the payment must be made.
    - **Amount:** How much is due.
    - **Principal vs. Interest:** Breakdown of the payment.
    - **Status:** Shows if a period is Paid or Pending.

#### **Edit Collection Fee (ค่าทวงถาม)**
If you need to charge a fee for debt collection:
1.  On the Loan Detail page, find the **"Collection Fee" (ค่าทวงถาม)** section in the bottom card.
2.  Click the **"Edit" (แก้ไข)** button (Pencil icon).
3.  Enter the amount in the input box.
4.  Click the **Checkmark icon** to save.

### 4. Sending LINE Notifications
You can manually trigger specific notifications to the client's LINE app from the Loan Detail page.

1.  Open the Loan Detail page.
2.  Locate the **"Send LINE Message" (ส่งข้อความ LINE)** box.
3.  Click the appropriate button:
    - **New Loan:** Welcomes the user and sends contract details.
    - **Billing:** Sends the current bill.
    - **Due Warning:** Reminds them a payment is coming up.
    - **Overdue:** Alerts them of a missed payment.
4.  Wait for the confirmation popup ("ส่งข้อความสำเร็จ").

---

## Troubleshooting & FAQ

### Common Issues

**1. "Login Failed" or "Invalid Credentials"**
- **Cause:** You may have typed the wrong email or password.
- **Solution:** Double-check caps lock and spelling. If the problem persists, contact your system administrator to reset your password.

**2. Cannot Create a Loan Contract**
- **Error:** "Client is required"
- **Solution:** You must select an existing client from the database. Use the search box to find them by name or ID. If they don't exist, go to **Client Management** and create them first.

**3. "Internal Server Error" when saving**
- **Cause:** This usually indicates a temporary connection issue or a data conflict.
- **Solution:** Refresh the page and try again. If it continues, note down what you were doing and contact support.

**4. LINE Message not delivered**
- **Cause:** The client may not have linked their LINE account properly, or they may have blocked the Official Account.
- **Solution:** Verify the client's LINE status in their profile. Ask them to check if they have blocked the bot.

### FAQ
**Q: Can I delete a loan contract?**
A: Currently, you cannot delete a contract to preserve financial history. You should change its status to "Closed" or "Void" if it was created in error (depending on your internal policy).

**Q: How do I calculate the interest?**
A: The system automatically calculates interest based on the Principal, Rate, and Term you enter. You do not need to calculate it manually.
