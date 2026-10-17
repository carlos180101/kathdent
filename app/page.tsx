import Link from "next/link";
export default function Home() {
  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
      <div className="min-h-screen bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <div className="inline-block px-6 py-2 bg-blue-50 rounded-full text-blue-700 font-bold tracking-widest text-sm mb-4 border border-blue-100 shadow-sm">CLÍNICA DENTAL ESPECIALIZADA</div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter">Kath<span className="text-blue-600">Dent</span></h1>
          <p className="text-2xl text-slate-700 font-light max-w-2xl mx-auto leading-relaxed">Transformamos sonrisas con tecnología de punta y atención personalizada. Tu salud dental en manos de expertos.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Link href="/agendar" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-[0_10px_40px_-10px_rgba(37,99,235,0.6)] transition-all hover:scale-105">📅 Agendar Cita Ahora</Link>
            <Link href="/login" className="bg-white hover:bg-slate-50 text-slate-900 px-10 py-5 rounded-2xl font-bold text-lg shadow-xl border border-slate-100 transition-all hover:scale-105">🔒 Portal Admin</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
