import * as THREE from 'three';

export interface LandmarkMetadata {
  id: string;
  landmarkName: string;
  destination: string;
  architecturalStyle: string;
  yearBuilt: string;
  heightOrSize: string;
  curatorInsight: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  defaultTimeOfDay?: 'day' | 'golden' | 'night';
}

export interface GenuineEncyclopediaData {
  title: string;
  description?: string;
  extract: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  thumbnail?: string;
  originalImage?: string;
  wikipediaUrl?: string;
  wikibaseItem?: string;
  source: string;
}

export interface Google3DVirtualViewUrls {
  googleEarth3DUrl: string;
  googleStreetView360Url: string;
  googleSatelliteEmbedUrl: string;
  googleMapsUrl: string;
}

/**
 * Live factual encyclopedia query to Wikimedia / Wikipedia REST API.
 * 100% genuine data for ANY destination, landmark, city, or site on Earth (zero mock data).
 */
export async function fetchLiveDestinationEncyclopedia(
  destination: string,
  landmark?: string
): Promise<GenuineEncyclopediaData | null> {
  const cleanLandmark = (landmark || '').trim();
  const cleanDest = (destination || '').trim();
  
  // Try landmark first, then destination
  const queriesToTry = [
    cleanLandmark,
    cleanDest,
    `${cleanDest} ${cleanLandmark}`.trim()
  ].filter(q => q && q.length > 1);

  for (const q of queriesToTry) {
    try {
      const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/\s+/g, '_'))}`;
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.type !== 'disambiguation' && (data.extract || data.description)) {
          return {
            title: data.title || q,
            description: data.description,
            extract: data.extract || data.description || '',
            coordinates: data.coordinates ? { lat: data.coordinates.lat, lon: data.coordinates.lon } : undefined,
            thumbnail: data.thumbnail?.source,
            originalImage: data.originalimage?.source,
            wikipediaUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title || q)}`,
            wikibaseItem: data.wikibase_item,
            source: 'Wikimedia Foundation & Wikipedia REST API'
          };
        }
      }
    } catch {
      // Continue to next query candidate
    }
  }

  return null;
}

/**
 * Builds direct Google Earth 3D, Google Street View 360°, and Google 3D Satellite URLs
 * for ANY destination or coordinate on Earth.
 */
export function getGoogle3DVirtualViewUrls(
  destination: string,
  landmark?: string,
  coordinates?: { lat: number; lon: number }
): Google3DVirtualViewUrls {
  const query = [landmark, destination].filter(Boolean).join(', ') || destination;
  const encodedQuery = encodeURIComponent(query);

  const googleEarth3DUrl = `https://earth.google.com/web/search/${encodedQuery}`;
  
  const googleStreetView360Url = coordinates
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordinates.lat},${coordinates.lon}`
    : `https://www.google.com/maps/search/${encodeURIComponent(query + ' street view')}`;

  const googleSatelliteEmbedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;
  
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return {
    googleEarth3DUrl,
    googleStreetView360Url,
    googleSatelliteEmbedUrl,
    googleMapsUrl
  };
}

/**
 * Resolves destination & landmark names to a bespoke procedural 3D architectural profile
 */
