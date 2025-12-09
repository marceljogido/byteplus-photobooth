# digiSelfie AI Photobooth

Booth swafoto interaktif yang memadukan kamera langsung dengan transformasi artistik berbasis Google Gemini 2.5 Flash Image. Pengunjung dapat memilih gaya favorit, memproses foto secara instan, dan mengunduh hasilnya melalui QR code sebagai foto statis ber-watermark dan GIF sebelum-sesudah.

## Fitur Utama
- **Pemilihan gaya AI**: Renaissance, Cartoon, Statue, Banana, 80s, 19th Century, Anime, Psychedelic, 8-bit, Big Beard, Comic Book, Old, serta opsi prompt kustom.
- **Workflow kamera adaptif**: Countdown 3 detik, deteksi orientasi otomatis, serta handling error izin/perangkat.
- **Pratinjau dan watermark**: Preview hasil foto sebelum diproses AI dengan watermark bawaan acara.
- **Generasi GIF otomatis**: Memadukan foto asli dan hasil AI menggunakan `gifenc`.
- **Distribusi cepat**: Hasil foto dan GIF dapat dipindai lewat QR code, lengkap dengan upload ke Nextcloud, Google Drive, atau FTP sebagai penyimpanan utama.

## Prasyarat
- Node.js 18 atau lebih baru.
- Akun Google AI Studio dengan akses ke Gemini 2.5 Flash Image.
- Kredensial Nextcloud, Google Drive (service account), atau FTP (opsional, untuk upload otomatis).
- Berkas watermark PNG (default: `public/BytePlus.png`).

## Persiapan Lingkungan
1. Salin `.env.example` menjadi `.env` lalu isi variabel berikut:
   - `GEMINI_API_KEY`
   - `STORAGE_PROVIDER` (`nextcloud`, `google-drive`, atau `ftp`)
   - Kredensial Nextcloud/Google Drive/FTP sesuai pilihan penyimpanan
   - `WATERMARK_FILE_PATH` bila menggunakan watermark selain default
   - (Opsional) `PUBLIC_BASE_URL` jika ingin memaksa domain tertentu untuk link/QR hasil upload
2. Pasang dependensi:
   ```bash
   npm install
   ```

## Menjalankan Aplikasi
- **Mode pengembangan lengkap (frontend + backend)**  
  ```bash
  npm run dev:full
  ```
- **Hanya frontend Vite**  
  ```bash
  npm run dev
  ```
- **Produksi lokal**  
  ```bash
  npm run start
  ```
  Perintah ini melakukan build Vite lalu menjalankan server Express.

Antarmuka secara default dapat diakses di `http://localhost:5173`, sedangkan backend Express berada di `http://localhost:3001`.

## Struktur Proyek Singkat
- `src/components/App.jsx` – alur utama UI kamera, pemilihan mode, preview, serta modal download.
- `src/lib/actions.js` – logika pemrosesan foto, integrasi Gemini, dan pembuatan GIF.
- `src/lib/llm.js` – pembungkus SDK `@google/genai` dengan retry dan pengaturan safety.
- `src/lib/modes.js` – daftar gaya AI dan prompt bawaan.
- `src/server/server.js` – layanan Express untuk upload, watermark, serta integrasi Nextcloud/Google Drive/FTP.
- `System.md` – dokumentasi sistem dan konsep produk lengkap.

## Testing Lapangan
- Uji izin kamera pada perangkat target (Windows/Mac/Linux).
- Pastikan koneksi Nextcloud/Google Drive/FTP berhasil (cek `/health` atau endpoint konfigurasi `/api/{provider}/test`).
- Jika memakai `PUBLIC_BASE_URL`, pastikan domain tersebut mengarah ke server dan Nginx mengizinkan akses ke `/upload/*`.
- Coba scan QR dengan perangkat iOS dan Android untuk memastikan URL publik dapat diakses.
- Simulasikan kegagalan jaringan untuk memverifikasi fallback penyimpanan lokal.

## Lisensi dan Atribusi
- Aset logo dan watermark mengikuti hak milik BytePlus / pihak terkait.
- Ketergantungan pihak ketiga tunduk pada lisensi masing-masing (lihat `package.json`).
- Teknologi AI menggunakan Google Gemini 2.5 Flash Image.
