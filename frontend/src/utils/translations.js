// Translations dictionary for MandiDarpan (Hindi and English)
export const translations = {
  hi: {
    brandNameFirst: "Mandi",
    brandNameSecond: "Darpan",
    tagline: "किसान भाइयों के लिए ताज़ा मंडी भाव",
    nav: {
      home: "होम",
      livePrices: "ताज़ा भाव",
      trends: "भाव रुझान",
      compare: "मंडी तुलना",
      nearest: "नज़दीकी मंडी",
      assistant: "AI सहायक",
    },
    home: {
      welcomeTitle: "नमस्ते किसान भाई! 🙏",
      welcomeSubtitle: "आज अपनी फसल का सही सरकारी मंडी भाव देखें और सही समय पर बेचें।",
      quickLookupHeading: "फसल और मंडी चुनें",
      commodityLabel: "फसल का नाम (Crop)",
      districtLabel: "ज़िला (District)",
      stateLabel: "राज्य (State)",
      selectCommodityPlaceholder: "-- फसल चुनें --",
      selectDistrictPlaceholder: "ज़िले का नाम दर्ज करें (जैसे Lucknow, Kanpur)",
      selectStatePlaceholder: "राज्य चुनें (वैकल्पिक)",
      submitButton: "भाव देखें / Get Prices",
      loading: "ताज़ा मंडी भाव लाए जा रहे हैं...",
      latestPriceCardTitle: "ताज़ा मंडी भाव विवरण",
      marketLabel: "मंडी का नाम:",
      districtStateLabel: "ज़िला व राज्य:",
      varietyLabel: "किस्म (Variety):",
      gradeLabel: "ग्रेड:",
      modalPriceLabel: "मॉडल भाव (औसत दर)",
      perQuintal: "/ क्विंटल",
      minPriceLabel: "न्यूनतम भाव:",
      maxPriceLabel: "अधिकतम भाव:",
      reportedDateLabel: "रिपोर्टिंग तारीख:",
      recordsFound: "कुल रिकॉर्ड्स मिले:",
      sourceNotice: "सरकारी स्रोत: Agmarknet (data.gov.in) वास्तविक आंकड़े",
      noDataTitle: "कोई रिकॉर्ड नहीं मिला",
      noDataDesc: "चुनी गई फसल और ज़िले के लिए आज कोई मंडी भाव दर्ज नहीं है। कृपया पास का दूसरा ज़िला या अन्य फसल चुनकर देखें।",
      suggestedDistricts: "सुझाए गए ज़िले:",
      quickFeaturesHeading: "अन्य उपयोगी सेवाएं",
      featureTrendsTitle: "मूल्य रुझान (Price Trends)",
      featureTrendsDesc: "पिछले 7 दिनों में भाव बढ़ा या घटा, इसका ग्राफ और विश्लेषण देखें।",
      featureCompareTitle: "मंडियों की तुलना (Compare)",
      featureCompareDesc: "आस-पास की मंडियों में एक ही किस्म के भाव की तुलना करें।",
      featureNearestTitle: "नज़दीकी मंडी (Nearest Mandi)",
      featureNearestDesc: "अपने खेत से सबसे पास स्थित APMC मंडी की दूरी जानें।",
      featureAssistantTitle: "AI कृषि मित्र (AI Assistant)",
      featureAssistantDesc: "Gemma 4 AI से बोलकर या लिखकर अपनी भाषा में भाव पूछें।",
      exploreBtn: "खोलें →",
    },
    common: {
      errorTitle: "डेटा लोड करने में समस्या",
      retry: "पुनः प्रयास करें",
      rupeeSymbol: "₹",
      viewDetails: "विस्तार से देखें",
      backendOffline: "सर्वर से संपर्क नहीं हो पा रहा है। कृपया सुनिश्चित करें कि बैकएंड पोर्ट 5001 पर चल रहा है।",
      allRecords: "आज के सभी उपलब्ध भाव",
    }
  },
  en: {
    brandNameFirst: "Mandi",
    brandNameSecond: "Darpan",
    tagline: "Live Mandi Rates for Indian Farmers",
    nav: {
      home: "Home",
      livePrices: "Live Prices",
      trends: "Price Trends",
      compare: "Compare Mandis",
      nearest: "Find Nearest Mandi",
      assistant: "AI Assistant",
    },
    home: {
      welcomeTitle: "Welcome, Farmer Brother! 🙏",
      welcomeSubtitle: "Check authentic daily APMC mandi prices for your crops and make informed selling decisions.",
      quickLookupHeading: "Select Crop & Mandi",
      commodityLabel: "Crop / Commodity",
      districtLabel: "District",
      stateLabel: "State (Optional)",
      selectCommodityPlaceholder: "-- Select Crop --",
      selectDistrictPlaceholder: "Enter District (e.g. Lucknow, Kanpur)",
      selectStatePlaceholder: "Select State (Optional)",
      submitButton: "Get Prices / भाव देखें",
      loading: "Fetching live mandi prices...",
      latestPriceCardTitle: "Latest Reported Mandi Price",
      marketLabel: "Market (Mandi):",
      districtStateLabel: "District & State:",
      varietyLabel: "Variety:",
      gradeLabel: "Grade:",
      modalPriceLabel: "Modal Price (Average)",
      perQuintal: "/ Quintal",
      minPriceLabel: "Min Price:",
      maxPriceLabel: "Max Price:",
      reportedDateLabel: "Reported Date:",
      recordsFound: "Total Records Found:",
      sourceNotice: "Official Source: Agmarknet (data.gov.in) genuine records",
      noDataTitle: "No Mandi Records Found",
      noDataDesc: "No reported mandi prices found for the selected crop and district today. Try checking a neighboring district or another crop.",
      suggestedDistricts: "Suggested Districts:",
      quickFeaturesHeading: "Explore Other Services",
      featureTrendsTitle: "Price Trends",
      featureTrendsDesc: "Analyze whether prices rose or fell over recent days.",
      featureCompareTitle: "Compare Mandis",
      featureCompareDesc: "Compare prices across different mandis for the same variety and grade.",
      featureNearestTitle: "Find Nearest Mandi",
      featureNearestDesc: "Calculate distance to surrounding APMC markets from your location.",
      featureAssistantTitle: "AI Farming Assistant",
      featureAssistantDesc: "Ask crop price queries in simple Hindi or English with Gemma 4.",
      exploreBtn: "Open →",
    },
    common: {
      errorTitle: "Unable to Load Data",
      retry: "Retry",
      rupeeSymbol: "₹",
      viewDetails: "View Details",
      backendOffline: "Could not connect to the backend server. Please verify backend is running on port 5001.",
      allRecords: "All Reported Records Today",
    }
  }
};