export function resolveLandmarkDetails(destinationName: string = '', landmarkName: string = ''): LandmarkMetadata {
  const norm = `${destinationName} ${landmarkName}`.toLowerCase();

  // 1. Paris - Eiffel Tower
  if (norm.includes('eiffel') || (norm.includes('paris') && !norm.includes('louvre'))) {
    return {
      id: 'paris-eiffel',
      landmarkName: 'Eiffel Tower',
      destination: 'Paris, France',
      architecturalStyle: 'Puddle Iron Lattice Spire',
      yearBuilt: '1889',
      heightOrSize: '330 meters (1,083 ft)',
      curatorInsight: 'Constructed as the centerpiece of the 1889 World\'s Fair, its aerodynamic lattice arches withstand extreme wind shear with minimal mass.',
      cameraPosition: [0, 4.5, 9.5],
      cameraTarget: [0, 3.2, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 2. Paris - Louvre Pyramid
  if (norm.includes('louvre') || norm.includes('pyramid')) {
    return {
      id: 'paris-louvre',
      landmarkName: 'Louvre Pyramid',
      destination: 'Paris, France',
      architecturalStyle: 'High-Tech Glass & Steel Pyramid',
      yearBuilt: '1989',
      heightOrSize: '21.6 meters (71 ft)',
      curatorInsight: 'Designed by I.M. Pei with 673 glass diamond and triangular segments, reflecting the neoclassical Cour Napoléon palace facade.',
      cameraPosition: [0, 3.0, 7.5],
      cameraTarget: [0, 1.2, 0],
      defaultTimeOfDay: 'night'
    };
  }

  // 3. Tokyo - Senso-ji & Japanese Pagoda
  if (norm.includes('tokyo') || norm.includes('senso') || norm.includes('pagoda') || norm.includes('asakusa') || norm.includes('shibuya')) {
    return {
      id: 'tokyo-pagoda',
      landmarkName: 'Sensō-ji Five-Tier Pagoda',
      destination: 'Tokyo, Japan',
      architecturalStyle: 'Traditional Japanese Wood Timber Pagoda',
      yearBuilt: '645 AD (Rebuilt 1973)',
      heightOrSize: '53.3 meters (175 ft)',
      curatorInsight: 'Features interlocking seismic-resistant wooden joints (shinbashira central pillar) and sweeping curved eaves adorned with brass ornaments.',
      cameraPosition: [0, 3.8, 8.5],
      cameraTarget: [0, 2.5, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 4. Rome - Colosseum
  if (norm.includes('rome') || norm.includes('colosseum') || norm.includes('coliseo') || norm.includes('forum')) {
    return {
      id: 'rome-colosseum',
      landmarkName: 'The Colosseum',
      destination: 'Rome, Italy',
      architecturalStyle: 'Flavian Classical Amphitheater',
      yearBuilt: '80 AD',
      heightOrSize: '48 meters (157 ft)',
      curatorInsight: 'The largest ancient amphitheater ever built, engineered from travertine limestone, tuff stone, and brick-faced concrete with 80 arched entrances.',
      cameraPosition: [0, 4.0, 8.0],
      cameraTarget: [0, 1.5, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 5. New York City - Empire State Building & Skyline
  if (norm.includes('new york') || norm.includes('empire') || norm.includes('manhattan') || norm.includes('broadway')) {
    return {
      id: 'newyork-empire',
      landmarkName: 'Empire State Building',
      destination: 'New York, USA',
      architecturalStyle: 'Art Deco Stepped Skyscraper',
      yearBuilt: '1931',
      heightOrSize: '381 meters (1,250 ft, 443m to tip)',
      curatorInsight: 'Icon of American Art Deco featuring symmetrical geometric setbacks, Indiana limestone piers, and a mooring mast engineered originally for airships.',
      cameraPosition: [0, 4.5, 9.0],
      cameraTarget: [0, 3.5, 0],
      defaultTimeOfDay: 'night'
    };
  }

  // 6. Dubai - Burj Khalifa
  if (norm.includes('dubai') || norm.includes('khalifa') || norm.includes('burj')) {
    return {
      id: 'dubai-burj-khalifa',
      landmarkName: 'Burj Khalifa',
      destination: 'Dubai, UAE',
      architecturalStyle: 'Neo-Futuristic Tri-Axial Tower',
      yearBuilt: '2010',
      heightOrSize: '828 meters (2,717 ft)',
      curatorInsight: 'Inspired by the desert flower Hymenocallis, its Y-shaped tri-petal footprint and 26 spiraling setbacks reduce wind vortex shedding at extreme heights.',
      cameraPosition: [0, 5.0, 9.5],
      cameraTarget: [0, 4.0, 0],
      defaultTimeOfDay: 'night'
    };
  }

  // 7. Sydney - Sydney Opera House
  if (norm.includes('sydney') || norm.includes('opera') || norm.includes('harbour')) {
    return {
      id: 'sydney-opera',
      landmarkName: 'Sydney Opera House',
      destination: 'Sydney, Australia',
      architecturalStyle: 'Expressionist Vaulted Sail Architecture',
      yearBuilt: '1973',
      heightOrSize: '65 meters (213 ft)',
      curatorInsight: 'Jørn Utzon\'s masterpiece of precast concrete shell segments derived from the surface of a single sphere, clad in over 1 million self-cleaning ceramic tiles.',
      cameraPosition: [0, 3.5, 8.5],
      cameraTarget: [0, 1.5, 0],
      defaultTimeOfDay: 'day'
    };
  }

  // 8. Singapore - Marina Bay Sands
  if (norm.includes('singapore') || norm.includes('marina bay') || norm.includes('sands')) {
    return {
      id: 'singapore-mbs',
      landmarkName: 'Marina Bay Sands & SkyPark',
      destination: 'Singapore',
      architecturalStyle: 'Parametric Integrated Resort & Cantilever',
      yearBuilt: '2010',
      heightOrSize: '200 meters (656 ft, 340m SkyPark)',
      curatorInsight: 'Moshe Safdie designed three gently curving 55-story hotel towers spanned by a 1.2-hectare SkyPark cantilevered 66 meters over the edge.',
      cameraPosition: [0, 4.0, 9.0],
      cameraTarget: [0, 2.5, 0],
      defaultTimeOfDay: 'night'
    };
  }

  // 9. London - Big Ben (Elizabeth Tower)
  if (norm.includes('london') || norm.includes('big ben') || norm.includes('westminster')) {
    return {
      id: 'london-big-ben',
      landmarkName: 'Elizabeth Tower (Big Ben)',
      destination: 'London, UK',
      architecturalStyle: 'Victorian Gothic Revival Belfry',
      yearBuilt: '1859',
      heightOrSize: '96 meters (316 ft)',
      curatorInsight: 'Augustus Pugin\'s Gothic masterwork with 4 massive 7-meter clock dials illuminated by opal glass, housing the famous 13.7-ton Great Bell.',
      cameraPosition: [0, 4.2, 9.0],
      cameraTarget: [0, 3.0, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 10. Barcelona - Sagrada Família
  if (norm.includes('barcelona') || norm.includes('sagrada') || norm.includes('gaudi')) {
    return {
      id: 'barcelona-sagrada',
      landmarkName: 'Basílica de la Sagrada Família',
      destination: 'Barcelona, Spain',
      architecturalStyle: 'Catalan Modernisme & Gothic Naturalism',
      yearBuilt: '1882 - Present',
      heightOrSize: '172.5 meters (566 ft)',
      curatorInsight: 'Antoni Gaudí combined hyperbolic paraboloid vaults, tree-like stone column branches, and Venetian glass mosaic finials representing biblical fruit & wheat.',
      cameraPosition: [0, 4.5, 9.0],
      cameraTarget: [0, 3.0, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 11. Santorini - Cycladic Blue Dome Caldera
  if (norm.includes('santorini') || norm.includes('oia') || norm.includes('caldera') || norm.includes('greece')) {
    return {
      id: 'santorini-caldera',
      landmarkName: 'Oia Blue Dome Church & Caldera',
      destination: 'Santorini, Greece',
      architecturalStyle: 'Cycladic Whitewashed Cubism',
      yearBuilt: '18th Century',
      heightOrSize: 'Cascading volcanic cliffside village',
      curatorInsight: 'Iconic cubist white volcanic lime dwellings with cobalt blue hemispherical domes and three-bell belfry arches overlooking the sunken Aegean caldera.',
      cameraPosition: [0, 3.5, 8.0],
      cameraTarget: [0, 1.8, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 12. Bangkok - Wat Arun
  if (norm.includes('bangkok') || norm.includes('wat arun') || norm.includes('temple of dawn') || norm.includes('thailand')) {
    return {
      id: 'bangkok-wat-arun',
      landmarkName: 'Wat Arun (Temple of Dawn)',
      destination: 'Bangkok, Thailand',
      architecturalStyle: 'Rattanakosin Khmer-Style Prang',
      yearBuilt: '17th Century',
      heightOrSize: '82 meters (269 ft)',
      curatorInsight: 'Encrusted with thousands of pieces of Chinese glazed porcelain and seashells that glisten in morning dawn light, crowned by a golden Shiva trident.',
      cameraPosition: [0, 4.0, 8.5],
      cameraTarget: [0, 2.5, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 13. Swiss Alps - Matterhorn
  if (norm.includes('swiss') || norm.includes('alps') || norm.includes('matterhorn') || norm.includes('zermatt')) {
    return {
      id: 'swiss-matterhorn',
      landmarkName: 'The Matterhorn & Alpine Chalet',
      destination: 'Zermatt, Switzerland',
      architecturalStyle: 'Pyramidal Glacial Alpine Peak',
      yearBuilt: 'Natural Wonder (Alpine Chalet c. 1850)',
      heightOrSize: '4,478 meters (14,692 ft)',
      curatorInsight: 'One of the deadliest and most iconic peaks in the world, sculpted by cirque glaciers into a four-faced chisel horn flanked by wooden larch chalets.',
      cameraPosition: [0, 3.8, 8.5],
      cameraTarget: [0, 2.0, 0],
      defaultTimeOfDay: 'day'
    };
  }

  // 14. Agra - Taj Mahal
  if (norm.includes('agra') || norm.includes('taj') || norm.includes('mahal')) {
    return {
      id: 'agra-taj-mahal',
      landmarkName: 'The Taj Mahal',
      destination: 'Agra, India',
      architecturalStyle: 'Mughal Symmetrical White Marble',
      yearBuilt: '1648',
      heightOrSize: '73 meters (240 ft)',
      curatorInsight: 'Emperor Shah Jahan\'s monument of love, crafted from translucent Makrana marble with intricate pietra dura gemstone inlays and 4 tilted minarets.',
      cameraPosition: [0, 3.6, 8.5],
      cameraTarget: [0, 2.0, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 15. Jaipur - Hawa Mahal
  if (norm.includes('jaipur') || norm.includes('hawa') || norm.includes('amer')) {
    return {
      id: 'jaipur-hawa-mahal',
      landmarkName: 'Hawa Mahal (Palace of Winds)',
      destination: 'Jaipur, India',
      architecturalStyle: 'Rajput-Mughal Honeycomb Pink Sandstone',
      yearBuilt: '1799',
      heightOrSize: '15 meters (50 ft, 5 stories)',
      curatorInsight: 'Built by Maharaja Sawai Pratap Singh with 953 delicate carved jharokha balconies designed like Lord Krishna\'s crown to circulate cooling desert breezes.',
      cameraPosition: [0, 3.5, 8.0],
      cameraTarget: [0, 2.0, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 16. Amritsar - Golden Temple
  if (norm.includes('amritsar') || norm.includes('golden temple') || norm.includes('harmandir')) {
    return {
      id: 'amritsar-golden-temple',
      landmarkName: 'Harmandir Sahib (The Golden Temple)',
      destination: 'Amritsar, India',
      architecturalStyle: 'Sikh Sacred Gilded Architecture',
      yearBuilt: '1589 (Gold Foil added 1830)',
      heightOrSize: 'Two-story sanctum in 500ft Amrit Sarovar',
      curatorInsight: 'Adorned with 500kg of pure gold leaf foil, seated in the center of the sacred nectar pool with four open entrances welcoming all humanity.',
      cameraPosition: [0, 3.5, 8.0],
      cameraTarget: [0, 1.8, 0],
      defaultTimeOfDay: 'night'
    };
  }

  // 17. Varanasi - Ganga Ghats
  if (norm.includes('varanasi') || norm.includes('ghat') || norm.includes('kashi') || norm.includes('ganga')) {
    return {
      id: 'varanasi-ghats',
      landmarkName: 'Varanasi Ghats & Shikhara Temples',
      destination: 'Varanasi, India',
      architecturalStyle: 'Ancient Riverbank Stepped Stone Architecture',
      yearBuilt: 'c. 11th - 18th Century',
      heightOrSize: '84 riverfront stone ghats along the Ganges',
      curatorInsight: 'One of the oldest continuously inhabited cities on Earth, where monumental stone staircases descend to holy river waters flanked by sandstone spires.',
      cameraPosition: [0, 3.5, 8.0],
      cameraTarget: [0, 1.6, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 18. Tropical Beaches (Goa, Bali, Maldives, Andaman, Kerala)
  if (norm.includes('goa') || norm.includes('bali') || norm.includes('beach') || norm.includes('andaman') || norm.includes('kerala')) {
    return {
      id: 'tropical-beach',
      landmarkName: 'Tropical Island Villa & Palms',
      destination: destinationName || 'Tropical Paradise',
      architecturalStyle: 'Vernacular Island Bamboo & Thatch',
      yearBuilt: 'Traditional Coastal Architecture',
      heightOrSize: 'Coastal Lagoon with Overwater Gazebo',
      curatorInsight: 'Gentle ocean waves rolling over white coral sand with wind-swept coconut palms and an open thatched cabana oriented for panoramic ocean sunsets.',
      cameraPosition: [0, 3.2, 8.0],
      cameraTarget: [0, 1.5, 0],
      defaultTimeOfDay: 'golden'
    };
  }

  // 19. Mountains & Alpine Valleys (Manali, Kashmir, Shimla, Spiti, Ladakh)
  if (norm.includes('manali') || norm.includes('kashmir') || norm.includes('shimla') || norm.includes('spiti') || norm.includes('ladakh') || norm.includes('sikkim')) {
    return {
      id: 'alpine-valley',
      landmarkName: 'Himalayan Ridge & Stone Monastery',
      destination: destinationName || 'Himalayan Mountains',
      architecturalStyle: 'Kath-Kuni Timber & Stone Mountain Citadel',
      yearBuilt: 'Traditional Himalayan Architecture',
      heightOrSize: 'Elevation 2,000m - 4,500m peaks',
      curatorInsight: 'Steep interlocking cedar wood and schist stone architecture engineered to flex during seismic events and shed deep winter mountain snowfall.',
      cameraPosition: [0, 3.8, 8.5],
      cameraTarget: [0, 2.0, 0],
      defaultTimeOfDay: 'day'
    };
  }

  // 20. Default Heritage Pavilion fallback
  return {
    id: 'heritage-pavilion',
    landmarkName: landmarkName || 'Heritage Monument',
    destination: destinationName || 'Historic Explorer Destination',
    architecturalStyle: 'Classical Monumental Architecture',
    yearBuilt: 'Historic Era',
    heightOrSize: 'Monumental Plaza Structure',
    curatorInsight: 'Features classical symmetry, load-bearing carved pillars, and an elevated pedestal designed for communal ceremonies and panoramic vistas.',
    cameraPosition: [0, 4.0, 9.0],
    cameraTarget: [0, 2.0, 0],
    defaultTimeOfDay: 'golden'
  };
}

/**
 * Procedural 3D Geometry Builders for Three.js
 */

// 1. Eiffel Tower
function buildEiffelTower(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.8 });
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  materials.push(ironMat, platformMat, beaconMat);

  // 4 Arch Base Legs
  const legGeo = new THREE.CylinderGeometry(0.2, 0.45, 2.2, 6);
  const legOffsets = [
    [-1.2, -1.2, 0.18, -0.18],
    [1.2, -1.2, -0.18, -0.18],
    [-1.2, 1.2, 0.18, 0.18],
    [1.2, 1.2, -0.18, 0.18]
  ];
  legOffsets.forEach(([lx, lz, rx, rz]) => {
    const leg = new THREE.Mesh(legGeo, ironMat);
    leg.position.set(lx, 1.0, lz);
    leg.rotation.z = rx;
    leg.rotation.x = rz;
    leg.castShadow = true;
    rootGroup.add(leg);
  });

  // Base Arches
  const archRingGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 24, Math.PI);
  const arch1 = new THREE.Mesh(archRingGeo, ironMat);
  arch1.position.set(0, 0.8, -1.2);
  rootGroup.add(arch1);
  const arch2 = new THREE.Mesh(archRingGeo, ironMat);
  arch2.position.set(0, 0.8, 1.2);
  rootGroup.add(arch2);

  // Platform 1 (First Floor)
  const plat1Geo = new THREE.BoxGeometry(2.5, 0.25, 2.5);
  const plat1 = new THREE.Mesh(plat1Geo, platformMat);
  plat1.position.y = 2.1;
  plat1.castShadow = true;
  rootGroup.add(plat1);

  // Middle Tier Shaft
  const midTierGeo = new THREE.CylinderGeometry(0.7, 1.05, 1.8, 4);
  const midTier = new THREE.Mesh(midTierGeo, ironMat);
  midTier.position.y = 3.1;
  midTier.rotation.y = Math.PI / 4;
  midTier.castShadow = true;
  rootGroup.add(midTier);

  // Platform 2 (Second Floor)
  const plat2Geo = new THREE.BoxGeometry(1.6, 0.2, 1.6);
  const plat2 = new THREE.Mesh(plat2Geo, platformMat);
  plat2.position.y = 4.1;
  plat2.castShadow = true;
  rootGroup.add(plat2);

  // Upper Spire Tower
  const upperSpireGeo = new THREE.CylinderGeometry(0.12, 0.65, 3.2, 4);
  const upperSpire = new THREE.Mesh(upperSpireGeo, ironMat);
  upperSpire.position.y = 5.8;
  upperSpire.rotation.y = Math.PI / 4;
  upperSpire.castShadow = true;
  rootGroup.add(upperSpire);

  // Crowning Dome & Needle Spire
  const domeGeo = new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, ironMat);
  dome.position.y = 7.4;
  rootGroup.add(dome);

  const needleGeo = new THREE.CylinderGeometry(0.015, 0.05, 1.2, 6);
  const needle = new THREE.Mesh(needleGeo, beaconMat);
  needle.position.y = 8.1;
  rootGroup.add(needle);
}

// 2. Louvre Pyramid
function buildLouvrePyramid(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.65
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.9 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.6 });
  materials.push(glassMat, frameMat, waterMat);

  // Surrounding water basin
  const basinGeo = new THREE.CylinderGeometry(3.8, 3.8, 0.15, 32);
  const basin = new THREE.Mesh(basinGeo, waterMat);
  basin.position.y = 0.08;
  basin.receiveShadow = true;
  rootGroup.add(basin);

  // Main Glass Pyramid
  const pyramidGeo = new THREE.ConeGeometry(2.8, 2.6, 4);
  const pyramid = new THREE.Mesh(pyramidGeo, glassMat);
  pyramid.position.y = 1.38;
  pyramid.rotation.y = Math.PI / 4;
  pyramid.castShadow = true;
  rootGroup.add(pyramid);

  // Pyramid Grid Skeleton frame
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, wireframe: true });
  materials.push(wireMat);
  const wireframePyramid = new THREE.Mesh(pyramidGeo, wireMat);
  wireframePyramid.position.y = 1.38;
  wireframePyramid.rotation.y = Math.PI / 4;
  rootGroup.add(wireframePyramid);

  // 3 Mini Satellites
  const miniGeo = new THREE.ConeGeometry(0.65, 0.6, 4);
  const miniPositions = [
    [-2.2, 1.2],
    [2.2, 1.2],
    [0, -2.4]
  ];
  miniPositions.forEach(([mx, mz]) => {
    const mini = new THREE.Mesh(miniGeo, glassMat);
    mini.position.set(mx, 0.38, mz);
    mini.rotation.y = Math.PI / 4;
    rootGroup.add(mini);
  });
}

// 3. Japanese Pagoda (Tokyo Sensō-ji)
function buildJapanesePagoda(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const vermillionMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  materials.push(vermillionMat, roofMat, goldMat, woodMat);

  // Stone Foundation
  const baseGeo = new THREE.BoxGeometry(3.0, 0.4, 3.0);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  materials.push(baseMat);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.2;
  base.receiveShadow = true;
  rootGroup.add(base);

  // 5 Pagoda Tiers
  const tierHeights = [0.8, 1.8, 2.7, 3.5, 4.2];
  const bodySizes = [1.8, 1.5, 1.25, 1.0, 0.8];
  const roofSizes = [2.6, 2.2, 1.85, 1.5, 1.2];

  for (let i = 0; i < 5; i++) {
    const y = tierHeights[i];
    // Vermillion Tier Core
    const bodyGeo = new THREE.BoxGeometry(bodySizes[i], 0.6, bodySizes[i]);
    const body = new THREE.Mesh(bodyGeo, vermillionMat);
    body.position.y = y;
    body.castShadow = true;
    rootGroup.add(body);

    // Flared Curved Roof Eaves
    const roofGeo = new THREE.ConeGeometry(roofSizes[i], 0.4, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = y + 0.45;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    rootGroup.add(roof);
  }

  // Golden Brass Sorin Spire
  const sorinGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.6, 8);
  const sorin = new THREE.Mesh(sorinGeo, goldMat);
  sorin.position.y = 5.5;
  rootGroup.add(sorin);

  // 9 Sacred Rings on Sorin
  const ringGeo = new THREE.TorusGeometry(0.18, 0.03, 6, 16);
  for (let r = 0; r < 5; r++) {
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 4.9 + r * 0.16;
    rootGroup.add(ring);
  }

  // Torii Gate in Front
  const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8);
  const p1 = new THREE.Mesh(pillarGeo, vermillionMat);
  p1.position.set(-1.2, 0.7, 2.2);
  rootGroup.add(p1);
  const p2 = new THREE.Mesh(pillarGeo, vermillionMat);
  p2.position.set(1.2, 0.7, 2.2);
  rootGroup.add(p2);

  const lintelGeo = new THREE.BoxGeometry(2.8, 0.16, 0.2);
  const lintel = new THREE.Mesh(lintelGeo, vermillionMat);
  lintel.position.set(0, 1.4, 2.2);
  rootGroup.add(lintel);
}

// 4. Rome Colosseum
function buildColosseum(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const travertineMat = new THREE.MeshStandardMaterial({ color: 0xd6c5a0, roughness: 0.8 });
  const innerArenaMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
  materials.push(travertineMat, innerArenaMat);

  // Outer Elliptical Wall Tiers
  const outerTier1 = new THREE.CylinderGeometry(2.8, 2.9, 1.0, 32, 1, true, 0, Math.PI * 1.6);
  const wall1 = new THREE.Mesh(outerTier1, travertineMat);
  wall1.position.y = 0.5;
  wall1.castShadow = true;
  rootGroup.add(wall1);

  const outerTier2 = new THREE.CylinderGeometry(2.65, 2.75, 1.0, 32, 1, true, 0, Math.PI * 1.5);
  const wall2 = new THREE.Mesh(outerTier2, travertineMat);
  wall2.position.y = 1.4;
  wall2.castShadow = true;
  rootGroup.add(wall2);

  const outerTier3 = new THREE.CylinderGeometry(2.5, 2.6, 1.0, 32, 1, true, 0, Math.PI * 1.35);
  const wall3 = new THREE.Mesh(outerTier3, travertineMat);
  wall3.position.y = 2.3;
  wall3.castShadow = true;
  rootGroup.add(wall3);

  // Inner Arena Floor
  const arenaGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.2, 24);
  const arena = new THREE.Mesh(arenaGeo, innerArenaMat);
  arena.position.y = 0.1;
  arena.receiveShadow = true;
  rootGroup.add(arena);

  // Hypogeum Labyrinth Walls
  const hypoWallGeo = new THREE.BoxGeometry(0.1, 0.4, 1.8);
  for (let w = -2; w <= 2; w++) {
    const hw = new THREE.Mesh(hypoWallGeo, travertineMat);
    hw.position.set(w * 0.35, 0.3, 0);
    rootGroup.add(hw);
  }

  // Row of Arch Colonnade accent rings
  const rimRingGeo = new THREE.RingGeometry(2.5, 2.8, 32);
  const rimRing = new THREE.Mesh(rimRingGeo, travertineMat);
  rimRing.rotation.x = -Math.PI / 2;
  rimRing.position.y = 2.82;
  rootGroup.add(rimRing);
}

// 5. New York - Empire State Building
function buildEmpireStateBuilding(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const limestoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6, metalness: 0.3 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  materials.push(limestoneMat, mullionMat, beaconMat);

  // Tier 1 Base Podium
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 2.0), limestoneMat);
  b1.position.y = 0.6;
  b1.castShadow = true;
  rootGroup.add(b1);

  // Tier 2 Mid Tower Setback
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 1.5), limestoneMat);
  b2.position.y = 1.95;
  b2.castShadow = true;
  rootGroup.add(b2);

  // Tier 3 Main Soaring Tower
  const b3 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 1.1), limestoneMat);
  b3.position.y = 4.1;
  b3.castShadow = true;
  rootGroup.add(b3);

  // Vertical Art Deco Mullion glass strip
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.7, 1.12), mullionMat);
  mullion.position.y = 4.1;
  rootGroup.add(mullion);

  // Tier 4 Crown & Mooring Mast
  const crownGeo = new THREE.CylinderGeometry(0.4, 0.65, 0.8, 16);
  const crown = new THREE.Mesh(crownGeo, limestoneMat);
  crown.position.y = 5.9;
  rootGroup.add(crown);

  const mastGeo = new THREE.CylinderGeometry(0.12, 0.28, 1.2, 16);
  const mast = new THREE.Mesh(mastGeo, limestoneMat);
  mast.position.y = 6.8;
  rootGroup.add(mast);

  // Stainless Steel Antenna Needle with flashing beacon
  const needleGeo = new THREE.CylinderGeometry(0.02, 0.06, 1.5, 8);
  const needle = new THREE.Mesh(needleGeo, beaconMat);
  needle.position.y = 8.1;
  rootGroup.add(needle);
}

// 6. Dubai - Burj Khalifa
function buildBurjKhalifa(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.95 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });
  materials.push(glassMat, steelMat);

  // Y-Shaped Stepped Wings Ascending
  const tiers = [
    { rTop: 1.4, rBot: 1.8, h: 1.4, y: 0.7 },
    { rTop: 1.1, rBot: 1.4, h: 1.4, y: 2.1 },
    { rTop: 0.8, rBot: 1.1, h: 1.4, y: 3.5 },
    { rTop: 0.55, rBot: 0.8, h: 1.4, y: 4.9 },
    { rTop: 0.35, rBot: 0.55, h: 1.4, y: 6.3 },
    { rTop: 0.15, rBot: 0.35, h: 1.4, y: 7.7 }
  ];

  tiers.forEach((t, idx) => {
    const geo = new THREE.CylinderGeometry(t.rTop, t.rBot, t.h, 6);
    const mesh = new THREE.Mesh(geo, glassMat);
    mesh.position.y = t.y;
    mesh.rotation.y = (idx * Math.PI) / 6;
    mesh.castShadow = true;
    rootGroup.add(mesh);
  });

  // Soaring Needle Spire
  const spireGeo = new THREE.CylinderGeometry(0.015, 0.12, 1.8, 8);
  const spire = new THREE.Mesh(spireGeo, steelMat);
  spire.position.y = 9.3;
  rootGroup.add(spire);
}

// 7. Sydney Opera House
function buildSydneyOperaHouse(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const concourseMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.7 });
  materials.push(concourseMat, shellMat, waterMat);

  // Water Platform
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.15, 32), waterMat);
  water.position.y = 0.08;
  water.receiveShadow = true;
  rootGroup.add(water);

  // Granite Concourse Podium
  const concourse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 2.4), concourseMat);
  concourse.position.y = 0.35;
  concourse.castShadow = true;
  concourse.receiveShadow = true;
  rootGroup.add(concourse);

  // Sail Shell Clusters
  const shellConfigs = [
    { scale: [1.2, 1.8, 0.8], pos: [-0.8, 1.2, 0], rotZ: 0.2 },
    { scale: [1.0, 1.5, 0.7], pos: [0.1, 1.05, 0], rotZ: 0.1 },
    { scale: [0.75, 1.15, 0.6], pos: [0.85, 0.85, 0], rotZ: 0.05 },
    // Secondary hall
    { scale: [0.9, 1.35, 0.65], pos: [-0.6, 1.0, 0.7], rotZ: 0.15 },
    { scale: [0.7, 1.05, 0.55], pos: [0.15, 0.85, 0.7], rotZ: 0.08 }
  ];

  shellConfigs.forEach(({ scale, pos, rotZ }) => {
    // Sphere segment rotated & scaled to form iconic peaked sail shell
    const shellGeo = new THREE.SphereGeometry(1.0, 20, 16, 0, Math.PI, 0, Math.PI / 2);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.scale.set(scale[0], scale[1], scale[2]);
    shell.position.set(pos[0], pos[1], pos[2]);
    shell.rotation.z = -rotZ;
    shell.rotation.y = -Math.PI / 2;
    shell.castShadow = true;
    rootGroup.add(shell);
  });
}

// 8. Singapore Marina Bay Sands
function buildMarinaBaySands(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.85 });
  const skyParkMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.4 });
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.8 });
  materials.push(glassMat, skyParkMat, poolMat);

  // Three Curved Hotel Towers
  const towerPositions = [-1.3, 0, 1.3];
  towerPositions.forEach((tx) => {
    const towerGeo = new THREE.BoxGeometry(0.75, 3.8, 0.9);
    const tower = new THREE.Mesh(towerGeo, glassMat);
    tower.position.set(tx, 1.9, 0);
    tower.castShadow = true;
    rootGroup.add(tower);
  });

  // Iconic Cantilevered SkyPark Ship Terrace
  const parkGeo = new THREE.BoxGeometry(4.6, 0.35, 1.4);
  const park = new THREE.Mesh(parkGeo, skyParkMat);
  park.position.set(0.4, 3.95, 0);
  park.castShadow = true;
  rootGroup.add(park);

  // Cantilever Bow Prow
  const bowGeo = new THREE.ConeGeometry(0.7, 1.2, 4);
  const bow = new THREE.Mesh(bowGeo, skyParkMat);
  bow.rotation.z = Math.PI / 2;
  bow.position.set(2.8, 3.95, 0);
  rootGroup.add(bow);

  // Infinity Pool Water Ribbon
  const poolGeo = new THREE.BoxGeometry(2.6, 0.05, 0.4);
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.position.set(-0.2, 4.14, 0.4);
  rootGroup.add(pool);
}

