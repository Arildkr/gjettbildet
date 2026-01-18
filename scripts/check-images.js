/**
 * Verifiser at alle bilder eksisterer før build
 * Kjør: node scripts/check-images.js
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'assets', 'images');

// Samme bildeliste som i download-images.js
const REQUIRED_IMAGES = [
  // Dyr
  'elefant.jpg', 'love.jpg', 'sjiraff.jpg', 'katt.jpg', 'hund.jpg',
  'kanin.jpg', 'zebra.jpg', 'panda.jpg', 'tiger.jpg', 'pingvin.jpg',
  'skilpadde.jpg', 'isbjorn.jpg', 'koala.jpg', 'delfin.jpg', 'ugle.jpg',
  'gorilla.jpg', 'flamingo.jpg', 'klovnefisk.jpg',
  // Steder
  'eiffeltarnet.jpg', 'colosseum.jpg', 'pyramidene.jpg', 'frihetsgudinnen.jpg',
  'big-ben.jpg', 'taj-mahal.jpg', 'sydney-opera.jpg', 'new-york.jpg',
  'golden-gate.jpg', 'japan-tempel.jpg', 'santorini.jpg', 'neuschwanstein.jpg',
  'amsterdam.jpg', 'mount-fuji.jpg',
  // Ting
  'gitar.jpg', 'piano.jpg', 'kaffe.jpg', 'kamera.jpg', 'hodetelefoner.jpg',
  'sykkel.jpg', 'bil.jpg', 'mobil.jpg', 'klokke.jpg', 'solbriller.jpg',
  'laptop.jpg', 'sko.jpg', 'basketball.jpg', 'fotball.jpg',
];

// Minimum filstørrelse i bytes (for å oppdage korrupte/tomme filer)
const MIN_FILE_SIZE = 5000;

function checkImages() {
  console.log('\n=== Sjekker bilder før build ===\n');

  const missing = [];
  const corrupt = [];
  let valid = 0;

  for (const filename of REQUIRED_IMAGES) {
    const filepath = path.join(IMAGES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      missing.push(filename);
      console.log(`  ✗ ${filename} (MANGLER)`);
      continue;
    }

    const stats = fs.statSync(filepath);
    if (stats.size < MIN_FILE_SIZE) {
      corrupt.push({ name: filename, size: stats.size });
      console.log(`  ✗ ${filename} (KORRUPT - kun ${stats.size} bytes)`);
      continue;
    }

    console.log(`  ✓ ${filename}`);
    valid++;
  }

  console.log('\n=== Resultat ===');
  console.log(`Gyldige: ${valid}/${REQUIRED_IMAGES.length}`);

  if (missing.length > 0) {
    console.log(`\nManglende bilder (${missing.length}):`);
    missing.forEach(f => console.log(`  - ${f}`));
  }

  if (corrupt.length > 0) {
    console.log(`\nKorrupte bilder (${corrupt.length}):`);
    corrupt.forEach(f => console.log(`  - ${f.name} (${f.size} bytes)`));
  }

  if (missing.length > 0 || corrupt.length > 0) {
    console.log('\n❌ BUILD AVBRUTT: Kjør først "node scripts/download-images.js"\n');
    process.exit(1);
  }

  console.log('\n✓ Alle bilder er på plass. Fortsetter med build.\n');
  process.exit(0);
}

checkImages();
