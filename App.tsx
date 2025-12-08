import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClinicalHistory } from './components/ClinicalHistory';
import { Evolutions } from './components/Evolutions';
import { LabResults } from './components/LabResults';
import { Login } from './components/Login';
import { PatientList } from './components/PatientList';
import { PatientForm } from './components/PatientForm';
import { BedManagement } from './components/BedManagement';
import { AffiliationData } from './components/AffiliationData';
import { UserProfileModal } from './components/UserProfileModal'; 
import { Patient, EvolutionNote, LabResult, ViewState, Appointment, BedData, DischargedPatient, LabSection, Prescription, LabMetric } from './types';
import { Menu, LogOut, Stethoscope, Loader2, Settings, X, Calendar, Clock, MapPin, ArrowRight, Activity, Heart, ArrowLeft } from 'lucide-react';
import { UserProfile, signOut, getCurrentSession, updateUserProfile, deleteUserAccount } from './services/authService';

// Import Database Services
import * as dbService from './services/dbService';

// Extended type for appointment with patient name for the modal
interface ReminderAppointment extends Appointment {
    patientName?: string;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<ViewState>('history');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data State (Real DB)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientEvolutions, setPatientEvolutions] = useState<EvolutionNote[]>([]);
  const [patientResults, setPatientResults] = useState<LabResult[]>([]);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  
  // Bed Management State
  const [beds, setBeds] = useState<BedData[]>([]);
  const [dischargeHistory, setDischargeHistory] = useState<DischargedPatient[]>([]);

  // Daily Reminder State
  const [dailyAppointments, setDailyAppointments] = useState<ReminderAppointment[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Patient CRUD UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Derived State
  // Find the bed assigned to the selected patient to pass to ClinicalHistory
  const assignedBed = selectedPatient && selectedPatient.bedId 
      ? beds.find(b => b.id === selectedPatient.bedId) 
      : undefined;

  // --- CHECK SESSION ON LOAD ---
  useEffect(() => {
    const checkSession = async () => {
        const user = await getCurrentSession();
        if (user) {
            setCurrentUser(user);
        }
    };
    checkSession();
  }, []);

  // --- EFFECT: FETCH INITIAL DATA ON AUTH ---
  useEffect(() => {
    if (currentUser) {
        loadData();
        checkDailyAppointments();
    }
  }, [currentUser]);

  const loadData = async () => {
      setIsLoading(true);
      try {
          // Parallel fetch for dashboard data
          const [patientsData, bedsData, historyData] = await Promise.all([
              dbService.fetchPatients(),
              dbService.fetchBeds(),
              dbService.fetchDischargeHistory()
          ]);
          
          setPatients(patientsData);
          setBeds(bedsData);
          setDischargeHistory(historyData);
          
      } catch (error) {
          console.error("Failed to load initial data", error);
      } finally {
          // Add a small artificial delay for the animation to be appreciated if data loads too fast
          setTimeout(() => setIsLoading(false), 1500);
      }
  };

  const checkDailyAppointments = async () => {
      if (!currentUser) return;
      try {
          const appts = await dbService.fetchDoctorAppointmentsForToday(currentUser.fullName);
          if (appts && appts.length > 0) {
              setDailyAppointments(appts);
              setShowReminderModal(true);
          }
      } catch (error) {
          console.error("Error checking daily appointments", error);
      }
  };

  // --- EFFECT: FETCH DETAILS WHEN PATIENT SELECTED ---
  useEffect(() => {
      if (selectedPatient) {
          loadPatientDetails(selectedPatient.id);
      }
  }, [selectedPatient]);

  const loadPatientDetails = async (patientId: string) => {
      try {
          const { appointments, evolutions, labs, prescriptions } = await dbService.fetchPatientDetails(patientId);
          setPatientAppointments(appointments);
          setPatientEvolutions(evolutions);
          setPatientResults(labs);
          setPatientPrescriptions(prescriptions);
      } catch (error) {
          console.error("Failed to load details", error);
      }
  };

  // Handlers
  const handleLogin = (user: UserProfile) => {
      setCurrentUser(user);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setSelectedPatient(null);
  };

  const handleUpdateProfile = async (fullName: string, specialty: string, licenseNumber: string, phone: string) => {
      if (!currentUser) return;
      
      await updateUserProfile(currentUser.id, fullName, specialty, licenseNumber, phone);
      
      setCurrentUser({ 
          ...currentUser, 
          fullName,
          specialty,
          licenseNumber,
          phone
      });
      setIsProfileOpen(false);
  };

  const handleDeleteAccount = async () => {
      await deleteUserAccount();
      // Reset App State
      setCurrentUser(null);
      setSelectedPatient(null);
      setIsProfileOpen(false);
      alert("Su cuenta ha sido eliminada correctamente.");
  };

  const handleCreatePatient = async (newPatient: Patient) => {
    try {
        const created = await dbService.createPatient(newPatient);
        if (created) {
            setPatients(prev => [created, ...prev]);
            setIsFormOpen(false);
        }
    } catch (error) {
        alert("Error al crear paciente en BD.");
    }
  };

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    try {
        const updated = await dbService.updatePatient(updatedPatient);
        if (updated) {
            setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
            if (selectedPatient && selectedPatient.id === updated.id) {
                setSelectedPatient(updated);
            }
            setIsFormOpen(false);
            setEditingPatient(null);
        }
    } catch (error) {
        alert("Error al actualizar paciente.");
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
        await dbService.deletePatient(id);
        setPatients(prev => prev.filter(p => p.id !== id));
        if (selectedPatient?.id === id) {
            setSelectedPatient(null);
        }
        // Reload beds to reflect vacancy if patient was deleted while in bed
        const bedsData = await dbService.fetchBeds();
        setBeds(bedsData);

    } catch (error: any) {
        alert(`Error al eliminar paciente: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleAddEvolution = async (newNote: EvolutionNote) => {
    if (!selectedPatient) return;
    try {
        const created = await dbService.createEvolution(newNote, selectedPatient.id);
        if (created) {
            setPatientEvolutions(prev => [created, ...prev]);
        }
    } catch (error: any) {
        console.error("Add Evolution Error:", error);
        alert(`Error al guardar evolución: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleUpdateEvolution = async (updatedNote: EvolutionNote) => {
    try {
        const updated = await dbService.updateEvolution(updatedNote);
        if (updated) {
             setPatientEvolutions(prev => prev.map(e => e.id === updated.id ? updated : e));
        }
    } catch (error: any) {
        alert(`Error al actualizar evolución: ${error.message || 'Posible bloqueo de 24h'}`);
    }
  };

  const handleDeleteEvolution = async (id: string) => {
      try {
          await dbService.deleteEvolution(id);
          setPatientEvolutions(prev => prev.filter(e => e.id !== id));
      } catch (error: any) {
          alert(`Error al eliminar evolución: ${error.message || 'Posible bloqueo de 24h'}`);
      }
  };

  const handleAddLabResult = async (newResult: LabResult) => {
     if (!selectedPatient) return;
     try {
         // 1. Create in lab_results table (Permanent Record)
         const created = await dbService.createLabResult(newResult, selectedPatient.id);
         
         let bedSyncTriggeredRefresh = false;

         // 2. SYNC: If Patient is Hospitalized, add to Bed's "Recent Labs" section
         if (selectedPatient.bedId) {
            const currentBed = beds.find(b => b.id === selectedPatient.bedId);
            if (currentBed) {
                // Convert LabResult to Bed LabMetric
                const newMetric: LabMetric = {
                    name: newResult.testName,
                    value: newResult.resultType === 'quantitative' 
                        ? `${newResult.value} ${newResult.unit || ''}`.trim() 
                        : newResult.textValue || '',
                    type: newResult.resultType,
                    category: newResult.category,
                    isAbnormal: newResult.isAbnormal,
                    // reference removed
                };

                // Clone existing sections to avoid mutation
                const updatedSections = [...(currentBed.labSections || [])];
                const today = new Date().toISOString().split('T')[0];
                
                // Check if we have a section for today or generic "Resultados Recientes"
                const sectionIndex = updatedSections.findIndex(s => s.date === today || s.title === 'Resultados del Día');

                if (sectionIndex >= 0) {
                    updatedSections[sectionIndex].metrics.push(newMetric);
                } else {
                    // Create new section
                    updatedSections.unshift({
                        title: 'Resultados del Día',
                        date: today,
                        metrics: [newMetric]
                    });
                }

                // Update Bed in DB
                const updatedBed = { ...currentBed, labSections: updatedSections };
                await handleUpdateBed(updatedBed);
                
                // Flag that the bed update will have triggered a reload of results
                bedSyncTriggeredRefresh = true;
            }
         }

         // 3. Update Local State (Only if we didn't already refresh via bed sync)
         if (created && !bedSyncTriggeredRefresh) {
             setPatientResults(prev => [created, ...prev]);
         }
     } catch (error) {
         alert("Error al guardar resultado.");
     }
  };
  
  const handleUpdateLabResult = async (updatedResult: LabResult) => {
      try {
          const updated = await dbService.updateLabResult(updatedResult);
          if (updated) {
              setPatientResults(prev => prev.map(r => r.id === updated.id ? updated : r));
          }
      } catch (error) {
          alert("Error al actualizar resultado.");
      }
  };

  const handleDeleteLabResult = async (id: string) => {
      try {
          // Identify result before deleting to get Name/Date for Bed Sync
          const resultToDelete = patientResults.find(r => r.id === id);

          // 1. Delete from DB and Local State
          await dbService.deleteLabResult(id);
          setPatientResults(prev => prev.filter(r => r.id !== id));

          // 2. SYNC: Remove from Bed snapshot if patient is hospitalized
          if (resultToDelete && selectedPatient && selectedPatient.bedId) {
             const currentBed = beds.find(b => b.id === selectedPatient.bedId);
             
             if (currentBed && currentBed.labSections) {
                 // Deep copy sections to modify safely
                 const updatedSections = currentBed.labSections.map(section => ({
                     ...section,
                     metrics: [...section.metrics]
                 }));

                 let bedModified = false;

                 // Logic: Find section by date, remove metric by name
                 updatedSections.forEach((section, sIdx) => {
                     // Simple date comparison (YYYY-MM-DD)
                     if (section.date === resultToDelete.date) {
                         const initialCount = section.metrics.length;
                         // Filter out the metric that matches the deleted test name
                         section.metrics = section.metrics.filter(m => m.name !== resultToDelete.testName);
                         
                         if (section.metrics.length !== initialCount) {
                             bedModified = true;
                         }
                     }
                 });

                 // Clean up empty sections if needed
                 const finalSections = updatedSections.filter(s => s.metrics.length > 0);
                 if (finalSections.length !== updatedSections.length) {
                     bedModified = true;
                 }

                 if (bedModified) {
                     // We update the bed directly in DB to keep snapshot in sync
                     const updatedBed = { ...currentBed, labSections: finalSections };
                     
                     // Re-use existing update handler to sync State and DB
                     await handleUpdateBed(updatedBed);
                 }
             }
          }

      } catch (error) {
          alert("Error al eliminar resultado.");
      }
  };

  const handleAddAppointment = async (newAppt: Appointment) => {
    if (!selectedPatient) return;
    try {
        const created = await dbService.createAppointment(newAppt, selectedPatient.id);
        if (created) {
            setPatientAppointments(prev => [...prev, created]);
        }
    } catch (error: any) {
        console.error("Error creating appointment:", error);
        // Robust error handling to extract message from object
        let msg = "Error desconocido";
        if (error?.message) {
            msg = error.message;
        } else if (typeof error === 'string') {
            msg = error;
        } else if (error && typeof error === 'object') {
            // Try to stringify if it's an object without message property
            try {
                msg = JSON.stringify(error);
            } catch (e) {
                msg = "Detalles del error no disponibles";
            }
        }
        alert(`Error al agendar cita: ${msg}`);
    }
  };

  const handleUpdateAppointment = async (updatedAppt: Appointment) => {
     try {
         const updated = await dbService.updateAppointment(updatedAppt);
         if (updated) {
             setPatientAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
         }
     } catch (error) {
         alert("Error al actualizar cita (Posible bloqueo de 24h).");
     }
  };

  const handleAddPrescription = async (presc: Prescription) => {
      if (!selectedPatient) return;
      try {
          const created = await dbService.createPrescription(presc, selectedPatient.id);
          if (created) {
              setPatientPrescriptions(prev => [created, ...prev]);
          }
      } catch (error) {
          alert("Error al guardar receta.");
      }
  };

  const handleDeletePrescription = async (id: string) => {
      try {
          await dbService.deletePrescription(id);
          setPatientPrescriptions(prev => prev.filter(p => p.id !== id));
      } catch (error) {
          alert("Error al eliminar receta.");
      }
  };

  // --- BED ACTIONS (Connected to DB) ---
  
  const handleAssignPatientToBed = async (patient: Patient, bedPayload: Partial<BedData>) => {
      setIsLoading(true);
      try {
          // 1. Fetch latest data for snapshot if not present in payload
          const { evolutions, labs } = await dbService.fetchPatientDetails(patient.id);
          const lastEvolution = evolutions.length > 0 ? evolutions[0] : null;

          // 2. Prepare Bed Snapshot Data
          const finalBedData: Partial<BedData> = {
              ...bedPayload, // Includes ID and CarePlan from PatientList
              condition: lastEvolution?.assessment || patient.chronicConditions[0] || 'Ingreso General',
              admissionDate: new Date().toISOString().split('T')[0],
              clinicalSummary: [
                  `Paciente: ${patient.name}`,
                  `Edad: ${new Date().getFullYear() - new Date(patient.dob).getFullYear()} años`,
                  `Última evolución (${lastEvolution?.date || 'Sin fecha'}): ${lastEvolution?.subjective || 'Sin datos'}`
              ],
              plan: lastEvolution?.plan ? [lastEvolution.plan] : ['Realizar valoración inicial completa'],
              labSections: [] // Build lab sections from recent labs
          };

          // Group labs by date for initial snapshot
          if (labs.length > 0) {
              const recentDate = labs[0].date;
              const recentLabs = labs.filter(l => l.date === recentDate);
              const section: LabSection = {
                  title: 'Ingreso (Últimos Labs)',
                  date: recentDate,
                  metrics: recentLabs.map(l => {
                      let displayValue = 'Sin resultado';

                      // ROBUST CHECK: Try numeric first, then text
                      // This avoids strict dependency on resultType strings which might vary
                      if (l.value !== null && l.value !== undefined) {
                          displayValue = `${l.value} ${l.unit || ''}`.trim();
                      } else if (l.textValue && l.textValue.trim() !== '') {
                          displayValue = l.textValue;
                      }

                      return {
                          name: l.testName,
                          type: l.resultType || 'quantitative', 
                          value: displayValue,
                          isAbnormal: l.isAbnormal,
                          // Reference removed
                      };
                  })
              };
              finalBedData.labSections = [section];
          }

          // 3. Persist to DB
          await dbService.assignPatientToBed(patient, finalBedData);

          // 4. Reload Data
          await loadData(); // Reloads beds and patients to reflect status

      } catch (error) {
          console.error(error);
          alert("Error al asignar cama.");
      } finally {
          // Delay handled in loadData now
      }
  };

  const handleUpdateBed = async (updatedBed: BedData) => {
    try {
        // 1. Update Bed Table
        const result = await dbService.updateBed(updatedBed);
        
        // 2. NEW: Sync Labs to Patient History
        // If the bed has a patient and lab sections, try to sync new metrics to the main lab_results table
        if (updatedBed.patientId && updatedBed.labSections) {
            await dbService.syncBedLabsToResults(updatedBed.patientId, updatedBed.labSections);
            
            // Refresh local results if this patient is currently selected in the main view
            if (selectedPatient && selectedPatient.id === updatedBed.patientId) {
                    const details = await dbService.fetchPatientDetails(selectedPatient.id);
                    setPatientResults(details.labs);
            }
        }

        // 3. Update State
        if (result) {
            setBeds(prev => prev.map(b => b.id === result.id ? result : b));
        }
    } catch (error) {
        console.error(error);
        alert("Error al guardar datos de la cama.");
    }
  };

  const handleDischargePatient = async (bed: BedData) => {
    try {
        const dischargedRecord = await dbService.dischargePatient(bed);
        if (dischargedRecord) {
            // Update local state
            setDischargeHistory(prev => [dischargedRecord, ...prev]);
            
            // Reload all to ensure consistency
            await loadData();
        }
    } catch (error) {
        alert("Error al dar de alta.");
    }
  };

  // --- FORM HANDLERS ---
  const openCreateForm = () => {
    setEditingPatient(null);
    setIsFormOpen(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setIsFormOpen(true);
  };

  // --- NAVIGATION FROM REMINDER MODAL ---
  const handleViewAppointmentDetail = (patientName: string) => {
      // 1. Find the patient in the loaded patient list
      const patient = patients.find(p => p.name === patientName);
      
      if (patient) {
          // 2. Select Patient and Switch View
          setSelectedPatient(patient);
          setView('history');
          setShowReminderModal(false);
      } else {
          // Fallback if patient not found in current loaded list
          alert("No se pudo cargar el perfil del paciente. Intente buscarlo manualmente en el dashboard.");
          setShowReminderModal(false);
      }
  };

  // --- RENDER LOGIC ---

  const renderContent = () => {
    if (!selectedPatient) return null;

    switch (view) {
      case 'history':
        return (
            <ClinicalHistory 
                patient={selectedPatient} 
                appointments={patientAppointments}
                prescriptions={patientPrescriptions}
                doctorProfile={currentUser}
                assignedBed={assignedBed} // Pass the assigned bed object
                onAddAppointment={handleAddAppointment}
                onUpdateAppointment={handleUpdateAppointment}
                onAddPrescription={handleAddPrescription}
                onDeletePrescription={handleDeletePrescription}
                onEditPatientProfile={() => openEditForm(selectedPatient)}
            />
        );
      case 'evolution':
        return (
          <Evolutions 
            evolutions={patientEvolutions} 
            onAddEvolution={handleAddEvolution}
            onUpdateEvolution={handleUpdateEvolution}
            onDeleteEvolution={handleDeleteEvolution}
            doctorName={currentUser?.fullName} // Pass current user name for auto-fill
          />
        );
      case 'results':
        return (
            <LabResults 
                results={patientResults} 
                onAddResult={handleAddLabResult}
                onUpdateResult={handleUpdateLabResult}
                onDeleteResult={handleDeleteLabResult}
            />
        );
      case 'affiliation':
        return (
            <AffiliationData 
                patient={selectedPatient}
                onEditPatientProfile={() => openEditForm(selectedPatient)}
            />
        );
      default:
        return (
            <ClinicalHistory 
                patient={selectedPatient} 
                appointments={patientAppointments}
                prescriptions={patientPrescriptions}
                doctorProfile={currentUser}
                assignedBed={assignedBed}
                onAddAppointment={handleAddAppointment}
                onUpdateAppointment={handleUpdateAppointment}
                onAddPrescription={handleAddPrescription}
                onDeletePrescription={handleDeletePrescription}
                onEditPatientProfile={() => openEditForm(selectedPatient)}
            />
        );
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // New Bed Management View
  if (view === 'beds') {
      return (
        <BedManagement 
            beds={beds}
            patients={patients} // Pass patients list
            history={dischargeHistory}
            onBack={() => setView('history')} 
            onUpdateBed={handleUpdateBed}
            onDischarge={handleDischargePatient}
        />
      );
  }

  // Dashboard View (No patient selected)
  if (!selectedPatient) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Simple Navbar for Dashboard */}
        <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-[60]">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-600 rounded">
                <Stethoscope size={20} />
              </div>
              <span className="text-xl font-bold">MedicalMarioLT</span>
            </div>
            <div className="flex items-center gap-4">
                <div 
                    onClick={() => setIsProfileOpen(true)}
                    className="hidden md:flex flex-col items-end mr-2 cursor-pointer hover:bg-slate-800 px-2 py-1 rounded transition-colors group"
                >
                    <span className="text-sm font-bold text-slate-100 group-hover:text-white flex items-center gap-1">
                        {currentUser.fullName} <Settings size={12} className="opacity-50" />
                    </span>
                    <span className="text-slate-300 text-[10px] tracking-wide font-medium">{currentUser.specialty || 'Médico General'}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-red-600/80 px-3 py-1.5 rounded-lg">
                    <LogOut size={16} />
                    <span className="hidden md:inline text-sm">Salir</span>
                </button>
            </div>
          </div>
        </nav>
        
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <PatientList 
            patients={patients}
            beds={beds}
            onSelectPatient={(p) => { setSelectedPatient(p); setView('history'); }}
            onEditPatient={openEditForm}
            onDeletePatient={handleDeletePatient}
            onAddPatient={openCreateForm}
            onViewBeds={() => setView('beds')}
            onAssignBed={handleAssignPatientToBed}
          />
        </main>

        {isFormOpen && (
          <PatientForm 
            initialData={editingPatient}
            onSubmit={editingPatient ? handleUpdatePatient : handleCreatePatient}
            onCancel={() => setIsFormOpen(false)}
          />
        )}

        {/* Profile Modal - Reusing here so it's available in detail view too */}
        {isProfileOpen && (
            <UserProfileModal 
                user={currentUser} 
                onClose={() => setIsProfileOpen(false)}
                onSave={handleUpdateProfile}
                onDelete={handleDeleteAccount}
            />
        )}

        {/* LOADING OVERLAY (MEDICAL THEME) */}
        {isLoading && (
            <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center animate-fade-in">
                <div className="relative mb-8">
                    {/* Pulsing ring */}
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-2 bg-blue-400 rounded-full animate-ping opacity-30 animation-delay-300"></div>
                    
                    {/* Central Icon */}
                    <div className="relative bg-white p-8 rounded-full shadow-2xl border-4 border-blue-50 flex items-center justify-center">
                        <Activity size={64} className="text-blue-600" />
                    </div>
                </div>
                
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">MedicalMarioLT</h2>
                <p className="text-slate-500 mt-3 font-medium flex items-center bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                    <Loader2 size={16} className="animate-spin mr-2 text-blue-600" />
                    Preparando entorno clínico...
                </p>
            </div>
        )}

        {/* DAILY REMINDER MODAL */}
        {showReminderModal && !isLoading && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in flex flex-col overflow-hidden max-h-[80vh]">
                    <div className="p-6 bg-blue-600 text-white flex justify-between items-start">
                         <div>
                             <h3 className="text-xl font-bold flex items-center gap-2"><Calendar size={20} /> Citas Pendientes para Hoy</h3>
                             <p className="text-blue-100 text-sm mt-1">Hola Dr(a). {currentUser.fullName.split(' ')[0]}, tiene pacientes esperando.</p>
                         </div>
                         <button onClick={() => setShowReminderModal(false)} className="text-blue-100 hover:text-white hover:bg-blue-500 rounded-full p-1"><X size={20} /></button>
                    </div>
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                         <div className="text-xs font-bold text-slate-500 uppercase flex justify-between px-2">
                             <span>Hora</span>
                             <span>Paciente / Ubicación</span>
                             <span>Acción</span>
                         </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {dailyAppointments.map(appt => (
                            <div key={appt.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 shadow-sm flex items-center justify-between group transition-all">
                                <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded p-2 min-w-[60px]">
                                    <Clock size={16} className="mb-1" />
                                    <span className="font-bold text-lg leading-none">{appt.time}</span>
                                </div>
                                <div className="flex-1 px-4">
                                    <h4 className="font-bold text-slate-800">{appt.patientName || 'Paciente Desconocido'}</h4>
                                    <div className="flex items-center text-xs text-slate-500 mt-1">
                                        <MapPin size={12} className="mr-1" />
                                        {appt.location || 'Consultorio Principal'}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleViewAppointmentDetail(appt.patientName || '')}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Ver historia clínica"
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
                        <button onClick={() => setShowReminderModal(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">Cerrar Recordatorio</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}
