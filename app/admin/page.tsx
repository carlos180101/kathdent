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
  const [fechaHoy, setFechaHoy] = useState("")
  
  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null)
  const [modoImpresion, setModoImpresion] = useState("receta") 
  const router = useRouter()

  useEffect(() => { 
    cargarDatos(); 
    setFechaHoy(new Date().toLocaleDateString());
  }, [])

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
    if(confirm("⚠️ ATENCIÓN: ¿Borrar expediente permanentemente?")) {
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
      if(data && data[0]) { cargarOdontogramaYArchivos(data[0].id); setTab("pacientes") }
    }
  }

  const cargarOdontogramaYArchivos = async (pacienteId: string) => {
    const p = pacientes.find(x => x.id === pacienteId)
    setPacienteActivo(p || null)
    setEditando(false)
    if (!p) { setOdontograma([]); setPagos([]); return }
    
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

  // ODONTOGRAMA BLINDADO (Sin usar .match problemático)
  const cambiarEstadoDiente = async (diente: number, estado: string) => {
    if (!pacienteActivo) return
    
    setOdontograma(prev => {
      const f = prev.filter(o => o.diente !== diente)
      if (estado === 'sano') return f
      return [...f, { paciente_id: pacienteActivo.id, diente, estado }]
    })
    setDienteSeleccionado(null)

    if (estado === 'sano') {
      const { error } = await supabase.from("odontograma").delete().eq("paciente_id", pacienteActivo.id).eq("diente", diente)
      if (error) alert("Error en la nube: " + error.message)
    } else {
      const { error } = await supabase.from("odontograma").upsert(
        { paciente_id: pacienteActivo.id, diente, estado }, 
        { onConflict: "paciente_id,diente" }
      )
      if (error) alert("Error en la nube: " + error.message)
    }
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

  const dientesSuperiores = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28]
  const dientesInferiores = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]

  const getDienteStyle = (diente: number) => {
    const est = odontograma.find(o => o.diente === diente)?.estado || 'sano'
    if (est === 'caries') return "bg-red-100 border-red-500 text-red-700 shadow-inner"
    if (est === 'obturacion') return "bg-blue-100 border-blue-500 text-blue-700 shadow-inner"
    if (est === 'sarro') return "bg-yellow-100 border-yellow-500 text-yellow-700 shadow-inner"
    if (est === 'extraccion') return "bg-slate-800 border-slate-900 text-slate-100 line-through opacity-70"
    return "bg-white border-slate-300 text-slate-400"
  }
  const balanceTotal = pagos.reduce((acc, p) => p.tipo === 'cargo' ? acc + Number(p.monto) : acc - Number(p.monto), 0)

  return (
    <div className="w-full relative">
      
      {/* MODAL TÁCTIL PARA CELULARES Y PC (ODONTOGRAMA) */}
      {dienteSeleccionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm text-center shadow-2xl animate-fade-in">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-6">Pieza {dienteSeleccionado}</h3>
            <div className="space-y-3">
              <button onClick={()=>cambiarEstadoDiente(dienteSeleccionado, 'sano')} className="w-full bg-slate-100 text-slate-700 font-bold p-3 md:p-4 rounded-xl hover:bg-slate-200">⚪ Sano (Borrar marcas)</button>
              <button onClick={()=>cambiarEstadoDiente(dienteSeleccionado, 'caries')} className="w-full bg-red-50 text-red-600 font-bold p-3 md:p-4 rounded-xl hover:bg-red-100">🔴 Caries</button>
              <button onClick={()=>cambiarEstadoDiente(dienteSeleccionado, 'sarro')} className="w-full bg-yellow-50 text-yellow-700 font-bold p-3 md:p-4 rounded-xl hover:bg-yellow-100">🟡 Sarro / Placa</button>
              <button onClick={()=>cambiarEstadoDiente(dienteSeleccionado, 'obturacion')} className="w-full bg-blue-50 text-blue-600 font-bold p-3 md:p-4 rounded-xl hover:bg-blue-100">🔵 Obturación</button>
              <button onClick={()=>cambiarEstadoDiente(dienteSeleccionado, 'extraccion')} className="w-full bg-slate-800 text-slate-300 font-bold p-3 md:p-4 rounded-xl hover:bg-slate-700">⚫ Extracción</button>
            </div>
            <button onClick={()=>setDienteSeleccionado(null)} className="mt-6 text-slate-500 font-bold hover:text-slate-700 transition underline">✖ Cancelar</button>
          </div>
        </div>
      )}

      {/* VISTA EXCLUSIVA DE IMPRESIÓN (PDF) */}
      <div className="hidden print:block bg-white text-black w-full max-w-4xl mx-auto p-12">
        {modoImpresion === 'receta' ? (
          <>
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
                <p className="text-sm uppercase tracking-widest text-slate-500 font-black mb-1">Fecha</p>
                <p className="text-xl font-bold text-slate-900">{fechaHoy}</p>
              </div>
            </div>
            <div className="min-h-[400px]">
              <div className="text-6xl font-black text-slate-200 mb-8 italic">Rx</div>
              <div className="text-xl leading-loose text-slate-900 whitespace-pre-wrap pl-6 font-medium">{recetaTexto || "Sin indicaciones médicas."}</div>
            </div>
          </>
        ) : (
          <>
            <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Expediente Clínico Oficial</h1>
                <p className="text-xl font-bold mt-2 text-slate-500">Clínica KathDent</p>
              </div>
              <div className="text-right text-sm font-bold text-slate-600">
                <p>Fecha de Exportación: {fechaHoy}</p>
              </div>
            </div>
            <div className="mb-8 space-y-4 text-lg">
              <p><span className="font-bold text-slate-500">Paciente:</span> <span className="font-black text-slate-900">{pacienteActivo?.nombre_completo}</span></p>
              <p><span className="font-bold text-slate-500">Teléfono:</span> {pacienteActivo?.telefono || "No registrado"}</p>
              <p><span className="font-bold text-red-600">Alergias:</span> {pacienteActivo?.alergias || "Ninguna reportada"}</p>
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 mt-4">
                <p className="font-black text-slate-800 mb-2">Historial Médico:</p>
                <p className="whitespace-pre-wrap font-medium text-slate-700">{pacienteActivo?.historial_medico || "Sin historial."}</p>
              </div>
            </div>
            <div className="mb-8">
              <h3 className="font-black text-2xl border-b-2 border-slate-200 pb-2 mb-4 text-slate-800">Estado Odontológico Actual</h3>
              {odontograma.length === 0 ? <p className="text-slate-500 italic">No se registran afecciones dentales en el sistema.</p> : (
                <div className="grid grid-cols-2 gap-4">
                  {odontograma.map(o => (
                    <div key={o.diente} className="p-3 border border-slate-200 rounded-lg flex justify-between items-center bg-slate-50">
                      <span className="font-bold text-slate-600">Pieza {o.diente}</span>
                      <span className={`font-black uppercase text-sm ${o.estado === 'caries' ? 'text-red-600' : o.estado === 'obturacion' ? 'text-blue-600' : o.estado === 'sarro' ? 'text-yellow-600' : 'text-slate-800'}`}>{o.estado}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
               <h3 className="font-black text-2xl border-b-2 border-slate-200 pb-2 mb-4 text-slate-800">Resumen Financiero</h3>
               <p className="font-black text-3xl text-slate-900">Balance Actual: ${Math.max(0, balanceTotal).toFixed(2)}</p>
            </div>
          </>
        )}
      </div>

      {/* PANTALLA PRINCIPAL */}
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
        </aside>

        <main className="flex-1 p-4 md:p-10 overflow-y-auto w-full max-w-full">
          
          {tab === "citas" && (
             <div className="w-full">
               <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 md:mb-8">Control de Citas</h2>
               <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 p-4 md:p-8 space-y-4">
                 {citas.length === 0 ? <p className="text-slate-500 font-medium">No hay citas.</p> : citas.map(cita => (
                   <div key={cita.id} className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-4 md:p-6 border border-slate-100 hover:bg-slate-50 transition rounded-xl gap-4">
                     <div className="w-full">
                       <p className="font-black text-lg md:text-xl text-slate-900">{cita.nombre_paciente || 'Sin Nombre'}</p>
                       <p className="font-bold text-sm text-slate-700 mt-1">🗓️ {new Date(cita.fecha_hora).toLocaleString()}</p>
                     </div>
                     <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                       <button onClick={() => crearExpedienteDesdeCita(cita)} className="bg-purple-50 text-purple-600 px-3 py-2 rounded-lg text-sm font-bold border border-purple-200">📋 Generar Expediente</button>
                       <button onClick={() => eliminarCita(cita.id)} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold">🗑️ Borrar</button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {tab === "pacientes" && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              
              {/* LADO IZQUIERDO: Buscador General */}
              <div className="space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">Buscar Paciente</h2>
                  <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold focus:border-blue-600">
                    <option value="">+ Seleccione o cree uno nuevo...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select>
                </div>

                {/* Si NO hay paciente seleccionado, mostramos "Nuevo Expediente" */}
                {!pacienteActivo && (
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">Crear Nuevo Expediente</h2>
                    <form onSubmit={registrarPaciente} className="space-y-4">
                      <input required placeholder="Nombre Completo" value={nuevoPaciente.nombre} onChange={e=>setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                      <input placeholder="Teléfono" value={nuevoPaciente.telefono} onChange={e=>setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium"/>
                      <input placeholder="Alergias (Ej. Penicilina)" value={nuevoPaciente.alergias} onChange={e=>setNuevoPaciente({...nuevoPaciente, alergias: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium text-red-600"/>
                      <textarea placeholder="Historial Médico y Observaciones" value={nuevoPaciente.historial} onChange={e=>setNuevoPaciente({...nuevoPaciente, historial: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 font-medium h-24"></textarea>
                      <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-md">Crear Expediente</button>
                    </form>
                  </div>
                )}

                {/* Si SÍ hay paciente, mostramos su Info y botones de control */}
                {pacienteActivo && !editando && (
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-blue-200 bg-blue-50/30">
                    <h2 className="text-xl md:text-2xl font-black text-blue-900 mb-2">{pacienteActivo.nombre_completo}</h2>
                    <p className="text-slate-600 font-medium mb-4">📞 {pacienteActivo.telefono || "Sin teléfono"}</p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>setEditando(true)} className="flex-1 bg-white text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-100 transition border border-slate-200 shadow-sm text-sm">✏️ Editar Info</button>
                      <button onClick={() => {setModoImpresion("expediente"); setTimeout(()=>window.print(), 100)}} className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition shadow-md text-sm">📄 Exportar PDF</button>
                      <button onClick={() => eliminarPaciente(pacienteActivo.id)} className="w-full md:w-auto bg-red-50 text-red-600 font-bold py-3 px-4 rounded-xl hover:bg-red-100 transition border border-red-200 text-sm mt-2 md:mt-0">🗑️ Borrar</button>
                    </div>
                  </div>
                )}

                {/* Formulario de Edición */}
                {pacienteActivo && editando && (
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-blue-400">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-black text-blue-600">Editando Datos</h2>
                      <button onClick={()=>setEditando(false)} className="text-slate-400 font-bold text-sm">✖ Cancelar</button>
                    </div>
                    <form onSubmit={guardarEdicionPaciente} className="space-y-4">
                      <input required value={datosEdicion.nombre} onChange={e=>setDatosEdicion({...datosEdicion, nombre: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      <input value={datosEdicion.telefono} onChange={e=>setDatosEdicion({...datosEdicion, telefono: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      <input value={datosEdicion.alergias} onChange={e=>setDatosEdicion({...datosEdicion, alergias: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium text-red-600"/>
                      <textarea value={datosEdicion.historial} onChange={e=>setDatosEdicion({...datosEdicion, historial: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium h-24"></textarea>
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">💾 Guardar Cambios</button>
                    </form>
                  </div>
                )}
              </div>

              {/* LADO DERECHO: Archivos y Recetas (Solo si hay paciente) */}
              {pacienteActivo && (
                <div className="space-y-6">
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">Radiografías / Archivos</h2>
                    <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl text-center hover:bg-blue-50 transition">
                      <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="mb-4 block w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white cursor-pointer text-xs"/>
                      <button onClick={subirRadiografia} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-md text-sm">☁️ Subir a Nube</button>
                    </div>
                  </div>

                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 space-y-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900">Receta Médica</h2>
                    <textarea value={recetaTexto} onChange={e=>setRecetaTexto(e.target.value)} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-600 text-sm font-medium h-32" placeholder="Indicaciones..."></textarea>
                    <button onClick={()=>{setModoImpresion("receta"); setTimeout(()=>window.print(), 100)}} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 shadow-md text-sm">🖨️ Imprimir Receta</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "odontograma" && (
            <div className="w-full">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Odontograma</h2>
              <div className="bg-white p-4 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col gap-4 mb-6 md:mb-10 pb-6 border-b border-slate-100">
                  <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold focus:border-blue-600">
                    <option value="">Buscar paciente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select>
                  <div className="flex flex-wrap gap-2 text-xs md:text-sm font-bold text-slate-600 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100 justify-center">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-slate-300 rounded"></div> Sano</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-500 rounded"></div> Caries</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 border border-blue-500 rounded"></div> Obturado</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-500 rounded"></div> Sarro</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-800 rounded"></div> Extraído</span>
                  </div>
                </div>

                {pacienteActivo ? (
                  <div className="animate-fade-in text-center">
                    <div className="mb-8 md:mb-12">
                      <h3 className="text-slate-400 font-bold mb-4 md:mb-6 uppercase tracking-widest text-xs md:text-sm">Arcada Superior</h3>
                      <div className="flex flex-wrap justify-center gap-1 md:gap-3">
                        {dientesSuperiores.map(diente => (
                          <div key={diente} onClick={()=>setDienteSeleccionado(diente)} className={`w-9 h-12 sm:w-11 sm:h-16 md:w-14 md:h-20 border-2 rounded-lg md:rounded-xl flex items-center justify-center font-black cursor-pointer transition text-xs md:text-base hover:scale-110 ${getDienteStyle(diente)}`}>
                            {diente}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-slate-400 font-bold mb-4 md:mb-6 uppercase tracking-widest text-xs md:text-sm">Arcada Inferior</h3>
                      <div className="flex flex-wrap justify-center gap-1 md:gap-3">
                        {dientesInferiores.map(diente => (
                          <div key={diente} onClick={()=>setDienteSeleccionado(diente)} className={`w-9 h-12 sm:w-11 sm:h-16 md:w-14 md:h-20 border-2 rounded-lg md:rounded-xl flex items-center justify-center font-black cursor-pointer transition text-xs md:text-base hover:scale-110 ${getDienteStyle(diente)}`}>
                            {diente}
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
        </main>
      </div>
    </div>
  )
}