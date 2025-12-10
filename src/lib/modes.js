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
      'Transform the person into a high-quality 3D render on a sunny tropical beach (bobblehead style: kepala sedikit lebih besar dari tubuh, tapi leher normal tanpa pegas/spring). Wajah asli dan proporsi tetap wajar. Pose aktif/santai: sedang berselancar di ombak, atau rebahan/berjemur di pasir seperti anak pantai. Outfit summer cerah; ekspresi riang. Latar: laut biru, ombak, pasir hangat, sedikit palm tree; tanpa teks atau logo.'
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
      'Transform the subject into a sleek tech ambassador with holographic interface elements, inspired aqua gradients, reflective surfaces, and premium booth lighting.'
  },
  byteplusactionbox: {
    name: 'BytePlus Action Box',
    emoji: '\u2728',
    prompt:
      'Full-body action-figure box. Dark navy interior with Artifial Intelegence/neural grid and neon teal-ungu edges, tanpa header. Outfit menyesuaikan gender (batik/formal pria; batik dress/kebaya wanita). Wajah asli, skin tone realis, identitas tidak diubah. Pose santai: tangan memegang badge/phone ala tech di pinggang, tidak menutupi wajah. Props lengkap : laptop di rak, tower/mini PC, phone, modul flash/light ilmuwan AI, dan elemen hologram; prop rapi, tidak melayang sembarangan. Pencahayaan sinematik lembut, rim light bersih, refleksi rapi, tanpa clutter.'
  },
  byteplusprinterbadge: {
    name: 'BytePlus Caricature',
    emoji: '\uD83C\uDFA8',
    prompt:
      'Full-frame, fun tech-caricature portrait (gaya 3D/illustration) dengan sedikit eksaggerasi fitur tapi tetap menjaga identitas wajah. Tidak ada printer/kartu/badge/business card. Proporsi tubuh wajar, ekspresi ramah. Outfit rapi ala ambassador (blazer + kaos/kemeja atau smart casual) warna biru/gelap. Latar gradasi biru gelap dengan pola sirkuit sedang, cahaya expo lembut, tanpa teks atau logo. Sisakan area kosong bersih di bagian bawah gambar (footer) tanpa elemen apa pun untuk tempat watermark tempel.'
  }
}

export default modes
