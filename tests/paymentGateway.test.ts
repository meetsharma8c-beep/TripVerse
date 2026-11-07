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
import { formatCurrency, convertFromINR } from '../src/services/currencyService';

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

    it('applies PRO50 coupon on Pro Annual Pass', () => {
      const res = evaluateCoupon('PRO50', 999);
      expect(res.valid).toBe(true);
      expect(res.discount).toBe(50);
    });

    it('applies VIP10 percentage coupon on subscriptions', () => {
      const res = evaluateCoupon('VIP10', 999);
      expect(res.valid).toBe(true);
      expect(res.discount).toBe(100);
    });

    it('applies EARLYBIRD coupon on Pro Monthly Pass', () => {
      const res = evaluateCoupon('EARLYBIRD', 149);
      expect(res.valid).toBe(true);
      expect(res.discount).toBe(20);
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

    it('identifies Discover and JCB worldwide cards', () => {
      expect(detectCardBrand('6011000000000000')).toBe('discover');
      expect(detectCardBrand('6500000000000000')).toBe('discover');
      expect(detectCardBrand('3530000000000000')).toBe('jcb');
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

    it('formats currencies safely without throwing or rendering NaN', () => {
      expect(formatCurrency(undefined as any)).toBe('₹0');
      expect(formatCurrency(null as any)).toBe('₹0');
      expect(formatCurrency(NaN)).toBe('₹0');
      expect(formatCurrency(5000, 'INR')).toBe('₹5,000');
      expect(convertFromINR(NaN)).toBe(0);
      expect(convertFromINR(undefined as any)).toBe(0);
    });

    it('formats countdown timer seconds correctly for dynamic QR and rate locks', () => {
      const formatTimer = (totalSeconds: number) => {
        const m = Math.floor(Math.max(0, totalSeconds) / 60);
        const s = Math.max(0, totalSeconds) % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      expect(formatTimer(300)).toBe('05:00');
      expect(formatTimer(299)).toBe('04:59');
      expect(formatTimer(60)).toBe('01:00');
      expect(formatTimer(45)).toBe('00:45');
      expect(formatTimer(5)).toBe('00:05');
      expect(formatTimer(0)).toBe('00:00');
      expect(formatTimer(-1)).toBe('00:00');
    });
  });
});
