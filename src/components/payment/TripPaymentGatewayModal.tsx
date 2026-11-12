import { useModalBehavior } from '../../hooks/useModalBehavior';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  QrCode, 
  CreditCard, 
  Smartphone, 
  Landmark, 
  Wallet, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight, 
  BadgePercent, 
  Download, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Globe,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trip, CurrencyCode } from '../../types/trip';
import { formatCurrency, CURRENCIES, convertFromINR } from '../../services/currencyService';
import { evaluateLiveMarketPrices } from '../../services/liveMarketPricingService';
import { triggerHaptic } from '../../services/deviceService';
import { getCurrentUser } from '../../services/authService';
import { 
  BookingRecord, 
  PaymentMethodType, 
  AVAILABLE_COUPONS, 
  POPULAR_BANKS, 
  OTHER_BANKS, 
  saveBookingRecord, 
  generatePNR, 
  generateHotelVoucher, 
  buildUpiPaymentUri, 
  getUpiQrCodeUrl, 
  evaluateCoupon, 
  detectCardBrand, 
  formatCardNumber, 
  formatCardExpiry,
  generateTicketReceiptText,
  createRazorpayOrder,
  verifyRazorpayPayment,
  loadRazorpayScript
} from '../../services/paymentGatewayService';
import { useLanguage } from '../../services/languageService';

interface TripPaymentGatewayModalProps {
  trip?: Trip | null;
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  customAmount?: number;
  packageType?: 'full_package' | 'hotel_only' | 'transit_only' | 'pro_subscription';
  customTitle?: string;
  onBookingSuccess?: (booking: BookingRecord) => void;
  onNavigateToPasses?: () => void;
}

