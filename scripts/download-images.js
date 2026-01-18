/**
 * Last ned bilder fra URL-er og lagre lokalt
 * Kjør: node scripts/download-images.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Bildedata - samme som i src/images.js
const IMAGES = {
  dyr: [
    { url: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800", name: "elefant", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800", name: "love", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1547721064-da6cfb341d50?w=800", name: "sjiraff", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800", name: "katt", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", name: "hund", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800", name: "kanin", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=800", name: "zebra", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800", name: "panda", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800", name: "tiger", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1543946207-39bd91e70ca7?w=800", name: "pingvin", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=800", name: "skilpadde", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=800", name: "isbjorn", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1555169062-013468b47731?w=800", name: "koala", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1474314243412-cd4a79b46a27?w=800", name: "delfin", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1598439210625-5067c578f3f6?w=800", name: "ugle", difficulty: "hard" },
    { url: "https://images.unsplash.com/photo-1550853024-fae8cd4be47f?w=800", name: "gorilla", difficulty: "hard" },
    { url: "https://images.unsplash.com/photo-1462888210965-cdf193fb74de?w=800", name: "flamingo", difficulty: "hard" },
    { url: "https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800", name: "klovnefisk", difficulty: "hard" },
  ],
  steder: [
    { url: "https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=800", name: "eiffeltarnet", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800", name: "colosseum", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=800", name: "pyramidene", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=800", name: "frihetsgudinnen", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800", name: "big-ben", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1508050919630-b135583b29ab?w=800", name: "taj-mahal", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800", name: "sydney-opera", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800", name: "new-york", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800", name: "golden-gate", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800", name: "japan-tempel", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800", name: "santorini", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800", name: "neuschwanstein", difficulty: "hard" },
    { url: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800", name: "amsterdam", difficulty: "hard" },
    { url: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800", name: "mount-fuji", difficulty: "hard" },
  ],
  ting: [
    { url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800", name: "gitar", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800", name: "piano", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800", name: "kaffe", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800", name: "kamera", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800", name: "hodetelefoner", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800", name: "sykkel", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800", name: "bil", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800", name: "mobil", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800", name: "klokke", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800", name: "solbriller", difficulty: "easy" },
    { url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800", name: "laptop", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800", name: "sko", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800", name: "basketball", difficulty: "medium" },
    { url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800", name: "fotball", difficulty: "medium" },
  ],
};

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'images');

// Sørg for at output-mappen eksisterer
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(OUTPUT_DIR, filename);

    // Hopp over hvis filen allerede eksisterer
    if (fs.existsSync(filepath)) {
      console.log(`  ✓ ${filename} (eksisterer)`);
      resolve(filepath);
      return;
    }

    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      // Følg redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        downloadImage(response.headers.location, filename).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`  ↓ ${filename} (lastet ned)`);
        resolve(filepath);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('\n=== Laster ned bilder ===\n');

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const [category, images] of Object.entries(IMAGES)) {
    console.log(`\n${category.toUpperCase()}:`);

    for (const img of images) {
      const filename = `${img.name}.jpg`;
      try {
        await downloadImage(img.url, filename);
        success++;
      } catch (err) {
        console.log(`  ✗ ${filename} (FEIL: ${err.message})`);
        errors.push({ name: img.name, error: err.message });
        failed++;
      }
    }
  }

  console.log('\n=== Oppsummering ===');
  console.log(`Vellykket: ${success}`);
  console.log(`Feilet: ${failed}`);

  if (errors.length > 0) {
    console.log('\nFeil:');
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }

  console.log(`\nBilder lagret i: ${OUTPUT_DIR}\n`);
}

downloadAll();
