import { describe, it, expect } from 'vitest';

interface ParsedPayment {
  amount: number;
  utr?: string;
  sender: string;
  rawText: string;
}

// Generic SMS Bank Parser implementation for testing
function parseGenericSms(title: string, body: string): ParsedPayment | null {
  const senderAllowlist = [
    'UCOBNK', 'SBINB', 'SBINR', 'HDFCBK', 'ICICIB',
    'AXISBK', 'UTIBNK', 'PUNBNK', 'KOTAKB', 'UNIONB',
    'YESBNK', 'IDBIBK', 'BOIIND', 'CANBNK'
  ];
  const combined = `${title} ${body}`;
  if (!senderAllowlist.some((s) => combined.toUpperCase().includes(s))) return null;
  if (/debit|debited|withdrawn/i.test(body)) return null;

  const amountMatch = body.replace(/,/g, '').match(
    /(?:credited\s+(?:with|by)?|received|deposited)\s+(?:INR|Rs\.?)\s*([\d]+\.?\d*)/i
  );
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  const utrMatch = body.match(
    /(?:UPI\s+Ref(?:\s+no)?|Ref\s+no|UTR|RRN)[:\s]*([0-9]{12}|[A-Za-z0-9]{8,18})/i
  );

  return { amount, utr: utrMatch?.[1], sender: title, rawText: body };
}

// UPI App Push Notification Parser
function parseUpiAppNotification(pkg: string, title: string, body: string): ParsedPayment | null {
  const appAllowlist = [
    'com.google.android.apps.nbu.paisa.user', // GPay
    'com.phonepe.app',                       // PhonePe
    'net.one97.paytm',                       // Paytm
    'in.org.npci.upiapp'                     // BHIM
  ];
  if (!appAllowlist.includes(pkg)) return null;

  const combined = `${title} ${body}`.replace(/,/g, '');
  const amountMatch = combined.match(/(?:received|credited|added|payment\s+of)\s+(?:₹|Rs\.?|INR)\s*([\d]+\.?\d*)/i);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  const utrMatch = combined.match(/(?:UPI\s+Ref|Ref\s+No|UTR)[:\s]*([0-9]{12})/i);

  return { amount, utr: utrMatch?.[1], sender: title, rawText: combined };
}

describe('Bank SMS Parser — Multi-Bank Coverage', () => {
  it('parses UCO Bank credit SMS correctly', () => {
    const title = 'VM-UCOBNK-S';
    const body = 'A/c XXXXXX1234 credited with Rs.99.04 on 15-Aug-24. UPI Ref no:123456789012. Avl Bal: Rs.10,500.00';
    const result = parseGenericSms(title, body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(99.04);
    expect(result!.utr).toBe('123456789012');
  });

  it('parses SBI credit SMS correctly', () => {
    const title = 'VK-SBINB-T';
    const body = 'Dear SBI Customer, your A/C 9876 credited by Rs 500.25 on 15Aug24 by UPI/123456789012/P2M. Bal: Rs 15200.50';
    const result = parseGenericSms(title, body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500.25);
  });

  it('parses ICICI Bank credit SMS correctly', () => {
    const title = 'AD-ICICIB-S';
    const body = 'Dear Customer, Account 00123 credited with INR 2,499.12 on 15-Aug-24. UTR: 998877665544. Available Balance: 50,000.';
    const result = parseGenericSms(title, body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2499.12);
    expect(result!.utr).toBe('998877665544');
  });

  it('parses Axis Bank credit SMS correctly', () => {
    const title = 'AXISBK-T';
    const body = 'Your Axis Bank A/c has been credited with INR 799.08 via UPI Ref 445566778899.';
    const result = parseGenericSms(title, body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(799.08);
    expect(result!.utr).toBe('445566778899');
  });

  it('rejects debit and OTP messages', () => {
    expect(parseGenericSms('VM-UCOBNK-S', 'A/c debited with Rs.500')).toBeNull();
    expect(parseGenericSms('VM-UCOBNK-S', 'Your OTP is 987654')).toBeNull();
  });
});

describe('UPI App Push Notification Parser', () => {
  it('parses Google Pay notification', () => {
    const pkg = 'com.google.android.apps.nbu.paisa.user';
    const title = 'Google Pay';
    const body = 'You received ₹499.05 from Rahul S. UPI Ref: 123456789012';
    const result = parseUpiAppNotification(pkg, title, body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(499.05);
    expect(result!.utr).toBe('123456789012');
  });

  it('parses PhonePe notification', () => {
    const pkg = 'com.phonepe.app';
    const title = 'PhonePe';
    const body = 'Payment of ₹150.99 received from Priya K. UTR: 887766554433';
    const result = parseUpiAppNotification(pkg, title, body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150.99);
    expect(result!.utr).toBe('887766554433');
  });

  it('parses Paytm notification', () => {
    const pkg = 'net.one97.paytm';
    const title = 'Paytm';
    const body = 'Money credited ₹1,000.42 to your bank account via UPI Ref: 556677889900';
    const result = parseUpiAppNotification(pkg, title, body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000.42);
    expect(result!.utr).toBe('556677889900');
  });
});

describe('Paise Offset Algorithm Stability', () => {
  it('generates 99 distinct unique slots per base amount', () => {
    const base = 299.0;
    const slots = new Set<number>();
    for (let i = 1; i <= 99; i++) {
      slots.add(Number((base + i / 100).toFixed(2)));
    }
    expect(slots.size).toBe(99);
    expect(slots.has(299.01)).toBe(true);
    expect(slots.has(299.99)).toBe(true);
  });
});
