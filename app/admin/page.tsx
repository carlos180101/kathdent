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
    else { alert("¡Expediente creado con éxito!"); setNuevoPaciente({ nombre: "", telefono: "", alergias: "", historial: "" }); cargarDatos() }
  }

  const guardarEdicionPaciente = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from("pacientes").update({
      nombre_completo: datosEdicion.nombre, telefono: datosEdicion.telefono,
      alergias: datosEdicion.alergias, historial_medico: datosEdicion.historial
    }).eq("id", datosEdicion.id)
    if(error) alert("Error: " + error.message)
    else { alert("¡Datos actualizados!"); setEditando(false); cargarDatos() }
  }

  const eliminarPaciente = async (id: string) => {
    if(confirm("⚠️ ATENCIÓN: ¿Borrar expediente permanentemente? Se eliminará su historial, odontograma y pagos de la base de datos.")) {
      await supabase.from("pacientes").delete().eq("id", id)
      setPacienteActivo(null)
      cargarDatos()
    }
  }

  const crearExpedienteDesdeCita = async (cita: any) => {
    const { data, error } = await supabase.from("pacientes").insert([{
      nombre_completo: cita.nombre_paciente || "Sin Nombre", telefono: cita.telefono || "",
      alergias: "No reportadas", historial_medico: "Cita original: " + cita.motivo
    }]).select()
    if(error) alert("Error: " + error.message)
    else {
      alert("Expediente generado exitosamente")
      cargarDatos()
      if(data && data[0]) { cargarOdontogramaYArchivos(data[0].id); setTab("odontograma") }
    }
  }

  const cargarOdontogramaYArchivos = async (pacienteId: string) => {
    const p = pacientes.find(x => x.id === pacienteId)
    setPacienteActivo(p)
    if (!p) { setOdontograma([]); setPagos([]); setEditando(false); return }
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
      paciente_id: pacienteActivo.id, concepto: nuevoPago.concepto, monto: parseFloat(nuevoPago.monto), tipo: nuevoPago.tipo
    }])
    if(error) alert("Error: " + error.message)
    else { setNuevoPago({ concepto: "", monto: "", tipo: "cargo" }); cargarOdontogramaYArchivos(pacienteActivo.id) }
  }

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
    else { alert("¡Imagen anexada!"); setArchivo(null) }
  }

  const actualizarEstadoCita = async (id: string, nuevoEstado: string) => {
    await supabase.from("citas").update({ estado: nuevoEstado }).eq("id", id)
    cargarDatos()
  }
  const eliminarCita = async (id: string) => {
    if(confirm("¿Borrar esta cita permanentemente?")) { await supabase.from("citas").delete().eq("id", id); cargarDatos() }
  }

  const activarEdicion = () => setEditando(true)

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
    <div className="w-full">
      
      {/* VISTA EXCLUSIVA PARA LA IMPRESORA (Recetario Oficial) */}
      <div className="hidden print:block bg-white text-black w-full max-w-4xl mx-auto p-12">
        <div className="border-b-4 border-blue-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black text-blue-900 tracking-tighter">Kath<span className="text-blue-500">Dent</span></h1>
            <p className="text-2xl font-bold mt-2 text-slate-800">Dra. Kath</p>
            <p className="text-lg text-slate-500 font-medium">Cirujana Dentista Especializada</p>
          </div>
          <div className="text-right text-sm font-bold text-slate-600">
            <p>San Salvador, El Salvador</p>
            <p>Tel: (+503) 7000-0000</p>
            <p>www.ack-studio.com</p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 mb-10 flex justify-between items-center">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-500 font-black mb-1">Nombre del Paciente</p>
            <p className="text-2xl font-black text-slate-900">{pacienteActivo?.nombre_completo || "_______________________"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase tracking-widest text-slate-500 font-black mb-1">Fecha de Expedición</p>
            <p className="text-xl font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="min-h-[500px]">
          <div className="text-6xl font-black text-slate-200 mb-8 italic">Rx</div>
          <div className="text-xl leading-loose text-slate-900 whitespace-pre-wrap pl-6 font-medium">
            {recetaTexto || "Sin indicaciones médicas."}
          </div>
        </div>

        <div className="mt-20 flex justify-end">
          <div className="text-center w-72">
            <div className="border-t-2 border-slate-800 pt-3 font-black text-xl text-slate-800">Dra. Kath</div>
            <p className="text-base font-bold text-slate-500 mt-1">Firma y Sello</p>
          </div>
        </div>
      </div>

      {/* VISTA NORMAL DE PANTALLA */}
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:hidden w-full overflow-x-hidden">
        
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col p-4 md:p-6 shadow-2xl z-20 sticky top-0 md:h-screen">
          <div className="flex justify-between items-center mb-4 md:mb-10">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter">Kath<span className="text-blue-500">Dent</span></h1>
            <button onClick={() => { supabase.auth.signOut(); router.push("/") }} className="md:hidden text-red-400 font-bold p-2 text-sm bg-slate-800 rounded-lg">Salir</button>
          </div>
          
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto font-bold flex-1 pb-2 md:pb-0 scrollbar-hide">
            <button onClick={()=>setTab("citas")} className={`whitespace-nowrap text-sm md:text-base px-4 py-2 md:p-4 rounded-xl transition ${tab==="citas" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800 md:bg-transparent hover:bg-slate-800"}`}>📅 Agenda</button>
            <button onClick={()=>setTab("pacientes")} className={`whitespace-nowrap text-sm md:text-base px-4 py-2 md:p-4 rounded-xl transition ${tab==="pacientes" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800 md:bg-transparent hover:bg-slate-800"}`}>📁 Expedientes</button>
            <button onClick={()=>setTab("odontograma")} className={`whitespace-nowrap text-sm md:text-base px-4 py-2 md:p-4 rounded-xl transition ${tab==="odontograma" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800 md:bg-transparent hover:bg-slate-800"}`}>🦷 Odonto</button>
            <button onClick={()=>setTab("finanzas")} className={`whitespace-nowrap text-sm md:text-base px-4 py-2 md:p-4 rounded-xl transition ${tab==="finanzas" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800 md:bg-transparent hover:bg-slate-800"}`}>💰 Finanzas</button>
          </nav>
          <button onClick={() => { supabase.auth.signOut(); router.push("/") }} className="hidden md:block p-4 text-red-400 hover:bg-slate-800 rounded-xl font-bold text-left mt-4">Cerrar Sesión</button>
        </aside>

        <main className="flex-1 p-4 md:p-10 overflow-y-auto w-full max-w-full">
          {tab === "citas" && (
            <div className="w-full">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 md:mb-8">Control de Citas</h2>
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 p-4 md:p-8 space-y-4">
                {citas.length === 0 ? <p className="text-slate-500 font-medium">No hay citas registradas aún.</p> : citas.map(cita => (
                  <div key={cita.id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-4 md:p-6 border border-slate-100 hover:bg-slate-50 transition rounded-xl md:rounded-2xl gap-4">
                    <div className="w-full">
                      <p className="font-black text-lg md:text-xl text-slate-900 break-words">{cita.nombre_paciente || 'Paciente Sin Nombre'} <span className="block md:inline text-xs md:text-sm font-medium text-slate-500 md:ml-2 mt-1 md:mt-0">📞 {cita.telefono || 'Sin Tel.'}</span></p>
                      <p className="font-bold text-sm md:text-md text-slate-700 mt-2">🗓️ {new Date(cita.fecha_hora).toLocaleString()}</p>
                      <p className="text-sm md:text-base text-slate-600 font-medium mt-1">Motivo: <span className="text-blue-600 font-bold">{cita.motivo}</span></p>
                      <span className={`text-[10px] md:text-xs font-black uppercase mt-3 inline-block px-3 py-1 rounded-full ${cita.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : cita.estado === 'confirmada' ? 'bg-emerald-100 text-emerald-700' : cita.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{cita.estado}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                      <button onClick={() => crearExpedienteDesdeCita(cita)} className="w-full md:w-auto bg-purple-50 text-purple-600 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-bold hover:bg-purple-100 transition shadow-sm border border-purple-200">📋 Generar Expediente</button>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button onClick={() => actualizarEstadoCita(cita.id, 'confirmada')} className="flex-1 md:flex-none bg-emerald-50 text-emerald-600 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-bold hover:bg-emerald-100 transition">Confirmar</button>
                        <button onClick={() => actualizarEstadoCita(cita.id, 'completada')} className="flex-1 md:flex-none bg-blue-50 text-blue-600 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-bold hover:bg-blue-100 transition">Completar</button>
                        <button onClick={() => actualizarEstadoCita(cita.id, 'cancelada')} className="flex-1 md:flex-none bg-orange-50 text-orange-600 px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-bold hover:bg-orange-100 transition">Cancelar</button>
                        <button onClick={() => eliminarCita(cita.id)} className="flex-1 md:flex-none bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm md:text-base font-bold hover:bg-red-700 transition shadow-md">🗑️ Borrar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "pacientes" && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div>
                {editando ? (
                  <>
                    <div className="flex justify-between items-center mb-4 md:mb-6">
                      <h2 className="text-2xl md:text-3xl font-black text-blue-600">Editar</h2>
                      <button onClick={()=>{setEditando(false); setPacienteActivo(null)}} className="text-slate-400 hover:text-red-500 font-bold transition text-sm md:text-base">✖ Cancelar</button>
                    </div>
                    <form onSubmit={guardarEdicionPaciente} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-blue-200 space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                      <input required placeholder="Nombre Completo" value={datosEdicion.nombre} onChange={e=>setDatosEdicion({...datosEdicion, nombre: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium"/>
                      <input placeholder="Teléfono" value={datosEdicion.telefono} onChange={e=>setDatosEdicion({...datosEdicion, telefono: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium"/>
                      <input placeholder="Alergias (Ej. Penicilina)" value={datosEdicion.alergias} onChange={e=>setDatosEdicion({...datosEdicion, alergias: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium text-red-600"/>
                      <textarea placeholder="Historial Médico y Observaciones" value={datosEdicion.historial} onChange={e=>setDatosEdicion({...datosEdicion, historial: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium h-24 md:h-32"></textarea>
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-blue-700 transition shadow-md text-sm md:text-base">💾 Guardar Cambios</button>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Nuevo Expediente</h2>
                    <form onSubmit={registrarPaciente} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 space-y-4">
                      <input required placeholder="Nombre Completo" value={nuevoPaciente.nombre} onChange={e=>setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium"/>
                      <input placeholder="Teléfono" value={nuevoPaciente.telefono} onChange={e=>setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium"/>
                      <input placeholder="Alergias (Ej. Penicilina)" value={nuevoPaciente.alergias} onChange={e=>setNuevoPaciente({...nuevoPaciente, alergias: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium text-red-600"/>
                      <textarea placeholder="Historial Médico y Observaciones" value={nuevoPaciente.historial} onChange={e=>setNuevoPaciente({...nuevoPaciente, historial: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium h-24 md:h-32"></textarea>
                      <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-slate-800 transition shadow-md text-sm md:text-base">Crear Expediente</button>
                    </form>
                  </>
                )}
              </div>

              <div className="space-y-6 md:space-y-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Buscador</h2>
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                    <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold cursor-pointer focus:border-blue-600 text-sm md:text-base break-words">
                      <option value="">Seleccione paciente...</option>
                      {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                    </select>

                    {pacienteActivo && !editando && (
                      <div className="flex gap-2 mt-4">
                        <button onClick={activarEdicion} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition border border-slate-200 shadow-sm text-sm md:text-base">
                          ✏️ Editar
                        </button>
                        <button onClick={() => eliminarPaciente(pacienteActivo.id)} className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition border border-red-200 shadow-sm text-sm md:text-base">
                          🗑️ Borrar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {pacienteActivo && (
                  <>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Archivos</h2>
                      <div className="bg-white p-6 md:p-8 border-2 border-dashed border-slate-300 rounded-2xl md:rounded-3xl text-center hover:bg-blue-50 transition">
                        <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mb-4 md:mb-6 block w-full text-slate-500 file:mr-4 file:py-2 file:px-4 md:file:py-3 md:file:px-6 file:rounded-full file:border-0 file:text-xs md:file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer text-xs md:text-sm"/>
                        <button onClick={subirRadiografia} className="w-full bg-blue-600 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-blue-700 transition shadow-md text-sm md:text-base">☁️ Subir a Nube</button>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Receta Médica</h2>
                      <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 space-y-4">
                        <textarea value={recetaTexto} onChange={e=>setRecetaTexto(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm md:text-base font-medium h-24 md:h-32" placeholder="Ej. Amoxicilina 500mg... Escriba aquí y presione Imprimir"></textarea>
                        <button onClick={()=>window.print()} className="w-full bg-slate-900 text-white font-bold py-3 md:py-4 rounded-xl hover:bg-slate-800 transition shadow-md text-sm md:text-base">🖨️ Imprimir Receta</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === "odontograma" && (
            <div className="w-full">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Odontograma</h2>
              <div className="bg-white p-4 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col gap-4 mb-6 md:mb-10 pb-6 border-b border-slate-100">
                  <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold cursor-pointer focus:border-blue-600 text-sm md:text-base">
                    <option value="">Buscar paciente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-4 text-xs md:text-sm font-bold text-slate-600 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-1 md:gap-2"><div className="w-3 h-3 md:w-4 md:h-4 bg-white border border-slate-300 rounded"></div> Sano</span>
                    <span className="flex items-center gap-1 md:gap-2"><div className="w-3 h-3 md:w-4 md:h-4 bg-red-100 border border-red-500 rounded"></div> Caries</span>
                    <span className="flex items-center gap-1 md:gap-2"><div className="w-3 h-3 md:w-4 md:h-4 bg-blue-100 border border-blue-500 rounded"></div> Obturado</span>
                    <span className="flex items-center gap-1 md:gap-2"><div className="w-3 h-3 md:w-4 md:h-4 bg-slate-800 rounded"></div> Extraído</span>
                  </div>
                </div>

                {pacienteActivo ? (
                  <div className="animate-fade-in text-center">
                    <div className="mb-8 md:mb-12">
                      <h3 className="text-slate-400 font-bold mb-4 md:mb-6 uppercase tracking-widest text-xs md:text-sm">Arcada Superior</h3>
                      <div className="flex flex-wrap justify-center gap-1 md:gap-3">
                        {dientesSuperiores.map(diente => (
                          <div key={diente} className={`w-9 h-12 sm:w-11 sm:h-16 md:w-14 md:h-20 border-2 rounded-lg md:rounded-xl flex items-center justify-center font-black cursor-pointer transition relative group text-xs md:text-base ${getDienteStyle(diente)}`}>
                            {diente}
                            <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs md:text-sm p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-2xl w-28 md:w-36 z-30">
                              <button onClick={()=>cambiarEstadoDiente(diente, 'sano')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 rounded-lg">⚪ Sano</button>
                              <button onClick={()=>cambiarEstadoDiente(diente, 'caries')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 text-red-400 rounded-lg font-bold">🔴 Caries</button>
                              <button onClick={()=>cambiarEstadoDiente(diente, 'obturacion')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 text-blue-400 rounded-lg font-bold">🔵 Obtura</button>
                              <button onClick={()=>cambiarEstadoDiente(diente, 'extraccion')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 text-slate-300 rounded-lg">⚫ Extrae</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-slate-400 font-bold mb-4 md:mb-6 uppercase tracking-widest text-xs md:text-sm">Arcada Inferior</h3>
                      <div className="flex flex-wrap justify-center gap-1 md:gap-3">
                        {dientesInferiores.map(diente => (
                          <div key={diente} className={`w-9 h-12 sm:w-11 sm:h-16 md:w-14 md:h-20 border-2 rounded-lg md:rounded-xl flex items-center justify-center font-black cursor-pointer transition relative group text-xs md:text-base ${getDienteStyle(diente)}`}>
                            {diente}
                            <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs md:text-sm p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-2xl w-28 md:w-36 z-30">
                              <button onClick={()=>cambiarEstadoDiente(diente, 'sano')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 rounded-lg">⚪ Sano</button>
                              <button onClick={()=>cambiarEstadoDiente(diente, 'caries')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 text-red-400 rounded-lg font-bold">🔴 Caries</button>
                              <button onClick={()=>cambiarEstadoDiente(diente, 'obturacion')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 text-blue-400 rounded-lg font-bold">🔵 Obtura</button>
                              <button onClick={()=>cambiarEstadoDiente(diente, 'extraccion')} className="block w-full text-left p-1.5 md:p-2 hover:bg-slate-700 text-slate-300 rounded-lg">⚫ Extrae</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 md:py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-slate-500 font-medium text-sm md:text-lg">Seleccione un paciente para desplegar la ficha.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "finanzas" && (
            <div className="w-full">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Estado de Cuenta</h2>
              <div className="bg-white p-4 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-bold cursor-pointer focus:border-blue-600 mb-6 md:mb-8 text-sm md:text-base">
                  <option value="">Seleccione paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>

                {pacienteActivo ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                    <div>
                      <div className={`p-4 md:p-6 rounded-2xl mb-6 md:mb-8 text-center ${balanceTotal > 0 ? 'bg-red-50 border border-red-200 text-red-700' : balanceTotal < 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        <p className="font-bold text-xs md:text-sm uppercase tracking-widest mb-2">Balance a Pagar</p>
                        <p className="text-4xl md:text-5xl font-black">${Math.max(0, balanceTotal).toFixed(2)}</p>
                      </div>

                      <form onSubmit={registrarPago} className="space-y-4 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-slate-800 text-base md:text-lg mb-2 md:mb-4">Registrar Movimiento</h3>
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4">
                          <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer text-sm md:text-base">
                            <input type="radio" name="tipo" checked={nuevoPago.tipo === 'cargo'} onChange={() => setNuevoPago({...nuevoPago, tipo: 'cargo'})} className="w-4 h-4 md:w-5 md:h-5 accent-blue-600"/>
                            Cargo (Deuda)
                          </label>
                          <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer text-sm md:text-base">
                            <input type="radio" name="tipo" checked={nuevoPago.tipo === 'abono'} onChange={() => setNuevoPago({...nuevoPago, tipo: 'abono'})} className="w-4 h-4 md:w-5 md:h-5 accent-emerald-600"/>
                            Abono (Pago)
                          </label>
                        </div>
                        <input required placeholder="Concepto (Ej. Extracción)" value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto: e.target.value})} className="w-full p-3 md:p-4 rounded-xl border border-slate-200 outline-none focus:border-blue-600 font-medium text-sm md:text-base"/>
                        
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition">
                          <span className="pl-4 pr-1 font-black text-slate-400 text-lg">$</span>
                          <input required type="number" step="0.01" min="0" placeholder="0.00" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto: e.target.value})} className="w-full p-3 md:p-4 bg-transparent outline-none font-black text-base md:text-lg"/>
                        </div>

                        <button type="submit" className={`w-full text-white font-bold py-3 md:py-4 rounded-xl transition shadow-md text-sm md:text-base mt-2 ${nuevoPago.tipo === 'cargo' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                          Registrar {nuevoPago.tipo === 'cargo' ? 'Cargo' : 'Abono'}
                        </button>
                      </form>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 text-lg md:text-xl mb-4 md:mb-6">Historial</h3>
                      <div className="space-y-2 md:space-y-3 max-h-[300px] md:max-h-[500px] overflow-y-auto pr-1 md:pr-2">
                        {pagos.length === 0 ? <p className="text-slate-500 font-medium text-sm md:text-base">Sin registros.</p> : pagos.map(pago => (
                          <div key={pago.id} className="flex justify-between items-center p-3 md:p-4 border border-slate-100 rounded-xl bg-slate-50">
                            <div>
                              <p className="font-bold text-slate-800 text-sm md:text-base">{pago.concepto}</p>
                              <p className="text-[10px] md:text-xs font-medium text-slate-500">{new Date(pago.fecha).toLocaleDateString()}</p>
                            </div>
                            <div className={`font-black text-base md:text-lg ${pago.tipo === 'cargo' ? 'text-red-600' : 'text-emerald-600'}`}>
                              {pago.tipo === 'cargo' ? '+' : '-'}${Number(pago.monto).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 md:py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-slate-500 font-medium text-sm md:text-lg">Seleccione paciente para ver estado de cuenta.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}