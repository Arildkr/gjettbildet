// Bildedatabase for Gjett bildet
// Bruker lokale bilder fra /assets/images/

const BASE_PATH = '/assets/images/';

const IMAGES = {
  dyr: [
    // Lett
    { url: `${BASE_PATH}elefant.jpg`, answers: ["elefant", "elephant"], difficulty: "easy" },
    { url: `${BASE_PATH}love.jpg`, answers: ["løve", "lion"], difficulty: "easy" },
    { url: `${BASE_PATH}sjiraff.jpg`, answers: ["sjiraff", "giraff", "giraffe"], difficulty: "easy" },
    { url: `${BASE_PATH}katt.jpg`, answers: ["katt", "cat"], difficulty: "easy" },
    { url: `${BASE_PATH}hund.jpg`, answers: ["hund", "dog"], difficulty: "easy" },
    { url: `${BASE_PATH}kanin.jpg`, answers: ["kanin", "rabbit"], difficulty: "easy" },
    { url: `${BASE_PATH}zebra.jpg`, answers: ["zebra"], difficulty: "easy" },
    // Medium
    { url: `${BASE_PATH}panda.jpg`, answers: ["panda", "pandabjørn"], difficulty: "medium" },
    { url: `${BASE_PATH}tiger.jpg`, answers: ["tiger"], difficulty: "medium" },
    { url: `${BASE_PATH}pingvin.jpg`, answers: ["pingvin", "penguin"], difficulty: "medium" },
    { url: `${BASE_PATH}skilpadde.jpg`, answers: ["skilpadde", "turtle"], difficulty: "medium" },
    { url: `${BASE_PATH}isbjorn.jpg`, answers: ["isbjørn", "polar bear"], difficulty: "medium" },
    { url: `${BASE_PATH}koala.jpg`, answers: ["koala"], difficulty: "medium" },
    { url: `${BASE_PATH}delfin.jpg`, answers: ["delfin", "dolphin"], difficulty: "medium" },
    // Hard
    { url: `${BASE_PATH}ugle.jpg`, answers: ["ugle", "owl"], difficulty: "hard" },
    { url: `${BASE_PATH}gorilla.jpg`, answers: ["gorilla", "ape"], difficulty: "hard" },
    { url: `${BASE_PATH}flamingo.jpg`, answers: ["flamingo"], difficulty: "hard" },
    { url: `${BASE_PATH}klovnefisk.jpg`, answers: ["klovnefisk", "clownfish", "nemo", "fisk"], difficulty: "hard" },
  ],

  steder: [
    // Lett
    { url: `${BASE_PATH}eiffeltarnet.jpg`, answers: ["eiffeltårnet", "eiffel tower", "paris"], difficulty: "easy" },
    { url: `${BASE_PATH}colosseum.jpg`, answers: ["colosseum", "kolosseum", "roma", "rome"], difficulty: "easy" },
    { url: `${BASE_PATH}pyramidene.jpg`, answers: ["pyramidene", "pyramider", "giza", "egypt"], difficulty: "easy" },
    { url: `${BASE_PATH}frihetsgudinnen.jpg`, answers: ["frihetsgudinnen", "statue of liberty", "new york"], difficulty: "easy" },
    { url: `${BASE_PATH}big-ben.jpg`, answers: ["big ben", "london"], difficulty: "easy" },
    { url: `${BASE_PATH}taj-mahal.jpg`, answers: ["taj mahal", "india"], difficulty: "easy" },
    // Medium
    { url: `${BASE_PATH}sydney-opera.jpg`, answers: ["sydney", "operahuset", "opera house", "australia"], difficulty: "medium" },
    { url: `${BASE_PATH}new-york.jpg`, answers: ["new york", "manhattan"], difficulty: "medium" },
    { url: `${BASE_PATH}golden-gate.jpg`, answers: ["golden gate", "san francisco", "bro"], difficulty: "medium" },
    { url: `${BASE_PATH}japan-tempel.jpg`, answers: ["japan", "tokyo", "tempel"], difficulty: "medium" },
    { url: `${BASE_PATH}santorini.jpg`, answers: ["santorini", "hellas", "greece"], difficulty: "medium" },
    // Hard
    { url: `${BASE_PATH}neuschwanstein.jpg`, answers: ["neuschwanstein", "slott", "castle"], difficulty: "hard" },
    { url: `${BASE_PATH}amsterdam.jpg`, answers: ["amsterdam", "nederland", "holland"], difficulty: "hard" },
    { url: `${BASE_PATH}mount-fuji.jpg`, answers: ["fuji", "mount fuji", "japan"], difficulty: "hard" },
  ],

  personer: [
    // Fjernet - for få pålitelige bilder
  ],

  ting: [
    // Lett
    { url: `${BASE_PATH}gitar.jpg`, answers: ["gitar", "guitar"], difficulty: "easy" },
    { url: `${BASE_PATH}piano.jpg`, answers: ["piano", "flygel"], difficulty: "easy" },
    { url: `${BASE_PATH}kaffe.jpg`, answers: ["kaffe", "kaffekopp", "coffee"], difficulty: "easy" },
    { url: `${BASE_PATH}kamera.jpg`, answers: ["kamera", "camera"], difficulty: "easy" },
    { url: `${BASE_PATH}hodetelefoner.jpg`, answers: ["hodetelefoner", "headphones"], difficulty: "easy" },
    { url: `${BASE_PATH}sykkel.jpg`, answers: ["sykkel", "bike", "bicycle"], difficulty: "easy" },
    { url: `${BASE_PATH}bil.jpg`, answers: ["bil", "car"], difficulty: "easy" },
    { url: `${BASE_PATH}mobil.jpg`, answers: ["mobil", "telefon", "iphone", "smartphone"], difficulty: "easy" },
    { url: `${BASE_PATH}klokke.jpg`, answers: ["klokke", "watch", "armbåndsur"], difficulty: "easy" },
    { url: `${BASE_PATH}solbriller.jpg`, answers: ["solbriller", "sunglasses"], difficulty: "easy" },
    // Medium
    { url: `${BASE_PATH}laptop.jpg`, answers: ["laptop", "datamaskin", "pc", "computer"], difficulty: "medium" },
    { url: `${BASE_PATH}sko.jpg`, answers: ["sko", "joggesko", "sneakers"], difficulty: "medium" },
    { url: `${BASE_PATH}basketball.jpg`, answers: ["basketball", "ball"], difficulty: "medium" },
    { url: `${BASE_PATH}fotball.jpg`, answers: ["fotball", "soccer ball", "ball"], difficulty: "medium" },
  ],
};

// Hent bilder basert på kategori og vanskelighetsgrad
export function getImages(category, difficulty = null) {
  let images = [];

  if (category === 'blanding') {
    images = [...IMAGES.dyr, ...IMAGES.steder, ...IMAGES.ting];
  } else if (IMAGES[category]) {
    images = IMAGES[category];
  } else {
    return [];
  }

  if (difficulty) {
    images = images.filter(img => img.difficulty === difficulty);
  }

  return images;
}

// Sjekk om svaret er riktig
export function checkAnswer(userAnswer, correctAnswers) {
  const normalized = userAnswer.toLowerCase().trim();
  return correctAnswers.some(answer =>
    answer.toLowerCase() === normalized ||
    answer.toLowerCase().includes(normalized) ||
    normalized.includes(answer.toLowerCase())
  );
}

export default IMAGES;
