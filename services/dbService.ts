import { supabase, isDbConfigured } from './supabaseClient';
import { 
    Patient, 
    BedData, 
    DischargedPatient, 
    EvolutionNote, 
    LabResult, 
    Appointment, 
    Prescription,
    LabSection
} from '../types';

// --- MAPPERS ---

const mapPatientFromDB = (data: any): Patient => ({
    id: data.id,
    name: data.full_name,
    dob: data.dob,
    gender: data.gender,
    bloodType: data.blood_type,
    allergies: data.allergies || [],
    chronicConditions: data.chronic_conditions || [],
    contact: data.contact,
    bedId: data.bed_id
});

const mapBedFromDB = (data: any): BedData => {
    // LOGIC FOR 1-384 NUMBERING PATTERN
    // Each Pavilion has 2 sectors (I and II).
    // Each Sector has 24 beds.
    // Total per Pavilion = 48 beds.
    
    // Safety check: ensure ID is a number
    const bedId = typeof data.id === 'number' ? data.id : parseInt(data.id, 10);
    
    let calculatedPabellon = 'General';
    
    if (!isNaN(bedId) && bedId > 0) {
        // IDs are 1-based. Convert to 0-based for math.
        const globalIndex = bedId - 1;
        
        // Calculate Pavilion Number (1-8)
        // 0-47 -> Pav 1, 48-95 -> Pav 2, etc.
        const pavilionNum = Math.floor(globalIndex / 48) + 1;
        
        // Calculate remainder within the pavilion (0-47)
        const pavilionRemainder = globalIndex % 48;
        
        // Calculate Sector (I or II)
        // 0-23 -> Sector I, 24-47 -> Sector II
        const sector = pavilionRemainder < 24 ? 'I' : 'II';
        
        calculatedPabellon = `Pabellón ${pavilionNum} ${sector}`;
    }

    return {
        id: data.id,
        status: data.status,
        // Override DB string with Calculated Logic
        pabellon: calculatedPabellon,
        // Force label to be "Cama {ID}" to respect the 1-384 global sequence
        bedLabel: `Cama ${data.id}`,
        
        patientId: data.patient_id,
        patientName: data.patients?.full_name || data.patient_name_snapshot, 
        condition: data.diagnosis,
        admissionDate: data.admission_date,
        clinicalSummary: data.clinical_summary || [],
        plan: data.plan || [],
        carePlan: data.care_plan || {},
        labSections: data.lab_sections || []
    };
};

const mapDischargeFromDB = (data: any): DischargedPatient => ({
    id: data.original_bed_id, 
    status: 'available', 
    patientName: data.patient_name,
    condition: data.condition,
    clinicalSummary: data.clinical_summary || [],
    plan: data.plan || [],
    labSections: data.lab_sections || [],
    dischargeDate: data.discharge_date
});

const mapEvolutionFromDB = (data: any): EvolutionNote => ({
    id: data.id,
    date: data.date,
    // FIX: Fallback to 'doctor' if 'doctor_name' doesn't exist to handle DB schema variations
    doctor: data.doctor || data.doctor_name,
    subjective: data.subjective,
    objective: data.objective,
    assessment: data.assessment,
    plan: data.plan,
    severity: data.severity,
    createdAt: data.created_at
});

const mapLabResultFromDB = (data: any): LabResult => ({
    id: data.id,
    date: data.date,
    testName: data.test_name,
    category: data.category,
    resultType: data.result_type || 'quantitative',
    // FIX: Use nullish coalescing to fallback if 'value' is null (common in schema migrations)
    value: data.value ?? data.numeric_value, 
    textValue: data.text_value,
    unit: data.unit,
    // Reference range removed
    isAbnormal: data.is_abnormal,
    fileName: data.file_name,
    fileUrl: data.file_url
});

const mapAppointmentFromDB = (data: any): Appointment => ({
    id: data.id,
    date: data.date,
    time: data.time,
    // FIX: Map from 'doctor' column (fallback to doctor_name just in case)
    doctor: data.doctor || data.doctor_name,
    reason: data.reason,
    status: data.status,
    location: data.location,
    createdAt: data.created_at
});

const mapPrescriptionFromDB = (data: any): Prescription => ({
    id: data.id,
    patientId: data.patient_id,
    doctorName: data.doctor_name,
    doctorLicense: data.doctor_license,
    date: data.date,
    diagnosis: data.diagnosis,
    weight: data.weight,
    height: data.height,
    temperature: data.temperature,
    diet: data.diet,
    allergiesSnapshot: data.allergies_snapshot || [],
    carePlan: data.care_plan,
    medications: data.medications || [],
    createdAt: data.created_at
});

