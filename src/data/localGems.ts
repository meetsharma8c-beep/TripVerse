import { LocalFoodGem, HiddenGem } from '../types/trip';

export interface DestinationGems {
  destination: string;
  foodGems: LocalFoodGem[];
  hiddenGems: HiddenGem[];
}

export const LOCAL_GEMS_CATALOG: Record<string, DestinationGems> = {
  udaipur: {
    destination: 'Udaipur',
    foodGems: [
      {
        id: 'food-ud-1',
        name: 'Krishna Dal Bati Restro',
        dish: 'Authentic Rajasthani Dal Baati Churma Thali',
        category: 'heritage_dhaba',
        location: 'Jal Boraj, Gulab Bagh Road, Udaipur',
        pricePerPerson: 350,
        rating: 4.8,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '12:30 PM - 3:30 PM (Lunch)',
        whySpecial: 'Unlimited thali drenched in pure desi ghee with 4 types of hot churma (Gulab, Besan, Plain, Bajra) and spicy garlic chutney.',
        mustTry: 'Baati with spicy garlic chutney & hot boondi raita',
        coordinates: { lat: 24.5765, lng: 73.6935 }
      },
      {
        id: 'food-ud-2',
        name: 'Sukhadia Circle Street Pav Bhaji',
        dish: 'Buttery Bombay Pav Bhaji & Cold Badam Milk',
        category: 'street_food',
        location: 'Sukhadia Circle Fountain, Panchwati',
        pricePerPerson: 160,
        rating: 4.7,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '7:00 PM - 10:30 PM (Evening)',
        whySpecial: 'Iconic street food hub surrounding the glowing illuminated marble fountain. Huge copper tawas sizzling with fresh butter.',
        mustTry: 'Double Butter Cheese Pav Bhaji & Chilled Matka Kulfi',
        coordinates: { lat: 24.6012, lng: 73.6895 }
      },
      {
        id: 'food-ud-3',
        name: 'Jal Boraj & Bhole Nath Poha Center',
        dish: 'Steamed Sev Poha with Jalebi & Masala Tea',
        category: 'street_food',
        location: 'Near Town Hall Link Road',
        pricePerPerson: 60,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '7:30 AM - 10:00 AM (Breakfast)',
        whySpecial: 'The quintessential Mewari morning ritual. Soft vapor-cooked flattened rice topped with Ratlami sev, fresh coriander, pomegranate, and lemon.',
        mustTry: 'Poha plate with two crispy saffron jalebis',
        coordinates: { lat: 24.5820, lng: 73.6940 }
      },
      {
        id: 'food-ud-4',
        name: 'Ambrai Restaurant on Ghat',
        dish: 'Laal Maas & Garlic Naan by the Water',
        category: 'rooftop_cafe',
        location: 'Amet Haveli, Ambamata Ghat',
        pricePerPerson: 950,
        rating: 4.8,
        isVegetarian: false,
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '7:30 PM - 9:30 PM (Dinner)',
        whySpecial: 'Direct front-row water seat facing the illuminated City Palace and Lake Pichola. Spectacular romantic heritage ambience.',
        mustTry: 'Slow-braised Mutton Laal Maas with Mathania chillies',
        coordinates: { lat: 24.5779, lng: 73.6806 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-ud-1',
        title: 'Bahubali Hills (Badi Lake Cliff)',
        category: 'secret_viewpoint',
        location: 'Badi Lake Backwaters, 12 km from city',
        rating: 4.9,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '5:45 AM - 7:00 AM (Sunrise)',
        description: 'A secluded hilltop reminiscent of Vietnam hills that towers over the emerald waters of Lake Badi. 15-minute easy climb on rocky trail.',
        insiderTip: 'Reach 20 minutes before sunrise; morning mist rolling over the hills creates unforgettable drone & photography frames.',
        coordinates: { lat: 24.6280, lng: 73.6180 }
      },
      {
        id: 'gem-ud-2',
        title: 'Purohito Ka Talab (Mini Jodhpur)',
        category: 'nature_walk',
        location: 'Amberi Village, NH-8 Outskirts',
        rating: 4.7,
        crowdLevel: 'very_low',
        image: 'https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '4:00 PM - 6:00 PM (Golden Hour)',
        description: 'Serene reservoir surrounded by green Aravalli ridges, ornate red-stone chhatris (pavilions), and zero commercial tourist hustle.',
        insiderTip: 'Carry a travel rug and a thermos of chai. Perfect peaceful picnic haven for quiet reflection.',
        coordinates: { lat: 24.6750, lng: 73.7420 }
      },
      {
        id: 'gem-ud-3',
        title: 'Shilpgram Artisan Courtyard',
        category: 'artisan_village',
        location: 'Western foot of Sajjangarh, 3 km from city',
        rating: 4.8,
        crowdLevel: 'moderate',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '11:00 AM - 2:00 PM',
        description: 'Live ethnographic workshop where tribal craftspeople shape terracotta pottery, weave camel hair durries, and play traditional instruments.',
        insiderTip: 'Buy handcrafted souvenirs directly from master artisans at 50% cheaper prices than tourist bazaar shops.',
        coordinates: { lat: 24.6060, lng: 73.6550 }
      }
    ]
  },
  manali: {
    destination: 'Manali',
    foodGems: [
      {
        id: 'food-mn-1',
        name: 'The Siddu Corner & Himalayan Dhaba',
        dish: 'Traditional Himachali Walnut & Poppy Seed Siddu',
        category: 'heritage_dhaba',
        location: 'Old Manali Bridge Road',
        pricePerPerson: 180,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '1:00 PM - 4:00 PM',
        whySpecial: 'Steamed wheat dough stuffed with crushed walnuts, poppy seeds, and local hill spices, served bubbling with melted desi cow ghee.',
        mustTry: 'Sweet walnut siddu with green mint coriander chutney',
        coordinates: { lat: 32.2530, lng: 77.1850 }
      },
      {
        id: 'food-mn-2',
        name: 'Johnson’s Cafe & Garden',
        dish: 'Wood-Smoked Tirthan River Brown Trout Fish',
        category: 'rooftop_cafe',
        location: 'Circuit House Road, Manali',
        pricePerPerson: 850,
        rating: 4.7,
        isVegetarian: false,
        image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '7:00 PM - 10:00 PM',
        whySpecial: 'Historic stone fireplace, cedar pine tree garden, and fresh trout delivered daily from mountain rivers.',
        mustTry: 'Pan-fried Trout in almond butter sauce',
        coordinates: { lat: 32.2470, lng: 77.1890 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-mn-1',
        title: 'Sojha & Serolsar Lake Secret Trail',
        category: 'secret_viewpoint',
        location: 'Jalori Pass Outskirts (55 km from Manali)',
        rating: 4.9,
        crowdLevel: 'very_low',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '9:00 AM - 2:00 PM',
        description: 'An enchanted oak and deodar pine forest trail leading to a sacred, crystal-clear high alpine lake where no leaf stays on water surface.',
        insiderTip: 'Start early from Aut tunnel junction. Take local walking poles and warm thermos tea.',
        coordinates: { lat: 31.5350, lng: 77.3680 }
      }
    ]
  },
  goa: {
    destination: 'Goa',
    foodGems: [
      {
        id: 'food-goa-1',
        name: 'Vinayak Family Restaurant',
        dish: 'Goan Fish Thali with Kingfish & Solkadhi',
        category: 'heritage_dhaba',
        location: 'Main Road, Assagao',
        pricePerPerson: 320,
        rating: 4.8,
        isVegetarian: false,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '1:00 PM - 3:00 PM',
        whySpecial: 'Lush green paddy field views and daily fresh catch coated in spicy rava fry crust with tangy kokum solkadhi.',
        mustTry: 'Rava-fried Surmai (Kingfish) Thali with Crab Xec Xec',
        coordinates: { lat: 15.5920, lng: 73.7740 }
      },
      {
        id: 'food-goa-2',
        name: 'Ghat Corner Night Gaddo',
        dish: 'Spicy Chicken Ros Omelette with Pao',
        category: 'street_food',
        location: 'Near Panjim Municipal Garden',
        pricePerPerson: 120,
        rating: 4.9,
        isVegetarian: false,
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '8:30 PM - 11:30 PM',
        whySpecial: 'Goa’s iconic late night street food: fluffy masala omelette submerged in rich, fragrant xacuti chicken coconut gravy with crusty pao.',
        mustTry: 'Double Ros Omelette with butter toasted pao',
        coordinates: { lat: 15.4989, lng: 73.8278 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-goa-1',
        title: 'Cabo de Rama Secret Cliff Viewpoint',
        category: 'secret_viewpoint',
        location: 'Canacona, South Goa',
        rating: 4.9,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '5:15 PM - 6:45 PM (Sunset)',
        description: 'Dramatic limestone bluff with Portuguese fort ruins dropping straight into turquoise Arabian Sea waves.',
        insiderTip: 'Climb down past the cannon bastion onto the secret pebble cove below for total seclusion.',
        coordinates: { lat: 15.0880, lng: 73.9210 }
      }
    ]
  },
  poicha: {
    destination: 'Poicha, Gujarat',
    foodGems: [
      {
        id: 'food-poicha-1',
        name: 'Nilkanthdham Annakshetra Bhojanalaya',
        dish: 'Pure Desi Ghee Gujarati & Kathiyawadi Mahaprasad Thali',
        category: 'heritage_dhaba',
        location: 'Nilkanthdham Temple Complex, Poicha',
        pricePerPerson: 120,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '11:30 AM - 2:30 PM (Lunch) & 7:00 PM - 9:00 PM (Dinner)',
        whySpecial: 'Devotional sattvic thali served with pure desi ghee rotlis, Gujarati dal, kadhi, khichdi, seasonal vegetable curries and divine puran poli.',
        mustTry: 'Warm Puran Poli with Kadi, Khichdi & fresh Ghee',
        coordinates: { lat: 21.9352, lng: 73.5518 }
      },
      {
        id: 'food-poicha-2',
        name: 'Narmada Riverbank Fafda & Matka Chai',
        dish: 'Crispy Papdi-Fafda, Jalebi & Kadak Masala Tea',
        category: 'street_food',
        location: 'Poicha Narmada Boat Ghat Entrance',
        pricePerPerson: 80,
        rating: 4.8,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '7:00 AM - 10:30 AM (Breakfast)',
        whySpecial: 'Crispy freshly fried besan fafda served alongside spicy raw papaya sambharo, fried green chillies, and piping hot saffron jalebis by the river breeze.',
        mustTry: 'Fafda with Papaya Sambharo and steaming Clay Matka Tea',
        coordinates: { lat: 21.9338, lng: 73.5535 }
      },
      {
        id: 'food-poicha-3',
        name: 'Rajpipla Kathiyawadi Highway Dhaba',
        dish: 'Smoky Ringna No Olo with Bajra Rotla & White Makhan',
        category: 'heritage_dhaba',
        location: 'Rajpipla - Poicha Bypass Road',
        pricePerPerson: 240,
        rating: 4.8,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '1:00 PM - 3:30 PM (Lunch)',
        whySpecial: 'Authentic coal-roasted mashed eggplant curry loaded with garlic and spring onions, served with thick wood-fired pearl millet rotlas and homemade white butter.',
        mustTry: 'Baingan Bharta (Olo) with Garlic Chutney & Chilled Chaas',
        coordinates: { lat: 21.8950, lng: 73.5680 }
      },
      {
        id: 'food-poicha-4',
        name: 'Sahajanand Kulfi & Natural Ice Cream Stalls',
        dish: 'Matka Malai Kulfi & Fresh Sitaphal Ice Cream',
        category: 'street_food',
        location: 'Opposite Sahajanand Universe Exhibition Gate',
        pricePerPerson: 70,
        rating: 4.7,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '8:00 PM - 10:00 PM (After Musical Fountain)',
        whySpecial: 'Rich dense rabdi kulfi infused with cardamom, saffron, and roasted pistachios, perfect after the illuminated evening water fountain show.',
        mustTry: 'Kesar Pista Matka Kulfi',
        coordinates: { lat: 21.9360, lng: 73.5510 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-poicha-1',
        title: 'Narmada River Sandbar Secret Sunset Point',
        category: 'secret_viewpoint',
        location: 'Narmada River Sandbar, Poicha Backwaters',
        rating: 4.9,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '5:30 PM - 6:45 PM (Sunset)',
        description: 'A quiet natural sandbar in the middle of the sacred Narmada River, reachable via a 10-minute local wooden boat ride. Offers panoramic reflection views of the Nilkanthdham temple spires bathing in golden sunset rays.',
        insiderTip: 'Hire a local boatman at Poicha Ghat 45 minutes before dusk. Bring a camera for the temple reflection across the ripples.',
        coordinates: { lat: 21.9320, lng: 73.5540 }
      },
      {
        id: 'gem-poicha-2',
        title: 'Kuber Bhandari Temple Ghat Crossing (Karnali)',
        category: 'nature_walk',
        location: 'Karnali Confluence, direct ferry across Poicha Ghat',
        rating: 4.8,
        crowdLevel: 'very_low',
        image: 'https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '7:30 AM - 9:30 AM (Morning)',
        description: 'An ancient spiritual riverbank shrine located right at the Triveni Sangam across the river. Calm stone stairs, holy chants, and zero commercial noise.',
        insiderTip: 'Cross over by the sunrise morning ferry before temple queues start.',
        coordinates: { lat: 21.9560, lng: 73.5410 }
      },
      {
        id: 'gem-poicha-3',
        title: 'Karjan Reservoir Dam Overlook',
        category: 'secret_viewpoint',
        location: 'Rajpipla Foothills, 24 km from Poicha',
        rating: 4.9,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '4:00 PM - 6:00 PM',
        description: 'Vast reservoir framed by the rugged Satpura ranges. Cool breezes, crystal clean waters, and an uncommercialized scenic picnic haven.',
        insiderTip: 'Ideal stopover while traveling between Poicha and the Statue of Unity.',
        coordinates: { lat: 21.8280, lng: 73.5420 }
      }
    ]
  },
  jaipur: {
    destination: 'Jaipur',
    foodGems: [
      {
        id: 'food-jp-1',
        name: 'Rawat Mishthan Bhandar',
        dish: 'Legendary Crisp Pyaaz Kachori with Mint & Tamarind Chutney',
        category: 'street_food',
        location: 'Station Road, Sindhi Camp, Jaipur',
        pricePerPerson: 90,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '8:00 AM - 11:30 AM (Breakfast)',
        whySpecial: 'Crispy, multi-layered flaky crust filled with hot spiced caramelised onions and asafoetida. Famous across India.',
        mustTry: 'Hot Pyaaz Kachori with Mawa Kachori for dessert',
        coordinates: { lat: 26.9218, lng: 75.7972 }
      },
      {
        id: 'food-jp-2',
        name: 'LMB (Laxmi Mishthan Bhandar)',
        dish: 'Royal Rajasthani Thali & Malai Ghewar',
        category: 'heritage_dhaba',
        location: 'Johari Bazaar, Old Walled City, Jaipur',
        pricePerPerson: 550,
        rating: 4.8,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '1:00 PM - 3:30 PM (Lunch)',
        whySpecial: 'Historic heritage restaurant serving Ker Sangri, Rajasthani Kadi, and world-famous honeycomb Malai Ghewar drenched in rabdi.',
        mustTry: 'Paneer Ghewar & Special Dal Baati Churma',
        coordinates: { lat: 26.9205, lng: 75.8267 }
      },
      {
        id: 'food-jp-3',
        name: 'Tapri The Tea House',
        dish: 'Cutting Masala Chai with Khakra Pizza',
        category: 'rooftop_cafe',
        location: 'Opposite Central Park Gate 4, C-Scheme, Jaipur',
        pricePerPerson: 220,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '5:00 PM - 8:00 PM (Sunset)',
        whySpecial: 'Rooftop cafe overlooking lush green Central Park canopy with clay kullad tea and innovative fusion street bites.',
        mustTry: 'Kullad Chai with Garlic Tadka Maggi and Sauteed Mushroom Toast',
        coordinates: { lat: 26.9065, lng: 75.8078 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-jp-1',
        title: 'Nahargarh Fort Secret Stepwell (Padao Sunset Ridge)',
        category: 'secret_viewpoint',
        location: 'Nahargarh Fort Ridge, Aravalli Hills, Jaipur',
        rating: 4.9,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '5:30 PM - 6:45 PM (Sunset)',
        description: 'Spectacular geometric stone stepwell nestled into the cliff edge offering sweeping 360-degree vistas of the entire Pink City glowing at dusk.',
        insiderTip: 'Sit on the rampart ledge facing Man Sagar lake as city lights flicker on.',
        coordinates: { lat: 26.9372, lng: 75.8155 }
      }
    ]
  },
  amritsar: {
    destination: 'Amritsar',
    foodGems: [
      {
        id: 'food-asr-1',
        name: 'Kesar Da Dhaba (Since 1916)',
        dish: 'Slow-Cooked Maa Ki Dal in Pure Desi Ghee & Lachha Paratha',
        category: 'heritage_dhaba',
        location: 'Chowk Passian, Near Golden Temple, Amritsar',
        pricePerPerson: 320,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '1:00 PM - 3:30 PM & 7:30 PM - 10:00 PM',
        whySpecial: 'Simmered over coals for 12 hours in traditional earthen vessels. Rich, velvety, and served with smoky tandoori lachha parathas.',
        mustTry: 'Maa Ki Dal with Ghee-drenched Thali & Firni in clay cups',
        coordinates: { lat: 31.6234, lng: 74.8778 }
      },
      {
        id: 'food-asr-2',
        name: 'Bhai Kulwant Singh Kulchian Wale',
        dish: 'Flaky Tandoori Amritsari Aloo-Chur Chur Kulcha with Spicy Chole',
        category: 'street_food',
        location: 'Bazar Bikanerian, Near Heritage Street, Amritsar',
        pricePerPerson: 140,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '8:30 AM - 12:30 PM (Breakfast)',
        whySpecial: 'Crushed with bare hands to release layers of pure butter. Served with tangy imli-pyaaz chutney and spicy Punjabi chole.',
        mustTry: 'Special Paneer-Gobhi Chur Chur Kulcha & Sweet Lassi',
        coordinates: { lat: 31.6210, lng: 74.8765 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-asr-1',
        title: 'Gobindgarh Fort Ancient Whispering Ramparts',
        category: 'secret_viewpoint',
        location: 'Old Cantt Road, Vijay Chowk, Amritsar',
        rating: 4.8,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '5:00 PM - 6:30 PM',
        description: 'Restored 250-year-old military fort built by Maharaja Ranjit Singh with serene brick moats, ancient armory, and live martial arts demonstrations.',
        insiderTip: 'Visit the coin museum and watch the 7D Maharaja Ranjit Singh projection show.',
        coordinates: { lat: 31.6278, lng: 74.8643 }
      }
    ]
  },
  varanasi: {
    destination: 'Varanasi',
    foodGems: [
      {
        id: 'food-vns-1',
        name: 'Kashi Chaat Bhandar',
        dish: 'Hot Desi Ghee Tamatar Chaat & Palak Patta Chaat',
        category: 'street_food',
        location: 'D.53/98 Luxa Road, Godowlia, Varanasi',
        pricePerPerson: 110,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '4:30 PM - 9:30 PM (Evening)',
        whySpecial: 'Served in traditional clay earthen bowls (kulhads). Crushed tomatoes slow-simmered with cashews, khoya, cumin and hot Hing sugar syrup.',
        mustTry: 'Signature Tamatar Chaat & Gulab Jamun',
        coordinates: { lat: 25.3090, lng: 83.0035 }
      },
      {
        id: 'food-vns-2',
        name: 'The Blue Lassi Shop (Established 1925)',
        dish: 'Hand-Churned Malai Pomegranate & Mango Lassi in Earthen Matka',
        category: 'street_food',
        location: 'CK 12/1 Kunj Gali, Near Manikarnika Ghat, Varanasi',
        pricePerPerson: 120,
        rating: 4.8,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '11:00 AM - 6:00 PM',
        whySpecial: 'Legendary hole-in-the-wall in ancient alleyways serving over 80 variations of fruit lassi topped with thick rabdi and dry fruits.',
        mustTry: 'Kesar Pista Rabdi Lassi with fresh pomegranate',
        coordinates: { lat: 25.3115, lng: 83.0130 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-vns-1',
        title: 'Assi Ghat Subah-e-Banaras Morning Vedic Ragas',
        category: 'secret_viewpoint',
        location: 'Assi Ghat, Southern Waterfront, Varanasi',
        rating: 4.9,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '5:15 AM - 6:45 AM (Sunrise)',
        description: 'Daily dawn cultural prayer featuring morning Ganga Aarti, live classical shehnai & flute recitals as the orange sun emerges across the tranquil river.',
        insiderTip: 'Hire a quiet manual rowing boat at 5:00 AM to hear the morning chants echo from the water.',
        coordinates: { lat: 25.2895, lng: 83.0062 }
      }
    ]
  },
  rishikesh: {
    destination: 'Rishikesh',
    foodGems: [
      {
        id: 'food-rsh-1',
        name: 'Little Buddha Cafe',
        dish: 'Organic Wood-Fired Pizza, Falafel Platter & Herbal Ginger Lemon Tea',
        category: 'rooftop_cafe',
        location: 'Near Laxman Jhula, Tapovan, Rishikesh',
        pricePerPerson: 350,
        rating: 4.8,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '12:30 PM - 4:00 PM (Afternoon River Chill)',
        whySpecial: 'Treehouse-style multi-tier bamboo cafe with panoramic bird-eye views of the turquoise Ganga river flowing below.',
        mustTry: 'Wood-fired Thin Crust Pizza & Fresh Fruit Smoothie Bowls',
        coordinates: { lat: 30.1345, lng: 78.3275 }
      }
    ],
    hiddenGems: [
      {
        id: 'gem-rsh-1',
        title: 'Neer Garh Secret Upper Natural Pool',
        category: 'nature_walk',
        location: 'Neer Garh Waterfall Trail, 7 km from Tapovan',
        rating: 4.9,
        crowdLevel: 'very_low',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '7:30 AM - 10:30 AM',
        description: 'Trek 20 minutes beyond the commercial lower waterfall to reach a crystal turquoise mountain swimming pool framed by wild butterflies.',
        insiderTip: 'Start early before 9:00 AM to enjoy the pristine upper pool completely to yourself.',
        coordinates: { lat: 30.1480, lng: 78.3420 }
      }
    ]
  }
};

export function getLocalGemsForDestination(destination: string): DestinationGems {
  const norm = destination.toLowerCase().trim();

  // 1. Direct key match in curated catalog
  const directKey = Object.keys(LOCAL_GEMS_CATALOG).find(k => norm.includes(k) || k.includes(norm));
  if (directKey && LOCAL_GEMS_CATALOG[directKey]) {
    return LOCAL_GEMS_CATALOG[directKey];
  }

  const cleanDest = destination.split(',')[0].trim() || destination;

  // 2. Rajasthan / Desert regions (Jaipur, Mansarovar, Jodhpur, Jaisalmer, etc.)
  if (norm.includes('rajasthan') || norm.includes('jaipur') || norm.includes('mansarovar') || norm.includes('jodhpur') || norm.includes('jaisalmer') || norm.includes('pushkar') || norm.includes('bikaner')) {
    return {
      destination,
      foodGems: [
        {
          id: `food-syn-raj-1`,
          name: `${cleanDest} Royal Heritage Dal Baati Dhaba`,
          dish: 'Authentic Dal Baati Churma with Gatte Ki Sabzi',
          category: 'heritage_dhaba',
          location: `${cleanDest} Heritage Road`,
          pricePerPerson: 250,
          rating: 4.9,
          isVegetarian: true,
          image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
          bestTimeToVisit: '1:00 PM - 3:30 PM',
          whySpecial: 'Slow-baked baatis dipped in pure desi ghee, Panchmel dal, garlic chutney and sweetened churma.',
          mustTry: 'Ghee-drenched Baati with fiery Lasun Chutney'
        },
        {
          id: `food-syn-raj-2`,
          name: 'Traditional Pyaaz Kachori & Jalebi Corner',
          dish: 'Crisp Onion Kachori with Mint Chutney & Jalebis',
          category: 'street_food',
          location: `${cleanDest} Main Bazaar`,
          pricePerPerson: 70,
          rating: 4.8,
          isVegetarian: true,
          image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
          bestTimeToVisit: '8:00 AM - 10:30 AM',
          whySpecial: 'Crispy flaky crust stuffed with spiced caramelised onion and hing, fried golden brown.',
          mustTry: 'Hot Pyaaz Kachori with Kadhi drizzle'
        }
      ],
      hiddenGems: [
        {
          id: `gem-syn-raj-1`,
          title: `${cleanDest} Sunset Stepwell & Panoramic Point`,
          category: 'secret_viewpoint',
          location: `${cleanDest} Scenic Overlook`,
          rating: 4.8,
          crowdLevel: 'peaceful',
          image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
          bestTimeOfDay: '5:30 PM - 6:45 PM',
          description: `Ancient stone pavilion offering elevated sunset views and tranquil evening breezes.`,
          insiderTip: 'Arrive 30 minutes before golden hour for stunning photography angles.'
        }
      ]
    };
  }

  // 3. Uttarakhand / Himachal / Mountain spots (Chopta, Kasol, Spiti, etc.)
  if (norm.includes('himachal') || norm.includes('uttarakhand') || norm.includes('chopta') || norm.includes('kasol') || norm.includes('spiti') || norm.includes('parvati') || norm.includes('mountain') || norm.includes('hill')) {
    return {
      destination,
      foodGems: [
        {
          id: `food-syn-hill-1`,
          name: `${cleanDest} Mountain Pine Cafe & Dhaba`,
          dish: 'Steamed Siddu with Pure Ghee & Pahadi Dal',
          category: 'rooftop_cafe',
          location: `${cleanDest} Ridge Trail`,
          pricePerPerson: 220,
          rating: 4.9,
          isVegetarian: true,
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
          bestTimeToVisit: '12:00 PM - 3:00 PM',
          whySpecial: 'Freshly steamed walnut and poppy seed stuffed siddu served with local wild mountain honey and desi ghee.',
          mustTry: 'Traditional Pahadi Siddu & Rhododendron Juice'
        },
        {
          id: `food-syn-hill-2`,
          name: 'Valley Steam Momos & Herbal Tea Corner',
          dish: 'Handmade Steamed Momos & Adrak-Tulsi Tea',
          category: 'street_food',
          location: `${cleanDest} Valley Viewpoint`,
          pricePerPerson: 100,
          rating: 4.8,
          isVegetarian: false,
          image: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?auto=format&fit=crop&w=600&q=80',
          bestTimeToVisit: '4:00 PM - 7:00 PM',
          whySpecial: 'Hot comforting dumplings served with spicy sesame chutney amidst mountain mist.',
          mustTry: 'Steamed Vegetable Momos with hot soup'
        }
      ],
      hiddenGems: [
        {
          id: `gem-syn-hill-1`,
          title: `${cleanDest} High-Altitude Pine Ridge Viewpoint`,
          category: 'secret_viewpoint',
          location: `${cleanDest} Upper Trail (15-min walk)`,
          rating: 4.9,
          crowdLevel: 'peaceful',
          image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
          bestTimeOfDay: '6:00 AM - 7:30 AM',
          description: `Unmarked cliffside viewpoint overlooking snow peaks, mist-filled valleys, and alpine meadows.`,
          insiderTip: 'Wear sturdy walking shoes and carry a fleece jacket for the morning chill.'
        }
      ]
    };
  }

  // 4. Coastal / Beach (Gokarna, Dhanushkodi, Varkala, Kerala, Tamil Nadu, etc.)
  if (norm.includes('beach') || norm.includes('gokarna') || norm.includes('dhanushkodi') || norm.includes('varkala') || norm.includes('kerala') || norm.includes('tamil') || norm.includes('coast')) {
    return {
      destination,
      foodGems: [
        {
          id: `food-syn-coast-1`,
          name: `${cleanDest} Coastal Fisher Shack & Thali`,
          dish: 'Coastal Banana Leaf Curry Thali & Neer Dosa',
          category: 'street_food',
          location: `${cleanDest} Shoreline Walkway`,
          pricePerPerson: 240,
          rating: 4.8,
          isVegetarian: false,
          image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
          bestTimeToVisit: '1:00 PM - 3:30 PM',
          whySpecial: 'Coconut-laced coastal curries, fresh catch of the day, steamed red rice, and sol kadhi.',
          mustTry: 'Neer Dosa with Ghee Roast & Tender Coconut Water'
        }
      ],
      hiddenGems: [
        {
          id: `gem-syn-coast-1`,
          title: `${cleanDest} Secluded Cliff Sunset Cove`,
          category: 'secret_viewpoint',
          location: `${cleanDest} Coastal Ridge Trail`,
          rating: 4.9,
          crowdLevel: 'peaceful',
          image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
          bestTimeOfDay: '5:45 PM - 6:45 PM',
          description: `Panoramic coastal promontory offering unbroken horizon ocean sunsets and gentle waves below.`,
          insiderTip: 'Bring a picnic towel to watch the sunset over the sea.'
        }
      ]
    };
  }

  // 5. Gujarat regional synthesis
  if (norm.includes('gujarat') || norm.includes('ahmedabad') || norm.includes('vadodara') || norm.includes('surat') || norm.includes('rajkot') || norm.includes('polo')) {
    return {
      destination,
      foodGems: [
        {
          id: `food-syn-guj-1`,
          name: `${cleanDest} Heritage Kathiyawadi Dining`,
          dish: 'Authentic Kathiyawadi Thali with Bajra Rotla & Olo',
          category: 'heritage_dhaba',
          location: `${cleanDest} Main Corridor`,
          pricePerPerson: 220,
          rating: 4.8,
          isVegetarian: true,
          image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
          bestTimeToVisit: '12:30 PM - 3:00 PM',
          whySpecial: 'Pure ghee rotlas, smokey roasted baingan bharta, garlic chutney, and spiced buttermilk.',
          mustTry: 'Bajra Rotla with Desi Ghee & Jaggery (Gol)'
        },
        {
          id: `food-syn-guj-2`,
          name: 'Fresh Morning Farsan & Jalebi Stalls',
          dish: 'Steamed Khaman & Crispy Jalebi with Kadhi',
          category: 'street_food',
          location: `${cleanDest} Bazaar Square`,
          pricePerPerson: 90,
          rating: 4.9,
          isVegetarian: true,
          image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
          bestTimeToVisit: '7:30 AM - 10:00 AM',
          whySpecial: 'Spongy yellow mustard-tempered khaman dhokla served with sweet-tangy kadhi and papaya salad.',
          mustTry: 'Khaman with fried spicy green chillies'
        }
      ],
      hiddenGems: [
        {
          id: `gem-syn-guj-1`,
          title: `${cleanDest} Panoramic Sunset Point`,
          category: 'secret_viewpoint',
          location: `${cleanDest} Outskirts`,
          rating: 4.8,
          crowdLevel: 'peaceful',
          image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
          bestTimeOfDay: '5:45 PM - 6:45 PM',
          description: `Secluded ridge offering peaceful 360-degree sunset views away from urban rush.`,
          insiderTip: 'Carry a flask of hot tea for an unforgettable sunset view.'
        }
      ]
    };
  }

  // 6. Universal spot synthesis for ANY location in the world
  return {
    destination,
    foodGems: [
      {
        id: `food-syn-gen-1`,
        name: `${cleanDest} Traditional Artisan Kitchen`,
        dish: `Authentic ${cleanDest} Chef's Special Regional Thali / Platter`,
        category: 'heritage_dhaba',
        location: `${cleanDest} Central Quarter`,
        pricePerPerson: 250,
        rating: 4.8,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '1:00 PM - 3:00 PM',
        whySpecial: `Hand-prepared regional specialties made with farm-fresh local produce and time-honored heritage recipes.`,
        mustTry: `House Speciality Thali & Fresh Seasonal Beverage`
      },
      {
        id: `food-syn-gen-2`,
        name: `${cleanDest} Morning Heritage Tea & Delicacies`,
        dish: 'Fresh Local Morning Snacks & Masala Chai',
        category: 'street_food',
        location: `${cleanDest} Market Square`,
        pricePerPerson: 80,
        rating: 4.9,
        isVegetarian: true,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        bestTimeToVisit: '8:00 AM - 10:00 AM',
        whySpecial: `Beloved local breakfast hub frequented by residents for morning conversations and steaming hot snacks.`,
        mustTry: `Signature Morning Snacks with Chutneys`
      }
    ],
    hiddenGems: [
      {
        id: `gem-syn-gen-1`,
        title: `${cleanDest} Twilight Sunset Ridge`,
        category: 'secret_viewpoint',
        location: `${cleanDest} Scenic Ridge (10-min drive/walk)`,
        rating: 4.8,
        crowdLevel: 'peaceful',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        bestTimeOfDay: '5:45 PM - 6:45 PM',
        description: `Breathtaking vantage point overlooking ${cleanDest} as twilight paints the horizon in gold and amber.`,
        insiderTip: 'Bring your camera for golden hour photography.'
      }
    ]
  };
}

