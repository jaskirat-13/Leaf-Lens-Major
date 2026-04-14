import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "./TranslationContext";
import { translateText } from "./translationService";

const diseases = [
  {
    name: "Brown Spot",
    desc: "Circular brown spots with gray center on leaves.",
    severity: "Moderate",
    advice: "Use fungicide like Tricyclazole. Remove affected leaves.",
    crop: ["Rice"]
  },
  {
    name: "Blast",
    desc: "Diamond-shaped lesions with gray-white center.",
    severity: "High",
    advice: "Apply Carbendazim early. Avoid excess nitrogen.",
    crop: ["Rice"]
  },
  {
    name: "Leaf Rust",
    desc: "Orange-brown pustules on leaves.",
    severity: "Medium",
    advice: "Use Propiconazole. Plant resistant varieties.",
    crop: ["Wheat"]
  },
  {
    name: "Early Blight",
    desc: "Dark concentric rings on leaves.",
    severity: "Moderate",
    advice: "Spray Mancozeb. Improve air circulation.",
    crop: ["Tomato", "Potato"]
  },
  {
    name: "Late Blight",
    desc: "Dark green-black patches, white mold.",
    severity: "High",
    advice: "Use Metalaxyl + Mancozeb urgently.",
    crop: ["Potato", "Tomato"]
  },
  {
    name: "Turcicum Leaf Blight",
    desc: "Long grayish-brown streaks.",
    severity: "Medium",
    advice: "Spray Azoxystrobin. Crop rotation helps.",
    crop: ["Maize"]
  },
  {
    name: "Red Rot",
    desc: "Reddening of cane interior, shriveling.",
    severity: "High",
    advice: "Use disease-free setts. Rogue infected plants.",
    crop: ["Sugarcane"]
  }
];

const diseaseImgs = [
  "https://thumbs.dreamstime.com/b/plant-disease-rice-leaves-blight-micro-organism-plant-disease-rice-105425383.jpg",
  "https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41598-024-81143-1/MediaObjects/41598_2024_81143_Fig1_HTML.png",
  "https://www.thespruce.com/thmb/SkGrAk1vX132bHVIEn0QXN6B_Jo=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/spruce-tomato-YevheniiOrlov-d0bc52c1acef4fb59eac8519528f8d74.jpg"
];

const weatherCodeLabels = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Dense fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Rain showers",
  81: "Moderate showers",
  82: "Intense showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm with hail"
};

const geocodeEndpoint = "https://geocoding-api.open-meteo.com/v1/search";
const forecastEndpoint = "https://api.open-meteo.com/v1/forecast";
const nominatimEndpoint = "https://nominatim.openstreetmap.org/search";
const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter"
];
const geocodeCache = new Map();
const agroStoreCache = new Map();
const geocodeCacheTtlMs = 24 * 60 * 60 * 1000;
const agroStoreCacheTtlMs = 10 * 60 * 1000;
const geoRequestTimeoutMs = 7000;
const overpassRequestTimeoutMs = 8000;
const isLocalhost =
  typeof window !== "undefined" && /^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
const defaultHostedApiUrl = "https://leaf-lens-major.onrender.com";
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const apiBaseUrl = configuredApiBaseUrl || (isLocalhost ? "http://localhost:5000" : defaultHostedApiUrl);
const hasConfiguredExternalApi = configuredApiBaseUrl.length > 0;

const diseasePesticideProtocols = [
  {
    match: /(late blight|leaf blight|northern leaf blight|turcicum)/i,
    products: [
      { name: "Chlorothalonil 75 WP", dosage: "2.0 g/L water", schedule: "Every 7 days" },
      { name: "Copper Oxychloride", dosage: "3.0 g/L water", schedule: "Every 10 days" },
      { name: "Azoxystrobin", dosage: "1.0 mL/L water", schedule: "Every 14 days" }
    ]
  },
  {
    match: /(early blight|septoria|target spot)/i,
    products: [
      { name: "Mancozeb 75 WP", dosage: "2.5 g/L water", schedule: "Every 7 days" },
      { name: "Chlorothalonil 75 WP", dosage: "2.0 g/L water", schedule: "Every 7 days" },
      { name: "Azoxystrobin", dosage: "1.0 mL/L water", schedule: "Every 10-14 days" }
    ]
  },
  {
    match: /(rust|powdery mildew|leaf scorch)/i,
    products: [
      { name: "Wettable Sulphur", dosage: "2.5 g/L water", schedule: "Every 7-10 days" },
      { name: "Propiconazole", dosage: "1.0 mL/L water", schedule: "Every 12 days" },
      { name: "Azoxystrobin", dosage: "1.0 mL/L water", schedule: "Every 14 days" }
    ]
  },
  {
    match: /(bacterial spot|black rot|canker)/i,
    products: [
      { name: "Copper Oxychloride", dosage: "3.0 g/L water", schedule: "Every 7 days" },
      { name: "Streptocycline", dosage: "0.3 g/L water", schedule: "Every 10 days" },
      { name: "Bordeaux Mixture", dosage: "1% solution", schedule: "At symptom onset" }
    ]
  }
];

const cropFilenameHints = [
  { crop: "Apple", patterns: [/\bapple\b/i] },
  { crop: "Blueberry", patterns: [/\bblueberry\b/i] },
  { crop: "Cherry", patterns: [/\bcherry\b/i] },
  { crop: "Maize", patterns: [/\bmaize\b/i, /\bcorn\b/i] },
  { crop: "Grape", patterns: [/\bgrape\b/i] },
  { crop: "Orange", patterns: [/\borange\b/i] },
  { crop: "Peach", patterns: [/\bpeach\b/i] },
  { crop: "Bell Pepper", patterns: [/\bbell\s*pepper\b/i, /\bpepper\b/i] },
  { crop: "Potato", patterns: [/\bpotato\b/i] },
  { crop: "Raspberry", patterns: [/\braspberry\b/i] },
  { crop: "Soybean", patterns: [/\bsoybean\b/i] },
  { crop: "Squash", patterns: [/\bsquash\b/i] },
  { crop: "Strawberry", patterns: [/\bstrawberry\b/i] },
  { crop: "Tomato", patterns: [/\btomato\b/i] }
];

