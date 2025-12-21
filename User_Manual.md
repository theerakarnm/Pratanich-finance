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

## Core Features (Admin)

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
1.  Click on **"Clients" (ลูกค้า)** in the side navigation menu.
2.  Click the **"Create Client"** button.
3.  Fill in the **Client Form**:
    - **Citizen ID (เลขบัตรประชาชน):** Enter the 13-digit ID number.
    - **Title (คำนำหน้า):** Select Mr., Mrs., or Ms.
    - **Name (ชื่อ) & Surname (นามสกุล):** Enter the client's full name.
    - **Date of Birth (วันเกิด):** Select the date.
    - **Mobile Number (เบอร์โทรศัพท์):** Enter a valid 10-digit number.
4.  Click **"สร้างลูกค้า" (Create Client)** to save.

### 3. Loan Contract Management
This is where you create and monitor contracts.

#### **Create a New Loan Contract**
1.  Navigate to the **Loan Contracts** section.
2.  Click **"Create Contract"**.
3.  **Borrower Info:**
    - **Client:** Search for the client by *Name* or *Citizen ID*.
    - **Contract Number:** Enter your internal reference number (e.g., LN2023110001).
4.  **Financial Terms:**
    - **Principal (ยอดเงินต้น):** Enter the loaned amount.
    - **Interest Rate (อัตราดอกเบี้ย):** Enter the annual percentage (%).
    - **Term (ระยะเวลา):** Enter the number of months.
    - **Installment (ยอดผ่อนชำระ):** Enter the monthly payment amount.
5.  **Schedule:**
    - **Start Date:** When the loan begins.
    - **Due Day:** The day of the month payments are due (1-31).
6.  Click **"✨ สร้างสัญญา" (Create Contract)**.

#### **Edit Collection Fee (ค่าทวงถาม)**
If you need to charge a fee for debt collection:
1.  On the Loan Detail page, find the **"Collection Fee" (ค่าทวงถาม)** section.
2.  Click the **"Edit" (แก้ไข)** button (Pencil icon).
3.  Enter the amount and click the **Checkmark icon** to save.

---

## Client Journey & Experience
This section describes the end-to-end experience for your customers using the LINE application.

### 1. Admin Creates Client
The journey begins when you (the Admin) create a **Client Profile** and a **Loan Contract** in the system.
> **Important:** Ensure the **Phone Number** entered matches the client's actual mobile number, as this is used for verification.

### 2. Client Connects via LINE
The client opens your LINE Official Account and taps the service menu.
1.  **Welcome Screen:** The client sees the connection page.
2.  **Verification:** They select the "Phone + Contract" tab and enter:
    -   **Phone Number:** Must match the one in the system.
    -   **Contract Number:** Must be a valid contract number associated with them.
3.  **Consent:** They must check the box to accept the **PDPA Policy** (Privacy Policy).
4.  **Connect:** Tapping "Connect Account" links their LINE ID to your system.

### 3. Client Views Information
Once connected, the client can access their personal dashboard at any time:
-   **Loan Summary:** View total outstanding balance and number of active loans.
-   **Loan Details:** Tap on a loan card to see:
    -   Principal Amount
    -   Remaining Balance
    -   Next Due Date
    -   Installment Amount
-   **Payment History:** View a record of all past payments made.

### 4. Automated Notifications
The system automatically sends LINE notifications to the client to ensure timely payments. You do not need to send these manually.

**Schedule:**
| Notification Type | Timing | Purpose |
|-------------------|--------|---------|
| **Billing Notice** | **15 Days** before due date | Inform client of the upcoming bill. |
| **Warning** | **3 Days** before due date | Gentle reminder to prepare payment. |
| **Due Date** | **On Due Day** | Alert that payment is due today. |
| **Overdue Alert** | **Day +1, +3, +7** after due date | Warn client of missed payment and potential penalties. |

---

## Troubleshooting & FAQ

### Common Issues

**1. "Login Failed" or "Invalid Credentials"**
- **Cause:** Typo in email or password.
- **Solution:** Check caps lock and spelling. Contact admin to reset if needed.

**2. Client Cannot Connect on LINE**
- **Error:** "Phone number or contract number incorrect"
- **Solution:** Verify you entered the correct Phone Number in the Client Profile. Ensure the client is typing the Contract Number exactly as it appears in the system (case-sensitive).

**3. LINE Message not delivered**
- **Cause:** Client blocked the LINE Official Account.
- **Solution:** Ask the client to unblock the account.

### FAQ
**Q: Can I delete a loan contract?**
A: No, you should close it or mark it as void to preserve audit history.

**Q: How are overdue days calculated?**
A: The system automatically counts days from the "Due Day" set in the contract. If a client pays late, the system tracks this automatically.