// 9. London Big Ben (Elizabeth Tower)
function buildBigBen(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.7, metalness: 0.2 });
  const clockMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
  materials.push(stoneMat, clockMat, slateMat, goldMat);

  // Tower Base Shaft
  const shaftGeo = new THREE.BoxGeometry(1.6, 4.2, 1.6);
  const shaft = new THREE.Mesh(shaftGeo, stoneMat);
  shaft.position.y = 2.1;
  shaft.castShadow = true;
  rootGroup.add(shaft);

  // Clock Belfry Room
  const belfryGeo = new THREE.BoxGeometry(1.9, 1.2, 1.9);
  const belfry = new THREE.Mesh(belfryGeo, stoneMat);
  belfry.position.y = 4.8;
  belfry.castShadow = true;
  rootGroup.add(belfry);

  // 4 Illuminated Clock Faces
  const faceGeo = new THREE.CircleGeometry(0.5, 24);
  const faceOffsets = [
    [0, 4.8, 0.96, 0],
    [0, 4.8, -0.96, Math.PI],
    [0.96, 4.8, 0, Math.PI / 2],
    [-0.96, 4.8, 0, -Math.PI / 2]
  ];
  faceOffsets.forEach(([fx, fy, fz, ry]) => {
    const face = new THREE.Mesh(faceGeo, clockMat);
    face.position.set(fx, fy, fz);
    face.rotation.y = ry;
    rootGroup.add(face);
  });

  // Steep Gothic Spire
  const roofGeo = new THREE.ConeGeometry(1.35, 2.2, 4);
  const roof = new THREE.Mesh(roofGeo, slateMat);
  roof.position.y = 6.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  rootGroup.add(roof);

  // Golden Spire Pinnacle
  const pinnacleGeo = new THREE.CylinderGeometry(0.04, 0.1, 0.8, 8);
  const pinnacle = new THREE.Mesh(pinnacleGeo, goldMat);
  pinnacle.position.y = 7.7;
  rootGroup.add(pinnacle);
}