// --- PATIENT SERVICES ---

export const fetchPatients = async (): Promise<Patient[]> => {
    if (!isDbConfigured || !supabase) return [];
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name', { ascending: true });
    
    if (error) {
        console.error('Error fetching patients:', error);
        return [];
    }
    return data.map(mapPatientFromDB);
};

export const createPatient = async (patient: Patient): Promise<Patient | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('patients').insert([{
        full_name: patient.name,
        dob: patient.dob,
        gender: patient.gender,
        blood_type: patient.bloodType,
        allergies: patient.allergies,
        chronic_conditions: patient.chronicConditions,
        contact: patient.contact
    }]).select().single();

    if (error) throw error;
    return mapPatientFromDB(data);
};

export const updatePatient = async (patient: Patient): Promise<Patient | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('patients').update({
        full_name: patient.name,
        dob: patient.dob,
        gender: patient.gender,
        blood_type: patient.bloodType,
        allergies: patient.allergies,
        chronic_conditions: patient.chronicConditions,
        contact: patient.contact
    }).eq('id', patient.id).select().single();

    if (error) throw error;
    return mapPatientFromDB(data);
};

export const deletePatient = async (id: string): Promise<boolean> => {
    if (!isDbConfigured || !supabase) return false;

    // 1. Get Patient Info to check for Bed Assignment
    const { data: patientData } = await supabase
        .from('patients')
        .select('bed_id')
        .eq('id', id)
        .single();

    // 2. Free Bed if assigned (Must do this before deleting patient)
    if (patientData?.bed_id) {
        await supabase.from('beds').update({
            status: 'available',
            patient_id: null,
            diagnosis: null,
            admission_date: null,
            clinical_summary: null,
            plan: null,
            care_plan: null,
            lab_sections: null
        }).eq('id', patientData.bed_id);
    }

    // 3. Delete Related Records (Manual Cascade to prevent Foreign Key Errors)
    // We use Promise.all to delete children in parallel
    await Promise.all([
        supabase.from('appointments').delete().eq('patient_id', id),
        supabase.from('evolutions').delete().eq('patient_id', id),
        supabase.from('lab_results').delete().eq('patient_id', id),
        supabase.from('prescriptions').delete().eq('patient_id', id)
    ]);

    // 4. Finally, delete the Patient
    const { error } = await supabase.from('patients').delete().eq('id', id);
    
    if (error) {
        console.error("Error deleting patient:", error);
        throw error;
    }

    return true;
};

export const fetchPatientDetails = async (patientId: string) => {
    if (!isDbConfigured || !supabase) return { appointments: [], evolutions: [], labs: [], prescriptions: [] };

    // Fetch related data in parallel
    const [apptRes, evolRes, labRes, prescRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('evolutions').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('lab_results').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('date', { ascending: false })
    ]);

    return {
        appointments: (apptRes.data || []).map(mapAppointmentFromDB),
        evolutions: (evolRes.data || []).map(mapEvolutionFromDB),
        labs: (labRes.data || []).map(mapLabResultFromDB),
        prescriptions: (prescRes.data || []).map(mapPrescriptionFromDB)
    };
};


// --- EVOLUTION SERVICES ---

export const createEvolution = async (note: EvolutionNote, patientId: string): Promise<EvolutionNote | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('evolutions').insert([{
        patient_id: patientId,
        date: note.date,
        // FIX: Changed 'doctor_name' to 'doctor' to match likely DB schema
        doctor: note.doctor,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        severity: note.severity
    }]).select().single();
    if (error) throw error;
    return mapEvolutionFromDB(data);
};

export const updateEvolution = async (note: EvolutionNote): Promise<EvolutionNote | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('evolutions').update({
        date: note.date,
        // FIX: Changed 'doctor_name' to 'doctor'
        doctor: note.doctor,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        severity: note.severity
    }).eq('id', note.id).select().single();
    if (error) throw error;
    return mapEvolutionFromDB(data);
};

export const deleteEvolution = async (id: string): Promise<boolean> => {
    if (!isDbConfigured || !supabase) return false;
    const { error } = await supabase.from('evolutions').delete().eq('id', id);
    if (error) throw error;
    return true;
};

// --- LAB RESULT SERVICES ---

export const createLabResult = async (result: LabResult, patientId: string): Promise<LabResult | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('lab_results').insert([{
        patient_id: patientId,
        date: result.date,
        test_name: result.testName,
        category: result.category,
        result_type: result.resultType,
        value: result.value, // Corrected
        text_value: result.textValue,
        unit: result.unit,
        // reference_range removed
        is_abnormal: result.isAbnormal,
        file_name: result.fileName,
        file_url: result.fileUrl
    }]).select().single();
    if (error) throw error;
    return mapLabResultFromDB(data);
};

