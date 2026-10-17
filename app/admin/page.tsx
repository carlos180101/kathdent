"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const [citas, setCitas] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchCitas = async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) return router.push("/login")
      
      const { data } = await supabase.from("citas").select("*").order("fecha_hora", { ascending: true })
      if(data) setCitas(data)
    }
    fetchCitas()
  }, [])

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    await supabase.from("citas").update({ estado: nuevoEstado }).eq("id", id)
    setCitas(citas.map(c => c.id === id ? { ...c, estado: nuevoEstado } : c))
  }

  return (
    <div className="p-8 max-w-6xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Panel Central - KathDent</h1>
        <button onClick={() => { supabase.auth.signOut(); router.push("/") }} className="text-red-600 font-bold hover:underline">Cerrar Sesión</button>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6 text-slate-800 border-b pb-4">Citas Programadas</h2>
        <div className="space-y-4">
          {citas.length === 0 ? <p className="text-slate-500">No hay citas registradas en el sistema.</p> : citas.map(cita => (
            <div key={cita.id} className="p-5 border border-slate-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 hover:bg-slate-100 transition">
              <div className="mb-4 md:mb-0">
                <p className="font-bold text-lg text-slate-900">{new Date(cita.fecha_hora).toLocaleString()}</p>
                <p className="text-slate-700 font-medium">Procedimiento: <span className="text-blue-600">{cita.motivo}</span></p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold mt-3 inline-block ${cita.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : cita.estado === 'confirmada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {cita.estado.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => actualizarEstado(cita.id, 'confirmada')} className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 shadow-sm">Confirmar</button>
                <button onClick={() => actualizarEstado(cita.id, 'cancelada')} className="bg-slate-200 text-slate-800 px-5 py-2 rounded-lg font-bold hover:bg-slate-300 shadow-sm">Cancelar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
