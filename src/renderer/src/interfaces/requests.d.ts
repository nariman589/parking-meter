interface PaymentResponseI {
  txn_id: string;
  result: number;
  sum: number;
  message: string;
  current_balance: number;
  payment_id: number | null;
  currency: string | null;
}

interface BillingDataResponseI {
  txn_id: string;
  result: number;
  current_balance: number;
  sum: number;
  left_free_time_minutes: number;
  tariff: string;
  in_date: string;
  onlineSum: number;
  payed_till: string;
  hours: number;
  kaspiQr: string;
}

interface PrintCheckI {
  username: string;
  psswd: string;
  text: string;
  command: 'print_check';
}

interface BillingDataI {
  username: string;
  command: 'check';
  account: string;
  txn_id: string;
}

interface CheckNumberI {
  parkomat: string;
  sum: string;
  command: 'getCheck';
  account: string;
  txn_id: string;
  type: string;
}

interface PayI {
  parkomat: string;
  command: 'pay';
  account: string;
  txn_id: string;
  sum: string;
  change: string;
  payment_details: string;
  type: string;
  rrn: string;
  ikkmOnline: 'true' | 'false';
}

interface TryToLeaveI {
  username: string;
  psswd: string;
  account: string;
}

interface LastInCarsI {
  username: string;
  password: string;
  where: string;
  limit: '2';
  group: 'car_number';
  sort: 'createdAt ASC';
  car_number: string;
}
