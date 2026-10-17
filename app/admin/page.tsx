"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const [tab, setTab] = useState("citas")
  const [citas, setCitas] = useState<any[]>([])
  const [pacientes, setPacientes] = useState<any[]>([])
  const [pacienteActivo, setPacienteActivo] = useState<any>(null)
  const [odontograma, setOdontograma] = useState<any[]>([])

  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: "", telefono: "", alergias: "", historial: "" })
  const [archivo, setArchivo] = useState<File | null>(null)
  const router = useRouter()

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return router.push("/login")

    const { data: dataCitas } = await supabase.from("citas").select("*").order("fecha_hora", { ascending: true })
    if (dataCitas) setCitas(dataCitas)

    const { data: dataPacientes } = await supabase.from("pacientes").select("*").order("nombre_completo", { ascending: true })
    if (dataPacientes) setPacientes(dataPacientes)
  }

  const registrarPaciente = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from("pacientes").insert([{
      nombre_completo: nuevoPaciente.nombre,
      telefono: nuevoPaciente.telefono,
      alergias: nuevoPaciente.alergias,
      historial_medico: nuevoPaciente.historial
    }])

    if (error) {
      alert("Error en Supabase: " + error.message)
    } else {
      alert("¡Expediente de " + nuevoPaciente.nombre + " creado con éxito!")
      setNuevoPaciente({ nombre: "", telefono: "", alergias: "", historial: "" })
      cargarDatos() // Refresca la lista instantáneamente
    }
  }

  const cargarOdontogramaYArchivos = async (pacienteId: string) => {
    const p = pacientes.find(x => x.id === pacienteId)
    setPacienteActivo(p)
    if (!p) return setOdontograma([])

    const { data } = await supabase.from("odontograma").select("*").eq("paciente_id", pacienteId)
    if (data) setOdontograma(data)
  }

  const cambiarEstadoDiente = async (diente: number, estado: string) => {
    if (!pacienteActivo) return alert("Selecciona un paciente primero")

    // Cambia el color en la pantalla al instante
    setOdontograma(prev => {
      const filtrado = prev.filter(o => o.diente !== diente)
      return [...filtrado, { paciente_id: pacienteActivo.id, diente, estado }]
    })

    // Guarda en la base de datos
    await supabase.from("odontograma").upsert(
      { paciente_id: pacienteActivo.id, diente, estado },
      { onConflict: "paciente_id,diente" }
    )
  }

  const subirRadiografia = async () => {
    if (!archivo || !pacienteActivo) return alert("Selecciona un paciente en la lista y adjunta un archivo.")
    const ruta = `${pacienteActivo.id}/${Date.now()}_${archivo.name}`
    const { error } = await supabase.storage.from("radiografias").upload(ruta, archivo)
    if (error) alert("Error al subir archivo: " + error.message)
    else { alert("¡Imagen anexada al expediente!"); setArchivo(null); }
  }

  const eliminarCita = async (id: string) => { if(confirm('¿Borrar esta cita permanentemente?')) { await supabase.from('citas').delete().eq('id', id); cargarDatos() } }

  const actualizarEstadoCita = async (id: string, nuevoEstado: string) => {
    await supabase.from("citas").update({ estado: nuevoEstado }).eq("id", id)
    cargarDatos()
  }

  const dientesSuperiores = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28]
  const dientesInferiores = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]

  // Lógica de colores según estado guardado
  const getDienteStyle = (diente: number) => {
    const est = odontograma.find(o => o.diente === diente)?.estado || 'sano'
    if (est === 'caries') return "bg-red-100 border-red-500 text-red-700 shadow-inner"
    if (est === 'obturacion') return "bg-blue-100 border-blue-500 text-blue-700 shadow-inner"
    if (est === 'extraccion') return "bg-slate-800 border-slate-900 text-slate-100 line-through opacity-70"
    return "bg-white border-slate-300 text-slate-400 hover:border-slate-400"
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* MENU LATERAL */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-6 shadow-2xl z-10 sticky top-0 h-screen">
        <h1 className="text-2xl font-black text-white mb-10 tracking-tighter">Kath<span className="text-blue-500">Dent</span> ERP</h1>
        <nav className="space-y-3 font-bold flex-1">
          <button onClick={()=>setTab("citas")} className={`w-full text-left p-4 rounded-xl transition ${tab==="citas" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>📅 Agenda y Citas</button>
          <button onClick={()=>setTab("pacientes")} className={`w-full text-left p-4 rounded-xl transition ${tab==="pacientes" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>📁 Pacientes & Archivos</button>
          <button onClick={()=>setTab("odontograma")} className={`w-full text-left p-4 rounded-xl transition ${tab==="odontograma" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>🦷 Odontograma</button>
        </nav>
        <button onClick={() => { supabase.auth.signOut(); router.push("/") }} className="p-4 text-red-400 hover:bg-slate-800 rounded-xl font-bold text-left">Cerrar Sesión</button>
      </aside>

      {/* CONTENIDO CENTRAL */}
      <main className="flex-1 p-10 overflow-y-auto">
        {tab === "citas" && (
          <div className="max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900 mb-8">Control de Citas</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-4">
              {citas.length === 0 ? <p className="text-slate-500 font-medium">No hay citas registradas aún.</p> : citas.map(cita => (
                <div key={cita.id} className="flex justify-between items-center p-6 border border-slate-100 hover:bg-slate-50 transition rounded-2xl">
                  <div>
                    <p className="font-black text-xl text-slate-900">{cita.nombre_paciente || 'Paciente Sin Nombre'} <span className="text-sm font-medium text-slate-500 ml-2">📞 {cita.telefono || 'Sin Tel.'}</span></p><p className="font-bold text-md text-slate-700 mt-2">🗓️ {new Date(cita.fecha_hora).toLocaleString()}</p>
                    <p className="text-slate-600 font-medium mt-1">Tratamiento: <span className="text-blue-600 font-bold">{cita.motivo}</span></p>
                    <span className={`text-xs font-black uppercase mt-3 inline-block px-3 py-1 rounded-full ${cita.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : cita.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' : cita.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{cita.estado}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => actualizarEstadoCita(cita.id, 'confirmada')} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold hover:bg-emerald-100 transition">Confirmar</button>
                    <button onClick={() => actualizarEstadoCita(cita.id, 'completada')} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition">Completar</button>
                    <button onClick={() => actualizarEstadoCita(cita.id, 'cancelada')} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition">Cancelar</button>
                    <button onClick={() => eliminarCita(cita.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition shadow-md">🗑️ Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "pacientes" && (
          <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-6">Nuevo Expediente</h2>
              <form onSubmit={registrarPaciente} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <input required placeholder="Nombre Completo" value={nuevoPaciente.nombre} onChange={e=>setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                <input placeholder="Teléfono" value={nuevoPaciente.telefono} onChange={e=>setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                <input placeholder="Alergias (Ej. Penicilina)" value={nuevoPaciente.alergias} onChange={e=>setNuevoPaciente({...nuevoPaciente, alergias: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium text-red-600"/>
                <textarea placeholder="Historial Médico y Observaciones" value={nuevoPaciente.historial} onChange={e=>setNuevoPaciente({...nuevoPaciente, historial: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium h-32"></textarea>
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-blue-600 transition shadow-md">Crear Expediente</button>
              </form>
            </div>
            
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-6">Subir Archivos Clínicos</h2>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">1. Seleccionar Paciente</label>
                <select onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold mb-6 cursor-pointer focus:border-blue-600">
                  <option value="">Seleccione un paciente de la lista...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>

                {pacienteActivo && (
                  <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50 hover:bg-blue-50 transition">
                    <p className="font-bold text-slate-600 mb-4">Anexar Radiografía/Foto para <br/><span className="text-blue-600 text-lg">{pacienteActivo.nombre_completo}</span></p>
                    <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mb-6 block w-full text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"/>
                    <button onClick={subirRadiografia} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-md">Subir al Expediente Nube</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "odontograma" && (
          <div className="max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900 mb-6">Odontograma Interactivo</h2>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
              
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10 pb-6 border-b border-slate-100">
                <select onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full md:w-1/2 p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold cursor-pointer focus:border-blue-600">
                  <option value="">1. Buscar y seleccionar paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>

                <div className="flex gap-4 text-sm font-bold text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-slate-300 rounded"></div> Sano</span>
                  <span className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-500 rounded"></div> Caries</span>
                  <span className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-100 border border-blue-500 rounded"></div> Obturado</span>
                  <span className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-800 rounded"></div> Extraído</span>
                </div>
              </div>

              {pacienteActivo ? (
                <div className="animate-fade-in text-center">
                  <div className="mb-12">
                    <h3 className="text-slate-400 font-bold mb-6 uppercase tracking-widest text-sm">Arcada Superior</h3>
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                      {dientesSuperiores.map(diente => (
                        <div key={diente} className={`w-12 h-16 md:w-14 md:h-20 border-2 rounded-xl flex items-center justify-center font-black cursor-pointer transition relative group ${getDienteStyle(diente)}`}>
                          {diente}
                          <div className="absolute hidden group-hover:block bottom-full mb-3 bg-slate-900 text-white text-sm p-2 rounded-xl shadow-2xl w-36 z-20">
                            <button onClick={()=>cambiarEstadoDiente(diente, 'sano')} className="block w-full text-left p-2 hover:bg-slate-700 rounded-lg">⚪ Sano</button>
                            <button onClick={()=>cambiarEstadoDiente(diente, 'caries')} className="block w-full text-left p-2 hover:bg-slate-700 text-red-400 rounded-lg font-bold">🔴 Caries</button>
                            <button onClick={()=>cambiarEstadoDiente(diente, 'obturacion')} className="block w-full text-left p-2 hover:bg-slate-700 text-blue-400 rounded-lg font-bold">🔵 Obturación</button>
                            <button onClick={()=>cambiarEstadoDiente(diente, 'extraccion')} className="block w-full text-left p-2 hover:bg-slate-700 text-slate-300 rounded-lg">⚫ Extracción</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-slate-400 font-bold mb-6 uppercase tracking-widest text-sm">Arcada Inferior</h3>
                    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                      {dientesInferiores.map(diente => (
                        <div key={diente} className={`w-12 h-16 md:w-14 md:h-20 border-2 rounded-xl flex items-center justify-center font-black cursor-pointer transition relative group ${getDienteStyle(diente)}`}>
                          {diente}
                          <div className="absolute hidden group-hover:block bottom-full mb-3 bg-slate-900 text-white text-sm p-2 rounded-xl shadow-2xl w-36 z-20">
                            <button onClick={()=>cambiarEstadoDiente(diente, 'sano')} className="block w-full text-left p-2 hover:bg-slate-700 rounded-lg">⚪ Sano</button>
                            <button onClick={()=>cambiarEstadoDiente(diente, 'caries')} className="block w-full text-left p-2 hover:bg-slate-700 text-red-400 rounded-lg font-bold">🔴 Caries</button>
                            <button onClick={()=>cambiarEstadoDiente(diente, 'obturacion')} className="block w-full text-left p-2 hover:bg-slate-700 text-blue-400 rounded-lg font-bold">🔵 Obturación</button>
                            <button onClick={()=>cambiarEstadoDiente(diente, 'extraccion')} className="block w-full text-left p-2 hover:bg-slate-700 text-slate-300 rounded-lg">⚫ Extracción</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <p className="text-slate-500 font-medium text-lg">Busque y seleccione un paciente en el menú superior para desplegar su ficha dental.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
