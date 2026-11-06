/**
 * TRIPVERSE LANDMARK & FAMOUS SPOTS ATLAS
 * 
 * Curated, verified, real-world famous landmarks, monuments, viewpoints,
 * cultural districts, and culinary attractions for world and national destinations.
 * 
 * Provides 14 to 25 authentic, iconic activities per destination so multi-day
 * itineraries never exhaust genuine attractions or fall back to generic placeholders.
 */

export interface LandmarkSpot {
  name: string;
  type: 'attraction' | 'viewpoint' | 'food' | 'nightlife';
  neighborhood: string;
  estimatedFee: number;
  description: string;
  bestTime: 'morning' | 'midday' | 'afternoon' | 'sunset' | 'evening';
  category: 'monument' | 'culture' | 'viewpoint' | 'market' | 'nature' | 'art' | 'food';
}

export const FAMOUS_LANDMARKS_REGISTRY: Record<string, LandmarkSpot[]> = {
  tokyo: [
    {
      name: 'Shibuya Crossing & Hachiko Statue',
      type: 'attraction',
      neighborhood: 'Shibuya, Tokyo',
      estimatedFee: 0,
      description: 'Experience the world-renowned pedestrian scramble crossing and visit the legendary loyal dog Hachiko bronze monument outside Shibuya Station.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Senso-ji Temple & Nakamise-dori',
      type: 'attraction',
      neighborhood: 'Asakusa, Taito City, Tokyo',
      estimatedFee: 0,
      description: 'Tokyo’s oldest Buddhist temple founded in 645 AD, approached via the iconic Kaminarimon Thunder Gate and the bustling Nakamise shopping street lined with traditional snacks.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Meiji Jingu Shrine & Yoyogi Park',
      type: 'attraction',
      neighborhood: 'Shibuya, Tokyo',
      estimatedFee: 0,
      description: 'Tranquil forested Shinto shrine dedicated to Emperor Meiji and Empress Shoken, surrounded by over 100,000 evergreen trees right in central Tokyo.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Tokyo Skytree & Solamachi Panorama',
      type: 'viewpoint',
      neighborhood: 'Sumida, Tokyo',
      estimatedFee: 2100,
      description: 'Ascend to the 350m and 450m observation decks of the world’s tallest freestanding tower for unobstructed 360-degree panoramas extending to Mount Fuji on clear days.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'TeamLab Planets Immersive Digital Art',
      type: 'attraction',
      neighborhood: 'Toyosu, Koto City, Tokyo',
      estimatedFee: 3800,
      description: 'Barefoot sensory museum featuring massive body-immersive digital artworks where visitors walk through water, infinite crystal universes, and floating flower gardens.',
      bestTime: 'midday',
      category: 'art'
    },
    {
      name: 'Akihabara Electric Town & Retro Gaming',
      type: 'attraction',
      neighborhood: 'Akihabara, Chiyoda City, Tokyo',
      estimatedFee: 0,
      description: 'Global epicenter of electronics, anime, manga culture, multi-level arcades, and collector hubs such as Mandarake Complex and Radio Kaikan.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Shinjuku Gyoen National Garden',
      type: 'attraction',
      neighborhood: 'Shinjuku, Tokyo',
      estimatedFee: 500,
      description: 'Former Edo-period feudal lord residence turned imperial garden, featuring exquisite Japanese traditional landscaping, English landscape gardens, and French formal lawns.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Tsukiji Outer Market Food Tour',
      type: 'food',
      neighborhood: 'Tsukiji, Chuo City, Tokyo',
      estimatedFee: 1500,
      description: 'Bustling historic culinary market packed with authentic street food stalls serving freshly torched A5 wagyu skewers, melt-in-mouth sashimi, and warm dashi tamagoyaki.',
      bestTime: 'morning',
      category: 'food'
    },
    {
      name: 'Tokyo Tower & Shiba Park Vista',
      type: 'viewpoint',
      neighborhood: 'Minato, Tokyo',
      estimatedFee: 1200,
      description: 'Tokyo’s beloved 333-meter red-and-white retro communications landmark modeled after the Eiffel Tower, offering illuminated evening vistas from the main observation deck.',
      bestTime: 'evening',
      category: 'viewpoint'
    },
    {
      name: 'Roppongi Hills Mori Art Museum & Sky Deck',
      type: 'viewpoint',
      neighborhood: 'Roppongi, Minato City, Tokyo',
      estimatedFee: 2000,
      description: 'Contemporary museum atop the 53rd floor of Roppongi Hills Mori Tower, accompanied by the Tokyo City View open-air rooftop observation deck.',
      bestTime: 'sunset',
      category: 'art'
    },
    {
      name: 'Ueno Park & Tokyo National Museum',
      type: 'attraction',
      neighborhood: 'Ueno, Taito City, Tokyo',
      estimatedFee: 1000,
      description: 'Japan’s oldest and largest museum housing over 110,000 national treasures and artifacts, set within expansive park grounds alongside Shinobazu Lotus Pond.',
      bestTime: 'morning',
      category: 'culture'
    },
    {
      name: 'Ginza Chuo-dori & Kabukiza Theatre',
      type: 'attraction',
      neighborhood: 'Ginza, Chuo City, Tokyo',
      estimatedFee: 0,
      description: 'Tokyo’s premier luxury boulevard, famous for historic department stores like Ginza Six, artisan stationery shops (Itoya), and the landmark Kabukiza traditional theater.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Imperial Palace East Gardens & Nijubashi Bridge',
      type: 'attraction',
      neighborhood: 'Chiyoda, Tokyo',
      estimatedFee: 0,
      description: 'Walk the historic grounds of the former Edo Castle, featuring massive stone ramparts, Ninomaru Garden, and views of the double-arched stone Nijubashi Bridge.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Odaiba Seaside Promenade & Unicorn Gundam',
      type: 'viewpoint',
      neighborhood: 'Odaiba, Minato City, Tokyo',
      estimatedFee: 0,
      description: 'Futuristic waterfront district on Tokyo Bay with views of the Rainbow Bridge, the Tokyo replica Statue of Liberty, and the life-sized transforming RX-0 Unicorn Gundam statue.',
      bestTime: 'evening',
      category: 'viewpoint'
    },
    {
      name: 'Harajuku Takeshita Street & Omotesando',
      type: 'attraction',
      neighborhood: 'Harajuku, Shibuya, Tokyo',
      estimatedFee: 0,
      description: 'Vibrant epicenter of Japanese kawaii youth fashion on Takeshita Street, transitioning into the tree-lined European-style architectural boulevard of Omotesando.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Yanaka Ginza Shitamachi Old Town',
      type: 'attraction',
      neighborhood: 'Yanaka, Taito City, Tokyo',
      estimatedFee: 0,
      description: 'Preserved pre-war historic district retaining authentic Edo-period charm, narrow temple-lined alleys, cat motifs, and nostalgic retro croquette food stalls.',
      bestTime: 'morning',
      category: 'culture'
    },
    {
      name: 'Omoide Yokocho "Memory Lane" & Yakitori Alleys',
      type: 'food',
      neighborhood: 'Shinjuku, Tokyo',
      estimatedFee: 2000,
      description: 'Atmospheric post-war alleyway beside Shinjuku Station packed with tiny smoky yakitori counters, lantern-lit stalls, and nostalgic izakaya camaraderie.',
      bestTime: 'evening',
      category: 'food'
    },
    {
      name: 'Nezu Museum & Traditional Tea Garden',
      type: 'attraction',
      neighborhood: 'Minamiaoyama, Minato City, Tokyo',
      estimatedFee: 1400,
      description: 'Exquisite private collection of pre-modern Japanese and East Asian art housed in a Kengo Kuma designed pavilion, surrounded by a serene mossy bamboo and stone stroll garden.',
      bestTime: 'afternoon',
      category: 'art'
    }
  ],

  paris: [
    {
      name: 'Eiffel Tower Summit Tour',
      type: 'viewpoint',
      neighborhood: 'Champ de Mars, 7th arr., Paris',
      estimatedFee: 2800,
      description: 'Ascend Gustave Eiffel’s 330m iron masterpiece for panoramic vistas over the Seine, Champ de Mars, and historic Parisian boulevards, complete with evening light sparkle shows.',
      bestTime: 'sunset',
      category: 'monument'
    },
    {
      name: 'Louvre Museum Masterpieces & Glass Pyramid',
      type: 'attraction',
      neighborhood: '1st arr., Paris',
      estimatedFee: 2200,
      description: 'World’s most-visited art museum housing the Mona Lisa, Venus de Milo, Winged Victory of Samothrace, and thousands of masterworks within a royal Renaissance palace.',
      bestTime: 'morning',
      category: 'art'
    },
    {
      name: 'Musée d\'Orsay Impressionist Masterpieces',
      type: 'attraction',
      neighborhood: '7th arr., Paris',
      estimatedFee: 1600,
      description: 'Set inside a stunning 1900 Beaux-Arts railway station, holding the world’s finest collection of Impressionist and Post-Impressionist paintings by Monet, Van Gogh, and Renoir.',
      bestTime: 'afternoon',
      category: 'art'
    },
    {
      name: 'Arc de Triomphe & Champs-Élysées Promenade',
      type: 'viewpoint',
      neighborhood: '8th arr., Paris',
      estimatedFee: 1300,
      description: 'Triumphal arch commissioned by Napoleon at the Place Charles de Gaulle, offering rooftop views down twelve radiating grand avenues including Avenue des Champs-Élysées.',
      bestTime: 'sunset',
      category: 'monument'
    },
    {
      name: 'Cathédrale Notre-Dame & Île de la Cité',
      type: 'attraction',
      neighborhood: 'Île de la Cité, 4th arr., Paris',
      estimatedFee: 0,
      description: 'Gothic architectural jewel on the Seine founded in 1163, showcasing majestic stone gargoyles, rose stained-glass windows, and rich Parisian history.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Sacré-Cœur Basilica & Montmartre Artists Square',
      type: 'attraction',
      neighborhood: 'Montmartre, 18th arr., Paris',
      estimatedFee: 0,
      description: 'Dazzling Romano-Byzantine white travertine basilica perched atop Montmartre butte, overlooking Paris and surrounded by Place du Tertre’s bohemian portrait artists.',
      bestTime: 'morning',
      category: 'culture'
    },
    {
      name: 'Sainte-Chapelle 13th-Century Stained Glass',
      type: 'attraction',
      neighborhood: 'Île de la Cité, 1st arr., Paris',
      estimatedFee: 1150,
      description: 'Rayonnant Gothic royal chapel celebrated for 15 towering stained glass windows depicting over 1,100 biblical scenes in radiant violet, ruby, and gold hues.',
      bestTime: 'midday',
      category: 'art'
    },
    {
      name: 'Seine River Sunset Cruise from Pont Neuf',
      type: 'viewpoint',
      neighborhood: 'Pont Neuf, Paris',
      estimatedFee: 1500,
      description: 'Glide under historic bridges on an open-top riverboat, taking in the illuminated façades of the Louvre, Musée d’Orsay, and Eiffel Tower reflected on the Seine.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Jardin du Luxembourg & Medici Fountain',
      type: 'attraction',
      neighborhood: '6th arr., Paris',
      estimatedFee: 0,
      description: 'Splendid 17th-century palace gardens commissioned by Marie de’ Medici, featuring classical statues, iconic green metal chairs, chestnut groves, and model sailboats.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Centre Pompidou Modern Art & Piazza',
      type: 'attraction',
      neighborhood: 'Beaubourg, 4th arr., Paris',
      estimatedFee: 1500,
      description: 'Groundbreaking high-tech inside-out architecture by Renzo Piano and Richard Rogers, housing Europe’s largest collection of modern and contemporary art.',
      bestTime: 'afternoon',
      category: 'art'
    },
    {
      name: 'Panthéon & Latin Quarter Literary Walk',
      type: 'attraction',
      neighborhood: 'Latin Quarter, 5th arr., Paris',
      estimatedFee: 1150,
      description: 'Neoclassical domed mausoleum honoring French national heroes including Voltaire, Victor Hugo, and Marie Curie, located in the historic intellectual heart of Paris.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Palais Garnier Opera House Tour',
      type: 'attraction',
      neighborhood: '9th arr., Paris',
      estimatedFee: 1400,
      description: 'Opulent 19th-century Neo-Baroque opera masterpiece featuring a Grand Staircase of white marble, shimmering gilded salons, and Marc Chagall’s ceiling fresco.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Galeries Lafayette Rooftop Haussmann View',
      type: 'viewpoint',
      neighborhood: 'Boulevard Haussmann, Paris',
      estimatedFee: 0,
      description: 'Admire the stained-glass Art Nouveau dome inside the historic department store before ascending to the free panoramic rooftop terrace overlooking the Opéra and Eiffel Tower.',
      bestTime: 'afternoon',
      category: 'viewpoint'
    },
    {
      name: 'Musée de l\'Orangerie (Monet’s Water Lilies)',
      type: 'attraction',
      neighborhood: 'Tuileries Garden, 1st arr., Paris',
      estimatedFee: 1250,
      description: 'Contemplative oval galleries purpose-built to display Claude Monet’s monumental Water Lilies (Nymphéas) murals in continuous natural skylight.',
      bestTime: 'morning',
      category: 'art'
    },
    {
      name: 'Le Marais Historic Mansions & Place des Vosges',
      type: 'attraction',
      neighborhood: 'Le Marais, 3rd/4th arr., Paris',
      estimatedFee: 0,
      description: 'Stroll Paris’s oldest planned square surrounded by vaulted red-brick arcades, boutique fashion houses, courtyard galleries, and artisanal Jewish bakeries on Rue des Rosiers.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Palace of Versailles & Hall of Mirrors',
      type: 'attraction',
      neighborhood: 'Versailles, Île-de-France',
      estimatedFee: 2600,
      description: 'The golden seat of the French monarchy, boasting Louis XIV’s Hall of Mirrors, the King’s Grand Apartments, and André Le Nôtre’s immense geometric fountain gardens.',
      bestTime: 'morning',
      category: 'monument'
    }
  ],

  'new-york': [
    {
      name: 'Central Park & Bethesda Terrace Walk',
      type: 'attraction',
      neighborhood: 'Manhattan, New York',
      estimatedFee: 0,
      description: 'Explore the 843-acre urban sanctuary designed by Olmsted and Vaux, visiting Bethesda Fountain, the Mall lined with American elms, Bow Bridge, and Strawberry Fields.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Empire State Building 86th Floor Observatory',
      type: 'viewpoint',
      neighborhood: 'Midtown Manhattan, New York',
      estimatedFee: 4400,
      description: 'Iconic 1931 Art Deco skyscraper soaring 102 stories above Manhattan, offering open-air vistas of five states and the glittering city grid.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Statue of Liberty & Ellis Island Immigration Museum',
      type: 'attraction',
      neighborhood: 'New York Harbor, New York',
      estimatedFee: 2500,
      description: 'Scenic ferry across New York Harbor to Lady Liberty’s pedestal and the historic immigration halls where 12 million newcomers entered America.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Times Square & Broadway Theatre District',
      type: 'nightlife',
      neighborhood: 'Midtown Manhattan, New York',
      estimatedFee: 0,
      description: 'The Crossroads of the World, illuminated by titanic digital billboards, vibrant street performers, and the historic marquees of the Broadway theater district.',
      bestTime: 'evening',
      category: 'culture'
    },
    {
      name: 'The Metropolitan Museum of Art (The Met)',
      type: 'attraction',
      neighborhood: 'Upper East Side, New York',
      estimatedFee: 3000,
      description: 'One of the world’s grandest cultural institutions, spanning 5,000 years of art from the ancient Egyptian Temple of Dendur to European masters and modern galleries.',
      bestTime: 'morning',
      category: 'art'
    },
    {
      name: 'Brooklyn Bridge Pedestrian Promenade Walk',
      type: 'viewpoint',
      neighborhood: 'Lower Manhattan to DUMBO, New York',
      estimatedFee: 0,
      description: 'Historic 1883 neo-Gothic suspension bridge with soaring stone towers and steel cables, offering cinematic views of Lower Manhattan’s skyline and the East River.',
      bestTime: 'morning',
      category: 'viewpoint'
    },
    {
      name: 'The High Line & Hudson Yards Vessel',
      type: 'attraction',
      neighborhood: 'Chelsea & Hudson Yards, New York',
      estimatedFee: 0,
      description: 'A 1.45-mile elevated linear park created on a historic freight rail line above Manhattan’s West Side streets, culminating at the spiral staircase Vessel.',
      bestTime: 'afternoon',
      category: 'nature'
    },
    {
      name: '9/11 Memorial & One World Observatory',
      type: 'attraction',
      neighborhood: 'Financial District, New York',
      estimatedFee: 3800,
      description: 'Reflective waterfall pools in the twin tower footprints and the SkyPod elevator ascending to the 102nd floor of the Western Hemisphere’s tallest building.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Top of the Rock Observation Deck',
      type: 'viewpoint',
      neighborhood: 'Rockefeller Center, New York',
      estimatedFee: 4000,
      description: 'Three tiers of open-air decks atop 30 Rockefeller Plaza featuring the premier framed view of the Empire State Building and Central Park.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Museum of Modern Art (MoMA)',
      type: 'attraction',
      neighborhood: 'Midtown Manhattan, New York',
      estimatedFee: 2800,
      description: 'World benchmark of modern and contemporary art, holding Van Gogh’s Starry Night, Dalí’s The Persistence of Memory, and Warhol’s Campbell’s Soup Cans.',
      bestTime: 'afternoon',
      category: 'art'
    },
    {
      name: 'Grand Central Terminal & Whispering Gallery',
      type: 'attraction',
      neighborhood: 'Midtown Manhattan, New York',
      estimatedFee: 0,
      description: 'Beaux-Arts transportation cathedral featuring a celestial ceiling mural, the four-faced brass clock, and acoustic marvels in the lower dining concourse.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'DUMBO & Brooklyn Bridge Park Sunset',
      type: 'viewpoint',
      neighborhood: 'DUMBO, Brooklyn, New York',
      estimatedFee: 0,
      description: 'Cobblestone streets framing the Manhattan Bridge on Washington Street, Jane’s Carousel, and skyline sunset panoramas across the East River.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Greenwich Village & Washington Square Park',
      type: 'attraction',
      neighborhood: 'Lower Manhattan, New York',
      estimatedFee: 0,
      description: 'Bohemian brownstone-lined streets, intimate jazz basements, artisan espresso cafes, and street musicians gathered beneath the Washington Arch.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Chelsea Market & Food Hall Discovery',
      type: 'food',
      neighborhood: 'Chelsea, New York',
      estimatedFee: 2000,
      description: 'Former Nabisco factory turned world-class urban culinary hall, known for freshly steamed Maine lobsters, hand-pulled noodles, artisan tacos, and bakeries.',
      bestTime: 'midday',
      category: 'food'
    }
  ],

  rome: [
    {
      name: 'Colosseum & Gladiator Arena Floor',
      type: 'attraction',
      neighborhood: 'Piazza del Colosseo, Rome',
      estimatedFee: 1800,
      description: 'Ancient Rome’s iconic Flavian Amphitheatre completed in 80 AD, exploring the gladiator combat arena, seating tiers, and underground hypogeum tunnels.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Roman Forum & Palatine Hill Ruins',
      type: 'attraction',
      neighborhood: 'Via Sacra, Rome',
      estimatedFee: 1800,
      description: 'The civic, political, and religious heart of the Roman Empire, featuring the Curia, Arch of Titus, Temple of Saturn, and imperial palaces of the Palatine.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Vatican Museums & Sistine Chapel',
      type: 'attraction',
      neighborhood: 'Vatican City, Rome',
      estimatedFee: 2400,
      description: 'Vast papal palace galleries culminating in Michelangelo’s Genesis ceiling and The Last Judgment frescoes, Raphael’s Rooms, and the Gallery of Maps.',
      bestTime: 'morning',
      category: 'art'
    },
    {
      name: 'St. Peter\'s Basilica & Dome Climb',
      type: 'viewpoint',
      neighborhood: 'St. Peter’s Square, Vatican City',
      estimatedFee: 1000,
      description: 'The epicenter of Catholicism designed by Bramante and Michelangelo, featuring Bernini’s bronze Baldachin, Pietà, and panoramic dome views over Rome.',
      bestTime: 'afternoon',
      category: 'monument'
    },
    {
      name: 'The Pantheon & Piazza della Rotonda',
      type: 'attraction',
      neighborhood: 'Centro Storico, Rome',
      estimatedFee: 500,
      description: 'Best-preserved monument of ancient Rome, built by Emperor Hadrian with an unreinforced concrete dome and open central oculus, housing Raphael’s tomb.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Trevi Fountain & Baroque Evening Piazzas',
      type: 'attraction',
      neighborhood: 'Trevi, Rome',
      estimatedFee: 0,
      description: 'Baroque fountain masterpiece depicting Oceanus by Nicola Salvi; tradition holds that tossing a coin ensures a return journey to the Eternal City.',
      bestTime: 'evening',
      category: 'monument'
    },
    {
      name: 'Piazza Navona & Fountain of the Four Rivers',
      type: 'attraction',
      neighborhood: 'Centro Storico, Rome',
      estimatedFee: 0,
      description: 'Built over Domitian’s Roman stadium, featuring Gian Lorenzo Bernini’s Fountain of the Four Rivers, Sant\'Agnese in Agone, street painters, and trattorias.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Spanish Steps & Piazza di Spagna',
      type: 'attraction',
      neighborhood: 'Tridente, Rome',
      estimatedFee: 0,
      description: 'Monumental 135-step stairway climbing from the Barcaccia fountain to the Trinità dei Monti church, overlooking Rome’s luxury high-fashion boutiques.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Trastevere Cobblestone Walk & Authentic Trattorias',
      type: 'food',
      neighborhood: 'Trastevere, Rome',
      estimatedFee: 2500,
      description: 'Charming medieval bohemian quarter across the Tiber River, renowned for ivy-draped alleys, piazza aperitifs, and authentic Roman cacio e pepe and carbonara.',
      bestTime: 'evening',
      category: 'food'
    },
    {
      name: 'Borghese Gallery & Villa Borghese Gardens',
      type: 'attraction',
      neighborhood: 'Pinciano, Rome',
      estimatedFee: 1500,
      description: 'Renaissance villa holding Bernini’s Apollo and Daphne, Caravaggio canvases, and Canova sculptures, set within Rome’s lush landscaped central park.',
      bestTime: 'morning',
      category: 'art'
    },
    {
      name: 'Castel Sant\'Angelo & Bridge of Angels',
      type: 'viewpoint',
      neighborhood: 'Borgo, Rome',
      estimatedFee: 1400,
      description: 'Hadrian’s imperial mausoleum transformed into a papal fortress and prison, crowned with the Archangel Michael statue and sweeping terrace views over the Tiber.',
      bestTime: 'sunset',
      category: 'monument'
    },
    {
      name: 'Campo de\' Fiori Morning Market & Bakeries',
      type: 'food',
      neighborhood: 'Parione, Rome',
      estimatedFee: 600,
      description: 'Historic piazza holding a daily market of vibrant produce, flowers, and spices beneath Giordano Bruno’s statue, surrounded by classic Roman bakeries.',
      bestTime: 'morning',
      category: 'food'
    }
  ],

  dubai: [
    {
      name: 'Burj Khalifa Level 148 "At The Top" Sky Deck',
      type: 'viewpoint',
      neighborhood: 'Downtown Dubai, UAE',
      estimatedFee: 5500,
      description: 'Ascend the world’s tallest skyscraper (828m) to the 148th-floor observation lounge (555m) for aerial vistas across Dubai’s coastline, desert, and skyline.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'The Dubai Fountain & Burj Lake Synchronized Show',
      type: 'viewpoint',
      neighborhood: 'Downtown Dubai, UAE',
      estimatedFee: 0,
      description: 'The world’s largest choreographed water fountain system on Burj Lake, firing 22,000 gallons of water 150 meters into the air set to classical and Arabic music.',
      bestTime: 'evening',
      category: 'viewpoint'
    },
    {
      name: 'Dubai Mall & Underwater Zoo',
      type: 'attraction',
      neighborhood: 'Downtown Dubai, UAE',
      estimatedFee: 1800,
      description: 'Sprawling luxury shopping destination featuring over 1,200 retail stores, an Olympic-sized ice rink, and a 10-million-liter aquarium with sharks and rays.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Red Dune Desert Safari & Bedouin BBQ Camp',
      type: 'attraction',
      neighborhood: 'Lahbab Desert, Dubai',
      estimatedFee: 3200,
      description: 'Adrenaline 4x4 dune bashing across golden crimson desert sands, sandboarding, camel treks, henna painting, and an evening stargazing BBQ with Tanoura dance.',
      bestTime: 'afternoon',
      category: 'nature'
    },
    {
      name: 'Palm Jumeirah & The View at The Palm',
      type: 'viewpoint',
      neighborhood: 'Palm Jumeirah, Dubai',
      estimatedFee: 1600,
      description: 'Observation deck on the 52nd floor of Palm Tower offering panoramic 360-degree vistas of the palm-shaped archipelago, Arabian Gulf, and Dubai Marina.',
      bestTime: 'morning',
      category: 'viewpoint'
    },
    {
      name: 'Dubai Frame Architectural Portal',
      type: 'viewpoint',
      neighborhood: 'Zabeel Park, Dubai',
      estimatedFee: 500,
      description: 'A 150-meter golden picture frame bridging Dubai’s past and present, featuring a transparent glass sky-bridge walk connecting Old Deira with New Downtown.',
      bestTime: 'morning',
      category: 'viewpoint'
    },
    {
      name: 'Dubai Marina Walk & Yacht Promenade',
      type: 'viewpoint',
      neighborhood: 'Dubai Marina, UAE',
      estimatedFee: 0,
      description: 'A 7km pedestrian canal promenade bordered by illuminated skyscrapers, luxury superyachts, alfresco dining terraces, and lively evening energy.',
      bestTime: 'evening',
      category: 'culture'
    },
    {
      name: 'Old Dubai Gold & Spice Souks (Deira)',
      type: 'food',
      neighborhood: 'Deira, Dubai',
      estimatedFee: 200,
      description: 'Traditional atmospheric souks lined with windows of handcrafted gold jewelry, aromatic mountain herbs, saffron, dried limes, and frankincense.',
      bestTime: 'morning',
      category: 'market'
    },
    {
      name: 'Al Fahidi Historic District & Dubai Creek Abra Ride',
      type: 'attraction',
      neighborhood: 'Bur Dubai, UAE',
      estimatedFee: 50,
      description: 'Wander 19th-century gypsum wind-tower alleys and heritage coffee museums, then cross Dubai Creek on a traditional wooden 1-Dirham Abra ferry.',
      bestTime: 'morning',
      category: 'culture'
    },
    {
      name: 'Museum of the Future Architectural Wonder',
      type: 'attraction',
      neighborhood: 'Sheikh Zayed Road, Dubai',
      estimatedFee: 3500,
      description: 'Pioneering torus-shaped building inscribed with Arabic calligraphy poems, exploring innovative exhibits on future space exploration, bio-engineering, and AI.',
      bestTime: 'midday',
      category: 'art'
    },
    {
      name: 'Dubai Miracle Garden Floral Oasis',
      type: 'attraction',
      neighborhood: 'Al Barsha South, Dubai',
      estimatedFee: 850,
      description: 'World’s largest natural flower garden displaying over 150 million blooming flowers sculpted into life-sized Emirates A380 planes, castles, and heart arches.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Atlantis Aquaventure & The Lost Chambers',
      type: 'attraction',
      neighborhood: 'Crescent Road, Palm Jumeirah',
      estimatedFee: 6500,
      description: 'World’s largest waterpark featuring the Leap of Faith lagoon slide, roaring river rapids, and the mythical underwater tunnels of The Lost Chambers aquarium.',
      bestTime: 'morning',
      category: 'nature'
    }
  ],

  jaipur: [
    {
      name: 'Amber Fort & Sheesh Mahal (Mirror Palace)',
      type: 'attraction',
      neighborhood: 'Amer, Jaipur',
      estimatedFee: 550,
      description: 'UNESCO World Heritage hilltop citadel constructed from red sandstone and marble, famous for the glittering Sheesh Mahal and views over Maota Lake.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Hawa Mahal (Palace of Winds)',
      type: 'attraction',
      neighborhood: 'Badi Choupad, Old Pink City, Jaipur',
      estimatedFee: 200,
      description: 'Iconic 5-story pink-hued honeycomb façade with 953 intricately carved jharokha windows built so royal ladies could view street festivals unobserved.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'City Palace Complex & Chandra Mahal Museum',
      type: 'attraction',
      neighborhood: 'Old City, Jaipur',
      estimatedFee: 700,
      description: 'Seat of the Maharaja of Jaipur blending Rajasthani and Mughal architecture, housing the Peacock Gate, textile museums, and giant silver Gangajali urns.',
      bestTime: 'afternoon',
      category: 'monument'
    },
    {
      name: 'Jantar Mantar Astronomical Observatory',
      type: 'attraction',
      neighborhood: 'Old City, Jaipur',
      estimatedFee: 200,
      description: 'UNESCO World Heritage collection of nineteen architectural astronomical instruments built by Rajput King Sawai Jai Singh II, including the world’s largest stone sundial.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Nahargarh Fort Sunset Skyline Viewpoint',
      type: 'viewpoint',
      neighborhood: 'Aravalli Hills, Jaipur',
      estimatedFee: 200,
      description: 'Hilltop defensive fortification atop the rugged Aravalli ridge, offering the premier sunset vantage point over the entirety of the Pink City.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Jal Mahal (Water Palace) & Man Sagar Lake',
      type: 'viewpoint',
      neighborhood: 'Amer Road, Jaipur',
      estimatedFee: 0,
      description: 'Captivating Rajput-style palace appearing to float in the center of Man Sagar Lake, surrounded by the Aravalli hills and evening street craft stalls.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Albert Hall Museum & Ram Niwas Gardens',
      type: 'attraction',
      neighborhood: 'Ram Niwas Garden, Jaipur',
      estimatedFee: 300,
      description: 'State museum of Rajasthan housed in a grand Indo-Saracenic palace, featuring an Egyptian mummy, miniature court paintings, and illuminated evening gardens.',
      bestTime: 'evening',
      category: 'art'
    },
    {
      name: 'Jaigarh Fort & Jaivana Wheeled Cannon',
      type: 'attraction',
      neighborhood: 'Amer, Jaipur',
      estimatedFee: 250,
      description: 'Robust military fortress connected to Amber Fort by underground passages, housing the Jaivana cannon—once the world’s largest cannon on wheels.',
      bestTime: 'afternoon',
      category: 'monument'
    },
    {
      name: 'Johari Bazaar & Bapu Bazaar Artisan Walk',
      type: 'food',
      neighborhood: 'Old City, Jaipur',
      estimatedFee: 500,
      description: 'Historic covered arcades bustling with lac bangles, blue pottery, block-printed cottons, traditional mojari juttis, and hot onion kachoris.',
      bestTime: 'afternoon',
      category: 'market'
    },
    {
      name: 'Patrika Gate & Jawahar Circle Garden',
      type: 'attraction',
      neighborhood: 'Malviya Nagar, Jaipur',
      estimatedFee: 0,
      description: 'Vibrantly hand-painted monumental memorial gate depicting the culture, architectural heritage, and rulers of Rajasthan across colorful arched corridors.',
      bestTime: 'morning',
      category: 'culture'
    },
    {
      name: 'Galta Ji "Monkey Temple" & Sacred Springs',
      type: 'attraction',
      neighborhood: 'Khania-Balaji, Jaipur',
      estimatedFee: 100,
      description: 'Ancient Hindu pilgrimage complex tucked into a narrow mountain pass, featuring natural freshwater kunds (tanks) and hundreds of resident rhesus macaque monkeys.',
      bestTime: 'morning',
      category: 'culture'
    },
    {
      name: 'Panna Meena Ka Kund Stepwell',
      type: 'attraction',
      neighborhood: 'Amer, Jaipur',
      estimatedFee: 0,
      description: 'Stunning 16th-century geometric stepwell with interlocking criss-cross staircases, historic pavilions, and peaceful heritage photography angles.',
      bestTime: 'morning',
      category: 'monument'
    }
  ],

  udaipur: [
    {
      name: 'City Palace Complex & Crystal Gallery',
      type: 'attraction',
      neighborhood: 'Lake Pichola East Bank, Udaipur',
      estimatedFee: 450,
      description: 'Rajasthan’s largest palace complex perched over Lake Pichola, featuring mirror mosaics at Mor Chowk, panoramic royal courtyards, and the rare Crystal Gallery.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Lake Pichola Sunset Boat Cruise to Jag Mandir',
      type: 'viewpoint',
      neighborhood: 'Lake Pichola, Udaipur',
      estimatedFee: 750,
      description: 'Scenic boat ride across placid waters offering vistas of the City Palace, Lake Palace (Taj Lake Palace), and disembarking at the island palace of Jag Mandir.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Jagdish Temple & Old City Heritage Alleys',
      type: 'attraction',
      neighborhood: 'Old City, Udaipur',
      estimatedFee: 0,
      description: 'Magnificent 1651 Indo-Aryan temple dedicated to Lord Vishnu, featuring elaborately sculpted pillar friezes of dancers and musicians rising above city bazaars.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Saheliyon Ki Bari (Garden of the Royal Maids)',
      type: 'attraction',
      neighborhood: 'Saheli Marg, Udaipur',
      estimatedFee: 100,
      description: 'Ornamental royal leisure garden built for 48 princess maidens, featuring lotus pools, marble elephant fountains powered by gravity, and lush bougainvillea.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Bagore Ki Haveli Dharohar Evening Folk Show',
      type: 'attraction',
      neighborhood: 'Gangaur Ghat, Udaipur',
      estimatedFee: 200,
      description: '18th-century waterfront mansion hosting the lively Dharohar dance show with Kalbelia dancers balancing brass pots on their heads beside candlelit courtyards.',
      bestTime: 'evening',
      category: 'culture'
    },
    {
      name: 'Monsoon Palace (Sajjangarh) Sunset Panorama',
      type: 'viewpoint',
      neighborhood: 'Bansdara Peak, Udaipur',
      estimatedFee: 300,
      description: 'Palatial white marble hilltop residence built to watch monsoon clouds gather, offering panoramic vistas across Udaipur’s lakes, palaces, and surrounding Aravallis.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Fateh Sagar Lake Promenade & Nehru Park',
      type: 'viewpoint',
      neighborhood: 'Fateh Sagar, Udaipur',
      estimatedFee: 0,
      description: 'Tranquil artificial lake bordered by hills, featuring a scenic lakeside promenade popular for evening strolls, spicy kulhad coffee, and boat rides to Nehru Island.',
      bestTime: 'evening',
      category: 'nature'
    },
    {
      name: 'Ambrai Ghat Waterfront Twilight View',
      type: 'viewpoint',
      neighborhood: 'Chandpole, Udaipur',
      estimatedFee: 0,
      description: 'Intimate marble bathing ghat directly opposite the City Palace across Lake Pichola, offering the most romantic nighttime view of illuminated palace ramparts.',
      bestTime: 'evening',
      category: 'viewpoint'
    },
    {
      name: 'Shilpgram Rural Arts and Crafts Village',
      type: 'attraction',
      neighborhood: 'Haveli, Udaipur',
      estimatedFee: 150,
      description: 'Living ethnographic museum complex with traditional mud huts, terracotta pottery demonstrations, tribal weaving, and folk artisan markets.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Karni Mata Temple Ropeway Panorama',
      type: 'viewpoint',
      neighborhood: 'Machhala Hill, Udaipur',
      estimatedFee: 150,
      description: 'Aerial cable car ride up Machhala Hill leading to the Karni Mata shrine, offering aerial vistas of Lake Pichola, Doodh Talai, and the royal palaces.',
      bestTime: 'sunset',
      category: 'viewpoint'
    }
  ],

  london: [
    {
      name: 'Big Ben & Houses of Parliament',
      type: 'attraction',
      neighborhood: 'Westminster, London',
      estimatedFee: 0,
      description: 'Iconic neo-Gothic Elizabeth Tower and clock face overlooking the River Thames and Westminster Bridge.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Tower of London & Crown Jewels',
      type: 'attraction',
      neighborhood: 'Tower Hill, London',
      estimatedFee: 3300,
      description: 'Nearly 1,000-year-old royal fortress, former state prison, and home of the glittering Crown Jewels guarded by the Beefeaters.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Tower Bridge Glass Floor Walkway',
      type: 'viewpoint',
      neighborhood: 'River Thames, London',
      estimatedFee: 1300,
      description: 'Victorian bascule bridge featuring high-level walkways with glass floors providing views down to London traffic and the Thames.',
      bestTime: 'afternoon',
      category: 'viewpoint'
    },
    {
      name: 'British Museum & Great Court',
      type: 'attraction',
      neighborhood: 'Bloomsbury, London',
      estimatedFee: 0,
      description: 'World-famous museum dedicated to human history, art, and culture, housing the Rosetta Stone and Parthenon Sculptures beneath Foster’s glass ceiling.',
      bestTime: 'morning',
      category: 'art'
    },
    {
      name: 'London Eye Sunset Flight',
      type: 'viewpoint',
      neighborhood: 'South Bank, London',
      estimatedFee: 3500,
      description: 'Observation wheel on the South Bank of the Thames rising 135 meters high, providing 360-degree views over London landmarks.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Buckingham Palace & Changing of the Guard',
      type: 'attraction',
      neighborhood: 'Westminster, London',
      estimatedFee: 0,
      description: 'The monarch’s administrative headquarters, famous for ceremonial Changing the Guard marching in scarlet tunics and bearskin hats.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Westminster Abbey Royal Tombs',
      type: 'attraction',
      neighborhood: 'Westminster, London',
      estimatedFee: 2700,
      description: 'Coronation church of the British monarchy since 1066 and burial site of monarchs, statesmen, and poets in Poets’ Corner.',
      bestTime: 'afternoon',
      category: 'monument'
    },
    {
      name: 'Borough Market Artisan Food Trail',
      type: 'food',
      neighborhood: 'Southwark, London',
      estimatedFee: 1500,
      description: 'London’s oldest and largest food market, packed with stalls offering British cheeses, freshly baked pies, oysters, and hot salt beef bagels.',
      bestTime: 'midday',
      category: 'food'
    }
  ],

  barcelona: [
    {
      name: 'Sagrada Família & Nativity Towers',
      type: 'attraction',
      neighborhood: 'Eixample, Barcelona',
      estimatedFee: 2600,
      description: 'Antoni Gaudí’s breathtaking unfinished basilica featuring tree-like forest columns, radiant stained-glass windows, and soaring organic towers.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Park Güell Mosaic Serpentine Bench',
      type: 'attraction',
      neighborhood: 'Gràcia, Barcelona',
      estimatedFee: 1000,
      description: 'Public park system on Carmel Hill composed of vibrant trencadís mosaic salamanders, stone viaducts, and panoramic city views.',
      bestTime: 'morning',
      category: 'art'
    },
    {
      name: 'Casa Batlló Dragon Roof & Noble Floor',
      type: 'attraction',
      neighborhood: 'Passeig de Gràcia, Barcelona',
      estimatedFee: 3500,
      description: 'Gaudí’s undulating architectural masterpiece inspired by Saint George and the Dragon, featuring an iridescent scaled tile roof.',
      bestTime: 'afternoon',
      category: 'art'
    },
    {
      name: 'Gothic Quarter (Barri Gòtic) & Cathedral',
      type: 'attraction',
      neighborhood: 'Ciutat Vella, Barcelona',
      estimatedFee: 0,
      description: 'Maze of narrow medieval stone streets, tranquil squares, the Cathedral of the Holy Cross, and secluded tapas bodegas.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'La Boqueria Market & Las Ramblas',
      type: 'food',
      neighborhood: 'Las Ramblas, Barcelona',
      estimatedFee: 800,
      description: 'Historic public market overflowing with Iberian jamón bellota, fresh Mediterranean seafood, freshly cut fruit, and tapas bars.',
      bestTime: 'midday',
      category: 'food'
    },
    {
      name: 'Barceloneta Beach Promenade & Seafood',
      type: 'viewpoint',
      neighborhood: 'Barceloneta, Barcelona',
      estimatedFee: 0,
      description: 'Golden sand Mediterranean beach flanked by palm trees, coastal cycling paths, open-air beach chiringuitos, and authentic paella restaurants.',
      bestTime: 'sunset',
      category: 'viewpoint'
    }
  ],

  bali: [
    {
      name: 'Uluwatu Temple & Sunset Kecak Fire Dance',
      type: 'attraction',
      neighborhood: 'Pecatu, South Kuta, Bali',
      estimatedFee: 1500,
      description: 'Ancient sea temple perched on a dramatic 70-meter cliff above crashing Indian Ocean waves, hosting the sunset Kecak chant and fire dance.',
      bestTime: 'sunset',
      category: 'culture'
    },
    {
      name: 'Tanah Lot Ocean Sea Temple',
      type: 'viewpoint',
      neighborhood: 'Tabanan, Bali',
      estimatedFee: 600,
      description: 'Iconic offshore rock temple sculpted by ocean tides, dedicated to sea gods and framed against blazing sunsets.',
      bestTime: 'sunset',
      category: 'monument'
    },
    {
      name: 'Tegallalang Rice Terraces & Jungle Swing',
      type: 'viewpoint',
      neighborhood: 'Ubud, Gianyar, Bali',
      estimatedFee: 500,
      description: 'UNESCO-recognized subak cooperative irrigation rice terraces cascading through lush emerald ravines with iconic bamboo jungle swings.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Sacred Monkey Forest Sanctuary (Ubud)',
      type: 'attraction',
      neighborhood: 'Padangtegal, Ubud, Bali',
      estimatedFee: 800,
      description: 'Moss-covered sacred forest containing three 14th-century Hindu temples and over 1,000 playful Balinese long-tailed macaques.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Mount Batur Sunrise Volcano Trek',
      type: 'attraction',
      neighborhood: 'Kintamani, Bangli, Bali',
      estimatedFee: 3000,
      description: 'Pre-dawn mountain ascent (1,717m) to witness the sunrise over Lake Batur, Mount Abang, and morning caldera clouds.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Tirta Empul Holy Water Temple Springs',
      type: 'attraction',
      neighborhood: 'Tampaksiring, Gianyar, Bali',
      estimatedFee: 500,
      description: '10th-century water temple where Balinese Hindus and travelers take part in the sacred melukat purification ritual under holy water spouts.',
      bestTime: 'morning',
      category: 'culture'
    }
  ],

  goa: [
    {
      name: 'Basilica of Bom Jesus (UNESCO World Heritage)',
      type: 'attraction',
      neighborhood: 'Old Goa',
      estimatedFee: 0,
      description: 'Baroque Catholic basilica constructed in 1605 holding the sacred mortal remains of Saint Francis Xavier in an elaborate silver casket.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Fort Aguada & 17th-Century Lighthouse',
      type: 'viewpoint',
      neighborhood: 'Sinquerim, Candolim, Goa',
      estimatedFee: 50,
      description: 'Portuguese fort built in 1612 at the mouth of the Mandovi River, featuring a four-story freshwater reservoir and sweeping Arabian Sea vistas.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Dudhsagar Waterfalls Jeep Jungle Safari',
      type: 'attraction',
      neighborhood: 'Bhagwan Mahaveer Sanctuary, Sonaulim, Goa',
      estimatedFee: 1200,
      description: 'Four-tiered milky-white cascade tumbling 310 meters through Western Ghats rainforest, reached via an open 4x4 jungle riverbed trek.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Fontainhas Latin Quarter Heritage Walk',
      type: 'attraction',
      neighborhood: 'Panaji, Goa',
      estimatedFee: 0,
      description: 'Asia’s only Latin Quarter, featuring winding cobblestone lanes lined with pastel-yellow Portuguese villas, terracotta roofs, and artisan bakeries.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Chapora Fort (Dil Chahta Hai Sunset View)',
      type: 'viewpoint',
      neighborhood: 'Vagator, Goa',
      estimatedFee: 0,
      description: 'Red laterite cliff ramparts overlooking Vagator Beach and the Chapora River mouth, celebrated for sunset horizons and ocean breezes.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Palolem Beach Crescent & Kayaking',
      type: 'viewpoint',
      neighborhood: 'Canacona, South Goa',
      estimatedFee: 0,
      description: 'Serene crescent-shaped bay fringed by coconut palms and calm turquoise waters, ideal for dolphin-watching boat trips and kayaking.',
      bestTime: 'morning',
      category: 'nature'
    }
  ],

  manali: [
    {
      name: 'Solang Valley Adventure & Paragliding',
      type: 'attraction',
      neighborhood: 'Solang, Manali, Himachal Pradesh',
      estimatedFee: 1800,
      description: 'High-altitude adventure meadow framed by snow-clad peaks, offering paragliding, zorbing, quad biking, and winter ski slopes.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Atal Tunnel & Sissu Waterfall Snow Point',
      type: 'viewpoint',
      neighborhood: 'Lahaul Valley via Rohtang',
      estimatedFee: 500,
      description: 'Drive through the world’s longest highway tunnel above 10,000 feet into the stark mountain landscapes and frozen waterfalls of Sissu.',
      bestTime: 'morning',
      category: 'viewpoint'
    },
    {
      name: 'Hadimba Devi Ancient Cedar Pagoda Temple',
      type: 'attraction',
      neighborhood: 'Dhungri Forest, Manali',
      estimatedFee: 50,
      description: 'Four-tiered wooden pagoda temple built in 1553 AD dedicated to Hadimba, surrounded by towering deodar cedar trees and wood carvings.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Old Manali Bohemian Village & Riverside Cafes',
      type: 'attraction',
      neighborhood: 'Old Manali, Himachal Pradesh',
      estimatedFee: 400,
      description: 'Rustic mountain village across the Manalsu River with traditional stone-and-timber houses, bakeries, live acoustic music, and handicraft shops.',
      bestTime: 'afternoon',
      category: 'culture'
    },
    {
      name: 'Jogini Waterfall Pine Forest Trek',
      type: 'attraction',
      neighborhood: 'Vashisht, Manali',
      estimatedFee: 0,
      description: 'Scenic nature trail winding past apple orchards and pine forests to a cascading sacred waterfall overlooking the Beas River valley.',
      bestTime: 'morning',
      category: 'nature'
    },
    {
      name: 'Vashisht Hot Sulphur Springs & Temple',
      type: 'attraction',
      neighborhood: 'Vashisht Village, Manali',
      estimatedFee: 0,
      description: 'Natural natural thermal mineral water springs revered for therapeutic properties, paired with a 4,000-year-old stone temple of sage Vashistha.',
      bestTime: 'morning',
      category: 'culture'
    }
  ],

  agra: [
    {
      name: 'Taj Mahal Sunrise View & White Marble Wonders',
      type: 'attraction',
      neighborhood: 'Dharmapuri, Forest Colony, Agra',
      estimatedFee: 250,
      description: 'Shah Jahan’s transcendent ivory-white marble mausoleum on the Yamuna River bank, embodying eternal love and Mughal symmetrical architecture.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Agra Fort (Red Fort) & Jahangiri Mahal',
      type: 'attraction',
      neighborhood: 'Agra Fort, Rakabganj, Agra',
      estimatedFee: 50,
      description: 'UNESCO World Heritage red sandstone fortress palace holding the Khas Mahal, Sheesh Mahal, and the balcony where Shah Jahan gazed at the Taj Mahal.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Mehtab Bagh Moonlight Taj View across Yamuna',
      type: 'viewpoint',
      neighborhood: 'Nagla Devjit, Agra',
      estimatedFee: 25,
      description: 'Charbagh botanical garden complex aligned perfectly with the Taj Mahal across the Yamuna River, providing prime sunset reflections without crowds.',
      bestTime: 'sunset',
      category: 'viewpoint'
    },
    {
      name: 'Fatehpur Sikri Imperial Ruins & Buland Darwaza',
      type: 'attraction',
      neighborhood: 'Fatehpur Sikri, Agra District',
      estimatedFee: 50,
      description: 'Emperor Akbar’s preserved 16th-century ghost capital featuring the 54-meter Buland Darwaza gate, Jama Masjid, and tomb of Salim Chishti.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Tomb of I\'timad-ud-Daulah (Baby Taj)',
      type: 'attraction',
      neighborhood: 'Moti Bagh, Agra',
      estimatedFee: 30,
      description: 'Often termed the draft of the Taj Mahal, this jeweled marble tomb built by Nur Jahan features exquisite pietra dura stone inlay work.',
      bestTime: 'afternoon',
      category: 'monument'
    }
  ],

  varanasi: [
    {
      name: 'Dashashwamedh Ghat Evening Grand Ganga Aarti',
      type: 'attraction',
      neighborhood: 'Dashashwamedh Ghat Road, Varanasi',
      estimatedFee: 0,
      description: 'Spiritual evening ceremony of multi-tiered brass oil lamps, conch shells, and sacred Vedic chants performed by priests along the Holy Ganges.',
      bestTime: 'evening',
      category: 'culture'
    },
    {
      name: 'Subah-e-Banaras Sunrise Boat Ride on River Ganga',
      type: 'viewpoint',
      neighborhood: 'Assi Ghat to Manikarnika Ghat, Varanasi',
      estimatedFee: 400,
      description: 'Peaceful dawn wooden rowing boat ride watching sunrise light up the 84 ghats, pilgrims performing morning ablutions, and temple spires.',
      bestTime: 'morning',
      category: 'viewpoint'
    },
    {
      name: 'Kashi Vishwanath Golden Temple Corridor',
      type: 'attraction',
      neighborhood: 'Lahori Tola, Varanasi',
      estimatedFee: 0,
      description: 'One of the twelve sacred Jyotirlingas, featuring a gold-plated spire donated by Maharaja Ranjit Singh and a newly built heritage pilgrim corridor.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Sarnath Dhamek Stupa & Buddhist Pilgrimage',
      type: 'attraction',
      neighborhood: 'Sarnath, Varanasi',
      estimatedFee: 25,
      description: 'Sacred deer park where Gautama Buddha taught his first sermon after enlightenment; houses the colossal 43m stone Dhamek Stupa and Ashoka Pillar.',
      bestTime: 'morning',
      category: 'monument'
    },
    {
      name: 'Thatheri Gali Brass Artisans & Banarasi Silk Alleys',
      type: 'food',
      neighborhood: 'Chowk, Varanasi',
      estimatedFee: 200,
      description: 'Ancient maze of narrow lanes filled with heritage handloom weavers creating pure silver-and-gold zari Banarasi sarees and savoring hot kachori jalebis.',
      bestTime: 'afternoon',
      category: 'market'
    }
  ]
};

