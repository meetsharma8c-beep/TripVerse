import { describe, it, expect } from 'vitest';
import { 
  evaluateCoupon, 
  detectCardBrand, 
  generatePNR, 
  generateHotelVoucher,
  formatCardNumber,
  formatCardExpiry,
  buildUpiPaymentUri
} from '../src/services/paymentGatewayService';

describe('PaymentGatewayService Unit Tests', () => {
  describe('evaluateCoupon', () => {
    it('applies TRIPVERSE500 flat discount when minAmount is satisfied', () => {
      const res = evaluateCoupon('TRIPVERSE500', 3000);
      expect(res.valid).toBe(true);
      expect(res.discount).toBe(500);
    });

    it('rejects TRIPVERSE500 when below minimum amount', () => {
      const res = evaluateCoupon('TRIPVERSE500', 1000);
      expect(res.valid).toBe(false);
      expect(res.discount).toBe(0);
    });

    it('applies percentage coupon WANDERLUST within max limit', () => {
      const res = evaluateCoupon('WANDERLUST', 10000);
      expect(res.valid).toBe(true);
      // 10% of 10000 = 1000, maxDiscount is 2500
      expect(res.discount).toBe(1000);
    });

    it('caps percentage coupon discount at maxDiscount', () => {
      const res = evaluateCoupon('WANDERLUST', 50000);
      expect(res.valid).toBe(true);
      // 10% of 50000 = 5000, capped at maxDiscount 2500
      expect(res.discount).toBe(2500);
    });

    it('handles invalid coupon codes gracefully', () => {
      const res = evaluateCoupon('NONEXISTENT_CODE', 10000);
      expect(res.valid).toBe(false);
      expect(res.discount).toBe(0);
    });
  });

  describe('detectCardBrand', () => {
    it('identifies Visa cards', () => {
      expect(detectCardBrand('4111222233334444')).toBe('visa');
    });

    it('identifies Mastercard cards', () => {
      expect(detectCardBrand('5100000000000000')).toBe('mastercard');
      expect(detectCardBrand('5500000000000000')).toBe('mastercard');
    });

    it('identifies RuPay cards', () => {
      expect(detectCardBrand('6080000000000000')).toBe('rupay');
      expect(detectCardBrand('6521000000000000')).toBe('rupay');
    });

    it('identifies Amex cards', () => {
      expect(detectCardBrand('378282246310005')).toBe('amex');
    });
  });

  describe('Formatting & Generation', () => {
    it('generates valid PNR string with TRV prefix', () => {
      const pnr = generatePNR('TRV');
      expect(pnr).toMatch(/^TRV-[A-Z]{3}[0-9]{4}$/);
    });

    it('generates valid hotel voucher with HTL prefix', () => {
      const voucher = generateHotelVoucher();
      expect(voucher).toMatch(/^HTL-[0-9A-Z]{6}$/);
    });

    it('formats card numbers with spaces', () => {
      expect(formatCardNumber('1234567812345678')).toBe('1234 5678 1234 5678');
    });

    it('formats expiry dates as MM/YY', () => {
      expect(formatCardExpiry('1228')).toBe('12/28');
    });

    it('builds authentic UPI URI', () => {
      const uri = buildUpiPaymentUri({
        amount: 2500,
        transactionRef: 'TXN123456'
      });
      expect(uri).toContain('upi://pay?');
      expect(uri).toContain('am=2500.00');
      expect(uri).toContain('tr=TXN123456');
    });
  });
});