// 10. Barcelona Sagrada Família
function buildSagradaFamilia(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6c5a0, roughness: 0.7 });
  const mosaicMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.2, metalness: 0.7 });
  const goldCrossMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
  materials.push(stoneMat, mosaicMat, goldCrossMat);

  // Base Basilica nave
  const naveGeo = new THREE.BoxGeometry(2.8, 1.8, 2.0);
  const nave = new THREE.Mesh(naveGeo, stoneMat);
  nave.position.y = 0.9;
  nave.castShadow = true;
  rootGroup.add(nave);

  // 4 Organic Perforated Spires
  const towerOffsets = [
    [-0.9, -0.5, 3.8],
    [-0.3, -0.5, 4.5],
    [0.3, -0.5, 4.5],
    [0.9, -0.5, 3.8]
  ];
  towerOffsets.forEach(([tx, tz, h]) => {
    const spireGeo = new THREE.CylinderGeometry(0.18, 0.42, h, 8);
    const spire = new THREE.Mesh(spireGeo, stoneMat);
    spire.position.set(tx, 1.8 + h / 2, tz);
    spire.castShadow = true;
    rootGroup.add(spire);

    // Polychrome geometric finial crown
    const finialGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const finial = new THREE.Mesh(finialGeo, mosaicMat);
    finial.position.set(tx, 1.8 + h + 0.18, tz);
    rootGroup.add(finial);
  });

  // Central Jesus Tower (Soaring Highest)
  const jesusTowerGeo = new THREE.CylinderGeometry(0.25, 0.6, 5.4, 8);
  const jesusTower = new THREE.Mesh(jesusTowerGeo, stoneMat);
  jesusTower.position.set(0, 4.4, 0.4);
  rootGroup.add(jesusTower);

  // Four-armed Cross at peak
  const crossGeo = new THREE.BoxGeometry(0.7, 0.12, 0.12);
  const cross = new THREE.Mesh(crossGeo, goldCrossMat);
  cross.position.set(0, 7.2, 0.4);
  rootGroup.add(cross);
}