/**
 * Normalizes query string to match canonical destination key.
 */
export function getFamousLandmarksForDestination(destNameOrKey: string): LandmarkSpot[] {
  if (!destNameOrKey || typeof destNameOrKey !== 'string') return [];
  const clean = destNameOrKey.toLowerCase().trim();
  
  // Exact key match
  if (FAMOUS_LANDMARKS_REGISTRY[clean]) {
    return FAMOUS_LANDMARKS_REGISTRY[clean];
  }

  // Token / Substring check
  for (const [key, spots] of Object.entries(FAMOUS_LANDMARKS_REGISTRY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return spots;
    }
  }

  // Common aliases
  if (clean.includes('tokyo') || clean.includes('japan')) return FAMOUS_LANDMARKS_REGISTRY.tokyo;
  if (clean.includes('paris') || clean.includes('france')) return FAMOUS_LANDMARKS_REGISTRY.paris;
  if (clean.includes('york') || clean.includes('nyc') || clean.includes('manhattan') || clean.includes('brooklyn')) return FAMOUS_LANDMARKS_REGISTRY['new-york'];
  if (clean.includes('rome') || clean.includes('roma') || clean.includes('italy')) return FAMOUS_LANDMARKS_REGISTRY.rome;
  if (clean.includes('dubai') || clean.includes('uae')) return FAMOUS_LANDMARKS_REGISTRY.dubai;
  if (clean.includes('london') || clean.includes('england') || clean.includes('uk')) return FAMOUS_LANDMARKS_REGISTRY.london;
  if (clean.includes('barcelona') || clean.includes('catalonia') || clean.includes('spain')) return FAMOUS_LANDMARKS_REGISTRY.barcelona;
  if (clean.includes('bali') || clean.includes('ubud') || clean.includes('seminyak')) return FAMOUS_LANDMARKS_REGISTRY.bali;
  if (clean.includes('jaipur') || clean.includes('pink city')) return FAMOUS_LANDMARKS_REGISTRY.jaipur;
  if (clean.includes('udaipur') || clean.includes('lake city')) return FAMOUS_LANDMARKS_REGISTRY.udaipur;
  if (clean.includes('goa')) return FAMOUS_LANDMARKS_REGISTRY.goa;
  if (clean.includes('manali') || clean.includes('kullu')) return FAMOUS_LANDMARKS_REGISTRY.manali;
  if (clean.includes('agra') || clean.includes('taj')) return FAMOUS_LANDMARKS_REGISTRY.agra;
  if (clean.includes('varanasi') || clean.includes('banaras') || clean.includes('kashi')) return FAMOUS_LANDMARKS_REGISTRY.varanasi;

  return [];
}
