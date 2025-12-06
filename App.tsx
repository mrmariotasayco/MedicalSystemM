import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ClinicalHistory } from './components/ClinicalHistory';
import { Evolutions } from './components/Evolutions';
import { LabResults } from './components/LabResults';
import { Login } from './components/Login';
import { PatientList } from './components/PatientList';
import { PatientForm } from './components/PatientForm';
import { BedManagement } from './components/BedManagement';
import { UserProfileModal } from './components/UserProfileModal'; 
import { Patient, EvolutionNote, LabResult, ViewState, Appointment, BedData, DischargedPatient, LabSection, Prescription } from './types';
import { Menu, LogOut, Stethoscope, Loader2, Settings, X } from 'lucide-react';
import { UserProfile, signOut, getCurrentSession, updateUserProfile, deleteUserAccount } from './services/authService';

// Import Database Services
import * as dbService from './services/dbService';

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
          // Don't alert here to avoid spamming on mounting if DB has transient issue
      } finally {
          setIsLoading(false);
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

    } catch (error) {
        alert("Error al eliminar paciente.");
    }
  };

  const handleAddEvolution = async (newNote: EvolutionNote) => {
    if (!selectedPatient) return;
    try {
        const created = await dbService.createEvolution(newNote, selectedPatient.id);
        if (created) {
            setPatientEvolutions(prev => [created, ...prev]);
        }
    } catch (error) {
        alert("Error al guardar evolución.");
    }
  };

  const handleUpdateEvolution = async (updatedNote: EvolutionNote) => {
    try {
        const updated = await dbService.updateEvolution(updatedNote);
        if (updated) {
             setPatientEvolutions(prev => prev.map(e => e.id === updated.id ? updated : e));
        }
    } catch (error) {
        alert("Error al actualizar evolución (Posible bloqueo de 24h).");
    }
  };

  const handleDeleteEvolution = async (id: string) => {
      try {
          await dbService.deleteEvolution(id);
          setPatientEvolutions(prev => prev.filter(e => e.id !== id));
      } catch (error) {
          alert("Error al eliminar evolución (Posible bloqueo de 24h).");
      }
  };

  const handleAddLabResult = async (newResult: LabResult) => {
     if (!selectedPatient) return;
     try {
         const created = await dbService.createLabResult(newResult, selectedPatient.id);
         if (created) {
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
          await dbService.deleteLabResult(id);
          setPatientResults(prev => prev.filter(r => r.id !== id));
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
    } catch (error) {
        alert("Error al agendar cita.");
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
                          reference: l.referenceRange || ''
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
          setIsLoading(false);
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
        <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-600 rounded">
                <Stethoscope size={20} />
              </div>
              <span className="text-xl font-bold">MedicalMarioLT</span>
            </div>
            <div className="flex items-center gap-4">
                {isLoading && (
                    <div className="flex items-center text-blue-200 text-sm">
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Sincronizando...
                    </div>
                )}
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
    </div>
  );
}

  return (
    <div className="flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center z-20">
             <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-600 rounded">
                    <Stethoscope size={20} />
                </div>
                <span className="text-lg font-bold">MedicalMarioLT</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-300">
                <Menu />
            </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Desktop */}
            <div className="hidden md:block">
                <Sidebar 
                    currentView={view} 
                    onChangeView={setView} 
                    onLogout={handleLogout}
                    onBackToDashboard={() => setSelectedPatient(null)}
                    onOpenProfile={() => setIsProfileOpen(true)}
                    patientName={selectedPatient.name}
                    doctorName={currentUser.fullName}
                />
            </div>
            
            {/* Sidebar Mobile */}
            {isMobileMenuOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/95 md:hidden transition-all">
                    <div className="flex justify-end p-4">
                        <button onClick={() => setIsMobileMenuOpen(false)} className="text-white p-2">
                            <X size={24} />
                        </button>
                    </div>
                     <Sidebar 
                        currentView={view} 
                        onChangeView={(v) => { setView(v); setIsMobileMenuOpen(false); }} 
                        onLogout={handleLogout}
                        onBackToDashboard={() => { setSelectedPatient(null); setIsMobileMenuOpen(false); }}
                        onOpenProfile={() => { setIsProfileOpen(true); setIsMobileMenuOpen(false); }}
                        patientName={selectedPatient.name}
                        doctorName={currentUser.fullName}
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 relative">
                 <div className="max-w-6xl mx-auto">
                    {renderContent()}
                 </div>
            </div>
        </div>

        {isFormOpen && (
          <PatientForm 
            initialData={editingPatient}
            onSubmit={editingPatient ? handleUpdatePatient : handleCreatePatient}
            onCancel={() => setIsFormOpen(false)}
          />
        )}

         {/* Profile Modal */}
        {isProfileOpen && (
            <UserProfileModal 
                user={currentUser} 
                onClose={() => setIsProfileOpen(false)}
                onSave={handleUpdateProfile}
                onDelete={handleDeleteAccount}
            />
        )}
    </div>
  );
}