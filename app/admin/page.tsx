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
  const [pagos, setPagos] = useState<any[]>([])

  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: "", telefono: "", alergias: "", historial: "" })
  const [editando, setEditando] = useState(false)
  const [datosEdicion, setDatosEdicion] = useState({ id: "", nombre: "", telefono: "", alergias: "", historial: "" })
  const [nuevoPago, setNuevoPago] = useState({ concepto: "", monto: "", tipo: "cargo" })
  const [recetaTexto, setRecetaTexto] = useState("")

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
      nombre_completo: nuevoPaciente.nombre, telefono: nuevoPaciente.telefono,
      alergias: nuevoPaciente.alergias, historial_medico: nuevoPaciente.historial
    }])
    if (error) alert("Error: " + error.message)
    else {
      alert("¡Expediente creado con éxito!")
      setNuevoPaciente({ nombre: "", telefono: "", alergias: "", historial: "" })
      cargarDatos()
    }
  }

  const guardarEdicionPaciente = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from("pacientes").update({
      nombre_completo: datosEdicion.nombre, telefono: datosEdicion.telefono,
      alergias: datosEdicion.alergias, historial_medico: datosEdicion.historial
    }).eq("id", datosEdicion.id)

    if(error) alert("Error al actualizar: " + error.message)
    else {
      alert("¡Datos actualizados correctamente!")
      setEditando(false)
      cargarDatos()
    }
  }

  const crearExpedienteDesdeCita = async (cita: any) => {
    const { data, error } = await supabase.from("pacientes").insert([{
      nombre_completo: cita.nombre_paciente || "Sin Nombre",
      telefono: cita.telefono || "",
      alergias: "No reportadas",
      historial_medico: "Cita original: " + cita.motivo
    }]).select()

    if(error) alert("Error: " + error.message)
    else {
      alert("Expediente generado exitosamente para " + cita.nombre_paciente)
      cargarDatos()
      if(data && data[0]) {
         cargarOdontogramaYArchivos(data[0].id)
         setTab("odontograma")
      }
    }
  }

  const cargarOdontogramaYArchivos = async (pacienteId: string) => {
    const p = pacientes.find(x => x.id === pacienteId)
    setPacienteActivo(p)
    if (!p) {
       setOdontograma([])
       setPagos([])
       setEditando(false)
       return
    }
    setDatosEdicion({ id: p.id, nombre: p.nombre_completo, telefono: p.telefono, alergias: p.alergias, historial: p.historial_medico })

    const { data: odData } = await supabase.from("odontograma").select("*").eq("paciente_id", pacienteId)
    if (odData) setOdontograma(odData)

    const { data: pgData } = await supabase.from("pagos").select("*").eq("paciente_id", pacienteId).order("fecha", { ascending: false })
    if (pgData) setPagos(pgData)
  }

  const registrarPago = async (e: any) => {
    e.preventDefault()
    if(!pacienteActivo) return
    const { error } = await supabase.from("pagos").insert([{
      paciente_id: pacienteActivo.id,
      concepto: nuevoPago.concepto,
      monto: parseFloat(nuevoPago.monto),
      tipo: nuevoPago.tipo
    }])
    if(error) alert("Error: " + error.message)
    else {
      setNuevoPago({ concepto: "", monto: "", tipo: "cargo" })
      cargarOdontogramaYArchivos(pacienteActivo.id)
    }
  }

  const activarEdicion = () => setEditando(true)

  const cambiarEstadoDiente = async (diente: number, estado: string) => {
    if (!pacienteActivo) return alert("Selecciona un paciente primero")
    setOdontograma(prev => [...prev.filter(o => o.diente !== diente), { paciente_id: pacienteActivo.id, diente, estado }])
    await supabase.from("odontograma").upsert({ paciente_id: pacienteActivo.id, diente, estado }, { onConflict: "paciente_id,diente" })
  }

  const subirRadiografia = async () => {
    if (!archivo || !pacienteActivo) return alert("Selecciona paciente y archivo.")
    const ruta = `${pacienteActivo.id}/${Date.now()}_${archivo.name}`
    const { error } = await supabase.storage.from("radiografias").upload(ruta, archivo)
    if (error) alert("Error: " + error.message)
    else { alert("¡Imagen anexada!"); setArchivo(null); }
  }

  const actualizarEstadoCita = async (id: string, nuevoEstado: string) => {
    await supabase.from("citas").update({ estado: nuevoEstado }).eq("id", id)
    cargarDatos()
  }
  
  const eliminarCita = async (id: string) => {
    if(confirm("¿Estás seguro de borrar esta cita permanentemente?")) {
      await supabase.from("citas").delete().eq("id", id)
      cargarDatos()
    }
  }

  const dientesSuperiores = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28]
  const dientesInferiores = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]

  const getDienteStyle = (diente: number) => {
    const est = odontograma.find(o => o.diente === diente)?.estado || 'sano'
    if (est === 'caries') return "bg-red-100 border-red-500 text-red-700 shadow-inner"
    if (est === 'obturacion') return "bg-blue-100 border-blue-500 text-blue-700 shadow-inner"
    if (est === 'extraccion') return "bg-slate-800 border-slate-900 text-slate-100 line-through opacity-70"
    return "bg-white border-slate-300 text-slate-400 hover:border-slate-400"
  }

  const balanceTotal = pagos.reduce((acc, p) => p.tipo === 'cargo' ? acc + Number(p.monto) : acc - Number(p.monto), 0)

  return (
    <div className="min-h-screen bg-slate-50 flex print:bg-white">
      <div className="hidden print:block p-10 bg-white text-black w-full h-screen absolute top-0 left-0 z-50">
        <div className="text-center border-b-2 border-slate-800 pb-6 mb-8">
          <h1 className="text-4xl font-black">KathDent</h1>
          <p className="text-xl">Dra. Kath - Cirujana Dentista</p>
          <p className="text-sm">San Salvador, El Salvador | Tel: 7000-0000</p>
        </div>
        <div className="mb-8 flex justify-between text-lg font-bold">
          <p>Paciente: {pacienteActivo?.nombre_completo}</p>
          <p>Fecha: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="min-h-[400px] text-lg leading-relaxed whitespace-pre-wrap border border-slate-200 p-6 rounded-xl">
          <p className="font-bold text-2xl mb-4">Rx:</p>
          {recetaTexto}
        </div>
        <div className="mt-20 pt-10 border-t border-slate-400 text-center w-64 mx-auto font-bold">
          Firma y Sello
        </div>
      </div>

      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-6 shadow-2xl z-10 sticky top-0 h-screen print:hidden">
        <h1 className="text-2xl font-black text-white mb-10 tracking-tighter">Kath<span className="text-blue-500">Dent</span> ERP</h1>
        <nav className="space-y-3 font-bold flex-1">
          <button onClick={()=>setTab("citas")} className={`w-full text-left p-4 rounded-xl transition ${tab==="citas" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>📅 Agenda y Citas</button>
          <button onClick={()=>setTab("pacientes")} className={`w-full text-left p-4 rounded-xl transition ${tab==="pacientes" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>📁 Expedientes y Rx</button>
          <button onClick={()=>setTab("odontograma")} className={`w-full text-left p-4 rounded-xl transition ${tab==="odontograma" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>🦷 Odontograma</button>
          <button onClick={()=>setTab("finanzas")} className={`w-full text-left p-4 rounded-xl transition ${tab==="finanzas" ? "bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800"}`}>💰 Finanzas y Pagos</button>
        </nav>
        <button onClick={() => { supabase.auth.signOut(); router.push("/") }} className="p-4 text-red-400 hover:bg-slate-800 rounded-xl font-bold text-left">Cerrar Sesión</button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto print:hidden">
        {tab === "citas" && (
          <div className="max-w-6xl">
            <h2 className="text-3xl font-black text-slate-900 mb-8">Control de Citas</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-4">
              {citas.length === 0 ? <p className="text-slate-500 font-medium">No hay citas registradas aún.</p> : citas.map(cita => (
                <div key={cita.id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-6 border border-slate-100 hover:bg-slate-50 transition rounded-2xl gap-4">
                  <div>
                    <p className="font-black text-xl text-slate-900">{cita.nombre_paciente || 'Paciente Sin Nombre'} <span className="text-sm font-medium text-slate-500 ml-2">📞 {cita.telefono || 'Sin Tel.'}</span></p>
                    <p className="font-bold text-md text-slate-700 mt-2">🗓️ {new Date(cita.fecha_hora).toLocaleString()}</p>
                    <p className="text-slate-600 font-medium mt-1">Tratamiento: <span className="text-blue-600 font-bold">{cita.motivo}</span></p>
                    <span className={`text-xs font-black uppercase mt-3 inline-block px-3 py-1 rounded-full ${cita.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : cita.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' : cita.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{cita.estado}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => crearExpedienteDesdeCita(cita)} className="bg-purple-50 text-purple-600 px-4 py-2 rounded-lg font-bold hover:bg-purple-100 transition shadow-sm border border-purple-200">📋 Generar Expediente</button>
                    <button onClick={() => actualizarEstadoCita(cita.id, 'confirmada')} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold hover:bg-emerald-100 transition">Confirmar</button>
                    <button onClick={() => actualizarEstadoCita(cita.id, 'completada')} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition">Completar</button>
                    <button onClick={() => actualizarEstadoCita(cita.id, 'cancelada')} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg font-bold hover:bg-orange-100 transition">Cancelar</button>
                    <button onClick={() => eliminarCita(cita.id)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition shadow-md">🗑️ Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "pacientes" && (
          <div className="max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {editando ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-blue-600">Editar Expediente</h2>
                    <button onClick={()=>{setEditando(false); setPacienteActivo(null)}} className="text-slate-400 hover:text-red-500 font-bold transition">✖ Cancelar</button>
                  </div>
                  <form onSubmit={guardarEdicionPaciente} className="bg-white p-8 rounded-3xl shadow-sm border border-blue-200 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                    <input required placeholder="Nombre Completo" value={datosEdicion.nombre} onChange={e=>setDatosEdicion({...datosEdicion, nombre: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                    <input placeholder="Teléfono" value={datosEdicion.telefono} onChange={e=>setDatosEdicion({...datosEdicion, telefono: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                    <input placeholder="Alergias (Ej. Penicilina)" value={datosEdicion.alergias} onChange={e=>setDatosEdicion({...datosEdicion, alergias: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium text-red-600"/>
                    <textarea placeholder="Historial Médico y Observaciones" value={datosEdicion.historial} onChange={e=>setDatosEdicion({...datosEdicion, historial: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium h-32"></textarea>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-md">💾 Guardar Cambios</button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-black text-slate-900 mb-6">Nuevo Expediente</h2>
                  <form onSubmit={registrarPaciente} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                    <input required placeholder="Nombre Completo" value={nuevoPaciente.nombre} onChange={e=>setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                    <input placeholder="Teléfono" value={nuevoPaciente.telefono} onChange={e=>setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                    <input placeholder="Alergias (Ej. Penicilina)" value={nuevoPaciente.alergias} onChange={e=>setNuevoPaciente({...nuevoPaciente, alergias: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium text-red-600"/>
                    <textarea placeholder="Historial Médico y Observaciones" value={nuevoPaciente.historial} onChange={e=>setNuevoPaciente({...nuevoPaciente, historial: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium h-32"></textarea>
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-md">Crear Expediente</button>
                  </form>
                </>
              )}
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-6">Buscador Activo</h2>
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold cursor-pointer focus:border-blue-600">
                    <option value="">Seleccione un paciente de la lista...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select>

                  {pacienteActivo && !editando && (
                    <button onClick={activarEdicion} className="w-full mt-4 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition border border-slate-200 shadow-sm">
                      ✏️ Editar datos de {pacienteActivo.nombre_completo}
                    </button>
                  )}
                </div>
              </div>

              {pacienteActivo && (
                <>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Radiografías / Fotos</h2>
                    <div className="bg-white p-8 border-2 border-dashed border-slate-300 rounded-3xl text-center hover:bg-blue-50 transition">
                      <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mb-6 block w-full text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"/>
                      <button onClick={subirRadiografia} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-md">☁️ Subir Archivo Clínico</button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Generador de Recetas</h2>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                      <p className="text-slate-500 font-bold text-sm">Medicamentos e indicaciones:</p>
                      <textarea value={recetaTexto} onChange={e=>setRecetaTexto(e.target.value)} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium h-32" placeholder="Ej. Amoxicilina 500mg cada 8 horas..."></textarea>
                      <button onClick={()=>window.print()} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-md">🖨️ Imprimir Receta Oficial</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tab === "odontograma" && (
          <div className="max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900 mb-6">Odontograma Interactivo</h2>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-10 pb-6 border-b border-slate-100">
                <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full md:w-1/2 p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold cursor-pointer focus:border-blue-600">
                  <option value="">Buscar y seleccionar paciente...</option>
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
                  <p className="text-slate-500 font-medium text-lg">Seleccione un paciente para desplegar su ficha dental.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "finanzas" && (
          <div className="max-w-5xl">
            <h2 className="text-3xl font-black text-slate-900 mb-6">Finanzas y Estado de Cuenta</h2>
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
              <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold cursor-pointer focus:border-blue-600 mb-8">
                <option value="">1. Seleccione un paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>

              {pacienteActivo ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div>
                    <div className={`p-6 rounded-2xl mb-8 text-center ${balanceTotal > 0 ? 'bg-red-50 border border-red-200 text-red-700' : balanceTotal < 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                      <p className="font-bold text-sm uppercase tracking-widest mb-2">Balance Pendiente a Pagar</p>
                      <p className="text-5xl font-black">${Math.max(0, balanceTotal).toFixed(2)}</p>
                      {balanceTotal < 0 && <p className="text-sm font-bold mt-2 text-emerald-600">Tiene saldo a favor: ${Math.abs(balanceTotal).toFixed(2)}</p>}
                    </div>

                    <form onSubmit={registrarPago} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-slate-800 text-lg mb-4">Registrar Movimiento</h3>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer">
                          <input type="radio" name="tipo" checked={nuevoPago.tipo === 'cargo'} onChange={() => setNuevoPago({...nuevoPago, tipo: 'cargo'})} className="w-5 h-5 accent-blue-600"/>
                          Añadir Cargo (Deuda)
                        </label>
                        <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer">
                          <input type="radio" name="tipo" checked={nuevoPago.tipo === 'abono'} onChange={() => setNuevoPago({...nuevoPago, tipo: 'abono'})} className="w-5 h-5 accent-emerald-600"/>
                          Añadir Abono (Pago)
                        </label>
                      </div>
                      <input required placeholder="Concepto (Ej. Pago Limpieza)" value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto: e.target.value})} className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-blue-600 font-medium"/>
                      <div className="relative">
                        <span className="absolute left-4 top-4 font-black text-slate-400">$</span>
                        <input required type="number" step="0.01" min="0" placeholder="0.00" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto: e.target.value})} className="w-full p-4 pl-8 rounded-xl border border-slate-200 outline-none focus:border-blue-600 font-black text-lg"/>
                      </div>
                      <button type="submit" className={`w-full text-white font-bold py-4 rounded-xl transition shadow-md ${nuevoPago.tipo === 'cargo' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                        Registrar {nuevoPago.tipo === 'cargo' ? 'Cargo' : 'Abono'}
                      </button>
                    </form>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-xl mb-6">Historial Financiero</h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {pagos.length === 0 ? <p className="text-slate-500 font-medium">No hay registros financieros.</p> : pagos.map(pago => (
                        <div key={pago.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl bg-slate-50">
                          <div>
                            <p className="font-bold text-slate-800">{pago.concepto}</p>
                            <p className="text-xs font-medium text-slate-500">{new Date(pago.fecha).toLocaleDateString()}</p>
                          </div>
                          <div className={`font-black text-lg ${pago.tipo === 'cargo' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {pago.tipo === 'cargo' ? '+' : '-'}${Number(pago.monto).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <p className="text-slate-500 font-medium text-lg">Seleccione un paciente para ver su estado de cuenta.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}