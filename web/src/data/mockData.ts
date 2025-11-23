import { addDays, format, subDays } from 'date-fns';

export interface Client {
  citizen_id: string;
  title_name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mobile_number: string;
  email: string;
  line_id: string;
}

export interface LoanContract {
  contract_number: string;
  citizen_id: string;
  loan_type: string;
  principal_amount: number;
  approved_amount: number;
  interest_rate: number;
  term_months: number;
  installment_amount: number;
  contract_start_date: string;
  contract_end_date: string;
  due_day: number;
  contract_status: 'Active' | 'Closed' | 'Overdue';
  outstanding_balance: number;
  overdue_days: number;
}

export interface Transaction {
  success: boolean;
  data: {
    success: boolean;
    message: string;
    rqUID: string;
    language: string;
    transRef: string;
    sendingBank: string;
    receivingBank: string;
    transDate: string;
    transTime: string;
    sender: {
      displayName: string;
      name: string;
      proxy: {
        type: string | null;
        value: string | null;
      };
      account: {
        type: string;
        value: string;
      };
    };
    receiver: {
      displayName: string;
      name: string;
      proxy: {
        type: string;
        value: string;
      };
      account: {
        type: string;
        value: string;
      };
    };
    amount: number;
    paidLocalAmount: number;
    paidLocalCurrency: string;
    countryCode: string;
    transFeeAmount: number;
    ref1: string;
    ref2: string;
    ref3: string;
    toMerchantId: string;
  };
}

export const clients: Client[] = Array.from({ length: 50 }).map((_, i) => ({
  citizen_id: `110070${Math.floor(1000000 + Math.random() * 9000000)}`,
  title_name: i % 3 === 0 ? 'Mr.' : i % 3 === 1 ? 'Mrs.' : 'Ms.',
  first_name: `ClientFirst${i + 1}`,
  last_name: `ClientLast${i + 1}`,
  date_of_birth: format(subDays(new Date(), 7000 + i * 100), 'yyyy-MM-dd'),
  mobile_number: `08${Math.floor(10000000 + Math.random() * 90000000)}`,
  email: `client${i + 1}@example.com`,
  line_id: `line_id_${i + 1}`,
}));

export const loanContracts: LoanContract[] = Array.from({ length: 50 }).map((_, i) => {
  const principal = Math.floor(10000 + Math.random() * 90000);
  const approved = principal;
  const term = [12, 24, 36, 48][Math.floor(Math.random() * 4)];
  const rate = 15;
  const installment = Math.floor((approved * (1 + rate / 100)) / term);
  const start = subDays(new Date(), Math.floor(Math.random() * 365));

  return {
    contract_number: `LN${format(new Date(), 'yyyyMM')}${String(i + 1).padStart(4, '0')}`,
    citizen_id: `110070${Math.floor(1000000 + Math.random() * 9000000)}`,
    loan_type: 'Personal Loan',
    principal_amount: principal,
    approved_amount: approved,
    interest_rate: rate,
    term_months: term,
    installment_amount: installment,
    contract_start_date: format(start, 'yyyy-MM-dd'),
    contract_end_date: format(addDays(start, term * 30), 'yyyy-MM-dd'),
    due_day: Math.floor(1 + Math.random() * 28),
    contract_status: i % 10 === 0 ? 'Overdue' : i % 5 === 0 ? 'Closed' : 'Active',
    outstanding_balance: Math.floor(approved * (Math.random() * 0.8)),
    overdue_days: i % 10 === 0 ? Math.floor(1 + Math.random() * 30) : 0,
  };
});

export const transactions: Transaction[] = Array.from({ length: 50 }).map((_, i) => ({
  success: true,
  data: {
    success: true,
    message: "✅",
    rqUID: `REQ_${new Date().getTime()}_${i}`,
    language: "TH",
    transRef: `REF${new Date().getTime()}${i}`,
    sendingBank: "004",
    receivingBank: "004",
    transDate: format(subDays(new Date(), Math.floor(Math.random() * 10)), 'yyyyMMdd'),
    transTime: format(new Date(), 'HH:mm:ss'),
    sender: {
      displayName: `Sender ${i + 1}`,
      name: `Mr. Sender ${i + 1}`,
      proxy: { type: null, value: null },
      account: { type: "BANKAC", value: `xxx-x-x${Math.floor(1000 + Math.random() * 9000)}-x` }
    },
    receiver: {
      displayName: `Receiver ${i + 1}`,
      name: `KASIKORN R`,
      proxy: { type: "", value: "" },
      account: { type: "BANKAC", value: `xxx-x-x${Math.floor(1000 + Math.random() * 9000)}-x` }
    },
    amount: Math.floor(100 + Math.random() * 5000),
    paidLocalAmount: Math.floor(100 + Math.random() * 5000),
    paidLocalCurrency: "764",
    countryCode: "TH",
    transFeeAmount: 0,
    ref1: "",
    ref2: "",
    ref3: "",
    toMerchantId: ""
  }
}));
