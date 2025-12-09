# digiSelfie AI Photobooth - Sistem dan Konsep

## 1. Ringkasan Konsep
- **Tagline**: *Instant Style: Transform Your Selfie with AI.*
- **Inti pengalaman**: Booth swafoto layar sentuh yang menggabungkan kamera langsung, pilihan gaya artistik, dan pemrosesan generatif Google Gemini 2.5 Flash Image. Setiap sesi menghadirkan foto statis ber-watermark serta GIF perbandingan sebelum-sesudah secara otomatis.
- **Karakter produk**: Ceria, futuristik, ramah pengguna, dengan branding BytePlus yang tegas.

## 2. Identitas Visual dan Nuansa UI
- **Palet aktif**: Gradien toska dan aqua (#ccfbf1 ke #6ee7b7) dengan aksen ungu kebiruan (#6366f1) dan highlight oranye (#f97316) pada tombol utama.
- **Gaya antarmuka**: Glassmorphism ringan, icon Material Symbols, tipografi Space Mono dan Google Sans. Watermark `BytePlus.png` muncul pada preview, hasil, dan frame GIF.
- **Tone**: Playful tetapi profesional; instruksi UI jelas sehingga pengguna dapat mengikuti alur tanpa pendampingan intensif.

## 3. Alur Pengalaman Pengguna
1. **Layar sambutan**: Header menampilkan logo `BytePlus.png` dan judul BytePlus Photobooth. Tombol `Mari Berfoto!` mengaktifkan kamera (tidak auto-start demi privasi).
2. **Persiapan kamera**: Aplikasi mencoba resolusi tinggi lalu menurunkan ke medium atau default melalui `getUserMedia`. Orientasi portrait atau landscape dipilih otomatis, termasuk rotasi canvas bila diperlukan. Pesan error spesifik (izin ditolak, perangkat tidak ditemukan, browser tidak mendukung) disertai tombol coba lagi.
3. **Pemilihan mode AI**: Grid gaya selalu terlihat di sisi kamera dengan nama serta emoji: Renaissance, Cartoon, Statue, Banana, 80s, 19th Century, Anime, Psychedelic, 8-bit, Big Beard, Comic Book, Old. Mode `Custom` membuka editor prompt yang tersimpan di Zustand agar konsisten antar sesi.
4. **Pengambilan foto**: Tombol shutter memulai hitung mundur 3 detik, menyalakan flash overlay, dan menangkap frame sesuai rasio target. Foto disimpan sebagai JPEG 95 persen lengkap dengan metadata dimensi.
5. **Pra-tinjau**: Modal preview menampilkan foto asli bersama watermark, status proses AI, dan aksi `Retake` atau `Lanjut`.
6. **Pemrosesan AI**: Fungsi `snapPhoto` memanggil Gemini 2.5 Flash Image dengan prompt gaya terpilih. Output dinormalisasi ke rasio input, disimpan di cache `imageData`, dan status foto ditandai selesai.
7. **Pembuatan GIF**: Fungsi `makeGif` otomatis membuat GIF dua frame (foto asli dan hasil) melalui `gifenc`, termasuk watermark di setiap frame.
8. **Halaman hasil**: Layout dua kolom (desktop) atau tab (mobile) menampilkan foto AI dan GIF. Tombol `Download` membuka modal QR, sedangkan `Selesai` mengakhiri sesi dan menyiapkan kamera untuk pengunjung berikutnya.
9. **Unduh dan distribusi**: Modal QR memuat tab `QR Foto` dan `QR GIF`. Jika file belum ada di cloud, frontend mengunggah ke `/api/upload`, menerima URL publik dan QR dari server (atau membuat QR fallback). Pengunjung memindai QR untuk menyimpan hasil ke perangkat sendiri.

## 4. Fitur Teknis Kunci
- **State management**: Zustand + Immer untuk state ringan (foto aktif, mode, status GIF, custom prompt). Data gambar tersimpan di modul singleton `imageData`.
- **Kontrol sesi**: `resetSession()` menghapus URL blob, state, dan cache setelah sesi selesai. Token upload mencegah race condition saat beberapa proses paralel.
- **Adaptasi perangkat**: Breakpoint 1024 piksel membedakan layout desktop dan mobile. CSS mendukung orientasi landscape, fallback hover, serta kontrol sentuh.
- **Keandalan kamera**: Multi-tier constraint, pembersihan manual track video, dan pesan error yang mudah dipahami.
- **Watermark otomatis**: Diterapkan di preview, hasil AI, GIF, dan jalur upload server (Nextcloud membuat salinan ber-watermark, FTP menyalin file ter-watermark bila ada).
- **Aksesibilitas**: Tombol dan tab dilengkapi atribut aria, indikator loading, serta teks pendamping agar status proses mudah dibaca.

## 5. Integrasi AI Gemini 2.5 Flash Image
- **Model**: `gemini-2.5-flash-image` melalui SDK `@google/genai` dengan pembatas concurrency `p-limit`.
- **Payload**: Prompt gaya dan inline JPEG dari kamera; safety setting diset ke `BLOCK_NONE`.
- **Reliability**: Maksimum 5 percobaan dengan exponential backoff; timeout 123333 ms sebelum retry.
- **Penyesuaian dimensi**: Output dirender ulang ke ukuran input untuk menjaga konsistensi hasil dan GIF.
- **Custom prompt**: UI mengharuskan prompt terisi ketika mode `custom` dipilih.

## 6. Backend dan Penyimpanan
- **Stack**: Express (`src/server/server.js`) melayani bundel Vite serta endpoint `/api/upload`.
- **Storage provider**:
  1. Nextcloud (default) melalui WebDAV; menambahkan watermark memakai `sharp`, kemudian mengekspose URL publik dan QR.
  2. FTP atau SFTP sebagai opsi cadangan menggunakan `basic-ftp`, menaruh file pada folder `img/` dan `gif/` sesuai `.env`.
- **Fallback lokal**: Jika upload cloud gagal, file disalin ke `public/uploads/{img|gif}` dan QR dibuat dari URL lokal, sehingga booth tetap beroperasi.
- **Konfigurasi dinamis**: Endpoint `/api/{ftp|nextcloud}/config` dan `/api/{ftp|nextcloud}/test` memungkinkan perubahan kredensial tanpa rebuild.
- **Privasi**: Server hanya menyimpan file sementara; data foto di frontend dibersihkan setelah setiap sesi.

## 7. Rincian Operasional
- **Perangkat keras**: Kamera mirrorless atau webcam profesional, PC dengan internet stabil, layar sentuh minimal 49 inci, printer dye-sub opsional.
- **Persiapan lokasi**: Backdrop polos disarankan, namun prompt gaya dapat mengatasi latar kompleks. Tripod dan lampu kontinyu membantu konsistensi.
- **Personel**: Satu operator mendampingi antrean, membantu scan QR, dan memantau koneksi.
- **Kebutuhan jaringan**: Upload per sesi sekitar 5 sampai 8 MB (foto dan GIF). Kredensial Nextcloud atau FTP perlu diuji sebelum acara.
- **Reset cepat**: Tombol `Selesai` menghentikan stream kamera, membersihkan state, dan menyiapkan booth untuk pengguna berikutnya dalam hitungan detik.

## 8. Estimasi Biaya API Gemini
| Jumlah Pengguna | Estimasi Sesi (75%) | Biaya per Transformasi (~$0.02) | Total API |
|-----------------|---------------------|---------------------------------|-----------|
| 100             | 75                  | $0.0197                         | ~$1.50    |
| 250             | 188                 | $0.0197                         | ~$3.76    |
| 500             | 375                 | $0.0197                         | ~$7.50    |
| 1000            | 750                 | $0.0197                         | ~$15.00   |
| 1500            | 1125                | $0.0197                         | ~$22.50   |

> Komponen biaya: input sekitar 1300 token (foto dan prompt) ~ $0.000195, output satu gambar ~ $0.0195. Biaya server, storage, atau printer tidak termasuk.

## 9. Contoh Output dan Storytelling
- **Mode Anime**: Karakter semi-realistik bernuansa pastel; GIF menunjukkan transisi halus dengan watermark di pojok kanan bawah.
- **Mode Comic Book**: Warna blok kontras, outline kuat, bubble mengikuti prompt.
- **Mode Custom**: Contoh prompt "Ubah fotoku seolah sedang menunggang kuda di padang rumput sinematik" menghasilkan visual dramatis yang mudah viral.
- GIF dua frame (asli dan hasil) berdurasi sekitar 1,1 detik sehingga efektif sebagai teaser di layar unduh atau media sosial.

## 10. Checklist Pra-Acara
- Siapkan `.env` (GEMINI_API_KEY, kredensial Nextcloud atau FTP, WATERMARK_FILE_PATH jika berbeda).
- Jalankan `npm run dev:full` untuk uji coba; gunakan `npm run start` pada mode produksi.
- Pastikan izin kamera sudah diberikan di sistem operasi dan browser.
- Periksa kualitas watermark PNG (transparansi dan resolusi minimal 1024 piksel).
- Uji scan QR di perangkat iOS dan Android.
- Simulasikan kegagalan jaringan atau kredensial untuk memastikan fallback berjalan.

## 11. Roadmap Peningkatan
- Multi-shot agar pengguna dapat memilih frame terbaik sebelum diproses AI.
- Mode grup dengan komposisi otomatis untuk beberapa orang.
- Analytics ringan (jumlah sesi, mode populer) tanpa menyimpan data pribadi.
- Opsi kirim email sebagai alternatif QR.
- Panel operator untuk mengganti prompt custom atau menonaktifkan mode tertentu secara instan.

---

**Kesimpulan**  
digiSelfie AI Photobooth kini sejalan dengan implementasi aplikasi: UX kamera stabil, pilihan gaya AI kaya, dan distribusi hasil instan melalui QR. Dengan biaya Gemini yang rendah, solusi ini siap mendukung event kecil maupun besar. Fokus iterasi selanjutnya adalah memperluas personalisasi dan visibilitas operasional tanpa mengorbankan alur booth yang cepat.