// Popular agricultural crops in India with bilingual labels
export const POPULAR_CROPS = [
  { value: "Wheat", labelEn: "Wheat", labelHi: "गेहूं (Wheat)" },
  { value: "Paddy(Common)", labelEn: "Paddy / Rice (Common)", labelHi: "धान / चावल (Paddy)" },
  { value: "Potato", labelEn: "Potato", labelHi: "आलू (Potato)" },
  { value: "Tomato", labelEn: "Tomato", labelHi: "टमाटर (Tomato)" },
  { value: "Onion", labelEn: "Onion", labelHi: "प्याज (Onion)" },
  { value: "Mustard", labelEn: "Mustard", labelHi: "सरसों (Mustard)" },
  { value: "Maize", labelEn: "Maize / Corn", labelHi: "मक्का (Maize)" },
  { value: "Gram", labelEn: "Gram / Chana", labelHi: "चना (Gram)" },
  { value: "Green Chilli", labelEn: "Green Chilli", labelHi: "हरी मिर्च (Green Chilli)" },
  { value: "Garlic", labelEn: "Garlic", labelHi: "लहसुन (Garlic)" },
  { value: "Ginger(Green)", labelEn: "Ginger", labelHi: "अदरक (Ginger)" },
  { value: "Cotton", labelEn: "Cotton", labelHi: "कपास (Cotton)" },
  { value: "Apple", labelEn: "Apple", labelHi: "सेब (Apple)" },
  { value: "Banana", labelEn: "Banana", labelHi: "केला (Banana)" },
  { value: "Wood", labelEn: "Wood / Firewood", labelHi: "इमारती लकड़ी / काठ (Wood)" },
];

// Popular states supported by backend filter
export const POPULAR_STATES = [
  { value: "", labelEn: "-- All States --", labelHi: "-- सभी राज्य --" },
  { value: "Uttar Pradesh", labelEn: "Uttar Pradesh", labelHi: "उत्तर प्रदेश (Uttar Pradesh)" },
  { value: "Punjab", labelEn: "Punjab", labelHi: "पंजाब (Punjab)" },
  { value: "Haryana", labelEn: "Haryana", labelHi: "हरियाणा (Haryana)" },
  { value: "Madhya Pradesh", labelEn: "Madhya Pradesh", labelHi: "मध्य प्रदेश (Madhya Pradesh)" },
  { value: "Rajasthan", labelEn: "Rajasthan", labelHi: "राजस्थान (Rajasthan)" },
  { value: "Maharashtra", labelEn: "Maharashtra", labelHi: "महाराष्ट्र (Maharashtra)" },
  { value: "Bihar", labelEn: "Bihar", labelHi: "बिहार (Bihar)" },
  { value: "Gujarat", labelEn: "Gujarat", labelHi: "गुजरात (Gujarat)" },
];

// Popular districts for quick-pick chips
export const SUGGESTED_DISTRICTS = [
  "Lucknow",
  "Kanpur",
  "Varanasi",
  "Agra",
  "Ludhiana",
  "Bhopal",
  "Jaipur",
];

// District mapping by State for dependent dropdown selection
export const STATE_DISTRICTS_MAP = {
  "Uttar Pradesh": [
    "Lucknow",
    "Kanpur",
    "Varanasi",
    "Agra",
    "Prayagraj",
    "Bareilly",
    "Aligarh",
    "Meerut",
    "Gorakhpur",
    "Sitapur"
  ],
  "Madhya Pradesh": [
    "Bhopal",
    "Indore",
    "Ujjain",
    "Gwalior",
    "Jabalpur",
    "Dewas",
    "Sehore",
    "Vidisha"
  ],
  "Punjab": [
    "Ludhiana",
    "Amritsar",
    "Jalandhar",
    "Patiala",
    "Bathinda",
    "Ferozepur",
    "Sangrur"
  ],
  "Haryana": [
    "Karnal",
    "Hisar",
    "Ambala",
    "Kurukshetra",
    "Rohtak",
    "Sirsa",
    "Panipat"
  ],
  "Rajasthan": [
    "Jaipur",
    "Kota",
    "Jodhpur",
    "Bikaner",
    "Sri Ganganagar",
    "Alwar",
    "Bharatpur"
  ],
  "Maharashtra": [
    "Nashik",
    "Pune",
    "Nagpur",
    "Ahmednagar",
    "Solapur",
    "Kolhapur"
  ],
  "Bihar": [
    "Patna",
    "Muzaffarpur",
    "Gaya",
    "Bhagalpur",
    "Begusarai",
    "Purnia"
  ],
  "Gujarat": [
    "Ahmedabad",
    "Surat",
    "Rajkot",
    "Vadodara",
    "Mehsana",
    "Bhavnagar"
  ]
};

