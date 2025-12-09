/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
const modes = {
  anime: {
    name: 'Retro Anime',
    emoji: '\u2728',
    prompt:
      'Transform the photo into a retro 90s shoujo anime style. Use soft pastel colors, flat shading, and a vintage aesthetic like a classic TV cartoon. Keep the subject\'s facial identity and skin tone recognizable. Outfit can shift to casual streetwear. Background should be simple and graphical (solid color or simple pattern) to match a photobooth vibe, avoiding realistic cinematic clouds. Cute, youthful, slightly softer outlines like a lo-fi webtoon sticker; no extra text or logos.'
  },
  strangerthings: {
    name: 'Stranger Things',
    emoji: '\uD83D\uDEB2',
    prompt:
      "Make the photo look like a dark 80s retro cinematic poster inspired by Stranger Things. Keep the subject's facial identity. Dress them in a vintage denim jacket. Background: mysterious foggy scene with dramatic shadows and an ominous red neon rim light behind the subject. No added text or logos."
  },
  beach: {
    name: 'Beach Fun',
    emoji: '\uD83C\uDFD6\uFE0F',
    prompt:
      'Transform the person into a cute 3D caricature bobblehead style with a slightly larger head and small body while keeping the facial identity recognizable. Place them in a sunny tropical beach with vibrant blue ocean waves. Change outfit to colorful summer wear. High-quality 3D render look. No added text or logos.'
  },
  f1racing: {
    name: 'F1 Racer',
    emoji: '\uD83C\uDFCE\uFE0F',
    prompt:
      'Make the person look like a professional Formula 1 driver while keeping their real face and skin tone. Dress them in a detailed realistic racing suit without sponsor logos. Pose: sitting on a Formula 1 car tire with a helmet placed on the ground nearby, and a Formula 1 car visible behind them. Background: race track asphalt at golden hour with cinematic lighting and sharp focus. No added text or logos.'
  },
  byteplus: {
    name: 'BytePlus Futuristic',
    emoji: '\uD83C\uDF0C',
    prompt:
      'Transform the subject into a sleek tech ambassador with holographic interface elements, BytePlus-inspired aqua gradients, reflective surfaces, and premium booth lighting.'
  },
  byteplusactionbox: {
    name: 'BytePlus Action Box',
    emoji: '\u2728',
    prompt:
      'Full-body action-figure box for BytePlus. Dark navy interior with AI/neural grid and neon teal-ungu edges, tanpa header. Outfit menyesuaikan gender (batik/formal pria; batik dress/kebaya wanita). Wajah asli, skin tone realis, identitas tidak diubah. Pose santai: tangan memegang badge/phone ala tech di pinggang, tidak menutupi wajah. Props lengkap ala booth Dell: laptop di rak, tower/mini PC, phone, modul flash/light ilmuwan AI, dan elemen hologram; prop rapi, tidak melayang sembarangan. Pencahayaan sinematik lembut, rim light bersih, refleksi rapi, tanpa clutter.'
  },
  byteplusprinterbadge: {
    name: 'BytePlus Printer Badge',
    emoji: '\uD83D\uDCF0',
    prompt:
      'Top-down hyper-realistic macro of a compact, textured-black badge/photo printer on a clean white desk. BytePlus logo putih jelas di kiri atas bodi printer. Layar LCD kecil menampilkan status "Printing" dengan progress bar. Dari slot depan keluar kartu foto glossy yang sedikit melengkung: gunakan wajah asli subjek (jangan diubah atau di-stylize), gender/outfit sesuai subjek. Render avatar 3D berkualitas tinggi di kartu, outfit rapi (blazer + kaos atau sesuai subjek), ekspresi ramah. Nama di kartu pakai nama subjek; jika tidak ada, kosongkan teks nama. Tulis "BytePlus" kecil di bawah nama, latar kartu gradasi biru gelap dengan pola sirkuit halus. Pencahayaan expo dari atas, refleksi lembut pada printer dan kartu, bokeh peralatan tech di latar, meja putih sedikit reflektif, tanpa clutter.'
  }
}

export default modes
