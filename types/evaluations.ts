export type EvaluationType = 'MTC' | 'RADIESTESIA';

export interface BaseEvaluation {
  id: string;
  patientId: string;
  patientName: string;
  code?: string;
  date: string;
  evaluator: string;
  templateType?: EvaluationType; // Optional for legacy support, defaults to MTC
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

export type Evaluation = MTCEvaluation | RadiesthesiaEvaluation;