export const updateLabResult = async (result: LabResult): Promise<LabResult | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('lab_results').update({
        date: result.date,
        test_name: result.testName,
        category: result.category,
        result_type: result.resultType,
        value: result.value, // Corrected
        text_value: result.textValue,
        unit: result.unit,
        // reference_range removed
        is_abnormal: result.isAbnormal,
        file_name: result.fileName,
        file_url: result.fileUrl
    }).eq('id', result.id).select().single();
    if (error) throw error;
    return mapLabResultFromDB(data);
};

export const deleteLabResult = async (id: string): Promise<boolean> => {
    if (!isDbConfigured || !supabase) return false;
    const { error } = await supabase.from('lab_results').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const uploadLabFile = async (file: File): Promise<string | null> => {
    if (!isDbConfigured || !supabase) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('lab-results')
        .upload(filePath, file);

    if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return null;
    }

    const { data } = supabase.storage.from('lab-results').getPublicUrl(filePath);
    return data.publicUrl;
};

// --- APPOINTMENT SERVICES ---

export const createAppointment = async (appt: Appointment, patientId: string): Promise<Appointment | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('appointments').insert([{
        patient_id: patientId,
        date: appt.date,
        time: appt.time,
        // FIX: Change 'doctor_name' to 'doctor' to match DB schema error
        doctor: appt.doctor,
        reason: appt.reason,
        status: appt.status || 'Programada',
        location: appt.location || ''
    }]).select().single();
    if (error) throw error;
    return mapAppointmentFromDB(data);
};

export const updateAppointment = async (appt: Appointment): Promise<Appointment | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('appointments').update({
        date: appt.date,
        time: appt.time,
        // FIX: Change 'doctor_name' to 'doctor'
        doctor: appt.doctor,
        reason: appt.reason,
        status: appt.status,
        location: appt.location
    }).eq('id', appt.id).select().single();
    if (error) throw error;
    return mapAppointmentFromDB(data);
};

/**
 * Fetch daily appointments for a specific doctor, filtering out past times.
 * Includes patient name join.
 */
