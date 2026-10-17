"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const [tab, setTab] = useState("citas")
  const [citas, setCitas] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [pacienteActivo, setPacienteActivo] = useState<any>(null)
  const router = useRouter()

  // Estados para nuevo paciente
  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: "", telefono: "", alergias: "", historial: "" })
  const [archivo, setArchivo] = useState<File | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return router.push("/login")
    
    const { data: dataCitas } = await supabase.from("citas").select("*").order("fecha_hora", { ascending: true })
    if(dataCitas) setCitas(dataCitas)

    const { data: dataPacientes } = await supabase.from("pacientes").select("*").order("nombre_completo", { ascending: true })
    if(dataPacientes) setPacientes(dataPacientes)
  }

  const registrarPaciente = async (e: any) => {
    e.preventDefault()
    await supabase.from("pacientes").insert([{ 
      nombre_completo: nuevoPaciente.nombre, telefono: nuevoPaciente.telefono, 
      alergias: nuevoPaciente.alergias, historial_medico: nuevoPaciente.historial 
    }])
    alert("Paciente registrado")
    cargarDatos()
  }

  const subirRadiografia = async () => {
    if (!archivo || !pacienteActivo) return alert("Selecciona paciente y archivo")
    const ruta = `${pacienteActivo.id}/${Date.now()}_${archivo.name}`
    const { error } = await supabase.storage.from("radiografias").upload(ruta, archivo)
    if (error) alert("Error al subir imagen. Verifica crear el bucket 'radiografias'.")
    else alert("Imagen guardada en el expediente")
  }

  const actualizarEstadoCita = async (id: string, nuevoEstado: string) => {
    await supabase.from("citas").update({ estado: nuevoEstado }).eq("id", id)
    cargarDatos()
  }

  // Generador visual de dientes (11 al 18, 21 al 28, etc)
  const dientesSuperiores = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28]
  const dientesInferiores = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* MENÚ LATERAL */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-6 shadow-2xl z-10">
        <h1 className="text-2xl font-black text-white mb-10 tracking-tighter">Kath<span className="text-blue-500">Dent</span> ERP</h1>
        <nav className="space-y-4 font-bold flex-1">
          <button onClick={()=>setTab("citas")} className={`w-full text-left p-4 rounded-xl transition ${tab==="citas" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>📅 Agenda y Citas</button>
          <button onClick={()=>setTab("pacientes")} className={`w-full text-left p-4 rounded-xl transition ${tab==="pacientes" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>📁 Expedientes</button>
          <button onClick={()=>setTab("odontograma")} className={`w-full text-left p-4 rounded-xl transition ${tab==="odontograma" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>🦷 Odontograma</button>
        </nav>
        <button onClick={() => { supabase.auth.signOut(); router.push("/") }} className="p-4 text-red-400 hover:bg-slate-800 rounded-xl font-bold text-left">Cerrar Sesión</button>
      </aside>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* PESTAÑA 1: CITAS */}
        {tab === "citas" && (
          <div className="max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900 mb-8">Control de Citas</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
              {citas.map(cita => (
                <div key={cita.id} className="flex justify-between items-center p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition rounded-xl">
                  <div>
                    <p className="font-bold text-lg text-slate-800">{new Date(cita.fecha_hora).toLocaleString()}</p>
                    <p className="text-slate-500 font-medium">Motivo: <span className="text-blue-600">{cita.motivo}</span></p>
                    <span className="text-xs font-black uppercase mt-2 inline-block px-3 py-1 rounded-full bg-slate-100">{cita.estado}</span>
                  </div>
                  <div className="space-x-3">
                    <button onClick={() => actualizarEstadoCita(cita.id, 'confirmada')} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-200 transition">Confirmar</button>
                    <button onClick={() => actualizarEstadoCita(cita.id, 'completada')} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold hover:bg-blue-200 transition">Completar</button>
                    <button onClick={() => actualizarEstadoCita(cita.id, 'cancelada')} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition">Cancelar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: EXPEDIENTES Y RADIOGRAFÍAS */}
        {tab === "pacientes" && (
          <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-6">Nuevo Paciente</h2>
              <form onSubmit={registrarPaciente} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <input required placeholder="Nombre Completo" onChange={e=>setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 font-medium"/>
                <input placeholder="Teléfono" onChange={e=>setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 font-medium"/>
                <input placeholder="Alergias (Ej. Penicilina)" onChange={e=>setNuevoPaciente({...nuevoPaciente, alergias: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 font-medium"/>
                <textarea placeholder="Historial Médico / Observaciones" onChange={e=>setNuevoPaciente({...nuevoPaciente, historial: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 font-medium h-32"></textarea>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-blue-600 transition shadow-md">Crear Expediente</button>
              </form>
            </div>
            
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-6">Imágenes Clínicas</h2>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">Seleccionar Paciente</label>
                <select onChange={(e) => setPacienteActivo(pacientes.find(p => p.id === e.target.value))} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none mb-6">
                  <option>Seleccione un paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>
                
                {pacienteActivo && (
                  <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50">
                    <p className="font-bold text-slate-600 mb-4">Subir Radiografía o Foto para {pacienteActivo.nombre_completo}</p>
                    <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mb-4 block w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>
                    <button onClick={subirRadiografia} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition">Subir Archivo</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: ODONTOGRAMA VISUAL */}
        {tab === "odontograma" && (
          <div className="max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900 mb-6">Odontograma Digital</h2>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center">
              <select className="w-full max-w-md p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none font-bold mb-10">
                <option>Seleccione paciente para evaluar...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>

              <div className="mb-8">
                <h3 className="text-slate-400 font-bold mb-4 uppercase tracking-widest text-sm">Maxilar Superior</h3>
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                  {dientesSuperiores.map(diente => (
                    <div key={diente} className="w-10 h-14 md:w-14 md:h-20 border-2 border-slate-300 rounded-lg flex items-center justify-center font-black text-slate-400 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition relative group">
                      {diente}
                      <div className="absolute hidden group-hover:block bottom-full mb-2 bg-slate-900 text-white text-xs p-2 rounded shadow-xl w-32 z-20">
                        <button className="block w-full text-left p-1 hover:text-red-400">Marcar Caries</button>
                        <button className="block w-full text-left p-1 hover:text-blue-400">Marcar Obturación</button>
                        <button className="block w-full text-left p-1 hover:text-slate-400">Marcar Extracción</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-slate-400 font-bold mb-4 uppercase tracking-widest text-sm">Maxilar Inferior</h3>
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                  {dientesInferiores.map(diente => (
                    <div key={diente} className="w-10 h-14 md:w-14 md:h-20 border-2 border-slate-300 rounded-lg flex items-center justify-center font-black text-slate-400 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition relative group">
                      {diente}
                      <div className="absolute hidden group-hover:block bottom-full mb-2 bg-slate-900 text-white text-xs p-2 rounded shadow-xl w-32 z-20">
                        <button className="block w-full text-left p-1 hover:text-red-400">Marcar Caries</button>
                        <button className="block w-full text-left p-1 hover:text-blue-400">Marcar Obturación</button>
                        <button className="block w-full text-left p-1 hover:text-slate-400">Marcar Extracción</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  )
}
