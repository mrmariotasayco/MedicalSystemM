export interface Patient {
  id: string; // UUID from DB
  name: string; // Mapped from full_name
  dob: string;
  gender: 'Masculino' | 'Femenino' | 'Otro';
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  contact: string;
  bedId?: number; // Optional: ID of the bed assigned
}

export interface EvolutionNote {
  id: string;
  date: string;
  doctor: string;
  subjective: string; // S
  objective: string;  // O
  assessment: string; // A
  plan: string;       // P
  severity: 'Baja' | 'Media' | 'Alta';
  createdAt?: string; // ISO String for 24h lock check
}

export interface LabResult {
  id: string;
  date: string;
  testName: string;
  // New fields for classification
  resultType: 'quantitative' | 'qualitative'; 
  value?: number; // Optional (only for quantitative)
  textValue?: string; // Optional (only for qualitative)
  
  unit?: string; // Optional for qualitative
  referenceRange: string;
  isAbnormal: boolean;
  category: 'Hematología' | 'Bioquímica' | 'Inmunología' | 'Microbiología' | 'Patología';
  fileName?: string; 
  fileUrl?: string; // URL from Supabase Storage
}

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  reason: string;
  status: 'Programada' | 'Completada' | 'Cancelada';
  location?: string;
  createdAt?: string; // For 24h lock check
}

// --- PRESCRIPTION TYPES ---

export interface MedicationItem {
  name: string;        // MEDICAMENTO EN DCI
  dosage: string;      // DOSIS (ej. 50MG)
  frequency: string;   // FRECUENCIA (ej. C/8H)
  route: string;       // V.A. (ej. VO, EV)
  form: string;        // F.F. (ej. TAB, AMP)
  totalQuantity: string; // CANTIDAD (ej. 10)
}

export interface CarePlanData {
  // Hemoglucotest
  hgt1400: string;
  hgt2200: string;
  hgt0600: string;
  // Insumos
  catheterType: string; // Catéter periférico
  needleSize: string;   // Aguja
  nasogastricSonde: string; // Sonda NG (Mapped to generic input if needed)
  foleySonde: string;   // Sonda Foley (Mapped to generic input if needed)
  oxygenMode: string;   // FiO2 / Sist. Oxigeno
  // Checkbox/Booleans for supplies usually marked with X or Quantity
  venoclysis: boolean;
  microdropper: boolean;
  tripleWayCode: boolean;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorName: string;
  doctorLicense?: string; // Cédula
  date: string;
  diagnosis: string;
  
  // Vitals Snapshot
  weight?: string;
  height?: string;
  temperature?: string;
  allergiesSnapshot?: string[];

  // New Fields for PDF Accuracy
  diet: string; // "Dieta: HIPOGLUCIDA..."
  carePlan?: CarePlanData; // Data for the bottom grid

  medications: MedicationItem[];
  createdAt?: string;
}

// --- BED MANAGEMENT TYPES ---

export interface LabMetric {
  name: string;
  value: string; // Display string (e.g. "10 mg/dL" or "Positive")
  type: 'quantitative' | 'qualitative'; // For categorization
  isAbnormal?: boolean;
  reference?: string; // New: Reference range string
  category?: string; // New: Specific category for the metric
}

export interface LabSection {
  title: string;
  date: string;
  metrics: LabMetric[];
}

export interface BedData {
  id: number;
  status: 'occupied' | 'available';
  patientId?: string; // Link back to patient record
  patientName?: string;
  condition?: string;
  admissionDate?: string;
  clinicalSummary?: string[];
  plan?: string[];
  carePlan?: CarePlanData; // Persistent Care Plan stored in Bed
  labSections?: LabSection[];
}

export interface DischargedPatient extends BedData {
  dischargeDate: string;
}

export type ViewState = 'history' | 'evolution' | 'results' | 'beds';