// 11. Santorini Cycladic Caldera
function buildSantoriniCaldera(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const blueDomeMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2 });
  const volcanicMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 });
  materials.push(whiteMat, blueDomeMat, volcanicMat, waterMat);

  // Aegean Water
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.15, 32), waterMat);
  water.position.y = 0.08;
  rootGroup.add(water);

  // Tiered Volcanic Cliff Base
  const cliffGeo = new THREE.CylinderGeometry(2.8, 3.6, 1.2, 12);
  const cliff = new THREE.Mesh(cliffGeo, volcanicMat);
  cliff.position.y = 0.65;
  cliff.receiveShadow = true;
  rootGroup.add(cliff);

  // Terraced Cubist White Houses
  const houseOffsets = [
    [-1.0, 1.4, -0.6, 1.2, 0.8, 1.0],
    [0.6, 1.3, -0.4, 1.4, 0.7, 1.2],
    [-0.4, 1.8, 0.4, 1.1, 0.7, 0.9],
    [0.8, 1.9, 0.5, 0.9, 0.6, 0.9]
  ];
  houseOffsets.forEach(([hx, hy, hz, sx, sy, sz]) => {
    const house = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), whiteMat);
    house.position.set(hx, hy, hz);
    house.castShadow = true;
    house.receiveShadow = true;
    rootGroup.add(house);
  });

  // Iconic Blue Dome Church
  const churchBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), whiteMat);
  churchBody.position.set(0, 2.3, -0.2);
  churchBody.castShadow = true;
  rootGroup.add(churchBody);

  const domeGeo = new THREE.SphereGeometry(0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, blueDomeMat);
  dome.position.set(0, 2.9, -0.2);
  dome.castShadow = true;
  rootGroup.add(dome);

  // Whitewashed Three-Bell Belfry Wall
  const belfryWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.15), whiteMat);
  belfryWall.position.set(-1.0, 2.6, 0.4);
  rootGroup.add(belfryWall);
}