function inferCropFromFilename(fileName = "") {
  const baseName = String(fileName).replace(/[_-]+/g, " ");
  const match = cropFilenameHints.find((entry) => entry.patterns.some((pattern) => pattern.test(baseName)));
  return match?.crop || null;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceInKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function inferStoreTags(name, tags) {
  const source = `${name || ""} ${Object.values(tags || {}).join(" ")}`.toLowerCase();
  const labels = [];

  if (/(fertilizer|urea|dap|npk|potash|micronutrient)/.test(source)) labels.push("Fertilizers");
  if (/(pesticide|fungicide|insecticide|crop care)/.test(source)) labels.push("Pesticides");
  if (/(seed|nursery|hybrid|agri input)/.test(source)) labels.push("Seeds");

  return labels.length ? labels : ["Farm Inputs"];
}

function normalizeLocationKey(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function getCachedWithTtl(cache, key, ttlMs) {
  const row = cache.get(key);
  if (!row) return null;

  if (Date.now() - row.timestamp > ttlMs) {
    cache.delete(key);
    return null;
  }

  return row.value;
}

function setCachedWithTtl(cache, key, value) {
  cache.set(key, {
    timestamp: Date.now(),
    value
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isAgroRelevantName(name = "") {
  return /(agro|agri|fertili[sz]er|pesticide|seed|krishi|kisan|nursery|crop)/i.test(name);
}

function isAgroRelevantShop(shop = "") {
  return /(agrarian|farm|garden_centre|doityourself|hardware)/i.test(shop);
}

async function fetchOverpassQuery(query) {
  let lastError = null;

  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: new URLSearchParams({ data: query }).toString()
      }, overpassRequestTimeoutMs);

      if (!response.ok) {
        lastError = new Error(`Overpass request failed (${response.status})`);
        continue;
      }

      const payload = await response.json();
      return Array.isArray(payload?.elements) ? payload.elements : [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown Overpass request error");
    }
  }

  throw lastError || new Error("Unable to reach map data service right now.");
}

function buildFertilizerPlanFromSoil(soilResult) {
  const levels = soilResult?.levels || {};
  const recommendations = [];

  if (levels.nitrogen === "low") {
    recommendations.push({
      name: "Urea (46-0-0)",
      dosage: "110 kg/ha",
      stage: "Split at vegetative stage",
      purpose: "Quickly restores vegetative growth where leaves are pale or weak.",
      tip: "Apply in 2-3 splits with light irrigation to reduce nitrogen loss."
    });
    recommendations.push({
      name: "Calcium Nitrate",
      dosage: "200 kg/ha",
      stage: "Vegetative stage",
      purpose: "Supports strong canopy growth and calcium availability.",
      tip: "Avoid tank-mixing with sulphate/phosphate fertilizers in foliar sprays."
    });
  }

  if (levels.phosphorus === "low") {
    recommendations.push({
      name: "DAP (18-46-0)",
      dosage: "100 kg/ha",
      stage: "Base application",
      purpose: "Improves root establishment and early crop vigor.",
      tip: "Place near root zone and avoid broadcasting in dry topsoil."
    });
    recommendations.push({
      name: "SSP",
      dosage: "125 kg/ha",
      stage: "At sowing/transplant",
      purpose: "Adds phosphorus with sulphur support for balanced early growth.",
      tip: "Useful where sulphur deficiency is visible in younger leaves."
    });
  }

  if (levels.potassium === "low") {
    recommendations.push({
      name: "MOP (0-0-60)",
      dosage: "80 kg/ha",
      stage: "Basal or early growth",
      purpose: "Builds stress tolerance and stronger stems.",
      tip: "Use with adequate moisture for better potassium uptake."
    });
    recommendations.push({
      name: "SOP",
      dosage: "50 kg/ha",
      stage: "Flowering-fruiting",
      purpose: "Supports fruit quality and reduces chloride-sensitive stress.",
      tip: "Prefer SOP for horticulture crops during reproductive stages."
    });
  }

  if (levels.organicCarbon === "low") {
    recommendations.push({
      name: "Vermicompost",
      dosage: "2.0 t/ha",
      stage: "Before planting",
      purpose: "Improves soil aggregation, biology, and nutrient holding.",
      tip: "Incorporate 2-3 weeks before planting for better microbial activity."
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      name: "NPK 19-19-19",
      dosage: "150 kg/ha",
      stage: "Base application",
      purpose: "General balanced nutrition where major nutrients are stable.",
      tip: "Adjust upward only after next soil test confirms a deficiency."
    });
    recommendations.push({
      name: "Boron Foliar",
      dosage: "1 g/L",
      stage: "Flowering stage",
      purpose: "Improves flower retention and fruit set under micronutrient stress.",
      tip: "Spray during cool hours and avoid concentration above label limits."
    });
  }

  const unique = [];
  const seen = new Set();
  for (const item of recommendations) {
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    unique.push(item);
  }

  return unique.slice(0, 3);
}

function buildPesticidePlanFromDisease(diseaseResult) {
  const diseaseName = diseaseResult?.name || "";
  if (!diseaseName || !diseaseResult?.isDetected) {
    return [
      {
        name: "Neem Oil (1500 ppm)",
        dosage: "3.0 mL/L water",
        schedule: "Preventive every 10 days",
        purpose: "Suppresses early sucking pests and soft disease pressure.",
        tip: "Spray on both leaf surfaces during low sunlight hours."
      },
      {
        name: "Trichoderma (bio-fungicide)",
        dosage: "5.0 g/L water",
        schedule: "Every 14 days",
        purpose: "Biological protection for root and foliar disease prevention.",
        tip: "Do not mix with strong chemical fungicides in the same tank."
      },
      {
        name: "Copper Oxychloride",
        dosage: "2.5 g/L water",
        schedule: "Only if early symptoms appear",
        purpose: "Broad contact protection when first lesions are visible.",
        tip: "Use before disease spread and avoid spraying before rainfall."
      }
    ];
  }

  const protocol = diseasePesticideProtocols.find((item) => item.match.test(diseaseName));
  if (protocol) {
    return protocol.products.map((item) => ({
      ...item,
      purpose: "Targets active foliar disease pressure.",
      tip: "Rotate active ingredients across sprays to delay resistance."
    }));
  }

  return [
    {
      name: "Mancozeb 75 WP",
      dosage: "2.5 g/L water",
      schedule: "Every 7 days",
      purpose: "Protective cover for broad fungal disease complexes.",
      tip: "Maintain full leaf coverage for best preventive effect."
    },
    {
      name: "Copper Oxychloride",
      dosage: "3.0 g/L water",
      schedule: "Every 10 days",
      purpose: "Contact fungicide support for humid disease windows.",
      tip: "Avoid repeated back-to-back use without rotation."
    },
    {
      name: "Azoxystrobin",
      dosage: "1.0 mL/L water",
      schedule: "Every 14 days",
      purpose: "Systemic support during active disease progression.",
      tip: "Use with a protectant partner if field pressure is high."
    }
  ];
}

function buildPesticideInsights(diseaseResult) {
  const severity = String(diseaseResult?.severity || "").toLowerCase();

  if (!diseaseResult?.isDetected) {
    return {
      focus: [
        "No strong disease signal now: keep preventive biocontrol and weekly scouting.",
        "Spray only when threshold symptoms appear to avoid unnecessary chemical cost.",
        "Prioritize canopy airflow, clean tools, and irrigation hygiene to reduce outbreaks."
      ],
      checklist: [
        "Spray in early morning/evening, never in strong wind or midday heat.",
        "Keep at least one rain-free window after spray for better retention.",
        "Wear gloves, mask, and follow label PHI/REI before harvest or re-entry."
      ]
    };
  }

  if (severity === "high") {
    return {
      focus: [
        "High severity detected: complete first spray within 24 hours and isolate hotspots.",
        "Re-scout in 48-72 hours and continue only if new lesions are still expanding.",
        "Use strict rotation between chemical groups across rounds to slow resistance."
      ],
      checklist: [
        "Start from the least infected block and move to heavily infected blocks last.",
        "Avoid tank mixes with uncertain compatibility; do a jar test first.",
        "Record date, product, dose, and response to refine next spray cycle."
      ]
    };
  }

  return {
    focus: [
      "Disease pressure is manageable: use targeted sprays and avoid blanket application.",
      "Support crop recovery with balanced nutrition and regular canopy sanitation.",
      "Confirm symptom trend after each round before repeating the same chemistry."
    ],
    checklist: [
      "Calibrate sprayer volume so both upper and lower leaf surfaces are covered.",
      "Leave a consistent spray interval; do not shorten unless pressure rises sharply.",
      "Observe pre-harvest interval to protect produce quality and market acceptance."
    ]
  };
}

function buildFertilizerInsights(soilResult) {
  const levels = soilResult?.levels || {};
  const hasSoilData = Boolean(soilResult);
  const focus = [];

  if (!hasSoilData) {
    focus.push("Use a balanced starter dose first, then refine plan using latest soil test values.");
  }

  if (levels.nitrogen === "low") {
    focus.push("Nitrogen is low: prioritize split N applications to reduce leaching and volatilization loss.");
  }
  if (levels.phosphorus === "low") {
    focus.push("Phosphorus is low: place P near root zone for stronger early root growth.");
  }
  if (levels.potassium === "low") {
    focus.push("Potassium is low: strengthen stress tolerance before flowering and fruit load.");
  }
  if (levels.organicCarbon === "low") {
    focus.push("Organic carbon is low: add compost/FYM to improve nutrient holding and soil structure.");
  }

  if (soilResult?.water_risk === "Waterlogging Risk") {
    focus.push("Waterlogging risk: delay top-dressing before heavy rainfall and improve drainage channels.");
  } else if (soilResult?.water_risk === "Drought Stress") {
    focus.push("Drought risk: apply fertilizers with moisture support or light irrigation for uptake.");
  }

  if (!focus.length) {
    focus.push("Nutrient profile is fairly balanced; maintain schedule and retest in 45-60 days.");
    focus.push("Shift toward maintenance nutrition and avoid extra single-nutrient loading.");
  }

  return {
    focus: focus.slice(0, 4),
    checklist: [
      "Apply major fertilizers in splits based on crop stage, not in one heavy dose.",
      "Keep at least 5-7 days gap between strong pesticide spray and foliar nutrients.",
      "Do not mix calcium and phosphate/sulphate fertilizers in the same tank.",
      "Retest soil after one crop cycle to validate correction strategy."
    ]
  };
}

function buildInputRecommendations(diseaseResult, soilResult) {
  return {
    pesticides: buildPesticidePlanFromDisease(diseaseResult),
    fertilizers: buildFertilizerPlanFromSoil(soilResult),
    pesticideInsights: buildPesticideInsights(diseaseResult),
    fertilizerInsights: buildFertilizerInsights(soilResult)
  };
}

const translations = {
  en: {
    appName: "Leaflens",
    home: "Home",
    services: "Services",
    soil: "Soil",
    about: "About",
    heroKicker: "Precision farming demo for Indian growers",
    heroTitle: "Spot crop disease faster and plan field work with more confidence.",
    heroText: "Leaflens brings crop symptom screening and simple weather guidance into one clear mobile-friendly interface so farmers can review what they see in the field and decide what to do next.",
    tryDemo: "Try Demo",
    seeProjectScope: "See Project Scope",
    platform: "Platform",
    platformTitle: "Built around the three checks growers reach for first",
    platformCopy: "This version is still a frontend demo, but the interface now feels closer to a real product with disease, weather, and soil workflows designed for fast field decisions.",
    diseaseDetection: "Disease Detection",
    leafSymptomScreening: "Leaf symptom screening",
    leafSymptomDesc: "Guide the user from crop selection to image upload with a focused result card and practical treatment advice.",
    weatherPlanning: "Weather Planning",
    fieldReadyForecast: "Field-ready forecast panel",
    forecastDesc: "Summarize temperature, rainfall probability, and a short recommendation for the next three days.",
    soilAnalysis: "Soil Analysis",
    dataDrivernSoil: "Data-driven soil insights",
    soilDesc: "Analyze pH, NPK, moisture, organic carbon, and climate values to get fertility score and major corrective actions.",
    demo01: "Demo 01",
    detectCropDisease: "Detect Crop Disease",
    interviewMode: "Interview Mode",
    detectSimulate: "Simulate a farmer uploading a leaf image and receiving a clear diagnosis card with crop context and next-step advice.",
    selectCrop: "Select Crop",
    uploadLeafPhoto: "Upload Leaf Photo",
    analyzeImage: "Analyze Image",
    cropLimitNote: "Crop list is limited to what your current ML model supports.",
    noImageSelected: "No image selected yet.",
    selectedImage: "Selected image",
    healthCheckMessage: "Checking ML API status...",
    mlApiHealth: "ML API Health",
    recheckApi: "Recheck API",
    checking: "Checking...",
    online: "Online",
    wakingUp: "Waking Up",
    backendReachable: "Backend is reachable and ready for image analysis.",
    renderWakingUp: "Render backend is waking up. Retry in about 30-60 seconds.",
    detectionResult: "Detection Result",
    diseaseNotDetected: "Disease not detected",
    diseaseDetected: "Disease detected",
    cropAnalyzed: "Crop analyzed",
    mode: "Mode",
    mlModelAnalysis: "ML model analysis",
    demoMode: "Demo mode",
    status: "Status",
    severity: "Severity",
    recommendation: "Recommendation",
    topPredictions: "Top Predictions",
    confidenceMargin: "Confidence margin (Top1-Top2)",
    whyVerification: "Why verification is needed",
    demo02: "Demo 02",
    weatherOutlook: "Weather Outlook",
    weatherSimulate: "Enter a location name and fetch a quick 3-day farm advisory from live data.",
    location: "Location",
    locationHint: "E.g., Delhi, Mumbai, Bangalore",
    getWeather: "Get Weather",
    demo03: "Demo 03",
    soilTool: "Soil Carbon & Fertility Analysis",
    soilSimulate: "Input soil test values and get major insights on fertility, water stress, and corrective actions.",
    fertilityScore: "Fertility Score",
    waterRisk: "Water Risk",
    nutrientRisk: "Nutrient Risk",
    yieldOutlook: "Yield Outlook",
    majorInsights: "Major Insights",
    majorDrivers: "Major Drivers",
    recommendations: "Recommendations",
    section02: "Field Snapshot",
    section02Title: "One screen for three high-impact farm checks.",
    leafScanTitle: "Leaf scan demo",
    weatherTitle: "Weather outlook",
    soilTitle: "Soil intelligence",
    leafScanDesc: "Select a crop, upload a leaf image, and review a structured disease summary.",
    weatherDesc: "Generate a quick three-day forecast card with rainfall and work advice.",
    soilPanelDesc: "Input soil values and get major fertility, water, and nutrient risk insights instantly.",
    selectLanguage: "Language",
    thunderstormRisk: "Thunderstorm risk expected. Avoid open-field operations during lightning hours.",
    highRainChance: "High rain chance. Delay spraying and protect inputs and harvested produce.",
    possibleShowers: "Possible showers. Keep drainage channels open and plan flexible fieldwork windows.",
    hotConditions: "Hot conditions expected. Prefer irrigation in early morning or late evening.",
    coolTemperatures: "Cool night temperatures expected. Protect sensitive seedlings where needed.",
    stableWeather: "Stable weather expected. Suitable window for routine field monitoring and light operations.",
    variableWeather: "Variable weather",
    healthyLeafGuidance: "Healthy Leaf Guidance",
    weeklyLeafChecks: "Keep weekly leaf checks to catch early symptoms before spread.",
    avoidOverwatering: "Avoid overwatering and improve airflow around the crop canopy.",
    preventiveBioFungicide: "Apply preventive bio-fungicide during humid or rainy periods.",
    priorityTreatmentPlan: "Priority Treatment Plan",
    isolateInfected: "Isolate visibly infected plants or leaves to reduce cross-field spread.",
    startFungicideProtocol: "Start recommended fungicide protocol immediately and repeat as advised.",
    recheckField: "Recheck the field in 48-72 hours and document progression with photos.",
    suggestedFieldActions: "Suggested Field Actions",
    removeAffectedLeaves: "Remove affected leaves and sanitize tools after each row.",
    applyTargetedTreatment: "Apply targeted treatment in cool hours for better leaf retention.",
    reviewNutrientBalance: "Review nutrient balance to improve natural disease resistance.",
    locationNotFound: "Location not found. Try a city name like Delhi, Pune, or Jaipur.",
    forecastUnavailable: "Forecast data is currently unavailable for this location.",
    unableReachWeather: "Unable to reach weather service right now. Please try again.",
    uploadImage: "Please upload an image first.",
    analyzeLoading: "Analyzing image with ML model...",
    analyzeTimeout: "Image analysis timed out. Please retry with a clearer, smaller image.",
    analyzeError: "Unable to analyze image right now. Please try again.",
    apiUnreachable: "Could not reach the ML API. Check backend status and verify VITE_API_BASE_URL points to a live HTTPS endpoint.",
    apiError: "API request failed with status",
    renderUnavailable: "Render backend is waking up or unavailable (503). Wait 30-60 seconds and try Analyze Image again.",
    toggleNavigation: "Toggle navigation",
    yourLocation: "Your Location",
    forecastLoading: "Fetching live forecast for",
    unableFetchForecast: "Unable to fetch forecast right now.",
    unableAnalyzeSoil: "Unable to analyze soil profile right now.",
    soilUnreachable: "Live API is currently unreachable. Showing built-in website analysis.",
    soilAnalyzeLoading: "Analyzing soil profile and generating key insights...",
    soilBuiltInAnalysis: "Built-in website analysis mode is active.",
    usingRenderBackend: "Using default Render backend for disease detection.",
    fieldSnapshot: "Field Snapshot",
    oneScreenChecks: "One screen for three high-impact farm checks.",
    forecastTitle: "Weather Outlook",
    weatherForecast: "3-Day Forecast",
    get3DayForecast: "Get 3-Day Forecast",
    forecastFor: "Forecast for",
    updated: "Updated",
    minTemp: "Min",
    rainChance: "Rain",
    soilAnalysisTitle: "Soil Analysis and Major Insights",
    soilFormCrop: "Crop",
    soilPH: "pH",
    soilNitrogen: "Nitrogen (mg/kg)",
    soilPhosphorus: "Phosphorus (mg/kg)",
    soilPotassium: "Potassium (mg/kg)",
    soilMoisture: "Moisture (%)",
    soilCarbon: "Organic Carbon (%)",
    soilTemp: "Temp (°C)",
    soilRainfall: "Rainfall (mm)",
    analyzeButton: "Analyze Soil",
    needsVerification: "Needs Verification",
    confident: "% Confident",
    detectedHeading: "Disease Detected",
    healthyHeading: "Healthy",
    acidicSoil: "Acidic soil may reduce nutrient uptake.",
    alkalinePH: "Alkaline pH can lock phosphorus and micronutrients.",
    lowNitrogen: "Nitrogen is low, reducing vegetative growth potential.",
    highNitrogen: "Nitrogen is high; monitor excess foliage and pest pressure.",
    lowPhosphorus: "Phosphorus is low, affecting root development and flowering.",
    highPhosphorus: "Phosphorus is high; avoid unnecessary DAP applications.",
    lowPotassium: "Potassium is low, increasing stress and lodging risk.",
    highPotassium: "Potassium is high; rebalance future fertilizer schedule.",
    lowOrganicCarbon: "Low organic carbon indicates poor soil structure and biology.",
    lowMoisture: "Soil moisture is low and may limit nutrient availability.",
    highMoisture: "Soil moisture is high and can increase root disease risk.",
    highSoilTemp: "High soil temperature can stress roots and microbial activity.",
    lowSoilTemp: "Low soil temperature can slow nutrient mineralization.",
    highRainfall: "Very high rainfall may cause nutrient leaching.",
    applyLime: "Apply lime gradually to correct acidic pH.",
    useGypsum: "Use gypsum and organic matter to improve alkaline soil availability.",
    increaseNitrogen: "Increase nitrogen in split applications based on crop stage.",
    applyPhosphorus: "Apply phosphorus near root zone for better early uptake.",
    supplementPotash: "Supplement potash to improve stress tolerance and plant strength.",
    addCompost: "Add compost or FYM to improve soil carbon and structure.",
    mulching: "Use mulching and shorter irrigation intervals to reduce water stress.",
    improveDrainage: "Improve drainage before heavy rain and avoid fertilizer loss.",
    maintainSchedule: "Soil is relatively stable; maintain schedule and retest after 45-60 days.",
    estimatedSoilFertility: "Estimated soil fertility index:",
    primaryNutrient: "Primary nutrient status:",
    waterCondition: "Water condition:",
    organicCarbonStatus: "Organic carbon is",
    demoMode1: "Demo 01",
    demoMode2: "Demo 02",
    demoMode3: "Demo 03"
  },
  es: {
    appName: "Leaflens",
    home: "Inicio",
    services: "Servicios",
    soil: "Suelo",
    about: "Acerca de",
    heroKicker: "Demo de agricultura de precisión para agricultores indios",
    heroTitle: "Detecta enfermedades de cultivos más rápido y planifica el trabajo de campo con más confianza.",
    heroText: "Leaflens reúne el cribado de síntomas de cultivos y orientación meteorológica simple en una interfaz clara y fácil de usar para móviles para que los agricultores revisen lo que ven en el campo y decidan qué hacer a continuación.",
    tryDemo: "Prueba Demo",
    seeProjectScope: "Ver Alcance del Proyecto",
    platform: "Plataforma",
    platformTitle: "Construido alrededor de los tres controles que los cultivadores buscan primero",
    platformCopy: "Esta versión sigue siendo una demostración frontal, pero la interfaz se siente más cercana a un producto real con flujos de trabajo de enfermedades, clima y suelo diseñados para decisiones rápidas en el campo.",
    diseaseDetection: "Detección de Enfermedades",
    leafSymptomScreening: "Cribado de síntomas de hojas",
    leafSymptomDesc: "Guía al usuario desde la selección del cultivo hasta la carga de imagen con una tarjeta de resultado enfocada y consejos de tratamiento prácticos.",
    weatherPlanning: "Planificación Meteorológica",
    fieldReadyForecast: "Panel de previsión listo para el campo",
    forecastDesc: "Resumir temperatura, probabilidad de lluvia y una breve recomendación para los próximos tres días.",
    soilAnalysis: "Análisis de Suelo",
    dataDrivernSoil: "Información sobre suelo basada en datos",
    soilDesc: "Analiza pH, NPK, humedad, carbono orgánico y valores climáticos para obtener puntuación de fertilidad y acciones correctivas principales.",
    demo01: "Demo 01",
    detectCropDisease: "Detectar Enfermedad de Cultivos",
    interviewMode: "Modo Entrevista",
    detectSimulate: "Simula un agricultor cargando una imagen de hoja y recibiendo una tarjeta de diagnóstico clara con contexto de cultivo y consejos de próximos pasos.",
    selectCrop: "Seleccionar Cultivo",
    uploadLeafPhoto: "Cargar Foto de Hoja",
    analyzeImage: "Analizar Imagen",
    cropLimitNote: "La lista de cultivos se limita a lo que su modelo ML actual admite.",
    noImageSelected: "Aún no se ha seleccionado ninguna imagen.",
    selectedImage: "Imagen seleccionada",
    healthCheckMessage: "Comprobando estado de ML API...",
    mlApiHealth: "Salud de API ML",
    recheckApi: "Recomprobar API",
    checking: "Comprobando...",
    online: "En línea",
    wakingUp: "Despertando",
    backendReachable: "El backend es accesible y está listo para análisis de imágenes.",
    renderWakingUp: "El backend de Render se está despertando. Reintentar en unos 30-60 segundos.",
    detectionResult: "Resultado de Detección",
    diseaseNotDetected: "Enfermedad no detectada",
    diseaseDetected: "Enfermedad detectada",
    cropAnalyzed: "Cultivo analizado",
    mode: "Modo",
    mlModelAnalysis: "Análisis de modelo ML",
    demoMode: "Modo demo",
    status: "Estado",
    severity: "Severidad",
    recommendation: "Recomendación",
    topPredictions: "Predicciones Principales",
    confidenceMargin: "Margen de confianza (Top1-Top2)",
    whyVerification: "Por qué se necesita verificación",
    demo02: "Demo 02",
    weatherOutlook: "Perspectiva Meteorológica",
    weatherSimulate: "Ingrese un nombre de ubicación y obtenga un rápido consejo de granja de 3 días a partir de datos en vivo.",
    location: "Ubicación",
    locationHint: "p. ej., Delhi, Mumbai, Bangalore",
    getWeather: "Obtener Clima",
    demo03: "Demo 03",
    soilTool: "Análisis de Carbono y Fertilidad del Suelo",
    soilSimulate: "Ingrese valores de prueba de suelo y obtenga información importante sobre fertilidad, estrés hídrico y acciones correctivas.",
    fertilityScore: "Puntuación de Fertilidad",
    waterRisk: "Riesgo de Agua",
    nutrientRisk: "Riesgo de Nutrientes",
    yieldOutlook: "Perspectiva de Rendimiento",
    majorInsights: "Información Principal",
    majorDrivers: "Factores Principales",
    recommendations: "Recomendaciones",
    section02: "Snapshot de Campo",
    section02Title: "Una pantalla para tres controles de granja de alto impacto.",
    leafScanTitle: "Demo de escaneo de hojas",
    weatherTitle: "Perspectiva meteorológica",
    soilTitle: "Inteligencia del suelo",
    leafScanDesc: "Seleccione un cultivo, cargue una imagen de hoja y revise un resumen de enfermedad estructurado.",
    weatherDesc: "Genere una tarjeta de previsión de 3 días con lluvia y consejos de trabajo.",
    soilPanelDesc: "Ingrese valores de suelo y obtenga información instantánea sobre fertilidad, agua y riesgo de nutrientes.",
    selectLanguage: "Idioma",
    thunderstormRisk: "Se espera riesgo de tormenta eléctrica. Evitar operaciones al aire libre durante horas de relámpagos.",
    highRainChance: "Alta probabilidad de lluvia. Retrasar la pulverización y proteger insumos y productos cosechados.",
    possibleShowers: "Posibles aguaceros. Mantener canales de drenaje abiertos y planificar ventanas de trabajo flexibles.",
    hotConditions: "Se esperan condiciones cálidas. Preferir riego en las primeras horas de la mañana o al final de la tarde.",
    coolTemperatures: "Se esperan temperaturas nocturnas frescas. Proteger las plántulas sensibles donde sea necesario.",
    stableWeather: "Se espera clima estable. Ventana adecuada para monitoreo de campo rutinario y operaciones ligeras.",
    variableWeather: "Clima variable",
    healthyLeafGuidance: "Guía de Hojas Saludables",
    weeklyLeafChecks: "Realice controles semanales de hojas para detectar síntomas tempranos antes de la propagación.",
    avoidOverwatering: "Evite el riego excesivo y mejore la circulación de aire alrededor del dosel de cultivos.",
    preventiveBioFungicide: "Aplique biofungicida preventivo durante períodos húmedos o lluviosos.",
    priorityTreatmentPlan: "Plan de Tratamiento de Prioridad",
    isolateInfected: "Aísle plantas o hojas visiblemente infectadas para reducir la propagación del campo.",
    startFungicideProtocol: "Inicie el protocolo de fungicida recomendado inmediatamente y repita según se indique.",
    recheckField: "Vuelva a revisar el campo en 48-72 horas y documente la progresión con fotos.",
    suggestedFieldActions: "Acciones de Campo Sugeridas",
    removeAffectedLeaves: "Retire hojas afectadas y desinfecte herramientas después de cada hilera.",
    applyTargetedTreatment: "Aplique tratamiento específico en horas frías para mejor retención de hojas.",
    reviewNutrientBalance: "Revise el balance nutricional para mejorar la resistencia natural a la enfermedad.",
    locationNotFound: "Ubicación no encontrada. Intente un nombre de ciudad como Delhi, Pune o Jaipur.",
    forecastUnavailable: "Los datos de pronóstico no están disponibles actualmente para esta ubicación.",
    unableReachWeather: "No se puede alcanzar el servicio meteorológico ahora mismo. Intente de nuevo.",
    uploadImage: "Suba una imagen primero.",
    analyzeLoading: "Analizando imagen con modelo ML...",
    analyzeTimeout: "El análisis de imagen agotó el tiempo. Intente nuevamente con una imagen más clara y más pequeña.",
    analyzeError: "No se puede analizar la imagen ahora mismo. Intente de nuevo.",
    apiUnreachable: "No se puede acceder a la API de ML. Verifique el estado del backend y asegúrese de que VITE_API_BASE_URL apunte a un endpoint HTTPS en vivo.",
    apiError: "La solicitud de API falló con estado",
    renderUnavailable: "El backend de Render se está despertando o no está disponible (503). Espere 30-60 segundos e intente Analizar imagen de nuevo.",
    toggleNavigation: "Alternar navegación",
    yourLocation: "Su Ubicación",
    forecastLoading: "Obteniendo pronóstico en vivo para",
    unableFetchForecast: "No se puede obtener el pronóstico ahora mismo.",
    unableAnalyzeSoil: "No se puede analizar el perfil del suelo ahora mismo.",
    soilUnreachable: "API en vivo actualmente no disponible. Mostrando análisis integrado del sitio web.",
    soilAnalyzeLoading: "Analizando perfil del suelo y generando información clave...",
    soilBuiltInAnalysis: "El modo de análisis integrado del sitio web está activo.",
    usingRenderBackend: "Usando el backend de Render predeterminado para detección de enfermedades.",
    fieldSnapshot: "Snapshot de Campo",
    oneScreenChecks: "Una pantalla para tres controles de granja de alto impacto.",
    forecastTitle: "Perspectiva Meteorológica",
    weatherForecast: "Pronóstico de 3 Días",
    get3DayForecast: "Obtener Pronóstico de 3 Días",
    forecastFor: "Pronóstico para",
    updated: "Actualizado",
    minTemp: "Mín",
    rainChance: "Lluvia",
    soilAnalysisTitle: "Análisis de Suelo e Información Principal",
    soilFormCrop: "Cultivo",
    soilPH: "pH",
    soilNitrogen: "Nitrógeno (mg/kg)",
    soilPhosphorus: "Fósforo (mg/kg)",
    soilPotassium: "Potasio (mg/kg)",
    soilMoisture: "Humedad (%)",
    soilCarbon: "Carbono Orgánico (%)",
    soilTemp: "Temp (°C)",
    soilRainfall: "Lluvia (mm)",
    analyzeButton: "Analizar Suelo",
    needsVerification: "Necesita Verificación",
    confident: "% Confiante",
    detectedHeading: "Enfermedad Detectada",
    healthyHeading: "Saludable",
    acidicSoil: "El suelo ácido puede reducir la absorción de nutrientes.",
    alkalinePH: "El pH alcalino puede bloquear el fósforo y micronutrientes.",
    lowNitrogen: "El nitrógeno es bajo, reduciendo el potencial de crecimiento vegetativo.",
    highNitrogen: "El nitrógeno es alto; monitoree el follaje excesivo y la presión de plagas.",
    lowPhosphorus: "El fósforo es bajo, afectando desarrollo de raíces y floración.",
    highPhosphorus: "El fósforo es alto; evite aplicaciones DAP innecesarias.",
    lowPotassium: "El potasio es bajo, aumentando estrés y riesgo de volcamiento.",
    highPotassium: "El potasio es alto; reequilibre el cronograma de fertilizantes futuros.",
    lowOrganicCarbon: "El bajo carbono orgánico indica mala estructura del suelo y biología.",
    lowMoisture: "La humedad del suelo es baja y puede limitar la disponibilidad de nutrientes.",
    highMoisture: "La humedad del suelo es alta y puede aumentar el riesgo de enfermedad de raíces.",
    highSoilTemp: "La alta temperatura del suelo puede estresar raíces y actividad microbiana.",
    lowSoilTemp: "La baja temperatura del suelo puede ralentizar la mineralización de nutrientes.",
    highRainfall: "La lluvia muy alta puede causar pérdida de nutrientes por lixiviación.",
    applyLime: "Aplique cal gradualmente para corregir el pH ácido.",
    useGypsum: "Use yeso y materia orgánica para mejorar la disponibilidad del suelo alcalino.",
    increaseNitrogen: "Aumente el nitrógeno en aplicaciones divididas según la etapa del cultivo.",
    applyPhosphorus: "Aplique fósforo cerca de la zona raíz para mejor absorción temprana.",
    supplementPotash: "Suministre potasa para mejorar resistencia al estrés y fortaleza de plantas.",
    addCompost: "Agregue compost o FYM para mejorar carbono del suelo y estructura.",
    mulching: "Use acolchado e intervalos de riego más cortos para reducir estrés hídrico.",
    improveDrainage: "Mejore el drenaje antes de lluvia intensa y evite pérdida de fertilizante.",
    maintainSchedule: "El suelo es relativamente estable; mantenga cronograma y vuelva a probar después de 45-60 días.",
    estimatedSoilFertility: "Índice estimado de fertilidad del suelo:",
    primaryNutrient: "Estado nutricional primario:",
    waterCondition: "Condición de agua:",
    organicCarbonStatus: "El carbono orgánico es",
    demoMode1: "Demo 01",
    demoMode2: "Demo 02",
    demoMode3: "Demo 03"
  },
  fr: {
    appName: "Leaflens",
    home: "Accueil",
    services: "Services",
    soil: "Sol",
    about: "À propos",
    heroKicker: "Démo d'agriculture de précision pour les agriculteurs indiens",
    heroTitle: "Détectez les maladies des cultures plus rapidement et planifiez les travaux des champs en toute confiance.",
    heroText: "Leaflens réunit le dépistage des symptômes des cultures et des conseils météorologiques simples dans une interface claire et conviviale pour mobile afin que les agriculteurs examinent ce qu'ils voient dans le champ et décident quoi faire ensuite.",
    tryDemo: "Essayer la démo",
    seeProjectScope: "Voir la portée du projet",
    platform: "Plateforme",
    platformTitle: "Construit autour des trois contrôles que les agriculteurs recherchent en premier",
    platformCopy: "Cette version est toujours une démo frontale, mais l'interface se rapproche davantage d'un produit réel avec des flux de travail de maladie, météo et sol conçus pour des décisions rapides sur le terrain.",
    diseaseDetection: "Détection des maladies",
    leafSymptomScreening: "Dépistage des symptômes des feuilles",
    leafSymptomDesc: "Guidez l'utilisateur de la sélection des cultures au téléchargement d'images avec une carte de résultats ciblée et des conseils de traitement pratiques.",
    weatherPlanning: "Planification météorologique",
    fieldReadyForecast: "Panneau de prévision prêt pour le champ",
    forecastDesc: "Résumer la température, la probabilité de précipitations et une brève recommandation pour les trois prochains jours.",
    soilAnalysis: "Analyse du sol",
    dataDrivernSoil: "Informations sur le sol basées sur les données",
    soilDesc: "Analysez le pH, NPK, l'humidité, le carbone organique et les valeurs climatiques pour obtenir un score de fertilité et des actions correctives majeures.",
    demo01: "Démo 01",
    detectCropDisease: "Détecter les maladies des cultures",
    interviewMode: "Mode Entretien",
    detectSimulate: "Simulez un agriculteur téléchargeant une image de feuille et recevant une carte de diagnostic claire avec contexte de culture et conseils pour les prochaines étapes.",
    selectCrop: "Sélectionner une culture",
    uploadLeafPhoto: "Télécharger une photo de feuille",
    analyzeImage: "Analyser l'image",
    cropLimitNote: "La liste des cultures est limitée à ce que votre modèle ML actuel supporte.",
    noImageSelected: "Aucune image sélectionnée pour l'instant.",
    selectedImage: "Image sélectionnée",
    healthCheckMessage: "Vérification du statut de l'API ML...",
    mlApiHealth: "Santé de l'API ML",
    recheckApi: "Revérifier l'API",
    checking: "Vérification en cours...",
    online: "En ligne",
    wakingUp: "Réveil en cours",
    backendReachable: "Le backend est accessible et prêt pour l'analyse d'images.",
    renderWakingUp: "Le backend Render se réveille. Réessayez dans 30 à 60 secondes.",
    detectionResult: "Résultat de la détection",
    diseaseNotDetected: "Maladie non détectée",
    diseaseDetected: "Maladie détectée",
    cropAnalyzed: "Culture analysée",
    mode: "Mode",
    mlModelAnalysis: "Analyse du modèle ML",
    demoMode: "Mode démo",
    status: "Statut",
    severity: "Gravité",
    recommendation: "Recommandation",
    topPredictions: "Prédictions principales",
    confidenceMargin: "Marge de confiance (Top1-Top2)",
    whyVerification: "Pourquoi la vérification est nécessaire",
    demo02: "Démo 02",
    weatherOutlook: "Perspectives météorologiques",
    weatherSimulate: "Entrez un nom de lieu et obtenez un rapide conseil agricole de 3 jours à partir de données en direct.",
    location: "Lieu",
    locationHint: "Ex. Delhi, Mumbai, Bangalore",
    getWeather: "Obtenir la météo",
    demo03: "Démo 03",
    soilTool: "Analyse du carbone et de la fertilité du sol",
    soilSimulate: "Entrez les valeurs du test de sol et obtenez des informations importantes sur la fertilité, le stress hydrique et les actions correctives.",
    fertilityScore: "Score de fertilité",
    waterRisk: "Risque d'eau",
    nutrientRisk: "Risque de nutriments",
    yieldOutlook: "Perspectives de rendement",
    majorInsights: "Informations majeures",
    majorDrivers: "Facteurs majeurs",
    recommendations: "Recommandations",
    section02: "Aperçu du terrain",
    section02Title: "Un écran pour trois vérifications agricoles à fort impact.",
    leafScanTitle: "Démo de numérisation des feuilles",
    weatherTitle: "Perspectives météorologiques",
    soilTitle: "Intelligence du sol",
    leafScanDesc: "Sélectionnez une culture, téléchargez une image de feuille et examinez un résumé structuré de la maladie.",
    weatherDesc: "Générez une carte de prévision de 3 jours avec précipitations et conseils de travail.",
    soilPanelDesc: "Entrez les valeurs du sol et obtenez instantanément des informations majeures sur la fertilité, l'eau et le risque de nutriments.",
    selectLanguage: "Langue",
    thunderstormRisk: "Risque d'orage prévu. Éviter les opérations en plein air pendant les heures d'éclair.",
    highRainChance: "Forte probabilité de pluie. Reporter la pulvérisation et protéger les apports et récoltes.",
    possibleShowers: "Averses possibles. Garder les canaux de drainage ouverts et planifier des fenêtres de travail flexibles.",
    hotConditions: "Conditions chaudes attendues. Préférer l'irrigation tôt le matin ou en fin d'après-midi.",
    coolTemperatures: "Températures nocturnes fraîches attendues. Protéger les semis sensibles au besoin.",
    stableWeather: "Météo stable attendue. Fenêtre appropriée pour la surveillance régulière des champs et les opérations légères.",
    variableWeather: "Météo variable",
    healthyLeafGuidance: "Guide des feuilles saines",
    weeklyLeafChecks: "Effectuez des vérifications foliaires hebdomadaires pour détecter les symptômes précoces avant la propagation.",
    avoidOverwatering: "Éviter l'arrosage excessif et améliorer la circulation d'air autour de la canopée de culture.",
    preventiveBioFungicide: "Appliquer un biofongicide préventif pendant les périodes humides ou pluvieuses.",
    priorityTreatmentPlan: "Plan de traitement prioritaire",
    isolateInfected: "Isoler les plantes ou feuilles visiblement infectées pour réduire la propagation d'un champ à l'autre.",
    startFungicideProtocol: "Commencer le protocole de fongicide recommandé immédiatement et répéter selon les instructions.",
    recheckField: "Revérifier le champ dans 48-72 heures et documenter la progression avec des photos.",
    suggestedFieldActions: "Actions suggérées sur le terrain",
    removeAffectedLeaves: "Retirer les feuilles affectées et désinfecter les outils après chaque rang.",
    applyTargetedTreatment: "Appliquer un traitement ciblé aux heures fraîches pour une meilleure rétention des feuilles.",
    reviewNutrientBalance: "Examiners l'équilibre nutritivo pour améliorer la résistance naturelle aux maladies.",
    locationNotFound: "Lieu non trouvé. Essayez un nom de ville comme Delhi, Pune ou Jaipur.",
    forecastUnavailable: "Les données de prévision ne sont actuellement pas disponibles pour ce lieu.",
    unableReachWeather: "Impossible d'accéder au service météorologique en ce moment. Veuillez réessayer.",
    uploadImage: "Veuillez d'abord télécharger une image.",
    analyzeLoading: "Analyse de l'image avec modèle ML en cours...",
    analyzeTimeout: "L'analyse d'image a dépassé le délai. Veuillez réessayer avec une image plus claire et plus petite.",
    analyzeError: "Impossible d'analyser l'image en ce moment. Veuillez réessayer.",
    apiUnreachable: "Impossible d'accéder à l'API ML. Vérifiez l'état du backend et assurez-vous que VITE_API_BASE_URL pointe vers un endpoint HTTPS en direct.",
    apiError: "La requête API a échoué avec le statut",
    renderUnavailable: "Le backend Render se réveille ou est indisponible (503). Attendez 30-60 secondes et réessayez Analyser l'image.",
    toggleNavigation: "Basculer la navigation",
    yourLocation: "Votre lieu",
    forecastLoading: "Récupération de la prévision en direct pour",
    unableFetchForecast: "Impossible d'obtenir la prévision en ce moment.",
    unableAnalyzeSoil: "Impossible d'analyser le profil du sol en ce moment.",
    soilUnreachable: "L'API en direct est actuellement inaccessible. Affichage de l'analyse intégrée du site Web.",
    soilAnalyzeLoading: "Analyse du profil du sol et génération d'informations clés en cours...",
    soilBuiltInAnalysis: "Le mode d'analyse intégré du site Web est actif.",
    usingRenderBackend: "Utilisation du backend Render par défaut pour la détection des maladies.",
    fieldSnapshot: "Aperçu du terrain",
    oneScreenChecks: "Un écran pour trois vérifications agricoles à fort impact.",
    forecastTitle: "Perspectives météorologiques",
    weatherForecast: "Prévision 3 jours",
    get3DayForecast: "Obtenir la prévision 3 jours",
    forecastFor: "Prévision pour",
    updated: "Mise à jour",
    minTemp: "Min",
    rainChance: "Pluie",
    soilAnalysisTitle: "Analyse du sol et informations majeures",
    soilFormCrop: "Culture",
    soilPH: "pH",
    soilNitrogen: "Azote (mg/kg)",
    soilPhosphorus: "Phosphore (mg/kg)",
    soilPotassium: "Potassium (mg/kg)",
    soilMoisture: "Humidité (%)",
    soilCarbon: "Carbone Organique (%)",
    soilTemp: "Temp (°C)",
    soilRainfall: "Précipitations (mm)",
    analyzeButton: "Analyser le sol",
    needsVerification: "Nécessite vérification",
    confident: "% Confiant",
    detectedHeading: "Maladie détectée",
    healthyHeading: "Sain",
    acidicSoil: "Le sol acide peut réduire l'absorption des nutriments.",
    alkalinePH: "Un pH alcalin peut bloquer le phosphore et les micronutriments.",
    lowNitrogen: "L'azote est faible, réduisant le potentiel de croissance végétative.",
    highNitrogen: "L'azote est élevé; surveillez l'excès de feuillage et la pression parasitaire.",
    lowPhosphorus: "Le phosphore est faible, affectant le développement des racines et la floraison.",
    highPhosphorus: "Le phosphore est élevé; évitez les applications DAP inutiles.",
    lowPotassium: "Le potassium est faible, augmentant le stress et le risque de verse.",
    highPotassium: "Le potassium est élevé; rééquilibrez le calendrier d'engrais futurs.",
    lowOrganicCarbon: "Un faible carbone organique indique une mauvaise structure du sol et une biologie.",
    lowMoisture: "L'humidité du sol est faible et peut limiter la disponibilité des nutriments.",
    highMoisture: "L'humidité du sol est élevée et peut augmenter le risque de maladie des racines.",
    highSoilTemp: "Une température du sol élevée peut stresser les racines et l'activité microbienne.",
    lowSoilTemp: "Une température du sol basse peut ralentir la minéralisation des nutriments.",
    highRainfall: "Les précipitations très élevées peuvent causer une perte de nutriments par lessivage.",
    applyLime: "Appliquer la chaux graduellement pour corriger un pH acide.",
    useGypsum: "Utilisez le gypse et la matière organique pour améliorer la disponibilité du sol alcalin.",
    increaseNitrogen: "Augmentez l'azote en applications fractionnées selon le stade de la culture.",
    applyPhosphorus: "Appliquez le phosphore près de la zone racinaire pour une meilleure absorption précoce.",
    supplementPotash: "Fournir de la potasse pour améliorer la tolérance au stress et la vigueur de la plante.",
    addCompost: "Ajoutez du compost ou du FYM pour améliorer le carbone du sol et la structure.",
    mulching: "Utilisez le paillage et les intervalles d'irrigation plus courts pour réduire le stress hydrique.",
    improveDrainage: "Améliorez le drainage avant les fortes pluies et évitez la perte d'engrais.",
    maintainSchedule: "Le sol est relativement stable; maintenez le calendrier et retestez après 45-60 jours.",
    estimatedSoilFertility: "Indice estimé de fertilité du sol:",
    primaryNutrient: "État nutritionnel primaire:",
    waterCondition: "Condition de l'eau:",
    organicCarbonStatus: "Le carbone organique est",
    demoMode1: "Démo 01",
    demoMode2: "Démo 02",
    demoMode3: "Démo 03"
  },
  hi: {
    appName: "Leaflens",
    home: "होम",
    services: "सेवाएं",
    soil: "मिट्टी",
    about: "के बारे में",
    heroKicker: "भारतीय किसानों के लिए सटीक खेती डेमो",
    heroTitle: "फसल रोगों का तेजी से पता लगाएं और अधिक आत्मविश्वास के साथ खेती का काम योजना बनाएं।",
    heroText: "Leaflens फसल के लक्षणों की जांच और सरल मौसम मार्गदर्शन को एक स्पष्ट मोबाइल-अनुकूल इंटरफेस में लाता है ताकि किसान देख सकें कि वे खेत में क्या देख रहे हैं और अगला क्या करें।",
    tryDemo: "डेमो आज़माएं",
    seeProjectScope: "प्रोजेक्ट स्कोप देखें",
    platform: "प्लेटफॉर्म",
    platformTitle: "किसानों द्वारा पहले मांगी जाने वाली तीन जांचों के आसपास निर्मित",
    platformCopy: "यह संस्करण अभी भी एक फ्रंटएंड डेमो है, लेकिन इंटरफेस तेजी से खेत के निर्णयों के लिए डिज़ाइन किए गए रोग, मौसम और मिट्टी के वर्कफ़्लो के साथ एक वास्तविक उत्पाद के करीब महसूस करता है।",
    diseaseDetection: "रोग पहचान",
    leafSymptomScreening: "पत्ती के लक्षण जांच",
    leafSymptomDesc: "उपयोगकर्ता को फसल चयन से लेकर छवि अपलोड तक एक केंद्रित परिणाम कार्ड और व्यावहारिक उपचार सलाह के साथ गाइड करें।",
    weatherPlanning: "मौसम योजना",
    fieldReadyForecast: "खेत के लिए तैयार पूर्वानुमान पैनल",
    forecastDesc: "तापमान, वर्षा की संभावना और अगले तीन दिनों के लिए एक संक्षिप्त सुझाव को सारांश दें।",
    soilAnalysis: "मिट्टी विश्लेषण",
    dataDrivernSoil: "डेटा-संचालित मिट्टी अंतर्दृष्टि",
    soilDesc: "उर्वरता स्कोर और प्रमुख सुधारात्मक कार्यों के लिए pH, NPK, नमी, जैविक कार्बन और जलवायु मानों का विश्लेषण करें।",
    demo01: "डेमो 01",
    detectCropDisease: "फसल रोग का पता लगाएं",
    interviewMode: "साक्षात्कार मोड",
    detectSimulate: "एक किसान को पत्ती की छवि अपलोड करने और फसल संदर्भ और अगली चरण सलाह के साथ एक स्पष्ट निदान कार्ड प्राप्त करने का अनुकरण करें।",
    selectCrop: "फसल चुनें",
    uploadLeafPhoto: "पत्ती फोटो अपलोड करें",
    analyzeImage: "छवि का विश्लेषण करें",
    cropLimitNote: "फसल सूची इस तक सीमित है कि आपका वर्तमान ML मॉडल क्या समर्थन करता है।",
    noImageSelected: "अभी तक कोई छवि नहीं चुनी गई है।",
    selectedImage: "चयनित छवि",
    healthCheckMessage: "ML API स्थिति की जांच की जा रही है...",
    mlApiHealth: "ML API स्वास्थ्य",
    recheckApi: "API को फिर से जांचें",
    checking: "जांच की जा रही है...",
    online: "ऑनलाइन",
    wakingUp: "जाग रहा है",
    backendReachable: "बैकएंड पहुंचने योग्य है और छवि विश्लेषण के लिए तैयार है।",
    renderWakingUp: "Render बैकएंड जाग रहा है। लगभग 30-60 सेकंड में दोबारा कोशिश करें।",
    detectionResult: "पहचान परिणाम",
    diseaseNotDetected: "रोग का पता नहीं चला",
    diseaseDetected: "रोग का पता चला",
    cropAnalyzed: "फसल का विश्लेषण किया गया",
    mode: "मोड",
    mlModelAnalysis: "ML मॉडल विश्लेषण",
    demoMode: "डेमो मोड",
    status: "स्थिति",
    severity: "गंभीरता",
    recommendation: "अनुशंसा",
    topPredictions: "शीर्ष भविष्यवाणियां",
    confidenceMargin: "आत्मविश्वास मार्जिन (Top1-Top2)",
    whyVerification: "सत्यापन क्यों आवश्यक है",
    demo02: "डेमो 02",
    weatherOutlook: "मौसम दृष्टिकोण",
    weatherSimulate: "एक स्थान का नाम दर्ज करें और लाइव डेटा से 3-दिन की त्वरित खेती सलाह प्राप्त करें।",
    location: "स्थान",
    locationHint: "जैसे दिल्ली, मुंबई, बेंगलुरु",
    getWeather: "मौसम प्राप्त करें",
    demo03: "डेमो 03",
    soilTool: "मिट्टी कार्बन और उर्वरता विश्लेषण",
    soilSimulate: "मिट्टी परीक्षण मान दर्ज करें और उर्वरता, जल तनाव और सुधारात्मक कार्यों के बारे में प्रमुख अंतर्दृष्टि प्राप्त करें।",
    fertilityScore: "उर्वरता स्कोर",
    waterRisk: "जल जोखिम",
    nutrientRisk: "पोषक तत्व जोखिम",
    yieldOutlook: "फसल दृष्टिकोण",
    majorInsights: "प्रमुख अंतर्दृष्टि",
    majorDrivers: "प्रमुख चालक",
    recommendations: "अनुशंसाएं",
    section02: "खेत स्नैपशॉट",
    section02Title: "तीन उच्च प्रभाव वाली खेत जांचों के लिए एक स्क्रीन।",
    leafScanTitle: "पत्ती स्कैन डेमो",
    weatherTitle: "मौसम दृष्टिकोण",
    soilTitle: "मिट्टी बुद्धिमत्ता",
    leafScanDesc: "एक फसल चुनें, पत्ती की छवि अपलोड करें और एक संरचित रोग सारांश की समीक्षा करें।",
    weatherDesc: "वर्षा और काम सलाह के साथ 3-दिन का पूर्वानुमान कार्ड तैयार करें।",
    soilPanelDesc: "मिट्टी मान दर्ज करें और उर्वरता, जल और पोषक तत्व जोखिम से संबंधित तुरंत प्रमुख अंतर्दृष्टि प्राप्त करें।",
    selectLanguage: "भाषा",
    thunderstormRisk: "तूफान का जोखिम अपेक्षित है। बिजली के घंटों के दौरान खुले मैदान के संचालन से बचें।",
    highRainChance: "उच्च वर्षा की संभावना। छिड़काव में देरी करें और इनपुट और कटाई की गई उपज की सुरक्षा करें।",
    possibleShowers: "संभावित बौछारें। जल निकास चैनलों को खुला रखें और लचीली खेती के समय की योजना बनाएं।",
    hotConditions: "गर्म परिस्थितियां अपेक्षित हैं। सुबह जल्दी या शाम को देर में सिंचाई को प्राथमिकता दें।",
    coolTemperatures: "ठंडी रातों के तापमान की अपेक्षा है। जहां आवश्यक हो संवेदनशील पौधों की सुरक्षा करें।",
    stableWeather: "स्थिर मौसम की अपेक्षा है। नियमित मैदान निगरानी और हल्के परचालन के लिए उपयुक्त समय।",
    variableWeather: "परिवर्तनशील मौसम",
    healthyLeafGuidance: "स्वस्थ पत्ती मार्गदर्शन",
    weeklyLeafChecks: "प्रसार से पहले प्रारंभिक लक्षणों को पकड़ने के लिए साप्ताहिक पत्ती जांच रखें।",
    avoidOverwatering: "अत्यधिक सिंचाई से बचें और फसल की छतरी के चारों ओर वायु संचार में सुधार करें।",
    preventiveBioFungicide: "नम या बरसात की अवधि के दौरान निवारक जैव कवकनाशक लागू करें।",
    priorityTreatmentPlan: "प्राथमिकता उपचार योजना",
    isolateInfected: "दृश्य रूप से संक्रमित पौधों या पत्तियों को अलग करें ताकि खेत में संक्रमण कम हो।",
    startFungicideProtocol: "अनुशंसित कवकनाशी प्रोटोकॉल को तुरंत शुरू करें और सलाह के अनुसार दोहराएं।",
    recheckField: "48-72 घंटों में खेत की फिर से जांच करें और तस्वीरों के साथ प्रगति को दस्तावेज़ करें।",
    suggestedFieldActions: "सुझाए गए खेत कार्य",
    removeAffectedLeaves: "प्रभावित पत्तियों को हटाएं और प्रत्येक पंक्ति के बाद उपकरणों को कीटाणुरहित करें।",
    applyTargetedTreatment: "ठंडे घंटों में लक्षित उपचार लागू करें बेहतर पत्ती प्रतिधारण के लिए।",
    reviewNutrientBalance: "प्राकृतिक रोग प्रतिरोध में सुधार के लिए पोषक संतुलन की समीक्षा करें।",
    locationNotFound: "स्थान नहीं मिला। दिल्ली, पुणे या जयपुर जैसे शहर का नाम आज़माएं।",
    forecastUnavailable: "इस स्थान के लिए पूर्वानुमान डेटा वर्तमान में उपलब्ध नहीं है।",
    unableReachWeather: "अभी मौसम सेवा तक नहीं पहुंचा जा सकता। कृपया फिर से प्रयास करें।",
    uploadImage: "कृपया पहले एक छवि अपलोड करें।",
    analyzeLoading: "ML मॉडल के साथ छवि का विश्लेषण जारी है...",
    analyzeTimeout: "छवि विश्लेषण का समय समाप्त हो गया। कृपया एक स्पष्ट, छोटी छवि के साथ फिर से प्रयास करें।",
    analyzeError: "अभी छवि का विश्लेषण नहीं किया जा सकता। कृपया फिर से प्रयास करें।",
    apiUnreachable: "ML API तक नहीं पहुंचा जा सकता। बैकएंड स्थिति की जांच करें और सुनिश्चित करें कि VITE_API_BASE_URL एक लाइव HTTPS एंडपॉइंट की ओर संकेत करता है।",
    apiError: "API अनुरोध स्थिति के साथ विफल रहा",
    renderUnavailable: "Render बैकएंड जाग रहा है या उपलब्ध नहीं है (503)। 30-60 सेकंड प्रतीक्षा करें और छवि का विश्लेषण करें फिर से प्रयास करें।",
    toggleNavigation: "नेविगेशन को टॉगल करें",
    yourLocation: "आपका स्थान",
    forecastLoading: "के लिए लाइव पूर्वानुमान प्राप्त किया जा रहा है",
    unableFetchForecast: "अभी पूर्वानुमान प्राप्त नहीं किया जा सकता।",
    unableAnalyzeSoil: "अभी मिट्टी प्रोफ़ाइल का विश्लेषण नहीं किया जा सकता।",
    soilUnreachable: "लाइव API वर्तमान में अगम्य है। अंतर्निहित वेबसाइट विश्लेषण दिखाया जा रहा है।",
    soilAnalyzeLoading: "मिट्टी प्रोफ़ाइल का विश्लेषण और मुख्य अंतर्दृष्टि उत्पन्न किया जा रहा है...",
    soilBuiltInAnalysis: "अंतर्निहित वेबसाइट विश्लेषण मोड सक्रिय है।",
    usingRenderBackend: "रोग पहचान के लिए डिफ़ॉल्ट Render बैकएंड का उपयोग किया जा रहा है।",
    fieldSnapshot: "खेत स्नैपशॉट",
    oneScreenChecks: "तीन उच्च प्रभाव वाली खेत जांचों के लिए एक स्क्रीन।",
    forecastTitle: "मौसम दृष्टिकोण",
    weatherForecast: "3-दिवसीय पूर्वानुमान",
    get3DayForecast: "3-दिवसीय पूर्वानुमान प्राप्त करें",
    forecastFor: "के लिए पूर्वानुमान",
    updated: "अपडेट किया गया",
    minTemp: "न्यूनतम",
    rainChance: "बारिश",
    soilAnalysisTitle: "मिट्टी विश्लेषण और प्रमुख अंतर्दृष्टि",
    soilFormCrop: "फसल",
    soilPH: "pH",
    soilNitrogen: "नाइट्रोजन (mg/kg)",
    soilPhosphorus: "फॉस्फोरस (mg/kg)",
    soilPotassium: "पोटेशियम (mg/kg)",
    soilMoisture: "नमी (%)",
    soilCarbon: "कार्बनिक कार्बन (%)",
    soilTemp: "तापमान (°C)",
    soilRainfall: "वर्षा (mm)",
    analyzeButton: "मिट्टी का विश्लेषण करें",
    needsVerification: "सत्यापन की आवश्यकता है",
    confident: "% आश्वस्त",
    detectedHeading: "रोग का पता चला",
    healthyHeading: "स्वस्थ",
    acidicSoil: "अम्लीय मिट्टी पोषक तत्व अवशोषण को कम कर सकती है।",
    alkalinePH: "क्षारीय pH फॉस्फोरस और सूक्ष्म पोषक तत्वों को बंद कर सकता है।",
    lowNitrogen: "नाइट्रोजन कम है, सब्जी वृद्धि की संभावना को कम करता है।",
    highNitrogen: "नाइट्रोजन अधिक है; अत्यधिक पत्ते और कीट के दबाव की निगरानी करें।",
    lowPhosphorus: "फॉस्फोरस कम है, जड़ विकास और फूल को प्रभावित करता है।",
    highPhosphorus: "फॉस्फोरस अधिक है; अनावश्यक DAP अनुप्रयोगों से बचें।",
    lowPotassium: "पोटेशियम कम है, तनाव और बंद होने का जोखिम बढ़ाता है।",
    highPotassium: "पोटेशियम अधिक है; भविष्य की खाद अनुसूची को पुनः संतुलित करें।",
    lowOrganicCarbon: "कम कार्बनिक कार्बन खराब मिट्टी संरचना और जीव विज्ञान का संकेत देता है।",
    lowMoisture: "मिट्टी की नमी कम है और पोषक तत्व की उपलब्धता को सीमित कर सकती है।",
    highMoisture: "मिट्टी की नमी अधिक है और जड़ रोग का जोखिम बढ़ा सकती है।",
    highSoilTemp: "उच्च मिट्टी का तापमान जड़ों और सूक्ष्म जीव गतिविधि को तनाव दे सकता है।",
    lowSoilTemp: "कम मिट्टी का तापमान पोषक खनिजकरण को धीमा कर सकता है।",
    highRainfall: "बहुत अधिक वर्षा पोषक तत्वों की लीचिंग का कारण बन सकती है।",
    applyLime: "अम्लीय pH को ठीक करने के लिए धीरे-धीरे चूना लागू करें।",
    useGypsum: "क्षारीय मिट्टी की उपलब्धता में सुधार के लिए जिप्सम और जैविक पदार्थ का उपयोग करें।",
    increaseNitrogen: "फसल स्तर के आधार पर विभाजित आवेदन में नाइट्रोजन बढ़ाएं।",
    applyPhosphorus: "बेहतर प्रारंभिक अवशोषण के लिए जड़ क्षेत्र के पास फॉस्फोरस लागू करें।",
    supplementPotash: "तनाव सहनशीलता और पौधे की शक्ति में सुधार के लिए पोटास की खपत करें।",
    addCompost: "मिट्टी के कार्बन और संरचना में सुधार के लिए खाद या FYM जोड़ें।",
    mulching: "जल तनाव को कम करने के लिए मल्चिंग और छोटे सिंचाई अंतराल का उपयोग करें।",
    improveDrainage: "भारी बारिश से पहले जल निकास में सुधार करें और खाद हानि से बचें।",
    maintainSchedule: "मिट्टी अपेक्षाकृत स्थिर है; अनुसूची बनाए रखें और 45-60 दिनों के बाद फिर से परीक्षण करें।",
    estimatedSoilFertility: "अनुमानित मिट्टी उर्वरता सूचकांक:",
    primaryNutrient: "प्राथमिक पोषक स्थिति:",
    waterCondition: "जल स्थिति:",
    organicCarbonStatus: "कार्बनिक कार्बन है",
    demoMode1: "डेमो 01",
    demoMode2: "डेमो 02",
    demoMode3: "डेमो 03"
  }
};

function getWeatherLabel(code) {
  return weatherCodeLabels[code] || "Variable weather";
}

function getFarmingAdvice(maxTemp, minTemp, rainChance, weatherCode, t) {
  if (weatherCode >= 95) {
    return t.thunderstormRisk;
  }
  if (rainChance >= 70) {
    return t.highRainChance;
  }
  if (rainChance >= 40) {
    return t.possibleShowers;
  }
  if (maxTemp >= 36) {
    return t.hotConditions;
  }
  if (minTemp <= 10) {
    return t.coolTemperatures;
  }
  return t.stableWeather;
}

function formatForecastDate(dateString, timeZone) {
  const [year, month, day] = dateString.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(dateObj);
  const fullDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone
  }).format(dateObj);

  return { weekday, fullDate };
}

