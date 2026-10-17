"use client"
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const handleLogin = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) router.push("/admin")
    else alert("Credenciales incorrectas")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Link href="/" className="mb-8 text-blue-600 font-semibold hover:underline">← Volver al inicio</Link>
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-slate-100">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-900">Acceso Privado</h1>
        <div className="space-y-4">
          <input required type="email" placeholder="Correo electrónico" onChange={(e)=>setEmail(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"/>
          <input required type="password" placeholder="Contraseña" onChange={(e)=>setPassword(e.target.value)} className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"/>
          <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow-md">Ingresar al Sistema</button>
        </div>
      </form>
    </div>
  )
}