// 12. Bangkok Wat Arun (Temple of Dawn)
function buildWatArunPrang(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const stuccoMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
  const mosaicMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.3, metalness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });
  materials.push(stuccoMat, mosaicMat, goldMat);

  // Stepped Pyramidal Base Terraces
  const tiers = [
    { s: 3.2, h: 0.4, y: 0.2 },
    { s: 2.6, h: 0.4, y: 0.6 },
    { s: 2.0, h: 0.4, y: 1.0 },
    { s: 1.5, h: 0.4, y: 1.4 }
  ];
  tiers.forEach(t => {
    const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(t.s, t.h, t.s), stuccoMat);
    tierMesh.position.y = t.y;
    tierMesh.castShadow = true;
    tierMesh.receiveShadow = true;
    rootGroup.add(tierMesh);
  });

  // Central Towering Khmer Prang Spire (Curved Corn-Cob Silhouette)
  const prangHeights = [1.9, 2.6, 3.3, 4.0, 4.6];
  const prangRadii = [0.85, 0.78, 0.65, 0.48, 0.28];
  for (let i = 0; i < 5; i++) {
    const prangSegment = new THREE.Mesh(new THREE.CylinderGeometry(prangRadii[i] * 0.85, prangRadii[i], 0.75, 12), mosaicMat);
    prangSegment.position.y = prangHeights[i];
    prangSegment.castShadow = true;
    rootGroup.add(prangSegment);
  }

  // Golden Shiva Trident (Trishula) at summit
  const trishulaGeo = new THREE.CylinderGeometry(0.03, 0.06, 0.9, 8);
  const trishula = new THREE.Mesh(trishulaGeo, goldMat);
  trishula.position.y = 5.4;
  rootGroup.add(trishula);

  // 4 Corner Satellite Chedis
  const chediPositions = [
    [-1.2, -1.2],
    [1.2, -1.2],
    [-1.2, 1.2],
    [1.2, 1.2]
  ];
  chediPositions.forEach(([cx, cz]) => {
    const chediSpire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 8), stuccoMat);
    chediSpire.position.set(cx, 1.3, cz);
    chediSpire.castShadow = true;
    rootGroup.add(chediSpire);
  });
}