function formatUpdatedTime(timeZone) {
  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  };

  try {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-GB", options).format(new Date());
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {}, geoRequestTimeoutMs);
  if (!response.ok) {
    throw new Error("Unable to reach weather service right now. Please try again.");
  }
  return response.json();
}

async function getLocationDetails(locationName) {
  const cacheKey = normalizeLocationKey(locationName);
  const cached = getCachedWithTtl(geocodeCache, cacheKey, geocodeCacheTtlMs);
  if (cached) {
    return cached;
  }

  const query = new URLSearchParams({
    name: locationName,
    count: "1",
    language: "en",
    format: "json"
  });
  const data = await fetchJson(`${geocodeEndpoint}?${query.toString()}`);

  if (!data.results || data.results.length === 0) {
    throw new Error("Location not found. Try a city name like Delhi, Pune, or Jaipur.");
  }

  const bestMatch = data.results[0];
  const placeParts = [bestMatch.name, bestMatch.admin1, bestMatch.country].filter(Boolean);

  const result = {
    latitude: bestMatch.latitude,
    longitude: bestMatch.longitude,
    timeZone: bestMatch.timezone || "Asia/Kolkata",
    displayName: placeParts.join(", ")
  };

  setCachedWithTtl(geocodeCache, cacheKey, result);
  return result;
}

