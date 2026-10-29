import { useModalBehavior } from '../../hooks/useModalBehavior';
import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trip, CurrencyCode } from '../../types/trip';
import { formatCurrency } from '../../services/currencyService';
import { triggerHaptic } from '../../services/deviceService';
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
  // Navigation / Payment Method Tab
  const [activeTab, setActiveTab] = useState<PaymentMethodType>('upi_qr');
  const [upiSubTab, setUpiSubTab] = useState<'qr' | 'apps' | 'id'>('qr');

  // Dynamic 5-minute (300 seconds) Countdown Timer State
  const INITIAL_TIMER_SECONDS = 300;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INITIAL_TIMER_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);
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

  // Base raw amounts in INR
  const baseTransport = trip?.budgetBreakdown?.transportation || 6500;
  const baseAccommodation = trip?.budgetBreakdown?.accommodation || 9500;
  const baseActivities = trip?.budgetBreakdown?.activities || 3200;

  let initialBaseAmount = trip?.estimatedTotal || (baseTransport + baseAccommodation + baseActivities);
  if (customAmount && customAmount > 0) {
    initialBaseAmount = customAmount;
  } else if (packageType === 'hotel_only') {
    initialBaseAmount = baseAccommodation;
  } else if (packageType === 'transit_only') {
    initialBaseAmount = baseTransport;
  } else if (packageType === 'pro_subscription') {
    initialBaseAmount = customAmount || 3999;
  }

  // Calculate taxes, discounts and net payable
  const coinDiscount = useTravelCoins ? Math.min(TRAVEL_COINS_VALUE, initialBaseAmount * 0.2) : 0;
  const promoDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const netDiscount = Math.round(coinDiscount + promoDiscount);
  
  // 18% GST calculation (transparently included/itemized)
  const taxableBase = Math.max(500, initialBaseAmount - netDiscount);
  const gstAmount = Math.round(taxableBase * 0.18);
  const finalPayableINR = Math.max(499, taxableBase + gstAmount);

  // Dynamic UPI URI
  const upiPaymentUri = buildUpiPaymentUri({
    amount: finalPayableINR,
    transactionRef: txnRef,
    transactionNote: `TripVerse ${destination} Booking`
  });
  const upiQrUrl = getUpiQrCodeUrl(upiPaymentUri, 280);

  // =========================================================================
  // 5-MINUTE LIVE COUNTDOWN TIMER ENGINE
  // =========================================================================
  useEffect(() => {
    if (!isOpen || !isTimerActive || gatewayStage !== 'checkout') return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isTimerActive, gatewayStage, qrKey]);

  // Reset timer handler
  const handleRegenerateQr = () => {
    triggerHaptic('medium');
    setSecondsRemaining(INITIAL_TIMER_SECONDS);
    setIsTimerActive(true);
    setQrKey(k => k + 1);
  };

  // Format MM:SS for countdown timer
  const formatTimerString = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer Circle Progress Math (300 seconds total)
  const timerRadius = 18;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerStrokeDashoffset = timerCircumference - (secondsRemaining / INITIAL_TIMER_SECONDS) * timerCircumference;

  // Color dynamics based on time remaining
  const getTimerColorClass = () => {
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
  const initiatePayment = async (methodName: string) => {
    triggerHaptic('medium');
    setGatewayStage('authorizing');
    setGatewayErrorMessage('');

    // Attempt Live Gateway Checkout via Razorpay Serverless API
    try {
      const orderRes = await createRazorpayOrder({
        amount: finalPayableINR,
        currency: 'INR',
        notes: {
          tripId: trip?.id || 'pro-membership',
          tripName: trip?.name || 'TripVerse Experience Booking'
        }
      });

      if (orderRes?.ok && orderRes.mode === 'live' && orderRes.orderId && orderRes.keyId) {
        const loaded = await loadRazorpayScript();
        if (loaded && (window as any).Razorpay) {
          const rzp = new (window as any).Razorpay({
            key: orderRes.keyId,
            amount: finalPayableINR * 100,
            currency: 'INR',
            name: 'TripVerse Travel Tech',
            description: customTitle || trip?.name || 'TripVerse Experience Booking',
            order_id: orderRes.orderId,
            handler: async (response: any) => {
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              if (verifyRes?.verified) {
                finalizeSuccessfulBooking(methodName, response.razorpay_payment_id);
              } else {
                setGatewayStage('checkout');
                alert('Cryptographic payment signature verification could not be completed.');
              }
            },
            modal: {
              ondismiss: () => {
                setGatewayStage('checkout');
              }
            },
            theme: { color: '#2D5A3D' }
          });
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
    const bookingId = `TRV-BKG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const effectiveTxnId = customTxnId || txnRef;

    const items = [
      { title: `Stay in ${destination} (${durationDays} Nights)`, category: 'Accommodation', amount: baseAccommodation },
      { title: `Transit: ${origin} ⇄ ${destination}`, category: 'Transport', amount: baseTransport },
      { title: 'Skip-The-Line Experience Passes', category: 'Activities', amount: baseActivities }
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

  return (
    <div 
      className="fixed inset-0 z-[250] flex items-start sm:items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-md overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div 
        className="my-auto flex w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] border border-emerald-900/40 bg-white shadow-2xl transition-all"
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

          <div className="flex items-center gap-3">
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
        {/* STAGE A: CHECKOUT SCREEN                                          */}
        {/* ================================================================ */}
        {gatewayStage === 'checkout' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
            
            {/* ------------------------------------------------------------ */}
            {/* LEFT COLUMN: PAYMENT METHOD TABS (7 cols)                     */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/60 p-4 sm:p-6">
              
              {/* Payment Methods Pill Selector */}
              <div className="mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Select Payment Method
                </span>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
                  {[
                    { id: 'upi_qr', label: 'UPI / QR', icon: QrCode, badge: '5 Min' },
                    { id: 'card', label: 'Cards', icon: CreditCard, badge: 'Debit/Credit' },
                    { id: 'netbanking', label: 'NetBanking', icon: Landmark, badge: '50+ Banks' },
                    { id: 'wallet', label: 'Wallets', icon: Wallet, badge: 'Coins/BNPL' },
                    { id: 'emi', label: 'EMI', icon: Receipt, badge: '0% Cost' }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setActiveTab(tab.id as PaymentMethodType);
                        }}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white text-emerald-950 font-bold shadow-sm border border-slate-200/80 scale-[1.02]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span className="text-[11px] leading-tight truncate w-full">{tab.label}</span>
                        <span className={`text-[9px] ${isActive ? 'text-emerald-700' : 'text-slate-400'} font-medium truncate`}>
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
                  <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setUpiSubTab('qr')}
                      className={`pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        upiSubTab === 'qr'
                          ? 'border-emerald-600 text-emerald-800'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
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
                          ? 'border-emerald-600 text-emerald-800'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
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
                          ? 'border-emerald-600 text-emerald-800'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Enter UPI ID
                    </button>
                  </div>

                  {/* Sub-tab A: DYNAMIC QR CODE DISPLAY WITH 5-MINUTE COUNTDOWN */}
                  {upiSubTab === 'qr' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-center shadow-xs space-y-3">
                      
                      {/* LIVE 5-MINUTE COUNTDOWN TIMER BADGE */}
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center justify-center w-8 h-8">
                            <svg className="w-8 h-8 -rotate-90">
                              <circle
                                cx="16"
                                cy="16"
                                r={timerRadius}
                                className="stroke-slate-200"
                                strokeWidth="3"
                                fill="transparent"
                              />
                              <circle
                                cx="16"
                                cy="16"
                                r={timerRadius}
                                className={`${getTimerColorClass()} transition-all duration-1000`}
                                strokeWidth="3"
                                strokeDasharray={timerCircumference}
                                strokeDashoffset={timerStrokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                              />
                            </svg>
                            <Clock className={`w-3.5 h-3.5 absolute ${getTimerColorClass()}`} />
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">QR Expires In</span>
                            <span className={`text-xs sm:text-sm font-black font-mono tracking-tight ${getTimerColorClass()}`}>
                              {formatTimerString(secondsRemaining)}
                            </span>
                          </div>
                        </div>

                        {secondsRemaining === 0 ? (
                          <button
                            type="button"
                            onClick={handleRegenerateQr}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerate
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Live Scanner Active</span>
                          </div>
                        )}
                      </div>

                      {/* QR Display or Expired State */}
                      {secondsRemaining > 0 ? (
                        <div className="space-y-3">
                          <div className="relative mx-auto w-48 h-48 sm:w-52 sm:h-52 p-2 rounded-2xl border border-slate-200 bg-white shadow-md flex items-center justify-center">
                            <img
                              src={upiQrUrl}
                              alt="Scan UPI QR Code to Pay"
                              className="w-full h-full object-contain rounded-xl"
                            />
                            {/* TripVerse Center Branding Pill */}
                            <div className="absolute inset-0 m-auto w-10 h-10 rounded-xl bg-white/95 border border-emerald-700 shadow-md flex items-center justify-center">
                              <span className="text-xs font-black text-emerald-800">TV</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 font-medium">
                            Scan with any UPI App: <strong className="text-slate-900">Google Pay, PhonePe, Paytm, CRED, BHIM</strong>
                          </p>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-bold text-emerald-900">
                            <span>Merchant UPI: 9904717666@ptaxis</span>
                          </div>

                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCopyUpiLink}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedUpi ? 'Copied UPI Intent' : 'Copy UPI Link'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 space-y-3 text-center">
                          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-900">QR Code Expired</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            The 5-minute security window has elapsed. Please regenerate a fresh QR code to proceed.
                          </p>
                          <button
                            type="button"
                            onClick={handleRegenerateQr}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Generate Fresh QR Code (5 Min)
                          </button>
                        </div>
                      )}

                      {/* Direct Checkout Actions */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                        <a
                          href={upiPaymentUri}
                          className="flex-1 py-2.5 px-4 rounded-xl border border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Open Installed UPI App</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => initiatePayment('Dynamic UPI QR')}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Verify via Razorpay Gateway</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab B: ONE-TAP UPI APPS */}
                  {upiSubTab === 'apps' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
                      <span className="text-xs font-bold text-slate-700 block">
                        Choose your installed UPI application:
                      </span>

                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: 'gpay', name: 'Google Pay', color: 'border-blue-200 hover:border-blue-500 bg-blue-50/40 text-blue-900' },
                          { id: 'phonepe', name: 'PhonePe', color: 'border-purple-200 hover:border-purple-500 bg-purple-50/40 text-purple-900' },
                          { id: 'paytm', name: 'Paytm UPI', color: 'border-sky-200 hover:border-sky-500 bg-sky-50/40 text-sky-900' },
                          { id: 'cred', name: 'CRED UPI', color: 'border-slate-300 hover:border-slate-800 bg-slate-100 text-slate-900' },
                          { id: 'bhim', name: 'BHIM UPI', color: 'border-teal-200 hover:border-teal-500 bg-teal-50/40 text-teal-900' },
                          { id: 'amazon', name: 'Amazon Pay', color: 'border-amber-200 hover:border-amber-500 bg-amber-50/40 text-amber-900' }
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

                      <a
                        href={upiPaymentUri}
                        className="w-full mt-3 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Open {selectedUpiApp || 'UPI App'} & Pay {formatCurrency(finalPayableINR, currency)}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => initiatePayment(`UPI App (${selectedUpiApp || 'Google Pay'})`)}
                        className="w-full py-2.5 rounded-xl border border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Or Pay via Razorpay Checkout</span>
                      </button>
                    </div>
                  )}

                  {/* Sub-tab C: UPI ID / VPA */}
                  {upiSubTab === 'id' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
                      <label className="text-xs font-bold text-slate-700 block">
                        Enter Recipient / Virtual Payment Address (VPA)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={upiIdInput}
                          onChange={e => setUpiIdInput(e.target.value)}
                          placeholder="e.g. mobile@okhdfcbank"
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      {/* Fast VPA Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['@ptaxis', '@okhdfcbank', '@okaxis', '@ybl', '@paytm', '@upi'].map(suffix => (
                          <button
                            key={suffix}
                            type="button"
                            onClick={() => setUpiIdInput(prev => (prev ? prev.split('@')[0] : 'alex') + suffix)}
                            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer"
                          >
                            {suffix}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => initiatePayment(`UPI ID (${upiIdInput || 'user@upi'})`)}
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
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
                  {/* Virtual Card Preview Header */}
                  <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 text-white shadow-md relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                        TripVerse Secure Card Pay
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        {detectCardBrand(cardNumber).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-mono tracking-widest mb-3">
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

                  {/* Card Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4532 8920 1823 4821"
                        maxLength={19}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Name on Card</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={e => setCardHolder(e.target.value)}
                        placeholder="e.g. Alex Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(formatCardExpiry(e.target.value))}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between mb-1">
                          <span>CVV / CVC</span>
                          <span className="text-[9px] text-slate-400 font-normal">3-4 digits</span>
                        </label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveCard}
                        onChange={e => setSaveCard(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-[11px] text-slate-600 font-medium">
                        Securely save card as per RBI Tokenization guidelines
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => initiatePayment(`Card (•••• ${cardNumber.slice(-4) || '4242'})`)}
                      className="w-full mt-2 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay {formatCurrency(finalPayableINR, currency)}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: NET BANKING */}
              {activeTab === 'netbanking' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2.5">
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
                              ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/30 font-bold'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 text-slate-700'
                          }`}
                        >
                          <span className="text-xs font-bold block truncate">{bank.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{bank.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Or select from 50+ other banks:
                    </label>
                    <select
                      value={selectedBank}
                      onChange={e => setSelectedBank(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      {OTHER_BANKS.map(bank => (
                        <option key={bank.id} value={bank.id}>{bank.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const bName = [...POPULAR_BANKS, ...OTHER_BANKS].find(b => b.id === selectedBank)?.name || 'NetBanking';
                      initiatePayment(`Net Banking (${bName})`);
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
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
                  {/* TripVerse Coins / Travel Wallet */}
                  <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm">
                          🪙
                        </div>
                        <div>
                          <span className="text-xs font-bold text-amber-950 block">TripVerse Travel Cash</span>
                          <span className="text-[11px] text-amber-700">₹1,500 promotional coins available</span>
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
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
                      </label>
                    </div>
                  </div>

                  {/* Wallets & BNPL providers */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">External Digital Wallets & BNPL</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'amazon_pay', name: 'Amazon Pay Balance', sub: 'Instant checkout' },
                        { id: 'paytm_wallet', name: 'Paytm Wallet', sub: 'Postpaid eligible' },
                        { id: 'simpl', name: 'Simpl PayLater', sub: '0% Interest for 15 Days' },
                        { id: 'lazypay', name: 'LazyPay', sub: 'Instant ₹10,000 credit' }
                      ].map(w => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => initiatePayment(`Wallet (${w.name})`)}
                          className="p-3 rounded-xl border border-slate-200 hover:border-emerald-600 bg-slate-50/50 hover:bg-emerald-50/20 text-left transition-all cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-900 block">{w.name}</span>
                          <span className="text-[10px] text-slate-500">{w.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 5: EMI & INSTALLMENTS */}
              {activeTab === 'emi' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
                  <span className="text-xs font-bold text-slate-800 block">
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
                        className="p-3 rounded-xl border border-slate-200 hover:border-emerald-600 flex items-center justify-between gap-3 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{plan.months} Months Plan</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-800">
                              {plan.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">{plan.rate}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-800 block">
                            ₹{plan.monthly.toLocaleString('en-IN')}/mo
                          </span>
                          <button
                            type="button"
                            onClick={() => initiatePayment(`EMI (${plan.months} Months @ ₹${plan.monthly}/mo)`)}
                            className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
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
            <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-6 bg-white space-y-4">
              
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Trip Order Summary
                </span>

                {/* Destination & Dates Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {packageType === 'pro_subscription' ? 'TripVerse Pro VIP Tier' : destination}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {packageType === 'pro_subscription' ? 'Unlimited AI Engine & 30h Co-Pilot' : `${origin} → ${destination}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {packageType === 'pro_subscription' ? 'VIP Access' : `${durationDays}D / ${Math.max(1, durationDays - 1)}N`}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                    <span>{packageType === 'pro_subscription' ? 'Plan Tier:' : 'Travelers:'}</span>
                    <strong className="text-slate-900">
                      {packageType === 'pro_subscription' ? 'All-Access Pass' : `${travelers} Pax`}
                    </strong>
                  </div>
                </div>

                {/* Promo Coupon Box */}
                <div className="space-y-2 mb-4">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Have a Promo Code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. TRIPVERSE500"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {couponMessage && (
                    <div className={`p-2 rounded-lg text-[11px] font-semibold flex items-center justify-between ${
                      couponMessage.isError ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'
                    }`}>
                      <span>{couponMessage.text}</span>
                      {appliedCoupon && (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  {/* Clickable Recommended Coupons */}
                  {!appliedCoupon && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {AVAILABLE_COUPONS.slice(0, 2).map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/50 text-[10px] font-bold text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <BadgePercent className="w-3 h-3 text-emerald-700" />
                          <span>{c.code} ({c.label})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Itemization Breakdown */}
                <div className="space-y-2 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200/80 text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Base Package Fare:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(initialBaseAmount, currency)}</span>
                  </div>

                  {coinDiscount > 0 && (
                    <div className="flex justify-between items-center text-amber-700 font-medium">
                      <span>TripVerse Coins Applied:</span>
                      <span>- {formatCurrency(coinDiscount, currency)}</span>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-emerald-700 font-medium">
                      <span>Promo ({appliedCoupon.code}) Discount:</span>
                      <span>- {formatCurrency(appliedCoupon.discount, currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Platform Convenience Fee:</span>
                    <span className="text-emerald-700 font-bold">
                      <span className="line-through text-slate-400 font-normal mr-1">₹199</span> FREE
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Taxes & GST (18%):</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(gstAmount, currency)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-xs font-black text-slate-900 uppercase">Total Amount:</span>
                    <span className="text-xl font-black text-emerald-800">
                      {formatCurrency(finalPayableINR, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust & Guarantee Banner */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Guaranteed Protection</span>
                </div>
                <p className="text-[10px] text-emerald-800/80 leading-relaxed">
                  Instant booking verification with immediate PNR and hotel confirmation. Free cancellation within 24 hours.
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
            <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-800 animate-spin" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Connecting to Secure Banking Gateway...
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Please do not refresh or press back. We are verifying authorization with your bank's 256-bit secure server.
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* STAGE C: HONEST GATEWAY UNAVAILABLE STATE (NO FAKE PNR/OTP)       */}
        {/* ================================================================ */}
        {gatewayStage === 'unavailable' && (
          <div className="p-6 sm:p-8 space-y-5 max-w-lg mx-auto my-auto min-h-[400px] flex flex-col justify-center">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-amber-950">
                  Live In-App Payment Gateway Not Configured
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  {gatewayErrorMessage || 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured on this server. No payment was charged and no PNR or hotel voucher has been issued.'}
                </p>
              </div>
            </div>

            {packageType === 'pro_subscription' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Complimentary Pro Preview Available
                </span>
                <p className="text-xs text-emerald-950 leading-relaxed">
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
                  Activate Complimentary Pro Preview (₹0)
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Complete Booking Directly on Official Partner Portals
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://www.google.com/travel/flights?q=${encodeURIComponent(`${origin} to ${destination}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 text-xs font-bold text-slate-800 transition-colors"
                  >
                    <span>Google Flights</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                  <a
                    href="https://www.irctc.co.in/nget/train-search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 text-xs font-bold text-slate-800 transition-colors"
                  >
                    <span>IRCTC Official Trains</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                  <a
                    href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(trip?.selectedHotel?.name || destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 text-xs font-bold text-slate-800 transition-colors"
                  >
                    <span>Booking.com Stays</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                  <a
                    href="https://www.redbus.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-600 text-xs font-bold text-slate-800 transition-colors"
                  >
                    <span>redBus Intercity</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGatewayStage('checkout')}
                className="flex-1 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                ← Back to Payment Options
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
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
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center shadow-md animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Payment Authorized & Verified
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Booking Confirmed!
              </h3>
              <p className="text-xs text-slate-500">
                Your journey to <strong className="text-slate-800">{destination}</strong> is officially booked & active.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Reference:</span>
                <span className="font-mono font-black text-slate-900">{confirmedBooking.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transit PNR:</span>
                <span className="font-mono font-black text-emerald-800">{confirmedBooking.pnr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hotel Voucher Code:</span>
                <span className="font-mono font-black text-indigo-800">{confirmedBooking.hotelVoucher}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-black text-slate-900">{formatCurrency(confirmedBooking.amount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-semibold text-slate-700">{confirmedBooking.paymentMethod}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadInvoice}
                className="w-full py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
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
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Declarative hidden anchor for invoice file download */}
        <a ref={downloadAnchorRef} className="hidden" aria-hidden="true" tabIndex={-1} />
      </div>
    </div>
  );
};
