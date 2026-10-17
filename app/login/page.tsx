"use client"
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) router.push("/admin")
    else alert("Credenciales incorrectas")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      <div className="relative z-10 w-full max-w-md p-10 bg-white rounded-[2rem] shadow-2xl mx-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900">Kath<span className="text-blue-600">Dent</span></h1>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs mt-3">Portal de la Doctora</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
            <input required type="email" onChange={(e)=>setEmail(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-0 focus:border-blue-600 outline-none transition font-medium"/>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
            <input required type="password" onChange={(e)=>setPassword(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl bg-slate-50 focus:ring-0 focus:border-blue-600 outline-none transition font-medium"/>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-black text-lg py-4 rounded-xl hover:bg-blue-700 transition shadow-[0_10px_20px_-10px_rgba(37,99,235,0.6)] mt-4 hover:-translate-y-1">Entrar al Consultorio</button>
        </form>
        <div className="mt-8 text-center">
          <Link href="/" className="text-slate-400 hover:text-blue-600 font-bold text-sm transition">← Regresar a la clínica</Link>
        </div>
      </div>
    </div>
  )
}