async function getForecast(latitude, longitude, timeZone) {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: timeZone,
    forecast_days: "3"
  });
  const data = await fetchJson(`${forecastEndpoint}?${query.toString()}`);

  if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
    throw new Error("Forecast data is currently unavailable for this location.");
  }

  return data.daily;
}

async function searchNominatimPlaces(queryText) {
  const query = new URLSearchParams({
    q: queryText,
    format: "jsonv2",
    limit: "16",
    addressdetails: "1"
  });

  const response = await fetchWithTimeout(
    `${nominatimEndpoint}?${query.toString()}`,
    {
      headers: {
        Accept: "application/json"
      }
    },
    geoRequestTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`Nominatim request failed (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function mapNominatimRowsToStores(rows, place) {
  const mapped = rows
    .map((row) => {
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const primaryName = String(row.name || "").trim();
      const displayName = String(row.display_name || "").trim();
      const inferredName = primaryName || displayName.split(",")[0] || "Agri Input Store";

      // Keep entries that look agro-relevant by primary name or display label.
      if (!(isAgroRelevantName(inferredName) || isAgroRelevantName(displayName))) {
        return null;
      }

      return {
        id: `nominatim-${row.place_id}`,
        name: inferredName,
        address: displayName || "Address unavailable in map data",
        phone: "Phone not listed",
        labels: inferStoreTags(inferredName, { source: displayName }),
        distanceKm: distanceInKm(place.latitude, place.longitude, lat, lon)
      };
    })
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  for (const row of mapped) {
    const key = `${row.name.toLowerCase()}|${row.address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 6);
}

async function getFallbackAgroStores(locationName, place) {
  const searchTerms = [
    `agro store ${locationName}`,
    `fertilizer shop ${locationName}`,
    `seed store ${locationName}`
  ];

  const settled = await Promise.allSettled(searchTerms.map((term) => searchNominatimPlaces(term)));
  const rows = settled
    .filter((entry) => entry.status === "fulfilled")
    .flatMap((entry) => entry.value);

  return mapNominatimRowsToStores(rows, place);
}

async function getNearbyAgroStores(locationName) {
  const cacheKey = normalizeLocationKey(locationName);
  const cached = getCachedWithTtl(agroStoreCache, cacheKey, agroStoreCacheTtlMs);
  if (cached) {
    return cached;
  }

  const place = await getLocationDetails(locationName);
  const strictRadius = 12000;
  const broadRadius = 15000;

  const strictQuery = `[out:json][timeout:18];
(
  node["shop"~"agrarian|farm|garden_centre",i](around:${strictRadius},${place.latitude},${place.longitude});
  way["shop"~"agrarian|farm|garden_centre",i](around:${strictRadius},${place.latitude},${place.longitude});
  node["name"~"agro|agri|fertili[sz]er|pesticide|seed|krishi|kisan|nursery",i](around:${strictRadius},${place.latitude},${place.longitude});
  way["name"~"agro|agri|fertili[sz]er|pesticide|seed|krishi|kisan|nursery",i](around:${strictRadius},${place.latitude},${place.longitude});
);
out center tags 70;`;

  const broadQuery = `[out:json][timeout:18];
(
  node["shop"~"hardware|garden_centre|doityourself",i](around:${broadRadius},${place.latitude},${place.longitude});
  way["shop"~"hardware|garden_centre|doityourself",i](around:${broadRadius},${place.latitude},${place.longitude});
);
out center tags 70;`;

  let result;

  try {
    const strictElements = await fetchOverpassQuery(strictQuery);
    const broadElements = strictElements.length >= 4 ? [] : await fetchOverpassQuery(broadQuery);
    const elements = [...strictElements, ...broadElements];

    const mapped = elements
      .map((item) => {
        const lat = item.lat ?? item.center?.lat;
        const lon = item.lon ?? item.center?.lon;
        if (typeof lat !== "number" || typeof lon !== "number") return null;

        const tags = item.tags || {};
        const name = tags.name || "Agri Input Store";
        const shop = tags.shop || "";

        // Keep map entries that are clearly agro-related by name or shop type.
        if (!(isAgroRelevantName(name) || isAgroRelevantShop(shop))) {
          return null;
        }

        const locality = [tags["addr:street"], tags["addr:suburb"], tags["addr:city"], tags["addr:state"]]
          .filter(Boolean)
          .join(", ");

        return {
          id: `${item.type}-${item.id}`,
          name,
          address: locality || "Address unavailable in map data",
          phone: tags["contact:phone"] || tags.phone || "Phone not listed",
          labels: inferStoreTags(name, { ...tags, shop }),
          distanceKm: distanceInKm(place.latitude, place.longitude, lat, lon)
        };
      })
      .filter(Boolean);

    const unique = [];
    const seen = new Set();
    for (const row of mapped) {
      const key = `${row.name.toLowerCase()}|${row.address.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }

    const stores = unique.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 6);
    if (!stores.length) {
      throw new Error("No tagged agro-input stores were found nearby. Try a nearby district or major city.");
    }

    result = {
      displayName: place.displayName,
      stores,
      source: "overpass"
    };
  } catch {
    const fallbackStores = await getFallbackAgroStores(locationName, place);

    if (!fallbackStores.length) {
      throw new Error("Map services are busy right now. Please retry in 30-60 seconds.");
    }

    result = {
      displayName: place.displayName,
      stores: fallbackStores,
      source: "nominatim"
    };
  }

  setCachedWithTtl(agroStoreCache, cacheKey, result);
  return result;
}

function getDiseaseInsight(result, t) {
  if (!result?.isDetected) {
    return {
      heading: t.healthyLeafGuidance,
      points: [
        t.weeklyLeafChecks,
        t.avoidOverwatering,
        t.preventiveBioFungicide
      ]
    };
  }

  if (String(result.severity).toLowerCase() === "high") {
    return {
      heading: t.priorityTreatmentPlan,
      points: [
        t.isolateInfected,
        t.startFungicideProtocol,
        t.recheckField
      ]
    };
  }

  return {
    heading: t.suggestedFieldActions,
    points: [
      t.removeAffectedLeaves,
      t.applyTargetedTreatment,
      t.reviewNutrientBalance
    ]
  };
}

function getSoilBandTone(fertilityBand) {
  const band = String(fertilityBand || "").toLowerCase();
  if (band === "high") {
    return "high";
  }
  if (band === "moderate") {
    return "moderate";
  }
  return "low";
}

function classifyLevel(value, low, high) {
  if (value < low) {
    return "low";
  }
  if (value > high) {
    return "high";
  }
  return "optimal";
}

function buildClientSoilAnalysis(rawInputs) {
  const ph = Number(rawInputs.ph || 0);
  const nitrogen = Number(rawInputs.nitrogen || 0);
  const phosphorus = Number(rawInputs.phosphorus || 0);
  const potassium = Number(rawInputs.potassium || 0);
  const moisture = Number(rawInputs.moisture || 0);
  const organicCarbon = Number(rawInputs.organicCarbon || 0);
  const temperature = Number(rawInputs.temperature || 0);
  const rainfall = Number(rawInputs.rainfall || 0);

  const levels = {
    nitrogen: classifyLevel(nitrogen, 40, 120),
    phosphorus: classifyLevel(phosphorus, 20, 60),
    potassium: classifyLevel(potassium, 80, 220),
    organicCarbon: classifyLevel(organicCarbon, 0.7, 1.5)
  };

  const penalties = [];

  if (ph < 6.0) {
    penalties.push([12, "Acidic soil may reduce nutrient uptake."]);
  } else if (ph > 7.8) {
    penalties.push([10, "Alkaline pH can lock phosphorus and micronutrients."]);
  }

  if (levels.nitrogen === "low") {
    penalties.push([16, "Nitrogen is low, reducing vegetative growth potential."]);
  } else if (levels.nitrogen === "high") {
    penalties.push([6, "Nitrogen is high; monitor excess foliage and pest pressure."]);
  }

  if (levels.phosphorus === "low") {
    penalties.push([14, "Phosphorus is low, affecting root development and flowering."]);
  } else if (levels.phosphorus === "high") {
    penalties.push([6, "Phosphorus is high; avoid unnecessary DAP applications."]);
  }

  if (levels.potassium === "low") {
    penalties.push([12, "Potassium is low, increasing stress and lodging risk."]);
  } else if (levels.potassium === "high") {
    penalties.push([5, "Potassium is high; rebalance future fertilizer schedule."]);
  }

  if (levels.organicCarbon === "low") {
    penalties.push([11, "Low organic carbon indicates poor soil structure and biology."]);
  }

  if (moisture < 30) {
    penalties.push([12, "Soil moisture is low and may limit nutrient availability."]);
  } else if (moisture > 75) {
    penalties.push([9, "Soil moisture is high and can increase root disease risk."]);
  }

  if (temperature > 35) {
    penalties.push([7, "High soil temperature can stress roots and microbial activity."]);
  } else if (temperature < 12) {
    penalties.push([5, "Low soil temperature can slow nutrient mineralization."]);
  }

  if (rainfall > 180) {
    penalties.push([6, "Very high rainfall may cause nutrient leaching."]);
  }

  const totalPenalty = penalties.reduce((sum, item) => sum + item[0], 0);
  const fertilityScore = Number(Math.max(18, Math.min(99, 100 - totalPenalty)).toFixed(1));

  const fertilityBand = fertilityScore >= 80 ? "High" : fertilityScore >= 60 ? "Moderate" : "Low";
  const waterRisk = moisture < 30 ? "Drought Stress" : moisture > 75 || rainfall > 140 ? "Waterlogging Risk" : "Low";
  const lowCount = Object.values(levels).filter((item) => item === "low").length;
  const highCount = Object.values(levels).filter((item) => item === "high").length;
  const nutrientRisk = lowCount >= 2 ? "Nutrient Deficiency Risk" : highCount >= 2 ? "Nutrient Excess Risk" : "Balanced";

  const recommendations = [];
  if (ph < 6) recommendations.push("Apply lime gradually to correct acidic pH.");
  if (ph > 7.8) recommendations.push("Use gypsum and organic matter to improve alkaline soil availability.");
  if (levels.nitrogen === "low") recommendations.push("Increase nitrogen in split applications based on crop stage.");
  if (levels.phosphorus === "low") recommendations.push("Apply phosphorus near root zone for better early uptake.");
  if (levels.potassium === "low") recommendations.push("Supplement potash to improve stress tolerance and plant strength.");
  if (levels.organicCarbon === "low") recommendations.push("Add compost or FYM to improve soil carbon and structure.");
  if (waterRisk === "Drought Stress") recommendations.push("Use mulching and shorter irrigation intervals to reduce water stress.");
  if (waterRisk === "Waterlogging Risk") recommendations.push("Improve drainage before heavy rain and avoid fertilizer loss.");
  if (!recommendations.length) recommendations.push("Soil is relatively stable; maintain schedule and retest after 45-60 days.");

  const majorDrivers = penalties.slice(0, 4).map((item) => item[1]);
  if (!majorDrivers.length) {
    majorDrivers.push("Soil parameters are within a stable operational range.");
  }

  return {
    crop: rawInputs.crop || "General Crop",
    fertility_score: fertilityScore,
    fertility_band: fertilityBand,
    water_risk: waterRisk,
    nutrient_risk: nutrientRisk,
    yield_outlook:
      fertilityScore >= 75
        ? "Good yield potential if disease and weather are managed well."
        : fertilityScore >= 60
          ? "Moderate yield potential; targeted nutrient corrections can improve output."
          : "Yield is at risk without immediate nutrient and water management adjustments.",
    major_insights: [
      `Estimated soil fertility index: ${fertilityScore}/100 (${fertilityBand}).`,
      `Primary nutrient status: N=${levels.nitrogen}, P=${levels.phosphorus}, K=${levels.potassium}.`,
      `Water condition: ${waterRisk} based on moisture ${moisture}% and rainfall ${rainfall} mm.`,
      `Organic carbon is ${levels.organicCarbon} at ${organicCarbon}% impacting soil structure and microbial activity.`
    ],
    major_drivers: majorDrivers,
    recommendations
  };
}

function App() {
  const { language, setLanguage, tSync } = useTranslation();
  const t = translations[language] || translations.en;

  const [menuOpen, setMenuOpen] = useState(false);
  const [crop, setCrop] = useState("all");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(t.noImageSelected);
  const [diseaseResult, setDiseaseResult] = useState(null);
  const [location, setLocation] = useState("");
  const [weatherCards, setWeatherCards] = useState([]);
  const [weatherMetaInfo, setWeatherMetaInfo] = useState("Live forecast powered by Open-Meteo.");
  const [weatherStatus, setWeatherStatus] = useState(null);
  const [storeLocation, setStoreLocation] = useState("Ludhiana");
  const [storeMetaInfo, setStoreMetaInfo] = useState("Live agro stores powered by OpenStreetMap data.");
  const [storeStatus, setStoreStatus] = useState(null);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [inputRecommendations, setInputRecommendations] = useState(() => buildInputRecommendations(null, null));
  const [soilInputs, setSoilInputs] = useState({
    crop: "Tomato",
    ph: "6.7",
    nitrogen: "90",
    phosphorus: "42",
    potassium: "160",
    moisture: "48",
    organicCarbon: "1.1",
    temperature: "29",
    rainfall: "65"
  });
  const [soilStatus, setSoilStatus] = useState(null);
  const [soilResult, setSoilResult] = useState(null);
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [demoUploadStep, setDemoUploadStep] = useState(1);
  const [apiHealth, setApiHealth] = useState({
    state: "checking",
    label: "Checking",
    message: "Checking ML API status..."
  });

  const supportedModelCrops = [
    "Apple",
    "Blueberry",
    "Cherry",
    "Maize",
    "Grape",
    "Orange",
    "Peach",
    "Bell Pepper",
    "Potato",
    "Raspberry",
    "Soybean",
    "Squash",
    "Strawberry",
    "Tomato"
  ];

  const [detectionStatus, setDetectionStatus] = useState(null);

  useEffect(() => {
    setInputRecommendations(buildInputRecommendations(diseaseResult, soilResult));
  }, [diseaseResult, soilResult]);

  // Translate dynamic content when language changes
  useEffect(() => {
    const translateDiseaseData = async () => {
      if (language === 'en') return;
      
      // Translate disease names, descriptions, and advice
      for (const disease of diseases) {
        disease.name = await translateText(disease.name, language, 'en');
        disease.desc = await translateText(disease.desc, language, 'en');
        disease.severity = await translateText(disease.severity, language, 'en');
        disease.advice = await translateText(disease.advice, language, 'en');
      }
    };

    const translateWeatherData = async () => {
      if (language === 'en') return;

      // Translate weather code labels
      for (const [code, label] of Object.entries(weatherCodeLabels)) {
        weatherCodeLabels[code] = await translateText(label, language, 'en');
      }
    };

    translateDiseaseData();
    translateWeatherData();
  }, [language]);

  const previewUrl = useMemo(() => {
      if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }
    return "";
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const checkApiHealth = async (showChecking = false) => {
    if (showChecking) {
      setApiHealth({ state: "checking", label: t.checking, message: t.healthCheckMessage });
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${apiBaseUrl}/health`, {
        method: "GET",
        signal: controller.signal
      });

      if (response.ok) {
        setApiHealth({
          state: "online",
          label: t.online,
          message: t.backendReachable
        });
        return;
      }

      if (response.status === 503) {
        setApiHealth({
          state: "degraded",
          label: t.wakingUp,
          message: t.renderWakingUp
        });
        return;
      }

      setApiHealth({
        state: "offline",
        label: "Unavailable",
        message: `Backend responded with status ${response.status}.`
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setApiHealth({
          state: "offline",
          label: "Timeout",
          message: "Health check timed out. Verify Render service status and network."
        });
      } else {
        setApiHealth({
          state: "offline",
          label: "Offline",
          message: "Cannot reach ML API endpoint."
        });
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    checkApiHealth(true);
    const intervalId = window.setInterval(() => {
      checkApiHealth(false);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleDiseaseSubmit = (event) => {
    event.preventDefault();
    setDetectionStatus({ type: "loading", message: t.analyzeLoading });
    setDiseaseResult(null);

    if (!selectedFile) {
      setDetectionStatus({ type: "error", message: t.uploadImage });
      return;
    }

    // On hosted frontend, if custom API is not configured, show which backend is being used.
    if (!isLocalhost && !hasConfiguredExternalApi) {
      setDetectionStatus({
        type: "info",
        message: t.usingRenderBackend
      });
    }

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("crop", crop);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45000);

    fetch(`${apiBaseUrl}/predict`, {
      method: "POST",
      body: formData,
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          let payload = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }

          if (response.status === 503) {
            throw new Error(t.renderUnavailable);
          }

          throw new Error(payload?.error || `${t.apiError} ${response.status}.`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.error) {
          setDiseaseResult(null);
          setDetectionStatus({ type: "error", message: data.error });
          return;
        }

        // Parse disease name and severity
        const invalidImage = Boolean(data.invalid_image);
        const diseaseName = invalidImage
          ? "Uncertain Result"
          : String(data.disease || "Unknown").replace(/_/g, " ");
        const isHealthy = invalidImage || diseaseName.toLowerCase().includes("healthy");
        const confidence = data.confidence.toFixed(2);
        const needsReview = Boolean(data.needs_review);
        const uncertaintyReasons = data.uncertainty_reasons || [];
        const predictedCrop = invalidImage ? "Unknown" : (data.crop_name || crop);
        const confidenceMargin = typeof data.confidence_margin === "number"
          ? data.confidence_margin.toFixed(2)
          : "N/A";

        // Map to severity levels
        let severity = "Moderate";
        if (isHealthy) {
          severity = "None";
        } else if (diseaseName.includes("Blast") || diseaseName.includes("Blight")) {
          severity = "High";
        }

        // Create result payload
        const resultPayload = {
          name: diseaseName,
          desc: invalidImage
            ? `The uploaded image could not be verified as a clear leaf sample. Confidence was ${confidence}% and this result needs verification.`
            : needsReview
              ? `Model predicted ${diseaseName} (${confidence}%), but this result needs verification.`
              : `ML model detected: ${diseaseName} with ${confidence}% confidence.`,
          severity,
          advice: invalidImage
            ? "Upload a clear close-up leaf photo in natural light, filling most of the frame, then try Analyze Image again."
            : needsReview
              ? "Retake a clearer leaf photo and verify this result before spraying inputs."
              : isHealthy
                ? "Continue regular monitoring, balanced irrigation, and preventive care."
                : "Please consult with an agronomist for detailed treatment recommendations.",
          crop: [predictedCrop],
          statusLabel: invalidImage ? t.needsVerification : (isHealthy ? t.diseaseNotDetected : t.diseaseDetected),
          confidence: parseFloat(confidence),
          topPredictions: data.top_3 || [],
          needsReview,
          uncertaintyReasons,
          confidenceMargin
        };

        setDiseaseResult({
          ...resultPayload,
          imageSource: previewUrl,
          isDetected: !isHealthy,
          imageAlt: `${predictedCrop} leaf uploaded for analysis`
        });
        setDetectionStatus(null);
      })
      .catch((error) => {
        let errorMessage = t.analyzeError;

        if (error instanceof Error && error.name === "AbortError") {
          errorMessage = t.analyzeTimeout;
        } else if (error instanceof TypeError) {
          errorMessage = t.apiUnreachable;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setDiseaseResult(null);
        setDetectionStatus({ type: "error", message: errorMessage });
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });
  };

  const handleWeatherSubmit = async (event) => {
    event.preventDefault();

    const locationName = location.trim() || "Delhi";
    setWeatherStatus({ type: "loading", message: `${t.forecastLoading} ${locationName}...` });

    try {
      const place = await getLocationDetails(locationName);
      const dailyData = await getForecast(place.latitude, place.longitude, place.timeZone);

      const cards = dailyData.time.map((day, dayIndex) => {
        const maxTemp = Math.round(dailyData.temperature_2m_max[dayIndex]);
        const minTemp = Math.round(dailyData.temperature_2m_min[dayIndex]);
        const rainChance = Math.round(dailyData.precipitation_probability_max[dayIndex] ?? 0);
        const weatherCode = dailyData.weathercode[dayIndex];
        const conditionLabel = getWeatherLabel(weatherCode);
        const advice = getFarmingAdvice(maxTemp, minTemp, rainChance, weatherCode, t);
        const { weekday, fullDate } = formatForecastDate(day, place.timeZone);

        return {
          weekday,
          fullDate,
          maxTemp,
          minTemp,
          rainChance,
          conditionLabel,
          advice,
          delayMs: dayIndex * 120
        };
      });

      setWeatherCards(cards);
      setWeatherStatus(null);
      setWeatherMetaInfo(`Forecast for ${place.displayName} (${place.timeZone}) • Updated ${formatUpdatedTime(place.timeZone)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.unableFetchForecast;
      setWeatherCards([]);
      setWeatherStatus({ type: "error", message });
      setWeatherMetaInfo("Live forecast powered by Open-Meteo.");
    }
  };

  const handleSoilInputChange = (event) => {
    const { name, value } = event.target;
    setSoilInputs((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSoilSubmit = async (event) => {
    event.preventDefault();
    setSoilStatus({ type: "loading", message: t.soilAnalyzeLoading });

    try {
      const response = await fetch(`${apiBaseUrl}/analyze-soil`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(soilInputs)
      });

      const payload = await response.json();
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Soil analysis failed. Check API status on port 5000.");
      }

      setSoilResult(payload.analysis);
      setSoilStatus(null);
    } catch (error) {
      // Fallback keeps the feature usable if API is unreachable.
      setSoilResult(buildClientSoilAnalysis(soilInputs));
      const message = error instanceof Error ? error.message : t.unableAnalyzeSoil;
      setSoilStatus({
        type: "info",
        message: `${t.soilUnreachable} (${message}).`
      });
    }
  };

  const handleLoadFieldSupport = async (event) => {
    event.preventDefault();

    const queryLocation = storeLocation.trim() || location.trim() || "Ludhiana";
    setStoreStatus({ type: "loading", message: `Finding agro stores around ${queryLocation}...` });

    try {
      const result = await getNearbyAgroStores(queryLocation);
      setNearbyStores(result.stores);
      if (result.source === "nominatim") {
        setStoreMetaInfo(`Nearby stores for ${result.displayName} • OpenStreetMap fallback data`);
        setStoreStatus({ type: "info", message: "Overpass is busy. Showing fallback store results." });
      } else {
        setStoreMetaInfo(`Nearby stores for ${result.displayName} • OpenStreetMap/Overpass live data`);
        setStoreStatus(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load nearby stores right now.";
      setNearbyStores([]);
      setStoreStatus({ type: "error", message });
      setStoreMetaInfo("Live agro stores powered by OpenStreetMap data.");
    }
  };

  return (
    <>
      <header className="site-header">
        <nav className="container">
          <a className="logo" href="#home" onClick={() => setMenuOpen(false)}>
            {t.appName}
          </a>
          <ul className={`nav-links${menuOpen ? " active" : ""}`}>
            <li>
              <a href="#home" onClick={() => setMenuOpen(false)}>
                {t.home}
              </a>
            </li>
            <li>
              <a href="#services" onClick={() => setMenuOpen(false)}>
                {t.services}
              </a>
            </li>
            <li>
              <a href="#soil-tool" onClick={() => setMenuOpen(false)}>
                {t.soil}
              </a>
            </li>
            <li>
              <a href="#about" onClick={() => setMenuOpen(false)}>
                {t.about}
              </a>
            </li>
          </ul>
          <select
            className="language-selector"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t.selectLanguage}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="hi">हिंदी</option>
            <option value="pt">Português</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
            <option value="ar">العربية</option>
          </select>
          <button
            className="mobile-toggle"
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            ☰
          </button>
        </nav>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="container hero-shell">
            <div className="hero-copy">
              <p className="hero-kicker">{t.heroKicker}</p>
              <h1>{t.heroTitle}</h1>
              <p className="hero-text">
                {t.heroText}
              </p>
              <div className="hero-actions">
                <a href="#services" className="cta-button">
                  {t.tryDemo}
                </a>
                <a href="#about" className="secondary-button">
                  {t.seeProjectScope}
                </a>
              </div>
              <div className="hero-highlights">
                <span>6 crop profiles</span>
                <span>Disease result cards</span>
                <span>3-day forecast panel</span>
                <span>Soil insight dashboard</span>
              </div>
            </div>
            <aside className="hero-panel">
              <div className="hero-panel-card">
                <p className="panel-label">Field Snapshot</p>
                <h2>One screen for three high-impact farm checks.</h2>
                <div className="snapshot-list">
                  <div className="snapshot-item">
                    <span className="snapshot-value">01</span>
                    <div>
                      <h3>{t.leafScanTitle}</h3>
                      <p>{t.leafScanDesc}</p>
                    </div>
                  </div>
                  <div className="snapshot-item">
                    <span className="snapshot-value">02</span>
                    <div>
                      <h3>{t.weatherTitle}</h3>
                      <p>{t.weatherDesc}</p>
                    </div>
                  </div>
                  <div className="snapshot-item">
                    <span className="snapshot-value">03</span>
                    <div>
                      <h3>{t.soilTitle}</h3>
                      <p>{t.soilPanelDesc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="services" className="services-section">
          <div className="container">
            <div className="section-heading">
              <p className="section-label">{t.platform}</p>
              <h2 className="section-title">{t.platformTitle}</h2>
              <p className="section-copy">
                {t.platformCopy}
              </p>
            </div>

            <div className="services-grid">
              <article className="service-card">
                <div className="service-icon">🌿</div>
                <p className="service-tag">{t.diseaseDetection}</p>
                <h3>{t.leafSymptomScreening}</h3>
                <p>
                  {t.leafSymptomDesc}
                </p>
              </article>
              <article className="service-card">
                <div className="service-icon">☁️</div>
                <p className="service-tag">{t.weatherPlanning}</p>
                <h3>{t.fieldReadyForecast}</h3>
                <p>{t.forecastDesc}</p>
              </article>
              <article className="service-card">
                <div className="service-icon">🧪</div>
                <p className="service-tag">{t.soilAnalysis}</p>
                <h3>{t.dataDrivernSoil}</h3>
                <p>
                  {t.soilDesc}
                </p>
              </article>
            </div>

            <div className="demo-grid">
              <section className="tool-panel" aria-labelledby="detection-heading">
                <div className="panel-heading">
                  <p className="panel-label">{t.demo01}</p>
                  <h3 className="demo-title" id="detection-heading">
                    {t.detectCropDisease}
                  </h3>
                  
                  <p className="panel-copy">
                    Simulate a farmer uploading a leaf image and receiving a clear diagnosis card with crop context and
                    next-step advice.
                  </p>
                  <div className="api-health-card" role="status" aria-live="polite">
                    <div className="api-health-row">
                      <p className="api-health-label">ML API Health</p>
                      <span className={`api-health-pill api-health-pill-${apiHealth.state}`}>{apiHealth.label}</span>
                    </div>
                    <p className="api-health-message">{apiHealth.message}</p>
                    <button
                      type="button"
                      className="api-health-action"
                      onClick={() => checkApiHealth(true)}
                      disabled={apiHealth.state === "checking"}
                    >
                      {apiHealth.state === "checking" ? "Checking..." : "Recheck API"}
                    </button>
                  </div>
                </div>

                <form className="detection-form" onSubmit={handleDiseaseSubmit}>
                  <div className="form-group">
                    <label htmlFor="crop-type">{t.selectCrop}</label>
                    <select id="crop-type" value={crop} onChange={(event) => setCrop(event.target.value)}>
                      <option value="all">Auto detect (all crops)</option>
                      {supportedModelCrops.map((cropName) => (
                        <option key={cropName}>{cropName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="image-upload">{t.uploadLeafPhoto}</label>
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setSelectedFile(file);
                        if (file && crop === "all") {
                          const inferredCrop = inferCropFromFilename(file.name);
                          if (inferredCrop) {
                            setCrop(inferredCrop);
                          }
                        }
                        setUploadStatus(file ? `${t.selectedImage}: ${file.name}` : t.noImageSelected);
                      }}
                    />
                    <p className="form-hint">
                      {t.cropLimitNote}
                    </p>
                    <p className="upload-status">{uploadStatus}</p>
                  </div>
                  <div className="form-group">
                    <button type="submit">{t.analyzeImage}</button>
                  </div>
                </form>

                {detectionStatus && (
                  <div className={`weather-status weather-status-${detectionStatus.type}`} style={{ marginTop: "20px" }}>
                    {detectionStatus.message}
                  </div>
                )}

                {diseaseResult && (
                  <div className="result-card" data-severity={diseaseResult.severity.toLowerCase()} style={{ display: "block" }}>
                    <div className="result-header">
                      <div>
                        <p className="result-label">Detection Result</p>
                        <h3 id="disease-title">{diseaseResult.name}</h3>
                      </div>
                      <span className="result-pill">
                        {diseaseResult.needsReview
                          ? "Needs Verification"
                          : diseaseResult.confidence
                            ? `${diseaseResult.confidence}% Confident`
                            : "ML Analysis"}
                      </span>
                    </div>
                    <p className="result-summary">
                      <strong>Crop analyzed:</strong> {diseaseResult.crop} • <strong>Mode:</strong>{" "}
                      {selectedFile ? "ML model analysis" : "Demo mode"} • <strong>Status:</strong>{" "}
                      {diseaseResult.statusLabel}
                    </p>
                    <div className="result-body">
                      <div className="result-details">
                        <p>{diseaseResult.desc}</p>
                        <p>
                          <strong>Severity:</strong> {diseaseResult.severity}
                        </p>
                        {diseaseResult.topPredictions && diseaseResult.topPredictions.length > 0 && (
                          <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e5e5" }}>
                            <p style={{ fontSize: "0.875rem", color: "#666" }}>
                              <strong>Top Predictions:</strong>
                            </p>
                            <p style={{ fontSize: "0.82rem", color: "#666", marginTop: "4px" }}>
                              Confidence margin (Top1-Top2): {diseaseResult.confidenceMargin}%
                            </p>
                            <ul style={{ fontSize: "0.875rem", marginLeft: "12px" }}>
                              {diseaseResult.topPredictions.map((pred, idx) => (
                                <li key={idx}>
                                  {pred.disease.replace(/_/g, " ")} ({pred.confidence.toFixed(2)}%)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {diseaseResult.needsReview && diseaseResult.uncertaintyReasons?.length > 0 && (
                          <div
                            style={{
                              marginTop: "12px",
                              padding: "10px",
                              borderRadius: "12px",
                              border: "1px solid #f0c36d",
                              background: "#fff8e8"
                            }}
                          >
                            <p style={{ fontSize: "0.875rem", marginBottom: "6px", color: "#7a4b00" }}>
                              <strong>Why verification is needed:</strong>
                            </p>
                            <ul style={{ marginLeft: "12px", fontSize: "0.85rem", color: "#7a4b00" }}>
                              {diseaseResult.uncertaintyReasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p>
                          <strong>Recommendation:</strong> {diseaseResult.advice}
                        </p>
                      </div>
                      <div className="result-side">
                        <img
                          className="disease-img"
                          src={diseaseResult.imageSource}
                          alt={diseaseResult.imageAlt}
                          style={{ display: "block" }}
                        />
                        <div className="disease-insight-card">
                          <p className="disease-insight-title">{getDiseaseInsight(diseaseResult, t).heading}</p>
                          <ul className="disease-insight-list">
                            {getDiseaseInsight(diseaseResult, t).points.map((point) => (
                              <li key={point}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="tool-panel" aria-labelledby="weather-heading">
                <div className="panel-heading">
                  <p className="panel-label">Demo 02</p>
                  <h3 className="forecast-title" id="weather-heading">
                    Weather Forecast
                  </h3>
                  <p className="panel-copy">
                    Generate a three-day local weather panel with crop-friendly fieldwork guidance.
                  </p>
                </div>

                <form className="weather-form" onSubmit={handleWeatherSubmit}>
                  <div className="form-group">
                    <label htmlFor="location">Your Location</label>
                    <input
                      type="text"
                      id="location"
                      placeholder="Delhi, Punjab, Lucknow..."
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <button type="submit">Get 3-Day Forecast</button>
                  </div>
                </form>

                <p className="weather-source">{weatherMetaInfo}</p>

                {(weatherStatus || weatherCards.length > 0) && (
                  <div className="weather-grid" style={{ display: "grid" }}>
                    {weatherStatus && (
                      <div className={`weather-status weather-status-${weatherStatus.type}`}>
                        {weatherStatus.message}
                      </div>
                    )}
                    {!weatherStatus &&
                      weatherCards.map((card) => (
                        <div
                          className="weather-card"
                          style={{ animationDelay: `${card.delayMs}ms` }}
                          key={`${card.fullDate}-${card.weekday}`}
                        >
                          <p className="weather-day">{card.weekday}</p>
                          <p className="weather-date">{card.fullDate}</p>
                          <div className="temp">{card.maxTemp}°C</div>
                          <p className="weather-condition">{card.conditionLabel}</p>
                          <div className="weather-meta">
                            <span>Min {card.minTemp}°C</span>
                            <span>Rain {card.rainChance}%</span>
                          </div>
                          <p className="weather-advice">
                            <em>{card.advice}</em>
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              <section id="soil-tool" className="tool-panel" aria-labelledby="soil-heading">
                <div className="panel-heading">
                  <p className="panel-label">Demo 03</p>
                  <h3 className="forecast-title" id="soil-heading">
                    Soil Analysis and Major Insights
                  </h3>
                  <p className="panel-copy">
                    Enter your soil and field data to estimate fertility level, identify key risks, and get practical
                    recommendations for the next field cycle.
                  </p>
                </div>

                <form className="soil-form" onSubmit={handleSoilSubmit}>
                  <div className="soil-grid-inputs">
                    <div className="form-group">
                      <label htmlFor="soil-crop">Crop</label>
                      <input
                        id="soil-crop"
                        name="crop"
                        type="text"
                        value={soilInputs.crop}
                        onChange={handleSoilInputChange}
                        placeholder="Tomato"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-ph">pH</label>
                      <input
                        id="soil-ph"
                        name="ph"
                        type="number"
                        step="0.1"
                        min="3"
                        max="10"
                        value={soilInputs.ph}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-n">Nitrogen (mg/kg)</label>
                      <input
                        id="soil-n"
                        name="nitrogen"
                        type="number"
                        step="0.1"
                        value={soilInputs.nitrogen}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-p">Phosphorus (mg/kg)</label>
                      <input
                        id="soil-p"
                        name="phosphorus"
                        type="number"
                        step="0.1"
                        value={soilInputs.phosphorus}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-k">Potassium (mg/kg)</label>
                      <input
                        id="soil-k"
                        name="potassium"
                        type="number"
                        step="0.1"
                        value={soilInputs.potassium}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-moisture">Moisture (%)</label>
                      <input
                        id="soil-moisture"
                        name="moisture"
                        type="number"
                        step="0.1"
                        value={soilInputs.moisture}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-carbon">Organic Carbon (%)</label>
                      <input
                        id="soil-carbon"
                        name="organicCarbon"
                        type="number"
                        step="0.01"
                        value={soilInputs.organicCarbon}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-temp">Soil Temp (C)</label>
                      <input
                        id="soil-temp"
                        name="temperature"
                        type="number"
                        step="0.1"
                        value={soilInputs.temperature}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="soil-rain">Rainfall (mm, recent)</label>
                      <input
                        id="soil-rain"
                        name="rainfall"
                        type="number"
                        step="0.1"
                        value={soilInputs.rainfall}
                        onChange={handleSoilInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <button type="submit">Analyze Soil Data</button>
                  </div>
                </form>

                {soilStatus && (
                  <div className={`weather-status weather-status-${soilStatus.type}`} style={{ marginTop: "20px" }}>
                    {soilStatus.message}
                  </div>
                )}

                {soilResult && (
                  <div className={`soil-result-card soil-tone-${getSoilBandTone(soilResult.fertility_band)}`}>
                    <div className="soil-result-top">
                      <div>
                        <p className="result-label">Soil Insight Report</p>
                        <h4>{soilResult.crop}</h4>
                      </div>
                      <span className="soil-score-pill">{soilResult.fertility_score}/100</span>
                    </div>

                    <div className="soil-kpi-row">
                      <p>
                        <strong>Fertility Band:</strong> {soilResult.fertility_band}
                      </p>
                      <p>
                        <strong>Water Risk:</strong> {soilResult.water_risk}
                      </p>
                      <p>
                        <strong>Nutrient Risk:</strong> {soilResult.nutrient_risk}
                      </p>
                    </div>

                    <p className="soil-yield-note">
                      <strong>Yield Outlook:</strong> {soilResult.yield_outlook}
                    </p>

                    <div className="soil-columns">
                      <div>
                        <p className="soil-block-title">Major Insights</p>
                        <ul className="soil-list">
                          {soilResult.major_insights.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="soil-block-title">Key Recommendations</p>
                        <ul className="soil-list">
                          {soilResult.recommendations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>

        <section id="field-support" className="field-support-section">
          <div className="container">
            <div className="section-heading">
              <p className="section-label">Field Support</p>
              <h2 className="section-title">Pesticides, Fertilizers, and Nearby Agro Stores</h2>
              <p className="section-copy">
                Recommendations are generated from the detected disease and soil profile (rule-based, non-random). Nearby
                stores are fetched live from OpenStreetMap Overpass.
              </p>
            </div>

            <div className="input-plan-grid">
              <article className="input-plan-card">
                <div className="input-plan-head">
                  <div className="input-plan-icon">🧪</div>
                  <h3>Pesticides</h3>
                </div>
                <ul className="input-plan-list">
                  {inputRecommendations.pesticides.map((item) => (
                    <li key={item.name}>
                      <p className="input-name">{item.name}</p>
                      <p className="input-meta">{item.dosage} · {item.schedule}</p>
                      {item.purpose && <p className="input-detail">{item.purpose}</p>}
                      {item.tip && <p className="input-tip">Tip: {item.tip}</p>}
                    </li>
                  ))}
                </ul>
                <div className="input-insight-panel">
                  <p className="input-insight-title">Pesticide Insights</p>
                  <ul>
                    {inputRecommendations.pesticideInsights.focus.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="input-insight-panel input-insight-panel-soft">
                  <p className="input-insight-title">Safety and Application Checklist</p>
                  <ul>
                    {inputRecommendations.pesticideInsights.checklist.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </article>

              <article className="input-plan-card">
                <div className="input-plan-head">
                  <div className="input-plan-icon">🌾</div>
                  <h3>Fertilizers</h3>
                </div>
                <ul className="input-plan-list">
                  {inputRecommendations.fertilizers.map((item) => (
                    <li key={item.name}>
                      <p className="input-name">{item.name}</p>
                      <p className="input-meta">{item.dosage} · {item.stage}</p>
                      {item.purpose && <p className="input-detail">{item.purpose}</p>}
                      {item.tip && <p className="input-tip">Tip: {item.tip}</p>}
                    </li>
                  ))}
                </ul>
                <div className="input-insight-panel">
                  <p className="input-insight-title">Fertilizer Insights</p>
                  <ul>
                    {inputRecommendations.fertilizerInsights.focus.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="input-insight-panel input-insight-panel-soft">
                  <p className="input-insight-title">Nutrient Management Checklist</p>
                  <ul>
                    {inputRecommendations.fertilizerInsights.checklist.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>

            <article className="stores-panel">
              <div className="stores-panel-head">
                <div>
                  <p className="panel-label">Nearby Agro Stores</p>
                  <p className="weather-source">{storeMetaInfo}</p>
                </div>
                <form className="stores-form" onSubmit={handleLoadFieldSupport}>
                  <input
                    type="text"
                    value={storeLocation}
                    onChange={(event) => setStoreLocation(event.target.value)}
                    placeholder="Enter city, e.g. Ludhiana"
                  />
                  <button type="submit">Find Stores</button>
                </form>
              </div>

              {storeStatus && <div className={`weather-status weather-status-${storeStatus.type}`}>{storeStatus.message}</div>}

              {nearbyStores.length > 0 && (
                <div className="stores-grid">
                  {nearbyStores.map((store) => (
                    <article className="store-card" key={store.id}>
                      <div className="store-title-row">
                        <h4>{store.name}</h4>
                        <span className="store-distance">{store.distanceKm.toFixed(1)} km away</span>
                      </div>
                      <p className="store-line">📍 {store.address}</p>
                      <p className="store-line">📞 {store.phone}</p>
                      <div className="store-tags">
                        {store.labels.map((label) => (
                          <span key={`${store.id}-${label}`}>{label}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="support-links">
                <div>
                  <p className="support-label">Kisan Call Centre</p>
                  <p>1800-180-1551</p>
                </div>
                <div>
                  <p className="support-label">PM Kisan Portal</p>
                  <p>https://pmkisan.gov.in</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="about" className="about-section">
          <div className="container">
            <div className="section-heading">
              <p className="section-label">About</p>
              <h2 className="section-title">A student project with a field-first interface</h2>
            </div>
            <div className="about-grid">
              <article className="about-card about-card-primary">
                <h3>Why this concept matters</h3>
                <p className="about-copy">
                  Many crop decisions happen quickly and directly in the field. Leaflens is designed to keep important
                  information visible, readable, and actionable on a phone-sized screen.
                </p>
              </article>
              <article className="about-card">
                <h3>What the current demo includes</h3>
                <ul className="about-list">
                  <li>Component-based React UI with state-driven result rendering.</li>
                  <li>Clearer hierarchy between hero content, feature cards, and interactive tools.</li>
                  <li>Responsive panels that stay usable on desktop and mobile layouts.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-shell">
          <p className="footer-brand">Leaflens Demo</p>
          <p>Educational frontend prototype for crop health workflows • March 2026</p>
        </div>
      </footer>
    </>
  );
}

export default App;
