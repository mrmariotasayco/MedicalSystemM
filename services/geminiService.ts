import { GoogleGenAI } from "@google/genai";
import { EvolutionNote, Patient } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateEvolutionSummary = async (notes: EvolutionNote[]): Promise<string> => {
  try {
    const notesText = notes.map(n => 
      `Fecha: ${n.date}, Diagnóstico: ${n.assessment}, Plan: ${n.plan}`
    ).join('\n---\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Actúa como un asistente médico profesional. Analiza las siguientes notas de evolución clínica y genera un resumen conciso (máximo 100 palabras) del progreso del paciente, destacando las tendencias clave y los cambios en el tratamiento. Usa terminología médica adecuada en español.\n\nNotas:\n${notesText}`,
    });

    return response.text || "No se pudo generar el resumen.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Error al conectar con el asistente inteligente. Verifique su conexión o clave API.";
  }
};

export const analyzeLabResults = async (resultName: string, value: number, unit: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `El paciente tiene un resultado de laboratorio de "${resultName}" con valor ${value} ${unit}. Proporciona una interpretación breve de una sola frase sobre si esto es generalmente alto, bajo o normal, y una recomendación general muy breve. No des consejo médico definitivo, solo orientación informativa.`,
        });
        return response.text || "";
    } catch (error) {
        return "";
    }
}

export const generateClinicalRecommendations = async (patient: Patient): Promise<string> => {
    try {
        const context = `
            Paciente: ${patient.name} (${patient.gender}, nacido en ${patient.dob}).
            Alergias: ${patient.allergies.join(', ') || 'Ninguna'}.
            Condiciones Crónicas: ${patient.chronicConditions.join(', ') || 'Ninguna'}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Actúa como un sistema de alerta médica clínica. Basado en el perfil del paciente:
            ${context}
            Genera una "Nota Importante" breve (máximo 2 frases) con recomendaciones de seguridad críticas o recordatorios de monitoreo específicos para sus condiciones y alergias. Sé directo y profesional. No saludes.`,
        });

        return response.text || "Se recomienda monitoreo general de signos vitales.";
    } catch (error) {
        return "Requiere evaluación médica estándar.";
    }
};