import { TransportDeal, TransportMode, Priority } from '../types/trip';

export interface DealQueryParams {
  mode: TransportMode;
  origin: string;
  destination: string;
  durationDays: number;
  travelersCount: number;
  totalBudget: number;
  priorities?: Priority[];
}

export function generateTransportDeals(params: DealQueryParams): {
  bestDeal: TransportDeal;
  allDeals: TransportDeal[];
} {
  const mode = params.mode === 'any' ? 'train' : params.mode;
  const deals = getDealsForMode(mode, params);

  const bestDeal = deals.find(d => d.isBestDeal) || deals[0];
  return {
    bestDeal,
    allDeals: deals
  };
}

export function getDealsForMode(mode: TransportMode, params: DealQueryParams): TransportDeal[] {
  const originCity = (params.origin || 'Origin').split(',')[0].trim();
  const destCity = (params.destination || 'Destination').split(',')[0].trim();
  const travelers = Math.max(1, params.travelersCount || 1);
  const baseBudgetShare = Math.round(params.totalBudget * 0.28);

  switch (mode) {
    case 'flight': {
      const baseFare = Math.max(2800, Math.round(baseBudgetShare / travelers));
      return [
        {
          id: `deal-flight-1-${Date.now()}`,
          mode: 'flight',
          provider: 'IndiGo 6E SuperSaver',
          title: `Non-Stop Morning Flight to ${destCity}`,
          subtitle: `${originCity} (Terminal 1) → ${destCity} Airport • Direct`,
          badge: 'Verified Partner Deal',
          isBestDeal: true,
          route: {
            from: `${originCity} (AMD/BOM)`,
            to: `${destCity} (UDR/JAI)`,
            departureTime: '06:45 AM',
            arrivalTime: '08:15 AM',
            duration: '1h 30m',
            stopsText: 'Non-Stop direct flight'
          },
          originalPrice: Math.round(baseFare * 1.35 * travelers),
          dealPrice: Math.round(baseFare * travelers),
          discountPercent: 26,
          savingsAmount: Math.round(baseFare * 0.35 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.8,
          reviewCount: 3840,
          features: [
            '15 kg Check-in Baggage + 7 kg Cabin Included',
            'Zero Convenience Fee with Promo Code',
            'Free Standard Seat Selection (Rows 8-15)',
            'Instant PNR Confirmation & Web Check-in',
            'Complimentary Beverage Voucher'
          ],
          couponCode: 'INDIGO500',
          bookingUrl: 'https://www.goindigo.in/',
          partnerVerified: true,
          termsAndConditions: 'Official IndiGo Promo: Flat ₹500 off on domestic round trips via UPI or NetBanking. Minimum booking value ₹2,500.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 2500,
          urgencyText: 'Lowest airfare seen in the last 14 days — 4 seats left at this promo rate',
          vehicleDetails: {
            type: 'Airbus A320neo',
            model: 'Modern Quiet Fleet',
            seats: 186,
            luggage: '15kg check-in + 7kg cabin'
          }
        },
        {
          id: `deal-flight-2-${Date.now()}`,
          mode: 'flight',
          provider: 'Air India Express Flexi',
          title: `Prime Afternoon Non-Stop Flight`,
          subtitle: `Complimentary hot snack & hot beverage onboard`,
          badge: 'Premium Comfort',
          isBestDeal: false,
          route: {
            from: `${originCity} (T2)`,
            to: `${destCity}`,
            departureTime: '02:15 PM',
            arrivalTime: '03:50 PM',
            duration: '1h 35m',
            stopsText: 'Non-Stop direct flight'
          },
          originalPrice: Math.round(baseFare * 1.45 * travelers),
          dealPrice: Math.round(baseFare * 1.15 * travelers),
          discountPercent: 21,
          savingsAmount: Math.round(baseFare * 0.30 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.7,
          reviewCount: 2100,
          features: [
            '20 kg Generous Check-in Allowance',
            'Complimentary Hot Meal Tray Included',
            'Free Rescheduling up to 24h before departure',
            'Priority Baggage Handling'
          ],
          couponCode: 'FLYAI250',
          bookingUrl: 'https://www.airindiaexpress.com/',
          partnerVerified: true,
          termsAndConditions: 'Instant ₹250 discount on domestic direct flights. Valid on Air India Express website & mobile app.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 2800,
          urgencyText: 'Flash promo code active today',
          vehicleDetails: {
            type: 'Boeing 737 MAX',
            model: 'Extra Legroom Seating',
            seats: 178,
            luggage: '20kg check-in + 7kg cabin'
          }
        },
        {
          id: `deal-flight-3-${Date.now()}`,
          mode: 'flight',
          provider: 'Akasa Air Saver',
          title: `Late Evening Economy Flight`,
          subtitle: `Maximum budget savings for night arrivals`,
          badge: 'Lowest Airfare',
          isBestDeal: false,
          route: {
            from: `${originCity}`,
            to: `${destCity}`,
            departureTime: '09:20 PM',
            arrivalTime: '10:55 PM',
            duration: '1h 35m',
            stopsText: 'Non-Stop direct flight'
          },
          originalPrice: Math.round(baseFare * 1.15 * travelers),
          dealPrice: Math.round(baseFare * 0.88 * travelers),
          discountPercent: 24,
          savingsAmount: Math.round(baseFare * 0.27 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.6,
          reviewCount: 1420,
          features: [
            'Ultra Low Cost Base Fare',
            'USB Fast Charging Port at Every Seat',
            'Cafe Akasa Pre-book 15% discount',
            'Digital Boarding Pass on WhatsApp'
          ],
          couponCode: 'AKASANEW',
          bookingUrl: 'https://www.akasaair.com/',
          partnerVerified: true,
          termsAndConditions: '10% instant discount on base fare for first-time bookings on Akasa Air web and mobile app.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 2000,
          urgencyText: 'Great for travelers on a strict budget',
          vehicleDetails: {
            type: 'Boeing 737-8',
            model: 'Cafe Akasa In-Flight',
            seats: 189,
            luggage: '15kg check-in included'
          }
        }
      ];
    }

    case 'train': {
      const trainBaseFare = Math.max(950, Math.round((baseBudgetShare * 0.55) / travelers));
      return [
        {
          id: `deal-train-1-${Date.now()}`,
          mode: 'train',
          provider: 'Vande Bharat Express (20901)',
          title: `Semi-High Speed Vande Bharat Executive Chair Car`,
          subtitle: `${originCity} Jn → ${destCity} • Premium AC Express`,
          badge: 'Verified Rail Deal',
          isBestDeal: true,
          route: {
            from: `${originCity} Junction`,
            to: `${destCity} Railway Station`,
            departureTime: '06:10 AM',
            arrivalTime: '11:20 AM',
            duration: '5h 10m',
            stopsText: 'Fastest rail connection (3 intermediate stops)'
          },
          originalPrice: Math.round(trainBaseFare * 1.4 * travelers),
          dealPrice: Math.round(trainBaseFare * 1.05 * travelers),
          discountPercent: 25,
          savingsAmount: Math.round(trainBaseFare * 0.35 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.9,
          reviewCount: 4210,
          features: [
            '98% Confirmed Seat Prediction by IRCTC Engine',
            'Complimentary Hot Breakfast & Morning Tea included',
            'Zero PG Convenience Surcharge via IRCTC UPI',
            '180° Rotating Seats & Panoramic Windows',
            'Automatic Plug Doors & Clean Bio-Vacuum Restrooms'
          ],
          couponCode: 'IRCTC50',
          bookingUrl: 'https://www.irctc.co.in/nget/train-search',
          partnerVerified: true,
          termsAndConditions: 'Zero payment gateway surcharge on IRCTC iMudra and UPI payments for Indian Railways tickets.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 500,
          urgencyText: 'High Demand: Only 12 Executive CC seats remaining today',
          vehicleDetails: {
            type: 'Vande Bharat Trainset',
            model: 'Executive Chair Car (EC)',
            seats: 52,
            luggage: 'Spacious overhead racks + luggage bay'
          }
        },
        {
          id: `deal-train-2-${Date.now()}`,
          mode: 'train',
          provider: 'Rajdhani / Duronto Express',
          title: `Overnight 3-Tier AC Sleeper with Meals`,
          subtitle: `Sleep comfortably and arrive fresh at dawn`,
          badge: 'Overnight Comfort',
          isBestDeal: false,
          route: {
            from: `${originCity} Central`,
            to: `${destCity}`,
            departureTime: '10:45 PM',
            arrivalTime: '06:30 AM',
            duration: '7h 45m',
            stopsText: 'Overnight non-stop superfast'
          },
          originalPrice: Math.round(trainBaseFare * 1.25 * travelers),
          dealPrice: Math.round(trainBaseFare * 0.95 * travelers),
          discountPercent: 24,
          savingsAmount: Math.round(trainBaseFare * 0.30 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.7,
          reviewCount: 3120,
          features: [
            'Fresh Sanitized Linen, Blanket & Pillow Kit',
            'Late Night Dinner + Morning Tea Included',
            'Confirmed Lower/Middle Berths Group Guarantee',
            'Dedicated Coach Attendant & Security Escort'
          ],
          couponCode: 'SBIRAIL',
          bookingUrl: 'https://www.irctc.co.in/nget/train-search',
          partnerVerified: true,
          termsAndConditions: '10% valueback reward points on IRCTC SBI Platinum / RuPay credit card train bookings.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 800,
          urgencyText: 'Saves 1 night of hotel accommodation costs',
          vehicleDetails: {
            type: 'LHB AC 3-Tier Coach',
            model: 'Superfast AC Sleeper',
            seats: 64,
            luggage: 'Under-berth luggage space'
          }
        },
        {
          id: `deal-train-3-${Date.now()}`,
          mode: 'train',
          provider: 'Jan Shatabdi Express',
          title: `Daytime AC Chair Car (Affordable Superfast)`,
          subtitle: `Punctual daytime express with scenic views`,
          badge: 'Budget Champion',
          isBestDeal: false,
          route: {
            from: `${originCity} Terminal`,
            to: `${destCity} Main`,
            departureTime: '01:30 PM',
            arrivalTime: '07:20 PM',
            duration: '5h 50m',
            stopsText: '5 intermediate stops'
          },
          originalPrice: Math.round(trainBaseFare * 0.85 * travelers),
          dealPrice: Math.round(trainBaseFare * 0.65 * travelers),
          discountPercent: 24,
          savingsAmount: Math.round(trainBaseFare * 0.20 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.5,
          reviewCount: 1850,
          features: [
            'Air-Conditioned Chair Car with wide legroom',
            'Pantry car onboard serving snacks and chai',
            'Clean window panoramic views of Aravalli plains',
            'Guaranteed Tatkal assistance'
          ],
          couponCode: 'UPIEXPRESS',
          bookingUrl: 'https://www.irctc.co.in/nget/train-search',
          partnerVerified: true,
          termsAndConditions: 'Zero PG charges + ₹50 cashback on Google Pay / PhonePe UPI checkout on IRCTC.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 300,
          urgencyText: 'Most cost-effective way to travel between both cities',
          vehicleDetails: {
            type: 'Jan Shatabdi LHB Coach',
            model: 'AC Chair Car (CC)',
            seats: 78,
            luggage: 'Overhead luggage racks'
          }
        }
      ];
    }

    case 'bus': {
      const busBaseFare = Math.max(650, Math.round((baseBudgetShare * 0.45) / travelers));
      return [
        {
          id: `deal-bus-1-${Date.now()}`,
          mode: 'bus',
          provider: 'IntrCity SmartBus Volvo 9600',
          title: `Luxury AC Multi-Axle Sleeper with Private Pods`,
          subtitle: `Air-Suspension • Lounge Access • Washroom Onboard`,
          badge: 'Verified Bus Deal',
          isBestDeal: true,
          route: {
            from: `${originCity} IntrCity SmartBoarding Lounge`,
            to: `${destCity} Private Drop Point`,
            departureTime: '10:30 PM',
            arrivalTime: '05:45 AM',
            duration: '7h 15m',
            stopsText: '1 express highway pitstop (Oasis Plaza)'
          },
          originalPrice: Math.round(busBaseFare * 1.38 * travelers),
          dealPrice: Math.round(busBaseFare * travelers),
          discountPercent: 28,
          savingsAmount: Math.round(busBaseFare * 0.38 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.85,
          reviewCount: 2840,
          features: [
            'Exclusive Access to Air-Conditioned Boarding Lounge with Restroom',
            'Private Double/Single Sleep Pods with Privacy Curtains',
            'Live GPS Tracking & SOS Emergency Panic Button',
            'Free Wi-Fi, Water Bottle & Sanitized Fleece Blanket',
            'Drop directly near top hotel clusters'
          ],
          couponCode: 'INTRSMART',
          bookingUrl: 'https://www.intrcity.com/',
          partnerVerified: true,
          termsAndConditions: 'Flat ₹200 off on AC sleeper berth bookings on IntrCity SmartBus. Valid on web and mobile app.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 700,
          urgencyText: 'Instant ₹200 Off per seat with IntrCity verified promo code',
          vehicleDetails: {
            type: 'Volvo 9600 Multi-Axle',
            model: 'Ultra-Smooth Air Suspension',
            seats: 36,
            luggage: '2 large suitcases in luggage bay'
          }
        },
        {
          id: `deal-bus-2-${Date.now()}`,
          mode: 'bus',
          provider: 'Zingbus Electric Club',
          title: `Quiet Eco-Sleeper AC Coach`,
          subtitle: `Zero tailpipe emissions, whisper-quiet highway ride`,
          badge: 'Eco-Friendly Pick',
          isBestDeal: false,
          route: {
            from: `${originCity} Expressway Toll Plaza`,
            to: `${destCity}`,
            departureTime: '11:15 PM',
            arrivalTime: '06:45 AM',
            duration: '7h 30m',
            stopsText: 'EV Fast-Charge Hub + Clean Dhaba Break'
          },
          originalPrice: Math.round(busBaseFare * 1.25 * travelers),
          dealPrice: Math.round(busBaseFare * 0.92 * travelers),
          discountPercent: 26,
          savingsAmount: Math.round(busBaseFare * 0.33 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.7,
          reviewCount: 1720,
          features: [
            'Whisper-Quiet Electric Propulsion (No Engine Noise)',
            'Hospital-Grade HEPA Cabin Air Filtration',
            'Zero Carbon Footprint Offset Certificate',
            'Clean Pitstop Guarantee at 4-Star Highway Food Court'
          ],
          couponCode: 'ZINGGREEN',
          bookingUrl: 'https://www.zingbus.com/',
          partnerVerified: true,
          termsAndConditions: 'Flat ₹120 off on electric luxury sleeper bus routes on Zingbus platform.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 600,
          urgencyText: 'Most peaceful overnight sleep experience',
          vehicleDetails: {
            type: 'Intercity EV Luxury Bus',
            model: 'Full AC Sleeper Berth',
            seats: 32,
            luggage: 'Underbelly secure hold'
          }
        },
        {
          id: `deal-bus-3-${Date.now()}`,
          mode: 'bus',
          provider: 'RedBus State Super Deluxe',
          title: `RedBus Verified Air-Conditioned Semi-Sleeper`,
          subtitle: `Punctual state highway express network with live tracking`,
          badge: 'Super Saver',
          isBestDeal: false,
          route: {
            from: `${originCity} Central Bus Terminal`,
            to: `${destCity} Bus Depot`,
            departureTime: '08:00 AM',
            arrivalTime: '03:15 PM',
            duration: '7h 15m',
            stopsText: '2 highway tea and meal breaks'
          },
          originalPrice: Math.round(busBaseFare * 0.85 * travelers),
          dealPrice: Math.round(busBaseFare * 0.65 * travelers),
          discountPercent: 23,
          savingsAmount: Math.round(busBaseFare * 0.20 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.4,
          reviewCount: 950,
          features: [
            'Government State Road Transport Safety Certified',
            'Pushback Recliner Seats with Footrest',
            'Lowest fares across all bus operators',
            'Instant digital ticket confirmation via SMS'
          ],
          couponCode: 'FIRST',
          bookingUrl: 'https://www.redbus.in/',
          partnerVerified: true,
          termsAndConditions: 'Official RedBus offer: Flat ₹250 instant discount + ₹100 redBus wallet cashback on first booking.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 400,
          urgencyText: 'Budget friendly daytime option with scenic highway views',
          vehicleDetails: {
            type: 'Ashok Leyland Viking AC',
            model: 'Semi-Sleeper Recliner 2+2',
            seats: 44,
            luggage: 'Under-coach storage'
          }
        }
      ];
    }

    case 'car': {
      const carDays = Math.max(1, params.durationDays);
      const baseCarFare = Math.max(1400, Math.round((baseBudgetShare * 0.7) / carDays));
      return [
        {
          id: `deal-car-1-${Date.now()}`,
          mode: 'car',
          provider: 'Zoomcar Self-Drive Unlimited Pass',
          title: `Self-Drive SUV (Creta / Grand Vitara / Brezza)`,
          subtitle: `Doorstep Delivery • Unlimited KMs • Zero Security Deposit`,
          badge: 'Verified Car Deal',
          isBestDeal: true,
          route: {
            from: `${originCity} Doorstep Delivery`,
            to: `${destCity} & Local Sightseeing`,
            departureTime: 'Flexible (Anytime)',
            arrivalTime: 'Self-Paced Roadtrip',
            duration: 'Direct Highway Drive',
            stopsText: 'Freedom to stop at any Highway Break Stop'
          },
          originalPrice: Math.round(baseCarFare * 1.32 * carDays),
          dealPrice: Math.round(baseCarFare * carDays),
          discountPercent: 24,
          savingsAmount: Math.round(baseCarFare * 0.32 * carDays),
          priceUnit: 'total',
          rating: 4.88,
          reviewCount: 5120,
          features: [
            'Unlimited Kilometers (No extra per-km penalties)',
            'Pre-Activated FASTag (Auto-toll sync via wallet)',
            'Zero Security Deposit for TripVerse Verified Users',
            '24x7 Roadside Assistance & Mechanical Backup across Highway',
            'Free doorstep pickup and return'
          ],
          couponCode: 'ZOOMNEW',
          bookingUrl: 'https://www.zoomcar.com/',
          partnerVerified: true,
          termsAndConditions: 'Official Zoomcar promo: Flat 15% off up to ₹800 on all self-drive cars for new & road-trip bookings.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 2000,
          urgencyText: 'Top rated for road trips — Includes free doorstep pickup and return',
          vehicleDetails: {
            model: 'Hyundai Creta / Grand Vitara',
            type: 'Compact SUV (5 Seater)',
            seats: 5,
            fuelType: 'Petrol / Hybrid (High Mileage)',
            transmission: 'Automatic / Manual',
            luggage: '3 Large Bags + 2 Small Bags'
          }
        },
        {
          id: `deal-car-2-${Date.now()}`,
          mode: 'car',
          provider: 'MakeMyTrip Outstation Cabs',
          title: `Chauffeur-Driven Private Sedan (Dzire / Etios)`,
          subtitle: `Dedicated professional driver, tolls & state taxes included`,
          badge: 'Stress-Free Ride',
          isBestDeal: false,
          route: {
            from: `${originCity} Pickup Address`,
            to: `${destCity} Hotel Drop`,
            departureTime: 'Requested Time',
            arrivalTime: 'Direct Door-to-Door',
            duration: 'Doorstep Pickup',
            stopsText: 'Driver stops on passenger demand'
          },
          originalPrice: Math.round(baseCarFare * 1.45 * carDays),
          dealPrice: Math.round(baseCarFare * 1.15 * carDays),
          discountPercent: 21,
          savingsAmount: Math.round(baseCarFare * 0.30 * carDays),
          priceUnit: 'total',
          rating: 4.8,
          reviewCount: 3400,
          features: [
            'Verified Professional Highway Chauffeur with 5+ yrs exp',
            'Zero Extra Night Driving Charges',
            'All Interstate Tolls, State Taxes & Parking Included',
            'Air-Conditioned Sedan with clean bottled water'
          ],
          couponCode: 'MMTCAB',
          bookingUrl: 'https://www.makemytrip.com/cabs/',
          partnerVerified: true,
          termsAndConditions: 'Flat ₹500 off on outstation roundtrip cab bookings on MakeMyTrip Cabs.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 2500,
          urgencyText: 'Sit back and relax while the driver navigates highway traffic',
          vehicleDetails: {
            model: 'Maruti Suzuki Dzire / Toyota Etios',
            type: 'AC Sedan (4 Passengers)',
            seats: 4,
            fuelType: 'CNG / Petrol',
            transmission: 'Chauffeur Driven',
            luggage: '2 Large Trolley Bags'
          }
        },
        {
          id: `deal-car-3-${Date.now()}`,
          mode: 'car',
          provider: 'Revv Self-Drive Cars',
          title: `Economical Hatchback (Swift / Baleno / i20)`,
          subtitle: `Ideal for couples & small groups on a budget`,
          badge: 'Best Economy Car',
          isBestDeal: false,
          route: {
            from: `${originCity} Hub`,
            to: `${destCity}`,
            departureTime: 'Instant Unlock',
            arrivalTime: 'Flexible',
            duration: 'Highway Drive',
            stopsText: 'Complete roadside freedom'
          },
          originalPrice: Math.round(baseCarFare * 1.15 * carDays),
          dealPrice: Math.round(baseCarFare * 0.85 * carDays),
          discountPercent: 26,
          savingsAmount: Math.round(baseCarFare * 0.30 * carDays),
          priceUnit: 'total',
          rating: 4.6,
          reviewCount: 1980,
          features: [
            'Low fuel consumption (19-21 km/L highway mileage)',
            'Comprehensive zero-depreciation insurance included',
            'Bluetooth audio & Apple CarPlay / Android Auto',
            'Clean sanitized interior with hygiene seal'
          ],
          couponCode: 'REVVFIRST',
          bookingUrl: 'https://www.revv.co.in/',
          partnerVerified: true,
          termsAndConditions: 'Flat ₹1,000 off on multi-day self-drive car subscriptions and road-trip packages on Revv.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 3000,
          urgencyText: 'Lowest running cost per kilometer for road trips',
          vehicleDetails: {
            model: 'Maruti Swift / Hyundai i20',
            type: 'Compact Hatchback',
            seats: 4,
            fuelType: 'Petrol (High Mileage)',
            transmission: 'Manual',
            luggage: '2 Cabin Bags'
          }
        }
      ];
    }

    case 'bike': {
      const bikeDays = Math.max(1, params.durationDays);
      const baseBikeFare = Math.max(900, Math.round((baseBudgetShare * 0.4) / bikeDays));
      return [
        {
          id: `deal-bike-1-${Date.now()}`,
          mode: 'bike',
          provider: 'Royal Brothers Bike Rentals',
          title: `Royal Enfield Himalayan 450 (Adventure Touring)`,
          subtitle: `Equipped with Panniers, Crash Guards & Mobile Mount`,
          badge: 'Verified Bike Deal',
          isBestDeal: true,
          route: {
            from: `${originCity} Motorcycle Hub`,
            to: `${destCity} & Hill Passes`,
            departureTime: 'Early Morning Departure',
            arrivalTime: 'Scenic Ghat Ride',
            duration: 'Full-Day Ride',
            stopsText: 'Photo stops at scenic canyon passes'
          },
          originalPrice: Math.round(baseBikeFare * 1.35 * bikeDays),
          dealPrice: Math.round(baseBikeFare * bikeDays),
          discountPercent: 26,
          savingsAmount: Math.round(baseBikeFare * 0.35 * bikeDays),
          priceUnit: 'total',
          rating: 4.92,
          reviewCount: 2240,
          features: [
            '452cc Sherpa Engine with Tripper TFT Navigation',
            'Full Waterproof Aluminum Panniers & Top Box Included',
            'DOT/ECE Certified Dual Touring Helmets Provided',
            'High-Speed Fast Wireless Phone Mount with USB-C Charger',
            'Interstate Road Permit & Green Tax Pre-Cleared'
          ],
          couponCode: 'RBNEW',
          bookingUrl: 'https://www.royalbrothers.com/',
          partnerVerified: true,
          termsAndConditions: 'Flat ₹150 off on weekend & touring motorcycle rentals with helmets included on Royal Brothers.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 800,
          urgencyText: '️ The ultimate machine for conquering Aravalli Ghats and highway twisties',
          vehicleDetails: {
            model: 'Royal Enfield Himalayan 450',
            type: 'Adventure Tourer (40 HP)',
            seats: 2,
            fuelType: 'Petrol (17L Long Range Tank)',
            transmission: '6-Speed with Slip & Assist Clutch',
            luggage: 'Hard Panniers + Tank Bag'
          }
        },
        {
          id: `deal-bike-2-${Date.now()}`,
          mode: 'bike',
          provider: 'Wheelstreet Adventure Rentals',
          title: `KTM 390 Adventure Touring Edition`,
          subtitle: `Lightweight power tourer with cornering traction control`,
          badge: 'High Performance',
          isBestDeal: false,
          route: {
            from: `${originCity} Garage`,
            to: `${destCity}`,
            departureTime: 'Self-Scheduled',
            arrivalTime: 'Swift Highway Cruise',
            duration: 'Highway Thrill',
            stopsText: 'Scenic coffee & viewpoint stops'
          },
          originalPrice: Math.round(baseBikeFare * 1.3 * bikeDays),
          dealPrice: Math.round(baseBikeFare * 1.05 * bikeDays),
          discountPercent: 19,
          savingsAmount: Math.round(baseBikeFare * 0.25 * bikeDays),
          priceUnit: 'total',
          rating: 4.75,
          reviewCount: 1310,
          features: [
            'Cornering ABS & Off-road riding modes',
            'WP Apex adjustable suspension for rough roads',
            'Knuckle guards & tall touring windshield',
            '24-Hour roadside puncture & mechanical support'
          ],
          couponCode: 'BIKETOUR',
          bookingUrl: 'https://www.wheelstreet.com/',
          partnerVerified: true,
          termsAndConditions: '10% instant discount on adventure motorcycle rentals for multi-day road trips.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 1000,
          urgencyText: 'High adrenaline touring with top-tier safety electronics',
          vehicleDetails: {
            model: 'KTM 390 Adventure',
            type: 'Dual Sport / Touring (44 HP)',
            seats: 2,
            fuelType: 'Petrol',
            transmission: '6-Speed Quickshifter+',
            luggage: 'Tail Bag Rack'
          }
        },
        {
          id: `deal-bike-3-${Date.now()}`,
          mode: 'bike',
          provider: 'Royal Brothers Roadster',
          title: `Royal Enfield Hunter 350 / Classic 350`,
          subtitle: `Iconic thumping cruiser for relaxed country road cruising`,
          badge: 'Economy Cruiser',
          isBestDeal: false,
          route: {
            from: `${originCity}`,
            to: `${destCity}`,
            departureTime: 'Flexible',
            arrivalTime: 'Easy Riding',
            duration: 'Comfortable Ride',
            stopsText: 'Highway dhabas & heritage tea stalls'
          },
          originalPrice: Math.round(baseBikeFare * 0.95 * bikeDays),
          dealPrice: Math.round(baseBikeFare * 0.75 * bikeDays),
          discountPercent: 21,
          savingsAmount: Math.round(baseBikeFare * 0.20 * bikeDays),
          priceUnit: 'total',
          rating: 4.65,
          reviewCount: 3100,
          features: [
            'Smooth J-Series 349cc engine with classic thump',
            'Low comfortable seat height (790mm) for easy handling',
            'High fuel efficiency (36-38 km/L)',
            'Standard safety crash guard and pillion backrest'
          ],
          couponCode: 'EXPLORE10',
          bookingUrl: 'https://www.royalbrothers.com/',
          partnerVerified: true,
          termsAndConditions: 'Flat 10% off on Royal Enfield roadster rentals for weekday road trips.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 600,
          urgencyText: 'Relaxed, vintage highway cruising at the lowest rental rate',
          vehicleDetails: {
            model: 'Royal Enfield Hunter / Classic 350',
            type: 'Modern Retro Cruiser',
            seats: 2,
            fuelType: 'Petrol (36 km/L High Mileage)',
            transmission: '5-Speed Manual',
            luggage: 'Saddle Bag Support'
          }
        }
      ];
    }

    default: {
      const defaultFare = Math.max(1200, Math.round(baseBudgetShare / travelers));
      return [
        {
          id: `deal-transit-combo-${Date.now()}`,
          mode: 'car',
          provider: 'TripVerse Multi-Modal Seamless Pass',
          title: `Express Rail + Doorstep Prepaid Station Taxi Combo`,
          subtitle: `${originCity} Jn → ${destCity} with Guaranteed Station Transfer`,
          badge: 'AI Best Value',
          isBestDeal: true,
          route: {
            from: `${originCity} Railway Station`,
            to: `${destCity} Hotel Doorstep`,
            departureTime: '06:10 AM',
            arrivalTime: '11:45 AM',
            duration: '5h 35m total',
            stopsText: 'Zero-wait seamless station transfer'
          },
          originalPrice: Math.round(defaultFare * 1.35 * travelers),
          dealPrice: Math.round(defaultFare * travelers),
          discountPercent: 26,
          savingsAmount: Math.round(defaultFare * 0.35 * travelers),
          priceUnit: travelers > 1 ? 'total' : 'per_person',
          rating: 4.9,
          reviewCount: 3100,
          features: [
            'All-in-One Booking: Train + Prepaid Cab at destination',
            'Luggage assistance on arrival station platform',
            'Complimentary Hot Breakfast on board train',
            'Zero Surge Pricing Guarantee on station cab drop',
            'Real-Time Train Delay Auto-Rebooking'
          ],
          couponCode: 'MMTDEAL',
          bookingUrl: 'https://www.makemytrip.com/',
          partnerVerified: true,
          termsAndConditions: 'Official MakeMyTrip Multi-Modal Voucher: Up to ₹1,200 instant savings on train + outstation cab combo bookings.',
          expiryDate: 'Valid till 31 Dec 2026',
          minBookingAmount: 1500,
          urgencyText: 'Recommended by AI for best balance of budget, comfort and speed',
          vehicleDetails: {
            type: 'Multi-Modal Combo',
            model: 'Express Rail + AC Sedan',
            seats: travelers,
            luggage: 'Full luggage allowance'
          }
        }
      ];
    }
  }
}