export const fetchDoctorAppointmentsForToday = async (doctorName: string) => {
    if (!isDbConfigured || !supabase) return [];

    const today = new Date().toISOString().split('T')[0];
    
    // Get current time in HH:mm format for comparison
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            patients (full_name)
        `)
        .eq('date', today)
        // Use ILIKE for case-insensitive matching of doctor name
        .ilike('doctor', `%${doctorName}%`)
        .eq('status', 'Programada')
        // Only future appointments today
        .gt('time', currentTime)
        .order('time', { ascending: true });

    if (error) {
        console.error("Error fetching daily appointments:", error);
        return [];
    }

    return data.map((item: any) => ({
        ...mapAppointmentFromDB(item),
        patientName: item.patients?.full_name // Helper field for UI
    }));
};

// --- PRESCRIPTION SERVICES ---

export const createPrescription = async (presc: Prescription, patientId: string): Promise<Prescription | null> => {
    if (!isDbConfigured || !supabase) return null;
    const { data, error } = await supabase.from('prescriptions').insert([{
        patient_id: patientId,
        doctor_name: presc.doctorName,
        doctor_license: presc.doctorLicense,
        date: presc.date,
        diagnosis: presc.diagnosis,
        weight: presc.weight,
        height: presc.height,
        temperature: presc.temperature,
        diet: presc.diet,
        allergies_snapshot: presc.allergiesSnapshot,
        care_plan: presc.carePlan,
        medications: presc.medications
    }]).select().single();
    if (error) throw error;
    return mapPrescriptionFromDB(data);
};

export const deletePrescription = async (id: string): Promise<boolean> => {
    if (!isDbConfigured || !supabase) return false;
    const { error } = await supabase.from('prescriptions').delete().eq('id', id);
    if (error) throw error;
    return true;
};

// --- BED SERVICES ---

export const fetchBeds = async (): Promise<BedData[]> => {
    if (!isDbConfigured || !supabase) return [];

    const { data, error } = await supabase
        .from('beds')
        .select(`*, patients (full_name)`)
        .order('id', { ascending: true });

    if (error) {
        console.error("Error fetching beds", error);
        throw error;
    }

    return data.map(mapBedFromDB);
};

export const assignPatientToBed = async (patient: Patient, bedData: Partial<BedData>): Promise<boolean> => {
    if (!isDbConfigured || !supabase) return false;

    const { error: patientError } = await supabase
        .from('patients')
        .update({ bed_id: bedData.id })
        .eq('id', patient.id);
    
    if (patientError) throw patientError;

    const { error: bedError } = await supabase
        .from('beds')
        .update({
            status: 'occupied',
            patient_id: patient.id,
            diagnosis: bedData.condition,
            admission_date: bedData.admissionDate,
            clinical_summary: bedData.clinicalSummary,
            plan: bedData.plan,
            care_plan: bedData.carePlan,
            lab_sections: bedData.labSections
        })
        .eq('id', bedData.id);

    if (bedError) throw bedError;

    return true;
};

export const updateBed = async (bed: BedData): Promise<BedData | null> => {
    if (!isDbConfigured || !supabase) return null;

    const { data, error } = await supabase
        .from('beds')
        .update({
            diagnosis: bed.condition,
            admission_date: bed.admissionDate,
            clinical_summary: bed.clinicalSummary,
            plan: bed.plan,
            care_plan: bed.carePlan,
            lab_sections: bed.labSections
        })
        .eq('id', bed.id)
        .select(`*, patients(full_name)`)
        .single();

    if (error) throw error;
    return mapBedFromDB(data);
};

// --- NEW FUNCTION: SYNC BED LABS TO PERMANENT RECORD ---
export const syncBedLabsToResults = async (patientId: string, labSections: LabSection[]) => {
    if (!isDbConfigured || !supabase) return;

    // 1. Fetch existing results to avoid naive duplicates (Check by Date + Name)
    const { data: existingData } = await supabase
        .from('lab_results')
        .select('date, test_name')
        .eq('patient_id', patientId);
    
    // Create a Set for O(1) lookup: "YYYY-MM-DD|Test Name"
    const existingSet = new Set(existingData?.map(e => `${e.date}|${e.test_name.trim().toLowerCase()}`));

    for (const section of labSections) {
        for (const metric of section.metrics) {
            const key = `${section.date}|${metric.name.trim().toLowerCase()}`;
            
            // Only create if it doesn't exist
            if (!existingSet.has(key)) {
                let parsedValue: number | null = null;
                let parsedUnit = '';
                let textValue = '';

                // Logic to parse "100 mg/dL" into value: 100, unit: "mg/dL"
                if (metric.type === 'quantitative' && metric.value) {
                    const parts = metric.value.trim().split(' ');
                    const num = parseFloat(parts[0]);
                    if (!isNaN(num)) {
                        parsedValue = num;
                        parsedUnit = parts.slice(1).join(' ');
                    } else {
                        // Fallback: If it's not a number, save as text even if flagged quantitative
                        textValue = metric.value;
                    }
                } else {
                    textValue = metric.value;
                }

                await createLabResult({
                    id: '', // Generated by DB
                    date: section.date,
                    testName: metric.name,
                    // FIX: Use specific category from metric, fallback to section title or General
                    category: (metric.category as any) || section.title || 'General',
                    resultType: metric.type,
                    value: parsedValue || undefined, // undefined for mapper logic compatibility
                    textValue: textValue,
                    unit: parsedUnit,
                    // reference removed
                    isAbnormal: metric.isAbnormal || false
                } as LabResult, patientId);
            }
        }
    }
};

export const dischargePatient = async (bed: BedData): Promise<DischargedPatient | null> => {
    if (!isDbConfigured || !supabase) return null;

    const today = new Date().toISOString().split('T')[0];

    const { data: historyData, error: histError } = await supabase
        .from('discharge_history')
        .insert([{
            original_bed_id: bed.id,
            patient_name: bed.patientName,
            discharge_date: today,
            condition: bed.condition,
            clinical_summary: bed.clinicalSummary,
            plan: bed.plan,
            lab_sections: bed.labSections
        }])
        .select()
        .single();
    
    if (histError) throw histError;

    if (bed.patientId) {
        await supabase
            .from('patients')
            .update({ bed_id: null })
            .eq('id', bed.patientId);
    }

    await supabase
        .from('beds')
        .update({
            status: 'available',
            patient_id: null,
            diagnosis: null,
            admission_date: null,
            clinical_summary: null,
            plan: null,
            care_plan: null, // Clear Care Plan
            lab_sections: null
        })
        .eq('id', bed.id);

    return mapDischargeFromDB(historyData);
};

export const fetchDischargeHistory = async (): Promise<DischargedPatient[]> => {
    if (!isDbConfigured || !supabase) return [];

    const { data, error } = await supabase
        .from('discharge_history')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapDischargeFromDB);
};
