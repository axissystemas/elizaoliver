export type EvaluationType = 'MTC' | 'RADIESTESIA' | 'DIAGNOSTICO_OURO';

export interface BaseEvaluation {
  id: string;
  patientId: string;
  patientName: string;
  code?: string;
  date: string;
  evaluator: string;
  templateType?: EvaluationType; // Optional for legacy support, defaults to MTC
}

export interface DiagnosticoOuroEvaluation extends BaseEvaluation {
  templateType: 'DIAGNOSTICO_OURO';
  // Página 1
  mainComplaint: string;
  mainComplaintStart: string;
  mainComplaintLocation: string;
  mainComplaintAssociatedFacts: string;
  mainComplaintCharacteristics: string;
  mainComplaintIntensity: number;
  mainComplaintFrequency: string;
  mainComplaintAccompanyingSymptoms: string;
  mainComplaintWorseningBetter: string;
  pain: {
    start: string;
    location: string;
    associatedFacts: string;
    characteristics: string;
    intensity: number;
    frequency: string;
    accompanyingSymptoms: string;
    worseningBetter: string;
  };
  observationsP1: string;
  treatmentsDone: string;
  habitsAndAddictions: string;
  foodIntolerance: string;
  surgeriesChronological: string;
  tastePreference: string;
  pathologicalHistory: string;
  familyHistory: string;

  // Página 2
  frioCalor: {
    tempPreference: string;
    seasonPreference: string;
    drinkTempPreference: string;
    frioAnalysis: string[];
    calorAnalysis: string[];
    observations: string;
  };
  suor: {
    normal: boolean;
    anidrose: string[];
    hiperidrose: string[];
    bodyRegions: string[];
    observations: string;
  };
  sede: {
    normal: boolean;
    absence: boolean;
    noPolydipsia: string[];
    withPolydipsia: string[];
    observations: string;
  };
  fome: {
    normal: boolean;
    anorexia: string[];
    hyperphagia: string[];
    noHyperphagia: boolean;
    observations: string;
  };

  // Página 3
  miccao: {
    normal: boolean;
    frequency: string;
    polaciuria: string[];
    disuria: string[];
    color: string[];
    volumePoliuria: string[];
    volumeOliguria: string[];
    accompanyingSensations: string[];
    observations: string;
  };
  evacuacao: {
    normal: boolean;
    color: string;
    volume: string;
    smell: string;
    buoyancy: string;
    accompanyingSensations: string;
    shapeTexture: string[];
    frequency: string;
    constipation: string[];
  };

  // Página 4
  diarreia: {
    acute: string[];
    chronic: string[];
    observations: string;
  };
  emocao: {
    predominant: string;
    intensePeriod: string;
    observations: string;
  };
  insonia: {
    normal: boolean;
    types: string[];
  };
  sonolencia: {
    types: string[];
    observations: string;
  };
  menstruacao: {
    cycleDuration: string;
    flowDuration: string;
    symptoms: string[];
    pregnanciesAbortions: string;
    sexualFrequency: string;
    libido: string;
    menarcheAge: string;
    menopause: string;
  };

  // Página 5
  ginecologiaDetalhada: {
    regularity: {
      normal: boolean;
      advancedCycle: string[];
      delayedCycle: string[];
      irregularCycle: string[];
    };
    volume: {
      normal: boolean;
      hypoligomenorrhea: string[];
      hypermenorrhea: string[];
    };
    dismenorreia: {
      deficiency: string[];
      excess: string[];
    };
    amenorreia: {
      deficiency: string[];
      excess: string[];
    };
  };
  homem: {
    fertility: string;
    sexualFrequency: string;
    libido: string;
    observations: string;
  };
  shenInspecao: {
    facialColor: string;
    physicalConstitution: string;
    lips: string;
    eyes: string;
    skin: string;
    hair: string;
    nails: string;
    gums: string;
    teeth: string;
    throat: string;
    limbs: string;
    thorax: string;
    observations: string;
  };