// 13. Swiss Alps Matterhorn
function buildMatterhorn(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, flatShading: true });
  const chaletMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
  materials.push(graniteMat, snowMat, chaletMat, pineMat);

  // Sharp Pyramidal Alpine Horn Mountain Peak
  const mountainGeo = new THREE.ConeGeometry(3.0, 5.0, 4);
  const mountain = new THREE.Mesh(mountainGeo, graniteMat);
  mountain.position.y = 2.5;
  mountain.rotation.y = Math.PI / 4;
  mountain.castShadow = true;
  rootGroup.add(mountain);

  // Glacial Snow Cap & Ridge
  const snowCapGeo = new THREE.ConeGeometry(1.6, 2.4, 4);
  const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
  snowCap.position.y = 3.9;
  snowCap.rotation.y = Math.PI / 4;
  rootGroup.add(snowCap);

  // Alpine Wooden Chalet with pitched roof
  const chaletBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.7), chaletMat);
  chaletBody.position.set(-1.6, 0.25, 1.2);
  chaletBody.castShadow = true;
  rootGroup.add(chaletBody);

  const chaletRoof = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.45, 4), graniteMat);
  chaletRoof.position.set(-1.6, 0.65, 1.2);
  chaletRoof.rotation.y = Math.PI / 4;
  rootGroup.add(chaletRoof);

  // Pine Trees clustered at the foot
  const pineGeo = new THREE.ConeGeometry(0.35, 0.9, 5);
  const treeOffsets = [
    [-1.2, 1.8],
    [1.6, 1.4],
    [1.8, -0.6],
    [-2.2, -0.8]
  ];
  treeOffsets.forEach(([tx, tz]) => {
    const tree = new THREE.Mesh(pineGeo, pineMat);
    tree.position.set(tx, 0.45, tz);
    tree.castShadow = true;
    rootGroup.add(tree);
  });
}

// 14. Agra Taj Mahal
function buildTajMahal(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.7 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.9 });
  materials.push(marbleMat, poolMat, goldMat);

  // Elevated Marble Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 3.6), marbleMat);
  plinth.position.y = 0.2;
  plinth.receiveShadow = true;
  rootGroup.add(plinth);

  // Charbagh Water Reflecting Pool Channel
  const pool = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 1.8), poolMat);
  pool.position.set(0, 0.42, 1.1);
  rootGroup.add(pool);

  // Symmetrical Central Mausoleum Cube with cut corners (Chamfered Octagon)
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 2.0), marbleMat);
  cube.position.y = 1.2;
  cube.castShadow = true;
  rootGroup.add(cube);

  // Grand Recessed Pishtaq / Iwan Archway Portal
  const archGeo = new THREE.BoxGeometry(1.0, 1.2, 0.3);
  const arch = new THREE.Mesh(archGeo, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }));
  arch.position.set(0, 1.2, 0.95);
  rootGroup.add(arch);

  // Famous Bulbous Onion Marble Dome
  const domeGeo = new THREE.SphereGeometry(0.85, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
  const dome = new THREE.Mesh(domeGeo, marbleMat);
  dome.position.y = 2.45;
  dome.castShadow = true;
  rootGroup.add(dome);

  // Golden Lotus Finial atop Dome
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.6, 8), goldMat);
  finial.position.y = 3.4;
  rootGroup.add(finial);

  // 4 Corner Chhatri Cupolas
  const chhatriOffsets = [
    [-0.7, -0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [0.7, 0.7]
  ];
  chhatriOffsets.forEach(([cx, cz]) => {
    const chhatri = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), marbleMat);
    chhatri.position.set(cx, 2.2, cz);
    rootGroup.add(chhatri);
  });

  // 4 Fluted Slender Three-Tiered Corner Minarets
  const minaretOffsets = [
    [-1.6, -1.6],
    [1.6, -1.6],
    [-1.6, 1.6],
    [1.6, 1.6]
  ];
  minaretOffsets.forEach(([mx, mz]) => {
    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.2, 12), marbleMat);
    minaret.position.set(mx, 1.8, mz);
    minaret.castShadow = true;
    rootGroup.add(minaret);

    // Minaret dome cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), marbleMat);
    cap.position.set(mx, 3.45, mz);
    rootGroup.add(cap);
  });
}

// 15. Jaipur Hawa Mahal
function buildHawaMahal(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const pinkSandstoneMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 });
  const redSandstoneMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.7 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7 });
  materials.push(pinkSandstoneMat, redSandstoneMat, goldMat);

  // 5 Tier Pyramidal Honeycomb Facade
  const tiers = [
    { w: 3.2, h: 0.8, y: 0.4 },
    { w: 2.8, h: 0.8, y: 1.2 },
    { w: 2.3, h: 0.8, y: 2.0 },
    { w: 1.7, h: 0.7, y: 2.75 },
    { w: 1.1, h: 0.6, y: 3.4 }
  ];

  tiers.forEach(t => {
    const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, 0.6), pinkSandstoneMat);
    tierMesh.position.y = t.y;
    tierMesh.castShadow = true;
    rootGroup.add(tierMesh);
  });

  // Honeycomb Jharokha Protrusions (Balconies)
  const jharokhaGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.4, 8, 1, false, 0, Math.PI);
  for (let row = 0; row < 4; row++) {
    const count = 4 - row;
    for (let col = 0; col < count; col++) {
      const jx = (col - (count - 1) / 2) * 0.6;
      const jy = 0.5 + row * 0.8;
      const jharokha = new THREE.Mesh(jharokhaGeo, redSandstoneMat);
      jharokha.position.set(jx, jy, 0.32);
      rootGroup.add(jharokha);
    }
  }

  // Crowning Chhatris at top
  const crownChhatri = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
  crownChhatri.position.set(0, 3.8, 0);
  rootGroup.add(crownChhatri);
}

// 16. Amritsar Golden Temple
function buildGoldenTemple(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.95 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const sarovarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 });
  materials.push(goldMat, marbleMat, sarovarMat);

  // Amrit Sarovar (Nectar Pool)
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.15, 32), sarovarMat);
  pool.position.y = 0.08;
  pool.receiveShadow = true;
  rootGroup.add(pool);

  // Marble Causeway Bridge
  const causeway = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 2.2), marbleMat);
  causeway.position.set(0, 0.18, 1.4);
  rootGroup.add(causeway);

  // Ground Marble Platform
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 2.0), marbleMat);
  plinth.position.y = 0.25;
  rootGroup.add(plinth);

  // Two-Story Golden Sanctum
  const story1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.6), goldMat);
  story1.position.y = 0.85;
  story1.castShadow = true;
  rootGroup.add(story1);

  const story2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.3), goldMat);
  story2.position.y = 1.7;
  story2.castShadow = true;
  rootGroup.add(story2);

  // Fluted Golden Dome & Chhatris
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 16, 0, Math.PI * 2, 0, Math.PI / 1.7), goldMat);
  dome.position.y = 2.4;
  dome.castShadow = true;
  rootGroup.add(dome);

  // Golden Spire Kalash
  const kalash = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.5, 8), goldMat);
  kalash.position.y = 2.9;
  rootGroup.add(kalash);
}

// 17. Varanasi Ghats
function buildVaranasiGhats(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.1, metalness: 0.6 });
  const shikharaMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.7 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });
  materials.push(stoneMat, waterMat, shikharaMat, brassMat);

  // Sacred River Ganga
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.15, 32), waterMat);
  water.position.y = 0.08;
  rootGroup.add(water);

  // Stepped Stone Staircase Ghats
  for (let s = 0; s < 6; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.4), stoneMat);
    step.position.set(0, 0.15 + s * 0.2, -0.4 - s * 0.35);
    step.receiveShadow = true;
    rootGroup.add(step);
  }

  // Riverside Shikhara Spire Temples
  const templePositions = [-1.2, 1.2];
  templePositions.forEach(tx => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.9), stoneMat);
    base.position.set(tx, 1.8, -1.8);
    rootGroup.add(base);

    const shikhara = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 8), shikharaMat);
    shikhara.position.set(tx, 3.1, -1.8);
    shikhara.castShadow = true;
    rootGroup.add(shikhara);
  });

  // Floating Aarti Brass Oil Diya
  const diyaGeo = new THREE.CylinderGeometry(0.12, 0.04, 0.06, 12);
  const flameGeo = new THREE.ConeGeometry(0.05, 0.14, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  materials.push(flameMat);

  for (let d = 0; d < 3; d++) {
    const diya = new THREE.Mesh(diyaGeo, brassMat);
    diya.position.set(-0.6 + d * 0.6, 0.18, 1.2 + (d % 2) * 0.4);
    rootGroup.add(diya);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(-0.6 + d * 0.6, 0.26, 1.2 + (d % 2) * 0.4);
    rootGroup.add(flame);
  }
}

