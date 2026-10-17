import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* BARRA DE NAVEGACIÓN (Adaptable) */}
      <nav className="bg-white/95 backdrop-blur-md fixed w-full z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter">
            Kath<span className="text-blue-600">Dent</span>
          </div>
          <div className="flex gap-3 md:gap-6 items-center text-xs md:text-sm font-bold text-slate-600">
            <a href="#servicios" className="hidden md:block hover:text-blue-600 transition">Tratamientos</a>
            <Link href="/login" className="hidden sm:block hover:text-blue-600 transition">Portal Dra.</Link>
            <Link href="/agendar" className="bg-blue-600 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-full hover:bg-blue-700 transition shadow-md">Reservar Cita</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION (Adaptable) */}
      <section className="relative pt-24 pb-16 md:pt-48 md:pb-32 flex items-center min-h-[85vh]">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=2000&auto=format&fit=crop" alt="Clínica Dental" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/40"></div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 w-full text-center md:text-left">
          <div className="max-w-2xl mx-auto md:mx-0">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-300 font-bold tracking-widest text-[10px] md:text-xs mb-4 md:mb-6 uppercase border border-blue-400/30">
              Odontología de Vanguardia
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-[1.1] mb-4 md:mb-6 tracking-tight">
              Vuelve a sonreír con <span className="text-blue-400">confianza.</span>
            </h1>
            <p className="text-base md:text-xl text-slate-300 mb-8 md:mb-10 leading-relaxed font-light px-4 md:px-0">
              Especialistas en transformar tu salud dental. Utilizamos tecnología de punta para tratamientos sin dolor y resultados garantizados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start px-6 md:px-0">
              <Link href="/agendar" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-base md:text-lg text-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                Agendar Consulta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS (Adaptable) */}
      <section id="servicios" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 md:mb-4 tracking-tight">Nuestros Tratamientos</h2>
            <p className="text-slate-500 text-base md:text-lg font-medium">Atención integral y personalizada para toda la familia</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            <div className="p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-50 border border-slate-100 shadow-sm text-center md:text-left">
              <div className="text-4xl mb-4 md:mb-6">✨</div>
              <h3 className="text-lg md:text-xl font-black mb-2 md:mb-3 text-slate-800">Limpieza Profunda</h3>
              <p className="text-slate-600 font-medium text-sm md:text-base">Eliminación de sarro, placa y manchas para encías sanas y aliento fresco.</p>
            </div>
            
            <div className="p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-50 border border-slate-100 shadow-sm text-center md:text-left">
              <div className="text-4xl mb-4 md:mb-6">💎</div>
              <h3 className="text-lg md:text-xl font-black mb-2 md:mb-3 text-slate-800">Estética Dental</h3>
              <p className="text-slate-600 font-medium text-sm md:text-base">Blanqueamiento láser y carillas de porcelana para una sonrisa de revista.</p>
            </div>
            
            <div className="p-6 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-50 border border-slate-100 shadow-sm text-center md:text-left">
              <div className="text-4xl mb-4 md:mb-6">🦷</div>
              <h3 className="text-lg md:text-xl font-black mb-2 md:mb-3 text-slate-800">Cirugía y Extracciones</h3>
              <p className="text-slate-600 font-medium text-sm md:text-base">Procedimientos seguros, rápidos y sin dolor, incluyendo muelas del juicio.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-8 md:py-12 text-center border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-black text-white mb-4">Kath<span className="text-blue-500">Dent</span></h2>
          <p className="font-medium text-xs md:text-sm">&copy; 2026 Clínica Dental Especializada. Todos los derechos reservados.</p>
          <Link href="/login" className="sm:hidden block mt-4 text-slate-500 hover:text-white underline text-xs">Acceso Portal Doctora</Link>
        </div>
      </footer>
    </div>
  );
}