  // Página 6
  pulso: {
    rightPulse: string;
    leftPulse: string;
    pulseType: string;
    depth: string;
    speed: string;
    bpm: string;
    observations: string;
  };
  lingua: {
    vitality: string;
    color: string;
    shape: string;
    movement: string;
    coatingTexture: string;
    coatingColor: string;
    coatingLocation: string;
    observations: string;
  };
  diagnosticoFinal: {
    syndromes: string;
    treatments: string;
    techniques: string;
    points: string;
    observations: string;
  };
}

export interface MTCEvaluation extends BaseEvaluation {
  templateType: 'MTC';
  origin: string;
  firstTimeTCM: boolean;
  mainComplaint: string;
  complaintStart: string;
  improvementFactors: string;
  worseningFactors: string;
  secondaryComplaints: string;
  aggravatingRelieving: string;
  previousDiseases: string;
  surgeries: string;
  medications: string;
  allergies: string;
  habits: {
    smoker: boolean;
    sedentary: boolean;
  };
  familyHistory: string;
  physical: {
    pa: string;
    fc: string;
    glucose: string;
    height: string;
    weight: string;
    imc: string;
    painType: string[];
    painIntensity: number;
    painFrequency: string;
    painMigration: boolean;
    painPeakTime: string;
    painAggravatingRelieving: string;
    involuntaryMovements: string;
    skin: string[];
  };
  sleep: {
    difficulty: boolean;
    hours: string;
    wakeUpTime: string;
    nightWaking: string;
    dreams: boolean;
    restorative: boolean;
  };
  appetite: {
    level: string;
    preference: string;
    taste: string;
    stomachWeight: boolean;
    fullness: boolean;
  };
  thirst: {
    frequency: boolean;
    time: string;
    preference: string;
    quantity: string;
  };
  evacuation: {
    frequency: string;
    bristol: string;
    gases: boolean;
  };
  urine: {
    color: string;
    frequency: string;
    pain: boolean;
  };
  reproductive: {
    menarche: string;
    cycleDuration: string;
    flowDuration: string;
    bloodColor: string;
    cramps: boolean;
    pms: string;
    contraceptives: string;
    pregnancies: string;
    abortions: string;
    libido: string;
    erection: string;
    ejaculation: string;
    ejaculationFrequency: string;
  };
  emotions: {
    predominant: string[];
    stress: string;
    anxiety: boolean;
    currentStatus: string;
  };
  thermoregulation: {
    feeling: string;
    spontaneousSweat: boolean;
    nightSweat: boolean;
    odor: boolean;
  };
  tonguePulse: {
    color: string;
    coating: string;
    humidity: string;
    shape: string;
    pulse: string;
  };
  seasonsWorsening: string;
  timeWorsening: string;
  syndromeHypothesis: string;
  initialTreatment: string;
}

export interface RadiesthesiaEvaluation extends BaseEvaluation {
  templateType: 'RADIESTESIA';
  mainComplaint?: string;
  energeticFields: {
    mental: { imbalance: number; affectedChakras: string };
    emotional: { imbalance: number; affectedChakras: string };
    spiritual: { imbalance: number; affectedChakras: string };
    physical: { imbalance: number; affectedChakras: string };
  };
  chakras: Array<{
    name: string;
    imbalance: boolean;
    percentage: number;
    state: 'HIPO' | 'NORMAL' | 'HIPER';
    affectsPhysicalSystem: string;
  }>;
  systems: Array<{
    name: string;
    imbalance: boolean;
    percentage: number;
    state: 'HIPO' | 'NORMAL' | 'HIPER';
    affectsPhysicalBody: string;
  }>;
  meridians: Array<{
    name: string;
    imbalance: boolean;
    state: 'DEFIC' | 'ESTAG' | 'NORMAL';
    comment: string;
  }>;
  treatments: Array<{
    treatment: string;
    time: number;
    unit: 'minutos' | 'horas' | 'dias';
    start: string;
    end: string;
  }>;
  healthEnergy: {
    value: number;
    category: string;
    comment: string;
  };
  finalObservations: string;
}

export type Evaluation = MTCEvaluation | RadiesthesiaEvaluation | DiagnosticoOuroEvaluation;