export const TripPaymentGatewayModal: React.FC<TripPaymentGatewayModalProps> = ({
  trip,
  isOpen,
  onClose,
  currency,
  customAmount,
  packageType = 'full_package',
  customTitle,
  onBookingSuccess,
  onNavigateToPasses
}) => {
  const { t } = useLanguage();
  const isINR = currency === 'INR';

  // Navigation / Payment Method Tab
  // Intelligently defaults to 'upi_qr' for INR, and 'card' (Global Cards) for all worldwide currencies
  const [activeTab, setActiveTab] = useState<PaymentMethodType>(() => (isINR ? 'upi_qr' : 'card'));
  const [upiSubTab, setUpiSubTab] = useState<'qr' | 'apps' | 'id'>('qr');

  // Dynamic Session Guarantee Duration
  // Dynamic UPI QR: 5 minutes (300s); Global checkout (Cards, Apple/Google Pay, PayPal, etc.): 15 minutes (900s)
  const getSessionDuration = (tab: PaymentMethodType) => (tab === 'upi_qr' ? 300 : 900);

  const initialDuration = getSessionDuration(isINR ? 'upi_qr' : 'card');
  const targetExpiryRef = useRef<number>(Date.now() + initialDuration * 1000);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialDuration);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [qrKey, setQrKey] = useState<number>(1); // used to force reload / animate QR

  // UPI Form States
  const [upiIdInput, setUpiIdInput] = useState<string>('');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  // Card Form States
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [saveCard, setSaveCard] = useState<boolean>(true);
  const [cardValidationError, setCardValidationError] = useState<string | null>(null);

  // Netbanking Form States
  const [selectedBank, setSelectedBank] = useState<string>('hdfc');

  // Wallet & Coins States
  const [useTravelCoins, setUseTravelCoins] = useState<boolean>(false);
  const TRAVEL_COINS_VALUE = 1500; // ₹1,500 wallet coins

  // Download anchor ref (clean React ref, zero manual DOM manipulation)
  const downloadAnchorRef = useRef<HTMLAnchorElement>(null);

  // Promo Code States
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Gateway Processing States
  const [gatewayStage, setGatewayStage] = useState<'checkout' | 'authorizing' | 'unavailable' | 'success'>('checkout');
  const [gatewayErrorMessage, setGatewayErrorMessage] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  // Unique Transaction Reference for this session
  const [txnRef] = useState<string>(() => `TXN${Date.now().toString().slice(-8)}`);

  // Calculate Base Pricing and Package Items
  const destination = (trip?.destination || 'Global Travel').split(',')[0].trim();
  const origin = (trip?.origin || 'City Center').split(',')[0].trim();
  const travelers = Math.max(1, trip?.travelersCount || 1);
  const durationDays = trip?.durationDays || 3;
  const nights = Math.max(1, durationDays - 1);
  const rooms = Math.ceil(travelers / 2);

  // Evaluate real-time live market prices
  const liveMarket = useMemo(() => {
    if (!trip) return null;
    return evaluateLiveMarketPrices({
      origin: trip.origin || 'Mumbai',
      destination: trip.destination,
      durationDays: durationDays,
      travelersCount: travelers,
      startDate: trip.startDate,
      accommodationType: trip.accommodationType,
      transportMode: trip.transportMode
    });
  }, [trip, durationDays, travelers]);

  // Base live market calibrated amounts in INR
  const baseAccommodation = trip?.selectedHotel?.nightlyRate
    ? trip.selectedHotel.nightlyRate * nights * rooms
    : (liveMarket?.hotelTotalGroupINR || trip?.budgetBreakdown?.accommodation || 9500);

  const baseTransport = liveMarket
    ? (trip?.transportMode === 'flight'
        ? (liveMarket.smartHubArbitrage
            ? liveMarket.smartHubArbitrage.hubRoundTripPerPerson * travelers + liveMarket.smartHubArbitrage.groundTransferToHubCost
            : liveMarket.flightTotalGroupINR)
        : trip?.transportMode === 'train'
        ? liveMarket.trainTotalGroupINR
        : trip?.transportMode === 'car' || trip?.transportMode === 'bike'
        ? liveMarket.roadTripFuelAndTollsINR
        : liveMarket.localTransitTotalGroupINR)
    : (trip?.budgetBreakdown?.transportation || 6500);

  const baseActivities = liveMarket?.attractionsTotalGroupINR || trip?.budgetBreakdown?.activities || 3200;
  const baseDining = liveMarket?.diningTotalGroupINR || trip?.budgetBreakdown?.food || 4200;
  const baseBuffer = Math.round((baseTransport + baseAccommodation + baseActivities + baseDining) * 0.05);

  const currentPackageLiveTotal = baseTransport + baseAccommodation + baseActivities + baseDining + baseBuffer;

  let initialBaseAmount = customAmount && customAmount > 0
    ? customAmount
    : packageType === 'hotel_only'
    ? baseAccommodation
    : packageType === 'transit_only'
    ? baseTransport
    : packageType === 'pro_subscription'
    ? (customAmount || 999)
    : currentPackageLiveTotal;

  const isProSub = packageType === 'pro_subscription';

  // Calculate taxes, discounts and net payable
  const coinDiscount = useTravelCoins ? Math.min(TRAVEL_COINS_VALUE, initialBaseAmount * 0.2) : 0;
  const promoDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const netDiscount = Math.round(coinDiscount + promoDiscount);
  
  // Taxes and fee calculation: for Pro subscription, headline pricing is all-inclusive and respects discounts
  const minFloor = isProSub ? 1 : 500;
  const taxableBase = Math.max(minFloor, initialBaseAmount - netDiscount);
  const gstAmount = isProSub ? 0 : Math.round(taxableBase * 0.18);
  const finalPayableINR = isProSub 
    ? Math.max(1, initialBaseAmount - netDiscount) 
    : Math.max(499, taxableBase + gstAmount);

  // Dynamic UPI URI - recomputed when amount or transaction reference changes
  const upiPaymentUri = useMemo(() => {
    return buildUpiPaymentUri({
      amount: finalPayableINR,
      transactionRef: txnRef,
      transactionNote: isProSub ? 'TripVerse Pro VIP Subscription' : `TripVerse ${destination} Booking`
    });
  }, [finalPayableINR, txnRef, isProSub, destination]);

  const upiQrUrl = useMemo(() => {
    return `${getUpiQrCodeUrl(upiPaymentUri, 280)}&ts=${qrKey}`;
  }, [upiPaymentUri, qrKey]);

  // Live Currency Exchange Rate Metadata
  const currencyConfig = CURRENCIES[currency] || CURRENCIES.INR;
  const inrPerUnit = currencyConfig.rateFromINR > 0 ? (1 / currencyConfig.rateFromINR).toFixed(2) : '1.00';
  const exchangeRateText = !isINR 
    ? `1 ${currency} ≈ ₹${inrPerUnit} INR • ${t('Guaranteed Zero Forex Surcharge')}` 
    : `${t('RBI 256-Bit SSL Bank Direct')}`;

  // Adaptive Payment Tabs
  const paymentTabs = useMemo(() => {
    if (isINR) {
      return [
        { id: 'upi_qr' as PaymentMethodType, label: t('UPI / QR'), icon: QrCode, badge: t('5 Min') },
        { id: 'card' as PaymentMethodType, label: t('Cards'), icon: CreditCard, badge: t('Debit/Credit') },
        { id: 'netbanking' as PaymentMethodType, label: t('NetBanking'), icon: Landmark, badge: t('50+ Banks') },
        { id: 'wallet' as PaymentMethodType, label: t('Wallets'), icon: Wallet, badge: t('Coins/BNPL') },
        { id: 'emi' as PaymentMethodType, label: t('EMI'), icon: Receipt, badge: t('0% Cost') },
        { id: 'paypal' as PaymentMethodType, label: t('PayPal'), icon: Globe, badge: t('Global') }
      ];
    }

    return [
      { id: 'card' as PaymentMethodType, label: t('Global Cards'), icon: CreditCard, badge: t('Visa/MC/Amex') },
      { id: 'digital_wallets' as PaymentMethodType, label: t('Apple / Google Pay'), icon: Smartphone, badge: t('1-Tap Pay') },
      { id: 'paypal' as PaymentMethodType, label: t('PayPal'), icon: Globe, badge: t('Worldwide') },
      { id: 'upi_qr' as PaymentMethodType, label: t('UPI & India Pay'), icon: QrCode, badge: t('NRI / India') }
    ];
  }, [isINR, t]);

  const handleTabSwitch = (newTab: PaymentMethodType) => {
    triggerHaptic('light');
    setActiveTab(newTab);
    setCardValidationError(null);
    const duration = getSessionDuration(newTab);
    targetExpiryRef.current = Date.now() + duration * 1000;
    setSecondsRemaining(duration);
    setIsTimerActive(true);
    setSessionExpired(false);
  };

  // Ensure timer, gateway stage, and errors are freshly initialized every time modal opens or currency changes
  const prevIsOpenRef = useRef(false);
  const prevCurrencyRef = useRef(currency);

  useEffect(() => {
    if (isOpen) {
      const isFreshOpen = !prevIsOpenRef.current;
      const isCurrencyChanged = prevCurrencyRef.current !== currency;

      if (isFreshOpen || isCurrencyChanged) {
        prevCurrencyRef.current = currency;
        const defaultTab = currency === 'INR' ? 'upi_qr' : 'card';
        setActiveTab(defaultTab);
        setCardValidationError(null);
        const duration = getSessionDuration(defaultTab);
        targetExpiryRef.current = Date.now() + duration * 1000;
        setSecondsRemaining(duration);
        setIsTimerActive(true);
        setSessionExpired(false);
        setGatewayStage('checkout');
        setGatewayErrorMessage('');
        setCouponMessage(null);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currency]);

  // =========================================================================
  // PRECISION COUNTDOWN TIMER ENGINE (Wall-Clock with Background Tab Resume)
  // =========================================================================
  useEffect(() => {
    if (!isOpen || !isTimerActive || gatewayStage !== 'checkout') return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((targetExpiryRef.current - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setIsTimerActive(false);
        setSessionExpired(true);
      }
    };

    tick();
    // 500ms heartbeat interval guarantees second-by-second accuracy
    const timer = setInterval(tick, 500);

    // CRITICAL: Handle browser tab switching / app backgrounding on mobile & desktop!
    // When returning from UPI app, 2FA SMS, or authenticator, recalculate instantly
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || (typeof document.hasFocus === 'function' && document.hasFocus())) {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isOpen, isTimerActive, gatewayStage, activeTab, qrKey]);

  // Refresh / Regenerate Handler
  const handleRefreshSession = () => {
    triggerHaptic('medium');
    const duration = getSessionDuration(activeTab);
    targetExpiryRef.current = Date.now() + duration * 1000;
    setSecondsRemaining(duration);
    setIsTimerActive(true);
    setSessionExpired(false);
    setQrKey(k => k + 1);
  };

  const handleRegenerateQr = () => {
    handleRefreshSession();
  };

  // Format MM:SS for countdown timer
  const formatTimerString = (secs: number) => {
    const safe = Math.max(0, Math.floor(secs));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer Circle Progress Math
  const totalDuration = getSessionDuration(activeTab);
  const timerRadius = 18;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerStrokeDashoffset = timerCircumference - (secondsRemaining / totalDuration) * timerCircumference;

  // Color dynamics based on time remaining
  const getTimerColorClass = () => {
    if (sessionExpired) return 'text-rose-500 stroke-rose-500';
    if (secondsRemaining > 120) return 'text-emerald-500 stroke-emerald-500';
    if (secondsRemaining > 45) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500 animate-pulse';
  };

  useModalBehavior(isOpen, undefined);
  if (!isOpen) return null;

  // Apply Coupon Handler
  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim();
    if (!code) return;
    triggerHaptic('light');

    const result = evaluateCoupon(code, initialBaseAmount);
    if (result.valid) {
      setAppliedCoupon({ code: result.coupon!.code, discount: result.discount });
      setCouponMessage({ text: result.message, isError: false });
      setCouponInput('');
    } else {
      setCouponMessage({ text: result.message, isError: true });
    }
  };

  // Remove Coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage(null);
  };

  // Copy UPI string
  const handleCopyUpiLink = () => {
    navigator.clipboard.writeText(upiPaymentUri);
    setCopiedUpi(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // =========================================================================
  // EXECUTE PAYMENT & CONFIRMATION
  // =========================================================================
  const initiatePayment = async (
    methodName: string, 
    extraOptions?: { wallet?: string; bank?: string; vpa?: string }
  ) => {
    // Validate card details if initiating from the Card tab with partial input
    if (activeTab === 'card') {
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 15) {
        setCardValidationError('Please enter a valid 15 or 16-digit card number.');
        return;
      }
      if (cardExpiry.trim().length > 0 && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.trim())) {
        setCardValidationError('Please enter card expiry in MM/YY format (e.g. 12/28).');
        return;
      }
      if (cardCvv.trim().length > 0 && cardCvv.trim().length < 3) {
        setCardValidationError('Please enter a valid 3 or 4-digit CVV/CVC code.');
        return;
      }
      setCardValidationError(null);
    }

    triggerHaptic('medium');
    setGatewayStage('authorizing');
    setGatewayErrorMessage('');

    // Genuine worldwide currency matching with Razorpay supported currencies
    const ALLOWED_RAZORPAY_CURRENCIES = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'AUD', 'CAD']);
    const targetOrderCurrency = ALLOWED_RAZORPAY_CURRENCIES.has(currency) ? currency : 'USD';
    const targetOrderAmount = targetOrderCurrency === 'INR'
      ? finalPayableINR
      : Math.max(1, convertFromINR(finalPayableINR, targetOrderCurrency));

    // Attempt Live Gateway Checkout via Razorpay Serverless API
    try {
      const orderRes = await createRazorpayOrder({
        amount: targetOrderAmount,
        currency: targetOrderCurrency,
        notes: {
          tripId: trip?.id || 'pro-membership',
          tripName: trip?.name || 'TripVerse Experience Booking',
          displayCurrency: currency,
          displayAmount: String(targetOrderAmount),
          packageType,
          paymentMethod: methodName
        }
      });

      if (orderRes?.ok && (orderRes.mode === 'live' || orderRes.mode === 'test') && orderRes.orderId && orderRes.keyId) {
        const loaded = await loadRazorpayScript();
        if (loaded && (window as any).Razorpay) {
          const user = getCurrentUser();

          // Map active tab to authentic Razorpay prefill method
          let prefillMethod: string | undefined = undefined;
          if (activeTab === 'card') prefillMethod = 'card';
          else if (activeTab === 'netbanking') prefillMethod = 'netbanking';
          else if (activeTab === 'upi_qr' || activeTab === 'upi_apps' || activeTab === 'upi_id') prefillMethod = 'upi';
          else if (activeTab === 'wallet') prefillMethod = 'wallet';
          else if (activeTab === 'emi') prefillMethod = 'emi';
          // Note: For 'digital_wallets' (Apple Pay / Google Pay) and 'paypal', leaving prefillMethod undefined
          // allows Razorpay to display the device's native 1-tap checkout (Pay / GPay) and PayPal.

          const rzpConfig: any = {
            key: orderRes.keyId,
            amount: orderRes.amount,
            currency: orderRes.currency,
            name: 'TripVerse',
            description: customTitle || trip?.name || 'TripVerse Experience Booking',
            order_id: orderRes.orderId,
            prefill: {
              name: cardHolder.trim() || user?.displayName || '',
              email: user?.email || '',
              contact: user?.phoneNumber || '',
              method: prefillMethod
            },
            modal: {
              ondismiss: () => {
                setGatewayStage('checkout');
              }
            },
            theme: { color: '#2D5A3D' }
          };

          if (activeTab === 'netbanking') {
            const bankCode = extraOptions?.bank || [...POPULAR_BANKS, ...OTHER_BANKS].find(b => b.id === selectedBank)?.code;
            if (bankCode) {
              rzpConfig.prefill.bank = bankCode;
            }
          }

          if ((activeTab === 'upi_id' || (activeTab === 'upi_qr' && upiSubTab === 'id')) && (extraOptions?.vpa || upiIdInput.trim())) {
            rzpConfig.prefill.vpa = (extraOptions?.vpa || upiIdInput).trim();
          }

          if (activeTab === 'wallet' && extraOptions?.wallet) {
            rzpConfig.prefill.wallet = extraOptions.wallet;
          }

          const rzp = new (window as any).Razorpay({
            ...rzpConfig,
            handler: async (response: any) => {
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              if (verifyRes?.verified) {
                finalizeSuccessfulBooking(methodName, response.razorpay_payment_id);
              } else {
                setGatewayErrorMessage('Cryptographic payment signature verification failed. Your account was not charged.');
                setGatewayStage('unavailable');
              }
            }
          });

          if (typeof rzp.on === 'function') {
            rzp.on('payment.failed', (failure: any) => {
              const reason = failure?.error?.description || 'Payment authorization was declined by your bank or UPI app.';
              setGatewayErrorMessage(reason);
              setGatewayStage('unavailable');
            });
          }

          rzp.open();
          return;
        }
      }

      setGatewayErrorMessage(
        orderRes?.message ||
        'Live Razorpay merchant credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server.'
      );
      setGatewayStage('unavailable');
    } catch {
      setGatewayErrorMessage(
        'Could not reach the payment gateway server. Please complete your booking directly with official partner portals below.'
      );
      setGatewayStage('unavailable');
    }
  };

  const finalizeSuccessfulBooking = (methodName: string, customTxnId?: string) => {
    const pnrGenerated = generatePNR('TRV');
    const voucherGenerated = generateHotelVoucher();
    const bookingId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `TRV-BKG-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
      : `TRV-BKG-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const effectiveTxnId = customTxnId || txnRef;

    const items = packageType === 'hotel_only'
      ? [{ title: `Stay at ${trip?.selectedHotel?.name || destination} (${nights} Nights, ${rooms} Room${rooms > 1 ? 's' : ''})`, category: 'Accommodation', amount: initialBaseAmount }]
      : packageType === 'transit_only'
      ? [{ title: `Transit: ${origin} ⇄ ${destination} (${travelers} Traveler${travelers > 1 ? 's' : ''})`, category: 'Transport', amount: initialBaseAmount }]
      : [
          { title: `Stay in ${destination} (${nights} Nights, ${rooms} Room${rooms > 1 ? 's' : ''})`, category: 'Accommodation', amount: baseAccommodation },
          { title: `Transit: ${origin} ⇄ ${destination}`, category: 'Transport', amount: baseTransport },
          { title: 'Skip-The-Line Experience Passes', category: 'Activities', amount: baseActivities },
          { title: `Local Dining & Buffer (${durationDays} Days)`, category: 'Dining & Buffer', amount: baseDining + baseBuffer }
        ];

    const newBooking: BookingRecord = {
      id: bookingId,
      tripId: trip?.id || 'pro-membership',
      tripName: trip?.name || (packageType === 'pro_subscription' ? 'TripVerse Pro VIP Access' : `Journey to ${destination}`),
      origin,
      destination,
      startDate: trip?.startDate || new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * durationDays).toISOString().split('T')[0],
      travelersCount: travelers,
      amount: finalPayableINR,
      currency,
      paymentMethod: methodName,
      paymentMethodType: activeTab,
      transactionId: effectiveTxnId,
      pnr: pnrGenerated,
      hotelVoucher: voucherGenerated,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      packageType,
      items,
      couponApplied: appliedCoupon ? {
        code: appliedCoupon.code,
        discountAmount: appliedCoupon.discount
      } : undefined
    };

    saveBookingRecord(newBooking);
    setConfirmedBooking(newBooking);
    setGatewayStage('success');
    triggerHaptic('success');

    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#2D5A3D', '#10B981', '#34D399', '#D4AF37', '#0EA5E9']
      });
    } catch {}

    if (onBookingSuccess) {
      onBookingSuccess(newBooking);
    }
  };

  // Download Invoice as clean text / HTML document via React ref
  const handleDownloadInvoice = () => {
    if (!confirmedBooking || !downloadAnchorRef.current) return;
    triggerHaptic('light');
    const text = generateTicketReceiptText(confirmedBooking, currency);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = downloadAnchorRef.current;
    anchor.href = url;
    anchor.download = `TripVerse_Tax_Invoice_${confirmedBooking.id}.txt`;
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div 
        className="my-auto flex w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] border border-emerald-900/40 dark:border-slate-800 bg-white dark:bg-[#0C1523] shadow-2xl transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* ================================================================ */}
        {/* 1. TOP GATEWAY HEADER                                             */}
        {/* ================================================================ */}
        <header className="shrink-0 flex items-center justify-between border-b border-emerald-900/20 bg-gradient-to-r from-[#0B2545] via-[#134E4A] to-[#152A1C] px-4 py-3 sm:px-6 sm:py-3.5 text-white">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-white/10 text-emerald-400 backdrop-blur-sm border border-white/15 shrink-0">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  TripVerse Pay • PCI-DSS
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                  <Lock className="h-2.5 w-2.5" /> 256-Bit SSL
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate max-w-[55vw] sm:max-w-md">
                {customTitle || `Secure Checkout • ${destination} Package`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Timer Pill in Header */}
            {gatewayStage === 'checkout' && (
              <div 
                translate="no"
                data-no-translate="true"
                title={sessionExpired ? "Session expired. Click to refresh" : "Your price and exchange rate are locked for this duration"}
                className={`notranslate flex items-center gap-1.5 px-2.5 py-1 rounded-xl backdrop-blur-sm border text-white shadow-xs transition-colors ${
                  sessionExpired
                    ? 'bg-rose-950/80 border-rose-500/50'
                    : 'bg-black/30 border-white/15'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${
                  sessionExpired 
                    ? 'text-rose-400' 
                    : secondsRemaining <= 45 
                      ? 'text-rose-400 animate-pulse' 
                      : 'text-emerald-400'
                }`} />
                <span className="hidden sm:inline text-[9px] uppercase font-bold tracking-wider text-slate-300">
                  {sessionExpired ? 'Session:' : (activeTab === 'upi_qr' ? 'QR Lock:' : 'Rate Lock:')}
                </span>
                <span 
                  translate="no"
                  data-no-translate="true"
                  className={`font-mono font-black text-xs sm:text-sm notranslate ${
                  sessionExpired 
                    ? 'text-rose-300' 
                    : secondsRemaining <= 45 
                      ? 'text-rose-400 animate-pulse' 
                      : 'text-emerald-300'
                }`}>
                  {formatTimerString(secondsRemaining)}
                </span>
                {sessionExpired && (
                  <button
                    type="button"
                    onClick={handleRefreshSession}
                    title="Refresh Rate Lock Session"
                    className="ml-1 inline-flex items-center gap-1 rounded-md bg-rose-600 hover:bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Refresh</span>
                  </button>
                )}
              </div>
            )}

            <div className="hidden sm:block text-right">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Payable</span>
              <span className="text-lg font-black text-emerald-300">
                {formatCurrency(finalPayableINR, currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* ================================================================ */}
        {/* 2. BODY SCROLL CONTAINER (ZERO CLIPPING & SMOOTH RESPONSIVE)     */}
        {/* ================================================================ */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain focus:outline-none">

        {/* ================================================================ */}
        {/* STAGE A: CHECKOUT SCREEN                                          */}
        {/* ================================================================ */}
        {gatewayStage === 'checkout' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0">
            
            {/* ------------------------------------------------------------ */}
            {/* LEFT COLUMN: PAYMENT METHOD TABS (7 cols)                     */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#0B1320] p-3.5 sm:p-5">
              
              {/* Payment Methods Pill Selector */}
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Select Payment Method
                </span>

                <div className={`grid gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl ${
                  isINR 
                    ? 'grid-cols-3 sm:grid-cols-6' 
                    : 'grid-cols-2 sm:grid-cols-4'
                }`}>
                  {paymentTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabSwitch(tab.id as PaymentMethodType)}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-slate-900 text-emerald-950 dark:text-emerald-300 font-bold shadow-sm border border-slate-200/80 dark:border-slate-700/80 scale-[1.02]'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 font-semibold'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="text-[11px] leading-tight truncate w-full">{tab.label}</span>
                        <span className={`text-[9px] ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'} font-medium truncate`}>
                          {tab.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB CONTENT 1: UPI & DYNAMIC QR (WITH 5-MINUTE LIVE TIMER) */}
              {activeTab === 'upi_qr' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* UPI Sub-Tabs */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setUpiSubTab('qr')}
                      className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        upiSubTab === 'qr'
                          ? 'border-emerald-600 dark:border-emerald-500 text-emerald-800 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Dynamic UPI QR (5 Min Timer)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiSubTab('apps')}
                      className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        upiSubTab === 'apps'
                          ? 'border-emerald-600 dark:border-emerald-500 text-emerald-800 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      One-Tap UPI Apps
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiSubTab('id')}
                      className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        upiSubTab === 'id'
                          ? 'border-emerald-600 dark:border-emerald-500 text-emerald-800 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Enter UPI ID
                    </button>
                  </div>

                  {/* Sub-tab A: DYNAMIC QR CODE DISPLAY WITH 5-MINUTE COUNTDOWN */}
                  {upiSubTab === 'qr' && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-3 sm:p-4 text-center shadow-xs space-y-2.5">
                      
                      {/* LIVE 5-MINUTE COUNTDOWN TIMER BADGE */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center justify-center w-7 h-7">
                            <svg className="w-7 h-7 -rotate-90">
                              <circle
                                cx="14"
                                cy="14"
                                r={11}
                                className="stroke-slate-200 dark:stroke-slate-800"
                                strokeWidth="2.5"
                                fill="transparent"
                              />
                              <circle
                                cx="14"
                                cy="14"
                                r={11}
                                className={`${getTimerColorClass()} transition-all duration-1000`}
                                strokeWidth="2.5"
                                strokeDasharray={69.1}
                                strokeDashoffset={(69.1 * (300 - secondsRemaining)) / 300}
                                strokeLinecap="round"
                                fill="transparent"
                              />
                            </svg>
                            <Clock className={`w-3 h-3 absolute ${getTimerColorClass()}`} />
                          </div>
                          <div className="text-left" translate="no" data-no-translate="true">
                            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-tight">QR Expires In</span>
                            <span 
                              translate="no"
                              data-no-translate="true"
                              className={`text-xs sm:text-sm font-black font-mono tracking-tight notranslate ${getTimerColorClass()}`}
                            >
                              {formatTimerString(secondsRemaining)}
                            </span>
                          </div>
                        </div>

                        {secondsRemaining === 0 ? (
                          <button
                            type="button"
                            onClick={handleRegenerateQr}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerate
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>Live Scanner Active</span>
                          </div>
                        )}
                      </div>

                      {/* Dynamic QR Display or Expired State */}
                      {secondsRemaining > 0 ? (
                        <div className="space-y-3 py-1">
                          <div 
                            onClick={() => initiatePayment('Dynamic UPI QR')}
                            className="relative mx-auto w-40 h-40 sm:w-44 sm:h-44 p-3 rounded-2xl border-2 border-dashed border-emerald-600/70 dark:border-emerald-500/50 bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 dark:from-emerald-950/40 dark:via-slate-900/90 dark:to-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-700 dark:hover:border-emerald-400 shadow-sm flex flex-col items-center justify-center cursor-pointer transition-all group"
                            title="Click to launch Official Bank-Verified Live Dynamic QR"
                          >
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/60 shadow-xs flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                              <QrCode className="w-8 h-8 text-emerald-800 dark:text-emerald-400" />
                            </div>
                            <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider block">
                              Launch Live Dynamic QR
                            </span>
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                              NPCI & RBI Verified
                            </span>
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 text-[8px] font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/80">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Zero Invalid VPA Errors</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium max-w-sm mx-auto">
                            Click below to generate your authentic, order-locked QR code. Works 100% with <strong className="text-slate-900 dark:text-slate-200">Google Pay, PhonePe, Paytm, CRED & BHIM</strong> without invalid UPI ID errors.
                          </p>
                          
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-[10px] font-mono font-bold text-emerald-900 dark:text-emerald-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                              <span>NPCI Direct Gateway • Instant PNR Issuance</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 space-y-2.5 text-center">
                          <AlertCircle className="w-9 h-9 text-rose-500 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">QR Session Expired</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                            The 5-minute security window has elapsed. Please regenerate a fresh session to proceed.
                          </p>
                          <button
                            type="button"
                            onClick={handleRegenerateQr}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Generate Fresh QR Session (5 Min)
                          </button>
                        </div>
                      )}

                      {/* Direct Checkout Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => initiatePayment('Dynamic UPI QR')}
                          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          <QrCode className="w-4 h-4 text-emerald-300 animate-pulse" />
                          <span>Open Live Dynamic UPI QR ({formatCurrency(finalPayableINR, currency)})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab B: ONE-TAP UPI APPS */}
                  {upiSubTab === 'apps' && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 sm:p-5 space-y-3 shadow-xs">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Choose your installed UPI application:
                      </span>

                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: 'gpay', name: 'Google Pay', color: 'border-blue-200 dark:border-blue-900/60 hover:border-blue-500 dark:hover:border-blue-400 bg-blue-50/40 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' },
                          { id: 'phonepe', name: 'PhonePe', color: 'border-purple-200 dark:border-purple-900/60 hover:border-purple-500 dark:hover:border-purple-400 bg-purple-50/40 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200' },
                          { id: 'paytm', name: 'Paytm UPI', color: 'border-sky-200 dark:border-sky-900/60 hover:border-sky-500 dark:hover:border-sky-400 bg-sky-50/40 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200' },
                          { id: 'cred', name: 'CRED UPI', color: 'border-slate-300 dark:border-slate-700 hover:border-slate-800 dark:hover:border-slate-500 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100' },
                          { id: 'bhim', name: 'BHIM UPI', color: 'border-teal-200 dark:border-teal-900/60 hover:border-teal-500 dark:hover:border-teal-400 bg-teal-50/40 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200' },
                          { id: 'amazon', name: 'Amazon Pay', color: 'border-amber-200 dark:border-amber-900/60 hover:border-amber-500 dark:hover:border-amber-400 bg-amber-50/40 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200' }
                        ].map(app => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedUpiApp(app.name)}
                            className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${app.color} ${
                              selectedUpiApp === app.name ? 'ring-2 ring-emerald-600 font-bold' : ''
                            }`}
                          >
                            <span className="text-xs font-bold">{app.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => initiatePayment(`UPI App (${selectedUpiApp || 'Google Pay'})`)}
                        className="w-full mt-3 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Launch {selectedUpiApp || 'Google Pay'} & Pay ({formatCurrency(finalPayableINR, currency)})</span>
                      </button>
                    </div>
                  )}

                  {/* Sub-tab C: UPI ID / VPA */}
                  {upiSubTab === 'id' && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 sm:p-5 space-y-3 shadow-xs">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Enter Recipient / Virtual Payment Address (VPA)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={upiIdInput}
                          onChange={e => setUpiIdInput(e.target.value)}
                          placeholder="e.g. mobile@okhdfcbank"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Fast VPA Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['@ptaxis', '@okhdfcbank', '@okaxis', '@ybl', '@paytm', '@upi'].map(suffix => (
                          <button
                            key={suffix}
                            type="button"
                            onClick={() => setUpiIdInput(prev => (prev ? prev.split('@')[0] : 'alex') + suffix)}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => initiatePayment(`UPI ID (${upiIdInput || 'user@upi'})`, { vpa: upiIdInput.trim() })}
                        className="w-full mt-2 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Verify & Pay {formatCurrency(finalPayableINR, currency)}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT 2: CREDIT / DEBIT CARDS */}
              {activeTab === 'card' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-3.5 sm:p-4 space-y-3 shadow-xs">
                  {/* Virtual Card Preview Header */}
                  <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-3 text-white shadow-md relative overflow-hidden border border-slate-700/50">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                        TripVerse Secure Card Pay
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        {detectCardBrand(cardNumber).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-mono tracking-widest mb-2.5">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-300">
                      <div>
                        <span className="block text-[8px] text-slate-400">Cardholder</span>
                        <span>{cardHolder || 'TRAVELER NAME'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400">Expires</span>
                        <span>{cardExpiry || 'MM/YY'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accepted Worldwide Cards Row */}
                  <div className="flex items-center justify-between px-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>Accepted Worldwide:</span>
                    <div className="flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Visa</span>
                      <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">Mastercard</span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">Amex</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Discover</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">JCB</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">RuPay</span>
                    </div>
                  </div>

                  {sessionExpired && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="text-[11px] font-semibold">
                          Rate lock expired. Refresh to guarantee current exchange rate.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshSession}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shrink-0 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  )}

                  {/* Card Form */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4532 8920 1823 4821"
                        maxLength={19}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Name on Card</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={e => setCardHolder(e.target.value)}
                        placeholder="e.g. Alex Sharma"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(formatCardExpiry(e.target.value))}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between mb-1">
                          <span>CVV / CVC</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">3-4 digits</span>
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveCard}
                        onChange={e => setSaveCard(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-emerald-700 focus:ring-emerald-600 dark:bg-slate-900"
                      />
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        {isINR
                          ? 'Securely save card as per RBI Tokenization guidelines'
                          : 'Save card securely with PCI-DSS Level 1 & 256-bit AES Tokenization'}
                      </span>
                    </label>

                    {cardValidationError && (
                      <div className="p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{cardValidationError}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => initiatePayment(`Card (•••• ${cardNumber.slice(-4) || '4242'})`)}
                      className="w-full mt-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay {formatCurrency(finalPayableINR, currency)}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: DIGITAL WALLETS (APPLE PAY & GOOGLE PAY) */}
              {activeTab === 'digital_wallets' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>1-Tap Digital Wallets</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Instant, biometric-verified payment with your device. Zero form filling or manual card number entry.
                    </p>
                  </div>

                  {sessionExpired && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="text-[11px] font-semibold">
                          Session expired. Refresh to guarantee current exchange rate.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshSession}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shrink-0 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  )}

                  {/* 1-Tap Apple Pay Button */}
                  <button
                    type="button"
                    onClick={() => initiatePayment(`Apple Pay (${currency})`)}
                    className="w-full py-3.5 px-4 rounded-xl bg-black hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] border border-slate-700/50"
                  >
                    <span className="text-sm font-semibold tracking-tight">Apple Pay</span>
                    <span>• Pay {formatCurrency(finalPayableINR, currency)}</span>
                  </button>

                  {/* 1-Tap Google Pay Button */}
                  <button
                    type="button"
                    onClick={() => initiatePayment(`Google Pay (${currency})`)}
                    className="w-full py-3.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
                  >
                    <span className="font-black text-sm tracking-tight text-blue-600">G<span className="text-red-500">o</span><span className="text-amber-500">o</span><span className="text-blue-500">g</span><span className="text-emerald-500">l</span><span className="text-red-500">e</span> Pay</span>
                    <span>• Pay {formatCurrency(finalPayableINR, currency)}</span>
                  </button>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Biometric FaceID / TouchID Tokenized</span>
                    </span>
                    <span 
                      translate="no"
                      data-no-translate="true"
                      className="font-mono text-emerald-700 dark:text-emerald-400 font-bold notranslate"
                    >
                      Rate Lock: {formatTimerString(secondsRemaining)}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PAYPAL WORLDWIDE */}
              {activeTab === 'paypal' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[#003087] dark:text-sky-400" />
                      <span>PayPal Worldwide Checkout</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Pay safely in {currency} or your local currency using your PayPal balance, linked bank, or international card.
                    </p>
                  </div>

                  {sessionExpired && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="text-[11px] font-semibold">
                          Session expired. Refresh to guarantee current exchange rate.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshSession}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shrink-0 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  )}

                  {/* PayPal Primary Checkout Button */}
                  <button
                    type="button"
                    onClick={() => initiatePayment(`PayPal (${currency})`)}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#0070BA] hover:bg-[#003087] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <span className="font-black italic text-base">Pay<span className="text-[#00CFBE]">Pal</span></span>
                    <span>Checkout • {formatCurrency(finalPayableINR, currency)}</span>
                  </button>

                  <div className="rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 p-3 text-[10px] text-sky-900 dark:text-sky-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                      <span>PayPal Buyer Protection</span>
                    </div>
                    <p className="text-sky-800/80 dark:text-sky-300/80 leading-relaxed">
                      Includes 180 days buyer protection and zero liability for unauthorized international transactions.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Available in 200+ countries</span>
                    <span 
                      translate="no"
                      data-no-translate="true"
                      className="font-mono text-emerald-700 dark:text-emerald-400 font-bold notranslate"
                    >
                      Rate Lock: {formatTimerString(secondsRemaining)}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: NET BANKING */}
              {activeTab === 'netbanking' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 sm:p-5 space-y-4 shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2.5">
                      Popular Indian Banks
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {POPULAR_BANKS.map(bank => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setSelectedBank(bank.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedBank === bank.id
                              ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-600/30 text-emerald-950 dark:text-emerald-300 font-bold'
                              : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/40 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span className="text-xs font-bold block truncate">{bank.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{bank.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Or select from 50+ other banks:
                    </label>
                    <select
                      value={selectedBank}
                      onChange={e => setSelectedBank(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {OTHER_BANKS.map(bank => (
                        <option key={bank.id} value={bank.id} className="dark:bg-slate-900 dark:text-white">{bank.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const bankInfo = [...POPULAR_BANKS, ...OTHER_BANKS].find(b => b.id === selectedBank);
                      const bName = bankInfo?.name || 'NetBanking';
                      initiatePayment(`Net Banking (${bName})`, { bank: bankInfo?.code });
                    }}
                    className="w-full mt-2 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Secure Bank Portal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TAB CONTENT 4: WALLETS & PAY LATER */}
              {activeTab === 'wallet' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 sm:p-5 space-y-4 shadow-xs">
                  {/* TripVerse Coins / Travel Wallet */}
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50/40 dark:from-amber-950/40 dark:to-orange-950/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Coins className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">TripVerse Travel Cash</span>
                          <span className="text-[11px] text-amber-700 dark:text-amber-400">₹1,500 promotional coins available</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useTravelCoins}
                          onChange={e => {
                            triggerHaptic('light');
                            setUseTravelCoins(e.target.checked);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
                      </label>
                    </div>
                  </div>

                  {/* Wallets & BNPL providers */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">External Digital Wallets & BNPL</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'amazon_pay', name: 'Amazon Pay Balance', sub: 'Instant checkout', code: 'amazonpay' },
                        { id: 'paytm_wallet', name: 'Paytm Wallet', sub: 'Postpaid eligible', code: 'paytm' },
                        { id: 'mobikwik', name: 'MobiKwik', sub: 'Instant checkout', code: 'mobikwik' },
                        { id: 'freecharge', name: 'Freecharge', sub: 'Instant checkout', code: 'freecharge' }
                      ].map(w => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => initiatePayment(`Wallet (${w.name})`, { wallet: w.code })}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-emerald-600 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/30 text-left transition-all cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">{w.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{w.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 5: EMI & INSTALLMENTS */}
              {activeTab === 'emi' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 sm:p-5 space-y-3 shadow-xs">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    No-Cost & Low-Cost Credit Card EMI Options
                  </span>

                  <div className="space-y-2">
                    {[
                      { months: 3, rate: '0% No-Cost EMI', monthly: Math.round(finalPayableINR / 3), badge: 'Best Value' },
                      { months: 6, rate: '0% No-Cost EMI', monthly: Math.round(finalPayableINR / 6), badge: 'Popular' },
                      { months: 9, rate: '12% p.a. standard', monthly: Math.round((finalPayableINR * 1.09) / 9), badge: 'Standard' },
                      { months: 12, rate: '14% p.a. standard', monthly: Math.round((finalPayableINR * 1.14) / 12), badge: 'Standard' }
                    ].map(plan => (
                      <div
                        key={plan.months}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-emerald-600 dark:hover:border-emerald-500 bg-slate-50/30 dark:bg-slate-800/40 flex items-center justify-between gap-3 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{plan.months} Months Plan</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70">
                              {plan.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{plan.rate}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 block">
                            ₹{plan.monthly.toLocaleString('en-IN')}/mo
                          </span>
                          <button
                            type="button"
                            onClick={() => initiatePayment(`EMI (${plan.months} Months @ ₹${plan.monthly}/mo)`)}
                            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            Choose Plan →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* ------------------------------------------------------------ */}
            {/* RIGHT COLUMN: ORDER SUMMARY & COUPONS (5 cols)               */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-5 flex flex-col justify-between p-3.5 sm:p-5 bg-white dark:bg-[#0C1523] space-y-3">
              
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Trip Order Summary
                </span>

                {/* Worldwide Live Forex Guarantee Badge */}
                {!isINR && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/90 dark:border-emerald-800/70 text-[10px] text-emerald-900 dark:text-emerald-300 font-medium mb-2.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold">Guaranteed Forex Rate: </span>
                      <span>1 {currency} ≈ ₹{inrPerUnit} INR • 0% Forex Surcharge</span>
                    </div>
                  </div>
                )}

                {/* Destination & Dates Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 mb-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {packageType === 'pro_subscription' ? 'TripVerse Pro VIP Tier' : destination}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                        {packageType === 'pro_subscription' ? 'Unlimited AI Engine & 30h Co-Pilot' : `${origin} → ${destination}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70">
                      {packageType === 'pro_subscription' ? 'VIP Access' : `${durationDays}D / ${Math.max(1, durationDays - 1)}N`}
                    </span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
                    <span>{packageType === 'pro_subscription' ? 'Plan Tier:' : 'Travelers:'}</span>
                    <strong className="text-slate-900 dark:text-white">
                      {packageType === 'pro_subscription' ? 'All-Access Pass' : `${travelers} Pax`}
                    </strong>
                  </div>
                </div>

                {/* Promo Coupon Box */}
                <div className="space-y-1.5 mb-2.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">
                    {t('Have a Promo Code?')}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TRIPVERSE500"
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {couponMessage && (
                    <div className={`p-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-between ${
                      couponMessage.isError ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      <span>{couponMessage.text}</span>
                      {appliedCoupon && (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  {/* Clickable Recommended Coupons */}
                  {!appliedCoupon && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(isProSub
                        ? AVAILABLE_COUPONS.filter(c => c.minAmount <= initialBaseAmount)
                        : AVAILABLE_COUPONS.filter(c => !['PRO50', 'EARLYBIRD'].includes(c.code))
                      ).slice(0, 3).map(c => {
                        const couponLabel = c.discountType === 'flat' 
                          ? `${formatCurrency(c.discountValue, currency)} OFF` 
                          : `${c.discountValue}% OFF`;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleApplyCoupon(c.code)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-emerald-400 dark:border-emerald-700/80 bg-emerald-50/50 dark:bg-emerald-950/40 text-[9px] font-bold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                          >
                            <BadgePercent className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-400" />
                            <span>{c.code} ({couponLabel})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Price Itemization Breakdown */}
                <div className="space-y-1.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/80 p-2.5 sm:p-3 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>{isProSub ? 'TripVerse Pro Plan:' : 'Base Package Fare:'}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(initialBaseAmount, currency)}</span>
                  </div>

                  {coinDiscount > 0 && (
                    <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 font-medium">
                      <span>TripVerse Coins Applied:</span>
                      <span>- {formatCurrency(coinDiscount, currency)}</span>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Promo ({appliedCoupon.code}) Discount:</span>
                      <span>- {formatCurrency(appliedCoupon.discount, currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Platform Convenience Fee:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      <span className="line-through text-slate-400 dark:text-slate-500 font-normal mr-1">{formatCurrency(199, currency)}</span> FREE
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>{isProSub ? 'Taxes & GST (Included):' : 'Taxes & GST (18%):'}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {isProSub ? 'Included' : formatCurrency(gstAmount, currency)}
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase">Total Amount:</span>
                    <span className="text-lg font-black text-emerald-800 dark:text-emerald-400">
                      {formatCurrency(finalPayableINR, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust & Guarantee Banner */}
              <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/40 p-2.5 text-[10px] text-emerald-900 dark:text-emerald-300 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Guaranteed Protection</span>
                </div>
                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                  {isProSub
                    ? 'Instant Pro VIP activation with unlimited AI replanning, 4K offline exports, and priority ConCode concierge.'
                    : 'Instant booking verification with immediate PNR and hotel confirmation. Free cancellation within 24 hours.'}
                </p>
              </div>

            </div>

          </div>
        )}

        {/* ================================================================ */}
        {/* STAGE B: AUTHORIZING / BANK CONNECTIVITY LOADER                   */}
        {/* ================================================================ */}
        {gatewayStage === 'authorizing' && (
          <div className="p-12 text-center space-y-4 min-h-[400px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-200 dark:border-emerald-800/60 border-t-emerald-800 dark:border-t-emerald-400 animate-spin" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Connecting to Secure Banking Gateway...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Please do not refresh or press back. We are verifying authorization with your bank's 256-bit secure server.
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* STAGE C: HONEST GATEWAY UNAVAILABLE STATE (NO FAKE PNR/OTP)       */}
        {/* ================================================================ */}
        {gatewayStage === 'unavailable' && (
          <div className="p-6 sm:p-8 space-y-5 max-w-lg mx-auto my-auto min-h-[400px] flex flex-col justify-center">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-4 text-left">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-amber-950 dark:text-amber-200">
                  Live In-App Payment Gateway Not Configured
                </h3>
                <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                  {gatewayErrorMessage || 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured on this server. No payment was charged and no PNR or hotel voucher has been issued.'}
                </p>
              </div>
            </div>

            {packageType === 'pro_subscription' ? (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 space-y-3 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                  Complimentary Pro Preview Available
                </span>
                <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  Since live merchant billing is not active on this server, you can unlock <strong>TripVerse Pro</strong> immediately at zero cost (no payment charged).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onBookingSuccess) {
                      onBookingSuccess({
                        id: `PRO-FREE-${Date.now()}`,
                        tripId: 'pro-membership',
                        tripName: 'TripVerse Pro Complimentary Access',
                        origin,
                        destination: 'TripVerse Pro',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0],
                        travelersCount: 1,
                        amount: 0,
                        currency,
                        paymentMethod: 'Complimentary Preview (No Charge)',
                        paymentMethodType: 'wallet',
                        transactionId: `FREE-${Date.now()}`,
                        pnr: 'N/A',
                        hotelVoucher: 'N/A',
                        createdAt: new Date().toISOString(),
                        status: 'confirmed',
                        packageType: 'pro_subscription',
                        items: [{ title: 'TripVerse Pro Preview Access', category: 'Subscription', amount: 0 }]
                      });
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Activate Complimentary Pro Preview ({formatCurrency(0, currency)})
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Complete Booking Directly on Official Partner Portals
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`${origin} to ${destination}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-emerald-600 dark:hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span>Google Flights</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  </a>
                  <a
                    href="https://www.irctc.co.in/nget/train-search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-emerald-600 dark:hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span>IRCTC Official Trains</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  </a>
                  <a
                    href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(trip?.selectedHotel?.name || destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-emerald-600 dark:hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span>Booking.com Stays</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  </a>
                  <a
                    href="https://www.redbus.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-emerald-600 dark:hover:border-emerald-500 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span>redBus Intercity</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGatewayStage('checkout')}
                className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                ← Back to Payment Options
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STAGE D: PAYMENT SUCCESS & BOOKING CONFIRMATION                   */}
        {/* ================================================================ */}
        {gatewayStage === 'success' && confirmedBooking && (
          <div className="p-6 sm:p-8 space-y-6 text-center max-w-lg mx-auto min-h-[460px] flex flex-col justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 mx-auto flex items-center justify-center shadow-md animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Payment Authorized & Verified
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Booking Confirmed!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your journey to <strong className="text-slate-800 dark:text-slate-200">{destination}</strong> is officially booked & active.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Booking Reference:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white">{confirmedBooking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Transit PNR:</span>
                <span className="font-mono font-black text-emerald-800 dark:text-emerald-400">{confirmedBooking.pnr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Hotel Voucher Code:</span>
                <span className="font-mono font-black text-indigo-800 dark:text-indigo-400">{confirmedBooking.hotelVoucher}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Amount Paid:</span>
                <span className="font-black text-slate-900 dark:text-white">{formatCurrency(confirmedBooking.amount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Payment Channel:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{confirmedBooking.paymentMethod}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Download E-Ticket & Tax Invoice</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateToPasses) onNavigateToPasses();
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>View in Passes & Hub</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Declarative hidden anchor for invoice file download */}
        <a ref={downloadAnchorRef} className="hidden" aria-hidden="true" tabIndex={-1} />
      </div>
    </div>,
    document.body
  );
};
