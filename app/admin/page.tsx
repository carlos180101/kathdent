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

  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: "", telefono: "", edad: "", direccion: "", alergias: "", historial: "" })
  const [editando, setEditando] = useState(false)
  const [datosEdicion, setDatosEdicion] = useState({ id: "", nombre: "", telefono: "", edad: "", direccion: "", alergias: "", historial: "" })
  const [nuevoPago, setNuevoPago] = useState({ concepto: "", monto: "", tipo: "cargo" })
  const [recetaTexto, setRecetaTexto] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [fechaHoy, setFechaHoy] = useState("")
  
  const [dienteSeleccionado, setDienteSeleccionado] = useState<number | null>(null)
  const [carasEditando, setCarasEditando] = useState<any>({})
  
  const [modoImpresion, setModoImpresion] = useState("receta") 
  const router = useRouter()

  useEffect(() => { cargarDatos(); setFechaHoy(new Date().toLocaleDateString()); }, [])

  const cargarDatos = async () => {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return router.push("/login")
    const { data: dataCitas } = await supabase.from("citas").select("*").order("fecha_hora", { ascending: true })
    if (dataCitas) setCitas(dataCitas)
    const { data: dataPacientes } = await supabase.from("pacientes").select("*").order("nombre_completo", { ascending: true })
    if (dataPacientes) setPacientes(dataPacientes)
  }

  const cargarOdontogramaYArchivos = async (pacienteId: string) => {
    if (!pacienteId) { setPacienteActivo(null); setOdontograma([]); setPagos([]); setEditando(false); return; }
    const p = pacientes.find(x => x.id === pacienteId)
    if (!p) return;
    setPacienteActivo(p)
    setEditando(false)
    setDatosEdicion({ id: p.id, nombre: p.nombre_completo, telefono: p.telefono, edad: p.edad || "", direccion: p.direccion || "", alergias: p.alergias, historial: p.historial_medico })
    const { data: odData } = await supabase.from("odontograma").select("*").eq("paciente_id", pacienteId)
    if (odData) setOdontograma(odData)
    const { data: pgData } = await supabase.from("pagos").select("*").eq("paciente_id", pacienteId).order("fecha", { ascending: false })
    if (pgData) setPagos(pgData)
  }

  const registrarPaciente = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from("pacientes").insert([{
      nombre_completo: nuevoPaciente.nombre, telefono: nuevoPaciente.telefono, edad: parseInt(nuevoPaciente.edad) || null, direccion: nuevoPaciente.direccion,
      alergias: nuevoPaciente.alergias, historial_medico: nuevoPaciente.historial
    }])
    if (error) alert("Error: " + error.message)
    else { alert("¡Expediente creado!"); setNuevoPaciente({ nombre: "", telefono: "", edad: "", direccion: "", alergias: "", historial: "" }); cargarDatos() }
  }

  const guardarEdicionPaciente = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from("pacientes").update({
      nombre_completo: datosEdicion.nombre, telefono: datosEdicion.telefono, edad: parseInt(datosEdicion.edad) || null, direccion: datosEdicion.direccion,
      alergias: datosEdicion.alergias, historial_medico: datosEdicion.historial
    }).eq("id", datosEdicion.id)
    if(error) alert("Error: " + error.message)
    else { alert("¡Datos actualizados!"); setEditando(false); cargarDatos(); cargarOdontogramaYArchivos(datosEdicion.id) }
  }

  const eliminarPaciente = async (id: string) => {
    if(confirm("⚠️ ATENCIÓN: ¿Borrar expediente permanentemente?")) { await supabase.from("pacientes").delete().eq("id", id); setPacienteActivo(null); cargarDatos() }
  }

  const crearExpedienteDesdeCita = async (cita: any) => {
    const { data, error } = await supabase.from("pacientes").insert([{ nombre_completo: cita.nombre_paciente || "Sin Nombre", telefono: cita.telefono || "", alergias: "No reportadas", historial_medico: "Cita original: " + cita.motivo }]).select()
    if(error) alert("Error: " + error.message)
    else { alert("Expediente generado exitosamente"); cargarDatos(); if(data && data[0]) { cargarOdontogramaYArchivos(data[0].id); setTab("pacientes") } }
  }

  const registrarPago = async (e: any) => {
    e.preventDefault()
    if(!pacienteActivo) return
    const { error } = await supabase.from("pagos").insert([{ paciente_id: pacienteActivo.id, concepto: nuevoPago.concepto, monto: parseFloat(nuevoPago.monto), tipo: nuevoPago.tipo }])
    if(error) alert("Error: " + error.message)
    else { setNuevoPago({ concepto: "", monto: "", tipo: "cargo" }); cargarOdontogramaYArchivos(pacienteActivo.id) }
  }

  const subirRadiografia = async () => {
    if (!archivo || !pacienteActivo) return alert("Selecciona paciente y archivo.")
    const ruta = `${pacienteActivo.id}/${Date.now()}_${archivo.name}`
    const { error } = await supabase.storage.from("radiografias").upload(ruta, archivo)
    if (error) alert("Error: " + error.message)
    else { alert("¡Imagen anexada!"); setArchivo(null) }
  }

  const actualizarEstadoCita = async (id: string, nuevoEstado: string) => { await supabase.from("citas").update({ estado: nuevoEstado }).eq("id", id); cargarDatos() }
  const eliminarCita = async (id: string) => { if(confirm("¿Borrar esta cita permanentemente?")) { await supabase.from("citas").delete().eq("id", id); cargarDatos() } }

  // --- LÓGICA DEL ODONTOGRAMA Y PERIODONTOGRAMA ---
  const getDienteData = (diente: number) => {
    const o = odontograma.find(x => x.diente === diente)
    const defaults = { completo: 'sano', oclusal: 'sano', vestibular: 'sano', palatina: 'sano', mesial: 'sano', distal: 'sano', movilidad: '0', sangrado: false, bolsa: '' }
    if (!o) return defaults
    try { return { ...defaults, ...JSON.parse(o.estado) } } catch { return { ...defaults, completo: o.estado } }
  }

  const abrirEditorDiente = (diente: number) => {
    if(!pacienteActivo) return alert("Seleccione un paciente primero.")
    setDienteSeleccionado(diente)
    setCarasEditando(getDienteData(diente))
  }

  const guardarDientePro = async () => {
    if (!pacienteActivo || !dienteSeleccionado) return
    const estadoString = JSON.stringify(carasEditando)
    setOdontograma(prev => {
      const f = prev.filter(o => o.diente !== dienteSeleccionado)
      return [...f, { paciente_id: pacienteActivo.id, diente: dienteSeleccionado, estado: estadoString }]
    })
    const dID = dienteSeleccionado
    setDienteSeleccionado(null)
    const { error } = await supabase.from("odontograma").upsert({ paciente_id: pacienteActivo.id, diente: dID, estado: estadoString }, { onConflict: "paciente_id,diente" })
    if (error) alert("Error guardando diente: " + error.message)
  }

  const getColorCara = (estado: string) => {
    if (estado === 'caries') return "bg-red-500"
    if (estado === 'obturacion') return "bg-blue-500"
    if (estado === 'sarro') return "bg-yellow-400"
    return "bg-white"
  }

  const RenderDiente = ({ diente }: { diente: number }) => {
    const data = getDienteData(diente)
    return (
      <div onClick={()=>abrirEditorDiente(diente)} className="w-10 h-14 sm:w-12 sm:h-16 md:w-14 md:h-20 flex flex-col items-center cursor-pointer hover:scale-110 transition relative group">
        
        {/* INDICADORES PERIODONTALES */}
        {data.sangrado && <div className="absolute top-0 right-0 md:-right-1 bg-red-600 text-white rounded-full w-3 h-3 md:w-4 md:h-4 shadow-sm animate-pulse border border-white text-[8px] flex items-center justify-center">🩸</div>}
        {data.movilidad !== '0' && <div className="absolute bottom-0 left-0 md:-left-1 bg-orange-500 text-white text-[9px] md:text-[10px] rounded-full w-3 h-3 md:w-4 md:h-4 shadow-sm font-black flex items-center justify-center border border-white">{data.movilidad}</div>}
        {data.bolsa && <div className="absolute top-0 left-0 md:-left-1 bg-slate-800 text-white text-[8px] md:text-[9px] rounded-sm px-1 shadow-sm font-black border border-white">{data.bolsa}mm</div>}

        <span className="text-[10px] md:text-xs font-bold text-slate-500 mb-1">{diente}</span>
        
        {data.completo === 'extraccion' ? (
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-slate-800 text-white flex items-center justify-center font-black text-xl rounded-lg opacity-80">X</div>
        ) : (
          <div className="grid grid-cols-3 grid-rows-3 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 gap-0.5 relative p-0.5 bg-slate-200 rounded-md">
            <div className={`col-start-2 row-start-1 border border-slate-300 rounded-t-sm ${getColorCara(data.vestibular)}`}></div>
            <div className={`col-start-1 row-start-2 border border-slate-300 rounded-l-sm ${getColorCara(data.mesial)}`}></div>
            <div className={`col-start-2 row-start-2 border border-slate-300 z-10 shadow-sm ${getColorCara(data.oclusal)}`}></div>
            <div className={`col-start-3 row-start-2 border border-slate-300 rounded-r-sm ${getColorCara(data.distal)}`}></div>
            <div className={`col-start-2 row-start-3 border border-slate-300 rounded-b-sm ${getColorCara(data.palatina)}`}></div>
          </div>
        )}
      </div>
    )
  }

  const balanceTotal = pagos.reduce((acc, p) => p.tipo === 'cargo' ? acc + Number(p.monto) : acc - Number(p.monto), 0)

  return (
    <div className="w-full relative">
      
      {/* EDITOR DE DIENTES Y PERIODONTOGRAMA (MODAL) */}
      {dienteSeleccionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:hidden overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl animate-fade-in my-8">
            <h3 className="text-2xl font-black text-slate-900 mb-6 text-center border-b pb-4">Pieza {dienteSeleccionado}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4 border-r-0 sm:border-r border-slate-200 sm:pr-6">
                <h4 className="font-black text-blue-600 mb-2 uppercase tracking-widest text-xs">Odontograma (Caras)</h4>
                {['oclusal', 'vestibular', 'palatina', 'mesial', 'distal'].map((cara) => (
                  <div key={cara} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 capitalize text-sm">{cara}</span>
                    <select value={carasEditando[cara]} onChange={(e) => setCarasEditando({...carasEditando, [cara]: e.target.value, completo: 'sano'})} className="p-1 rounded-lg border border-slate-300 font-medium outline-none focus:border-blue-500 text-xs w-28">
                      <option value="sano">⚪ Sano</option><option value="caries">🔴 Caries</option><option value="obturacion">🔵 Obturado</option><option value="sarro">🟡 Sarro</option>
                    </select>
                  </div>
                ))}
                <button onClick={() => setCarasEditando({...carasEditando, completo: 'extraccion'})} className="w-full bg-slate-800 text-white font-bold p-3 text-sm rounded-xl hover:bg-slate-900 transition mt-2">⚫ Extracción Total</button>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-emerald-600 mb-2 uppercase tracking-widest text-xs">Periodontograma</h4>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={carasEditando.sangrado} onChange={(e) => setCarasEditando({...carasEditando, sangrado: e.target.checked})} className="w-5 h-5 accent-red-500" />
                    <span className="font-bold text-slate-700 text-sm">Sangrado al sondaje 🩸</span>
                  </label>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Movilidad (Grado)</label>
                    <select value={carasEditando.movilidad} onChange={(e) => setCarasEditando({...carasEditando, movilidad: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 font-medium outline-none text-sm">
                      <option value="0">Normal (0)</option><option value="I">Grado I</option><option value="II">Grado II</option><option value="III">Grado III</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Bolsa Periodontal (mm)</label>
                    <input type="number" placeholder="Ej. 4" value={carasEditando.bolsa} onChange={(e) => setCarasEditando({...carasEditando, bolsa: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 font-medium outline-none text-sm"/>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 border-t border-slate-200 pt-6">
              <button onClick={()=>setDienteSeleccionado(null)} className="flex-1 text-slate-500 font-bold hover:text-slate-700 transition bg-slate-100 p-4 rounded-xl text-sm">Cancelar</button>
              <button onClick={guardarDientePro} className="flex-1 bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-md p-4 rounded-xl text-sm">💾 Guardar Diente</button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA DE IMPRESIÓN (PDF Y RECETA) */}
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
                <p>San Salvador, El Salvador | Tel: (+503) 7000-0000</p>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 mb-10 flex justify-between">
              <div><p className="text-sm uppercase text-slate-500 font-black mb-1">Paciente</p><p className="text-2xl font-black">{pacienteActivo?.nombre_completo}</p></div>
              <div className="text-right"><p className="text-sm uppercase text-slate-500 font-black mb-1">Fecha</p><p className="text-xl font-bold">{fechaHoy}</p></div>
            </div>
            <div className="min-h-[400px]">
              <div className="text-6xl font-black text-slate-200 mb-8 italic">Rx</div>
              <div className="text-xl leading-loose text-slate-900 whitespace-pre-wrap pl-6 font-medium">{recetaTexto}</div>
            </div>
          </>
        ) : (
          <>
            <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
              <div><h1 className="text-4xl font-black text-slate-900">Ficha Odontológica</h1><p className="text-xl font-bold mt-2 text-slate-500">Escuela UNASA / KathDent</p></div>
              <div className="text-right text-sm font-bold text-slate-600"><p>Fecha: {fechaHoy}</p></div>
            </div>
            <div className="mb-8 grid grid-cols-2 gap-4 text-lg bg-slate-50 p-6 rounded-xl border border-slate-200">
              <p><span className="font-bold text-slate-500">Paciente:</span> <span className="font-black text-slate-900">{pacienteActivo?.nombre_completo}</span></p>
              <p><span className="font-bold text-slate-500">Edad:</span> {pacienteActivo?.edad ? `${pacienteActivo.edad} años` : "N/A"}</p>
              <p><span className="font-bold text-slate-500">Teléfono:</span> {pacienteActivo?.telefono || "N/A"}</p>
              <p><span className="font-bold text-slate-500">Dirección:</span> {pacienteActivo?.direccion || "N/A"}</p>
            </div>
            <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-black text-slate-800 mb-2">Historia Médica / Enfermedad Presente:</p>
              <p className="whitespace-pre-wrap font-medium text-slate-700">{pacienteActivo?.historial_medico}</p>
              <p className="mt-4"><span className="font-bold text-red-600">Alergias:</span> {pacienteActivo?.alergias || "Ninguna"}</p>
            </div>
            <div className="mb-8">
              <h3 className="font-black text-2xl border-b-2 border-slate-200 pb-2 mb-4 text-slate-800">Estado Odontológico / Periodontal</h3>
              {odontograma.length === 0 ? <p className="text-slate-500">Sin registros dentales.</p> : (
                <div className="grid grid-cols-2 gap-4">
                  {odontograma.map(o => {
                     let desc = "";
                     try {
                       const d = JSON.parse(o.estado);
                       if(d.completo==='extraccion') desc = "Extracción completa";
                       else {
                         const caras = [];
                         if(d.oclusal!=='sano') caras.push(`Oclusal: ${d.oclusal}`);
                         if(d.vestibular!=='sano') caras.push(`Vestibular: ${d.vestibular}`);
                         if(d.palatina!=='sano') caras.push(`Palatina: ${d.palatina}`);
                         if(d.mesial!=='sano') caras.push(`Mesial: ${d.mesial}`);
                         if(d.distal!=='sano') caras.push(`Distal: ${d.distal}`);
                         desc = caras.join(', ');
                         if(d.sangrado) desc += " | Sangrado";
                         if(d.movilidad !== '0') desc += ` | Movilidad: ${d.movilidad}`;
                         if(d.bolsa) desc += ` | Bolsa: ${d.bolsa}mm`;
                       }
                     } catch { desc = o.estado }
                     return (
                       <div key={o.diente} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                         <span className="font-bold text-slate-800 block border-b border-slate-200 mb-1 pb-1">Pieza {o.diente}</span>
                         <span className="text-xs text-slate-600 font-medium">{desc || "Sano"}</span>
                       </div>
                     )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* VISTA NORMAL */}
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row print:hidden w-full overflow-x-hidden">
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col p-4 md:p-6 shadow-2xl z-20 sticky top-0 md:h-screen">
          <div className="flex justify-between items-center mb-4 md:mb-10">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter">Kath<span className="text-blue-500">Dent</span></h1>
            <button onClick={() => { supabase.auth.signOut(); router.push("/") }} className="md:hidden text-red-400 font-bold p-2 text-sm bg-slate-800 rounded-lg">Salir</button>
          </div>
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto font-bold flex-1 pb-2 md:pb-0 scrollbar-hide">
            <button onClick={()=>setTab("citas")} className={`whitespace-nowrap text-sm md:text-base px-4 py-2 md:p-4 rounded-xl transition ${tab==="citas" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800 md:bg-transparent hover:bg-slate-800"}`}>📅 Agenda</button>
            <button onClick={()=>setTab("pacientes")} className={`whitespace-nowrap text-sm md:text-base px-4 py-2 md:p-4 rounded-xl transition ${tab==="pacientes" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800 md:bg-transparent hover:bg-slate-800"}`}>📁 Expedientes</button>
            <button onClick={()=>setTab("odontograma")} className={`whitespace-nowrap text-sm md:text-base px-4 py-2 md:p-4 rounded-xl transition ${tab==="odontograma" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800 md:bg-transparent hover:bg-slate-800"}`}>🦷 Odonto & Perio</button>
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
                       <button onClick={() => crearExpedienteDesdeCita(cita)} className="bg-purple-50 text-purple-600 px-3 py-2 rounded-lg text-sm font-bold border border-purple-200">📋 Crear Expediente</button>
                       <button onClick={() => eliminarCita(cita.id)} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold">🗑️ Borrar</button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {tab === "pacientes" && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-6">
                <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">Buscador de Expedientes</h2>
                  <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold focus:border-blue-600">
                    <option value="">+ Crear Nuevo Expediente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select>
                </div>

                {!pacienteActivo && (
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 animate-fade-in">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">Nuevo Paciente</h2>
                    <form onSubmit={registrarPaciente} className="space-y-4">
                      <input required placeholder="Nombre Completo" value={nuevoPaciente.nombre} onChange={e=>setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Edad" value={nuevoPaciente.edad} onChange={e=>setNuevoPaciente({...nuevoPaciente, edad: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                        <input placeholder="Teléfono" value={nuevoPaciente.telefono} onChange={e=>setNuevoPaciente({...nuevoPaciente, telefono: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      </div>
                      <input placeholder="Dirección" value={nuevoPaciente.direccion} onChange={e=>setNuevoPaciente({...nuevoPaciente, direccion: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      <input placeholder="Alergias" value={nuevoPaciente.alergias} onChange={e=>setNuevoPaciente({...nuevoPaciente, alergias: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium text-red-600"/>
                      <textarea placeholder="Historial Médico / Enfermedad Presente" value={nuevoPaciente.historial} onChange={e=>setNuevoPaciente({...nuevoPaciente, historial: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium h-24"></textarea>
                      <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-md">Guardar Expediente</button>
                    </form>
                  </div>
                )}

                {pacienteActivo && !editando && (
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border-l-4 border-blue-600 animate-fade-in">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">{pacienteActivo.nombre_completo}</h2>
                    <p className="text-slate-600 font-medium">🎂 Edad: {pacienteActivo.edad ? `${pacienteActivo.edad} años` : "N/A"}</p>
                    <p className="text-slate-600 font-medium">📞 Tel: {pacienteActivo.telefono || "N/A"}</p>
                    <p className="text-slate-600 font-medium mb-2">🏠 Dir: {pacienteActivo.direccion || "N/A"}</p>
                    <p className="text-red-600 font-bold mb-6">⚠️ Alergias: {pacienteActivo.alergias || "Ninguna"}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={()=>setEditando(true)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-200 border border-slate-200">✏️ Editar</button>
                      <button onClick={() => {setModoImpresion("expediente"); setTimeout(()=>window.print(), 100)}} className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 shadow-md">📄 Exportar PDF</button>
                      <button onClick={() => eliminarPaciente(pacienteActivo.id)} className="w-full md:w-auto bg-red-50 text-red-600 font-bold py-3 px-4 rounded-xl hover:bg-red-100 border border-red-200">🗑️ Borrar</button>
                    </div>
                  </div>
                )}

                {pacienteActivo && editando && (
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-blue-400 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-black text-blue-600">Editando Datos</h2>
                      <button onClick={()=>setEditando(false)} className="text-slate-400 font-bold text-sm">✖ Cancelar</button>
                    </div>
                    <form onSubmit={guardarEdicionPaciente} className="space-y-4">
                      <input required value={datosEdicion.nombre} onChange={e=>setDatosEdicion({...datosEdicion, nombre: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Edad" value={datosEdicion.edad} onChange={e=>setDatosEdicion({...datosEdicion, edad: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                        <input placeholder="Teléfono" value={datosEdicion.telefono} onChange={e=>setDatosEdicion({...datosEdicion, telefono: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      </div>
                      <input placeholder="Dirección" value={datosEdicion.direccion} onChange={e=>setDatosEdicion({...datosEdicion, direccion: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium"/>
                      <input value={datosEdicion.alergias} onChange={e=>setDatosEdicion({...datosEdicion, alergias: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium text-red-600"/>
                      <textarea value={datosEdicion.historial} onChange={e=>setDatosEdicion({...datosEdicion, historial: e.target.value})} className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-blue-600 font-medium h-24"></textarea>
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">💾 Guardar Cambios</button>
                    </form>
                  </div>
                )}
              </div>

              {pacienteActivo && (
                <div className="space-y-6">
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-4">Radiografías / Archivos</h2>
                    <div className="p-6 border-2 border-dashed border-slate-300 rounded-2xl text-center hover:bg-blue-50">
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
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Ficha Odontológica Oficial</h2>
              <div className="bg-white p-4 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col gap-4 mb-6 md:mb-10 pb-6 border-b border-slate-100">
                  <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold focus:border-blue-600">
                    <option value="">Buscar paciente...</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                  </select>
                </div>

                {pacienteActivo ? (
                  <div className="animate-fade-in w-full overflow-x-auto pb-4">
                    {/* Contenedor que fuerza el ancho mínimo para que no se desordene en celulares */}
                    <div className="min-w-[600px] flex flex-col items-center gap-8 mx-auto">
                      
                      {/* FILA 1: ADULTOS SUPERIOR */}
                      <div className="flex gap-4 md:gap-8 justify-center w-full">
                        <div className="flex gap-1 md:gap-2">
                          {[18,17,16,15,14,13,12,11].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                        <div className="flex gap-1 md:gap-2">
                          {[21,22,23,24,25,26,27,28].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                      </div>

                      {/* FILA 2: NIÑOS SUPERIOR */}
                      <div className="flex gap-4 md:gap-8 justify-center w-full">
                        <div className="flex gap-1 md:gap-2 justify-end w-[280px] md:w-[350px]">
                          {[55,54,53,52,51].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                        <div className="flex gap-1 md:gap-2 justify-start w-[280px] md:w-[350px]">
                          {[61,62,63,64,65].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                      </div>

                      {/* FILA 3: NIÑOS INFERIOR */}
                      <div className="flex gap-4 md:gap-8 justify-center w-full">
                        <div className="flex gap-1 md:gap-2 justify-end w-[280px] md:w-[350px]">
                          {[85,84,83,82,81].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                        <div className="flex gap-1 md:gap-2 justify-start w-[280px] md:w-[350px]">
                          {[71,72,73,74,75].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                      </div>

                      {/* FILA 4: ADULTOS INFERIOR */}
                      <div className="flex gap-4 md:gap-8 justify-center w-full">
                        <div className="flex gap-1 md:gap-2">
                          {[48,47,46,45,44,43,42,41].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                        <div className="flex gap-1 md:gap-2">
                          {[31,32,33,34,35,36,37,38].map(diente => <RenderDiente key={diente} diente={diente} />)}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 md:py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-slate-500 font-medium text-sm md:text-lg">Seleccione un paciente para desplegar la ficha UNASA.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "finanzas" && (
            <div className="w-full">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 md:mb-6">Estado de Cuenta</h2>
              <div className="bg-white p-4 md:p-10 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
                <select value={pacienteActivo?.id || ""} onChange={(e) => cargarOdontogramaYArchivos(e.target.value)} className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold focus:border-blue-600 mb-6">
                  <option value="">Seleccione paciente...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>
                {pacienteActivo ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                    <div>
                      <div className={`p-4 md:p-6 rounded-2xl mb-6 md:mb-8 text-center ${balanceTotal > 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                        <p className="font-bold text-xs md:text-sm uppercase tracking-widest mb-2">Balance</p>
                        <p className="text-4xl md:text-5xl font-black">${Math.max(0, balanceTotal).toFixed(2)}</p>
                      </div>
                      <form onSubmit={registrarPago} className="space-y-4 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100">
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 font-bold text-slate-600"><input type="radio" name="tipo" checked={nuevoPago.tipo === 'cargo'} onChange={() => setNuevoPago({...nuevoPago, tipo: 'cargo'})}/> Cargo</label>
                          <label className="flex items-center gap-2 font-bold text-slate-600"><input type="radio" name="tipo" checked={nuevoPago.tipo === 'abono'} onChange={() => setNuevoPago({...nuevoPago, tipo: 'abono'})}/> Abono</label>
                        </div>
                        <input required placeholder="Concepto" value={nuevoPago.concepto} onChange={e=>setNuevoPago({...nuevoPago, concepto: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200"/>
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden px-4">
                          <span className="font-black text-slate-400">$</span>
                          <input required type="number" step="0.01" min="0" value={nuevoPago.monto} onChange={e=>setNuevoPago({...nuevoPago, monto: e.target.value})} className="w-full p-3 outline-none font-black"/>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">Registrar</button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50"><p className="text-slate-500 font-medium">Seleccione paciente</p></div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}