// 18. Tropical Beach (Goa / Bali / Maldives)
function buildTropicalBeach(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
  const palmMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
  materials.push(sandMat, waterMat, woodMat, thatchMat, palmMat);

  // Turquoise Ocean Water
  const water = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.15, 32), waterMat);
  water.position.y = 0.08;
  rootGroup.add(water);

  // Sand Shoreline
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.6, 0.22, 24, 1, false, 0, Math.PI), sandMat);
  sand.position.set(0, 0.15, -0.6);
  sand.receiveShadow = true;
  rootGroup.add(sand);

  // Curved Coconut Palm Trunk
  const palmTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.8, 8), woodMat);
  palmTrunk.position.set(-1.4, 1.4, -1.0);
  palmTrunk.rotation.z = -0.15;
  palmTrunk.castShadow = true;
  rootGroup.add(palmTrunk);

  // Lush Palm Fronds
  const frondGeo = new THREE.ConeGeometry(0.8, 0.3, 6);
  for (let f = 0; f < 6; f++) {
    const frond = new THREE.Mesh(frondGeo, palmMat);
    frond.position.set(-1.6 + Math.cos((f * Math.PI) / 3) * 0.5, 2.8, -1.0 + Math.sin((f * Math.PI) / 3) * 0.5);
    frond.rotation.z = Math.cos((f * Math.PI) / 3) * 0.5;
    frond.rotation.x = Math.sin((f * Math.PI) / 3) * 0.5;
    rootGroup.add(frond);
  }

  // Wooden Overwater Gazebo / Cabana
  const stiltsGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6);
  const stiltOffsets = [
    [0.6, 0.2],
    [1.6, 0.2],
    [0.6, 1.2],
    [1.6, 1.2]
  ];
  stiltOffsets.forEach(([sx, sz]) => {
    const stilt = new THREE.Mesh(stiltsGeo, woodMat);
    stilt.position.set(sx, 0.5, sz);
    rootGroup.add(stilt);
  });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), woodMat);
  deck.position.set(1.1, 1.0, 0.7);
  deck.castShadow = true;
  rootGroup.add(deck);

  const thatchRoof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 4), thatchMat);
  thatchRoof.position.set(1.1, 1.9, 0.7);
  thatchRoof.rotation.y = Math.PI / 4;
  thatchRoof.castShadow = true;
  rootGroup.add(thatchRoof);
}

// 19. Alpine Valley & Ridge (Manali, Kashmir, Shimla)
function buildAlpineValley(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, flatShading: true });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });
  materials.push(rockMat, snowMat, pineMat, timberMat);

  // Twin Mountain Peaks
  const peak1 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.0, 6), rockMat);
  peak1.position.set(-0.8, 2.0, -0.6);
  peak1.castShadow = true;
  rootGroup.add(peak1);

  const snow1 = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 6), snowMat);
  snow1.position.set(-0.8, 3.2, -0.6);
  rootGroup.add(snow1);

  const peak2 = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.2, 5), rockMat);
  peak2.position.set(1.2, 1.6, -1.0);
  peak2.castShadow = true;
  rootGroup.add(peak2);

  // Kath-Kuni Timber Mountain Cottage
  const cottage = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.9), timberMat);
  cottage.position.set(0.6, 0.35, 1.0);
  cottage.castShadow = true;
  rootGroup.add(cottage);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 4), rockMat);
  roof.position.set(0.6, 0.9, 1.0);
  roof.rotation.y = Math.PI / 4;
  rootGroup.add(roof);

  // Pine Forest
  const pineGeo = new THREE.ConeGeometry(0.4, 1.1, 5);
  const treeOffsets = [
    [-1.6, 1.2],
    [-0.2, 1.4],
    [1.8, 0.6],
    [-2.0, -0.5]
  ];
  treeOffsets.forEach(([tx, tz]) => {
    const tree = new THREE.Mesh(pineGeo, pineMat);
    tree.position.set(tx, 0.55, tz);
    tree.castShadow = true;
    rootGroup.add(tree);
  });
}

// 20. Default Classical Heritage Pavilion
function buildHeritagePavilion(rootGroup: THREE.Group, materials: THREE.Material[]) {
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.2 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  materials.push(stoneMat, roofMat);

  const pavilion = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 1.4, 12), stoneMat);
  pavilion.position.y = 0.7;
  pavilion.castShadow = true;
  rootGroup.add(pavilion);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 12), roofMat);
  roof.position.y = 2.2;
  roof.castShadow = true;
  rootGroup.add(roof);
}

/**
 * Master Procedural Model Generator
 * Builds and attaches the exact 3D architectural model for the given landmark id
 */
export function buildProceduralLandmark(
  landmarkId: string,
  rootGroup: THREE.Group,
  materials: THREE.Material[]
): void {
  switch (landmarkId) {
    case 'paris-eiffel':
      buildEiffelTower(rootGroup, materials);
      break;
    case 'paris-louvre':
      buildLouvrePyramid(rootGroup, materials);
      break;
    case 'tokyo-pagoda':
      buildJapanesePagoda(rootGroup, materials);
      break;
    case 'rome-colosseum':
      buildColosseum(rootGroup, materials);
      break;
    case 'newyork-empire':
      buildEmpireStateBuilding(rootGroup, materials);
      break;
    case 'dubai-burj-khalifa':
      buildBurjKhalifa(rootGroup, materials);
      break;
    case 'sydney-opera':
      buildSydneyOperaHouse(rootGroup, materials);
      break;
    case 'singapore-mbs':
      buildMarinaBaySands(rootGroup, materials);
      break;
    case 'london-big-ben':
      buildBigBen(rootGroup, materials);
      break;
    case 'barcelona-sagrada':
      buildSagradaFamilia(rootGroup, materials);
      break;
    case 'santorini-caldera':
      buildSantoriniCaldera(rootGroup, materials);
      break;
    case 'bangkok-wat-arun':
      buildWatArunPrang(rootGroup, materials);
      break;
    case 'swiss-matterhorn':
      buildMatterhorn(rootGroup, materials);
      break;
    case 'agra-taj-mahal':
      buildTajMahal(rootGroup, materials);
      break;
    case 'jaipur-hawa-mahal':
      buildHawaMahal(rootGroup, materials);
      break;
    case 'amritsar-golden-temple':
      buildGoldenTemple(rootGroup, materials);
      break;
    case 'varanasi-ghats':
      buildVaranasiGhats(rootGroup, materials);
      break;
    case 'tropical-beach':
      buildTropicalBeach(rootGroup, materials);
      break;
    case 'alpine-valley':
      buildAlpineValley(rootGroup, materials);
      break;
    default:
      buildHeritagePavilion(rootGroup, materials);
      break;
  }
}
