import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-redbull-dark to-redbull-darker text-white">
      <header className="bg-redbull-darker/80 backdrop-blur-sm border-b border-redbull-red/30 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-redbull-red p-2 rounded-full">
              <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center">
                <span className="text-redbull-dark font-bold text-sm">M</span>
              </div>
            </div>
            <h1 className="text-xl font-bold">Motoring</h1>
          </div>
          <nav>
            <ul className="flex space-x-6">
              <li><Link href="/" className="hover:text-redbull-red transition duration-200">Beranda</Link></li>
              <li><Link href="/#about" className="hover:text-redbull-red transition duration-200">Tentang</Link></li>
              <li><Link href="/#team" className="hover:text-redbull-red transition duration-200">Tim</Link></li>
              <li><Link href="/login" className="bg-redbull-red hover:bg-redbull-lighter text-white px-4 py-2 rounded-lg transition duration-300">Masuk</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Selamat Datang di <span className="text-redbull-red">Motoring</span>
            </h1>
            <p className="text-2xl text-redbull-light mb-10 max-w-3xl mx-auto">
              Sistem manajemen kendaraan terbaik untuk semua kebutuhan transportasi Anda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="bg-redbull-red hover:bg-redbull-lighter text-white font-bold py-4 px-8 rounded-lg transition duration-300 text-xl"
              >
                Akses Portal
              </Link>
              <Link
                href="/register"
                className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-lg transition duration-300 text-xl border border-redbull-red/30"
              >
                Daftar Sekarang
              </Link>
            </div>
          </div>
        </section>

        <section id="about" className="py-20 px-6 bg-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-redbull-red">Tentang Motoring</h2>
            <p className="text-xl text-redbull-light mb-6">
              Motoring adalah sistem manajemen kendaraan komprehensif yang dirancang untuk menyederhanakan semua aspek operasi dan perawatan kendaraan.
            </p>
            <p className="text-lg text-redbull-light">
              Platform kami menyediakan manajemen armada lanjutan, profil pengemudi, penjadwalan perawatan, dan analitik kinerja untuk organisasi berbagai ukuran.
            </p>
          </div>
        </section>

        <section id="team" className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center text-redbull-red">Tim Kami</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-redbull-red/30 text-center">
                <div className="w-32 h-32 rounded-full bg-redbull-red flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-bold text-white">JD</span>
                </div>
                <h3 className="text-2xl font-bold text-white">John Doe</h3>
                <p className="text-redbull-light">Manager Armada</p>
                <p className="text-redbull-light mt-2">Pengalaman 10 tahun</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-redbull-red/30 text-center">
                <div className="w-32 h-32 rounded-full bg-redbull-red flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl font-bold text-white">JS</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Jane Smith</h3>
                <p className="text-redbull-light">Manager Operasional</p>
                <p className="text-redbull-light mt-2">Pengalaman 8 tahun</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 px-6 border-t border-redbull-red/30">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center space-x-2 mb-6">
            <div className="bg-redbull-red p-3 rounded-full">
              <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center">
                <span className="text-redbull-dark font-bold text-sm">M</span>
              </div>
            </div>
          </div>
          <p className="text-redbull-light">
            © {new Date().getFullYear()} Motoring. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}