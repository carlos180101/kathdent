"use client"
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import Link from "next/link"

export default function Agendar() {
  const [motivo, setMotivo] = useState("")
  const [fecha, setFecha] = useState("")
  const [mensaje, setMensaje] = useState("")

  const agendarCita = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from("citas").insert([{ motivo, fecha_hora: fecha, estado: "pendiente" }])
    if (error) setMensaje("Error al agendar. Contacta soporte.")
    else setMensaje("✅ ¡Cita solicitada con éxito! Te contactaremos pronto.")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <Link href="/" className="absolute top-8 left-8 text-slate-500 font-bold hover:text-blue-600 transition flex items-center gap-2">← Regresar</Link>
      <form onSubmit={agendarCita} className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-100">
        <h1 className="text-4xl font-black mb-2 text-center text-slate-900">Reserva tu Cita</h1>
        <p className="text-center text-slate-500 mb-8 font-medium">Selecciona el tratamiento y horario de tu preferencia.</p>
        {mensaje && <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-center">{mensaje}</div>}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Tratamiento Requerido</label>
            <select required onChange={(e)=>setMotivo(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:border-blue-600 focus:ring-0 outline-none transition cursor-pointer">
              <option value="">Selecciona una opción...</option>
              <option value="Limpieza Dental Especializada">Limpieza Dental Especializada</option>
              <option value="Evaluación General / Diagnóstico">Evaluación General / Diagnóstico</option>
              <option value="Extracción">Extracción</option>
              <option value="Blanqueamiento Dental">Blanqueamiento Dental</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Fecha y Hora</label>
            <input required type="datetime-local" onChange={(e)=>setFecha(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:border-blue-600 focus:ring-0 outline-none transition"/>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white font-bold text-lg py-5 rounded-xl hover:bg-blue-600 transition-colors shadow-lg mt-4">Confirmar Reservación</button>
        </div>
      </form>
    </div>
  )
}
