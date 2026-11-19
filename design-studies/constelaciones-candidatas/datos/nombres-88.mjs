/**
 * Los 88 nombres, con su procedencia.
 *
 * `fuente` es el nombre en español tal como lo escribe el anexo de Wikipedia
 * (Anexo:Constelaciones), que lo toma de José Luis Comellas, *Astronomía*
 * (Ediciones Rialp, 1987), pp. 211-212. No se reescribe ni se completa: si el
 * anexo trae una glosa entre paréntesis («aguador», «cabra-cuerno») o una
 * alternativa con «o» (Aries o Carnero), se conserva en `fuente` y la
 * alternativa pasa a `alt` para que el buscador la encuentre. `es` es el
 * nombre sin glosa, sin artículo y sin la alternativa: lo que se imprime.
 *
 * `la` y `en` son los campos `name` y `en` de d3-celestial
 * (data/constellations.json, Olaf Frohn, BSD-3-Clause). En inglés el nombre de
 * uso es la traducción que trae ese dataset (Eagle, Great Dog), no el latín.
 * `la` es el nombre en latín tal como lo escribe el dataset (campo `name`); se
 * guarda para referencia y la página no lo imprime. No siempre coincide con la
 * forma oficial de la IAU (Canis Maior / Canis Major, Corona Austrina / Corona
 * Australis). En Serpens se unificó a `Serpens`: el dataset lo partía en Caput
 * y Cauda.
 *
 * Serpens llega partida en dos figuras (Caput y Cauda) en el dataset de
 * líneas. Acá es una sola constelación, como en la lista de la IAU.
 */
export const NOMBRES = [
  { id: 'And', la: "Andromeda", en: "Andromeda", es: "Andrómeda", fuente: "Andrómeda", alt: [] },
  { id: 'Ant', la: "Antlia", en: "Air Pump", es: "Bomba Neumática", fuente: "La Bomba Neumática", alt: ["Máquina Neumática"] },
  { id: 'Aps', la: "Apus", en: "Bird of Paradise", es: "Ave del Paraíso", fuente: "El Ave del Paraíso", alt: [] },
  { id: 'Aql', la: "Aquila", en: "Eagle", es: "Águila", fuente: "El Águila", alt: [] },
  { id: 'Aqr', la: "Aquarius", en: "Aquarius", es: "Acuario", fuente: "Acuario («aguador»)", alt: [] },
  { id: 'Ara', la: "Ara", en: "Altar", es: "Altar", fuente: "El Altar", alt: [] },
  { id: 'Ari', la: "Aries", en: "Ram", es: "Aries", fuente: "Aries o Carnero", alt: ["Carnero"] },
  { id: 'Aur', la: "Auriga", en: "Charioteer", es: "Cochero", fuente: "El Cochero", alt: [] },
  { id: 'Boo', la: "Boötes", en: "Herdsman", es: "Boyero", fuente: "El Boyero", alt: [] },
  { id: 'CMa', la: "Canis Major", en: "Great Dog", es: "Can Mayor", fuente: "El Can Mayor", alt: ["Perro Mayor"] },
  { id: 'CMi', la: "Canis Minor", en: "Little Dog", es: "Can Menor", fuente: "El Can Menor", alt: ["Perro Menor"] },
  { id: 'CVn', la: "Canes Venatici", en: "Hunting Dogs", es: "Perros de Caza", fuente: "Los Perros de Caza", alt: ["Lebreles"] },
  { id: 'Cae', la: "Caelum", en: "Graving tool", es: "Cincel", fuente: "El Cincel", alt: [] },
  { id: 'Cam', la: "Camelopardalis", en: "Giraffe", es: "Jirafa", fuente: "La Jirafa", alt: [] },
  { id: 'Cap', la: "Capricornus", en: "Capricorn", es: "Capricornio", fuente: "Capricornio («cabra-cuerno»)", alt: [] },
  { id: 'Car', la: "Carina", en: "Keel", es: "Quilla", fuente: "La Quilla", alt: ["Carina"] },
  { id: 'Cas', la: "Cassiopeia", en: "Cassiopeia", es: "Casiopea", fuente: "Casiopea", alt: [] },
  { id: 'Cen', la: "Centaurus", en: "Centaur", es: "Centauro", fuente: "El Centauro", alt: [] },
  { id: 'Cep', la: "Cepheus", en: "Cepheus", es: "Cefeo", fuente: "Cefeo", alt: [] },
  { id: 'Cet', la: "Cetus", en: "Whale", es: "Ballena", fuente: "La Ballena", alt: [] },
  { id: 'Cha', la: "Chamaeleon", en: "Chamaeleon", es: "Camaleón", fuente: "El Camaleón", alt: [] },
  { id: 'Cir', la: "Circinus", en: "Compass", es: "Compás", fuente: "El Compás", alt: [] },
  { id: 'Cnc', la: "Cancer", en: "Crab", es: "Cáncer", fuente: "Cáncer o Cangrejo", alt: ["Cangrejo"] },
  { id: 'Col', la: "Columba", en: "Dove", es: "Paloma", fuente: "La Paloma", alt: [] },
  { id: 'Com', la: "Coma Berenices", en: "Berenice's Hair", es: "Cabellera de Berenice", fuente: "La Cabellera de Berenice", alt: ["Pelo de Berenice"] },
  { id: 'CrA', la: "Corona Austrina", en: "Southern Crown", es: "Corona Austral", fuente: "La Corona Austral", alt: [] },
  { id: 'CrB', la: "Corona Borealis", en: "Northern Crown", es: "Corona Boreal", fuente: "La Corona Boreal", alt: [] },
  { id: 'Crt', la: "Crater", en: "Cup", es: "Copa", fuente: "La Copa", alt: [] },
  { id: 'Cru', la: "Crux", en: "Cross", es: "Cruz del Sur", fuente: "La Cruz del Sur", alt: [] },
  { id: 'Crv', la: "Corvus", en: "Crow", es: "Cuervo", fuente: "El Cuervo", alt: [] },
  { id: 'Cyg', la: "Cygnus", en: "Swan", es: "Cisne", fuente: "El Cisne", alt: [] },
  { id: 'Del', la: "Delphinus", en: "Dolphin", es: "Delfín", fuente: "El Delfín", alt: [] },
  { id: 'Dor', la: "Dorado", en: "Goldfish", es: "Pez Dorado", fuente: "El Pez Dorado", alt: ["Pez dorado"] },
  { id: 'Dra', la: "Draco", en: "Dragon", es: "Dragón", fuente: "El Dragón", alt: [] },
  { id: 'Equ', la: "Equuleus", en: "Colt", es: "Potro", fuente: "El Potro", alt: ["Caballito"] },
  { id: 'Eri', la: "Eridanus", en: "Eridanus", es: "Eridano", fuente: "El Eridano", alt: ["Erídano"] },
  { id: 'For', la: "Fornax", en: "Furnace", es: "Horno", fuente: "El Horno", alt: [] },
  { id: 'Gem', la: "Gemini", en: "Twins", es: "Géminis", fuente: "Géminis o Gemelos", alt: ["Gemelos"] },
  { id: 'Gru', la: "Grus", en: "Crane", es: "Grulla", fuente: "La Grulla", alt: [] },
  { id: 'Her', la: "Hercules", en: "Hercules", es: "Hércules", fuente: "Hércules", alt: [] },
  { id: 'Hor', la: "Horologium", en: "Clock", es: "Reloj", fuente: "El Reloj", alt: [] },
  { id: 'Hya', la: "Hydra", en: "Sea Serpent", es: "Hidra", fuente: "La Hidra", alt: [] },
  { id: 'Hyi', la: "Hydrus", en: "Hydrus", es: "Hidra Macho", fuente: "La Hidra Macho", alt: [] },
  { id: 'Ind', la: "Indus", en: "Indian", es: "Indio", fuente: "El Indio", alt: [] },
  { id: 'LMi', la: "Leo Minor", en: "Little Lion", es: "León Menor", fuente: "El León Menor", alt: [] },
  { id: 'Lac', la: "Lacerta", en: "Lizard", es: "Lagarto", fuente: "El Lagarto", alt: [] },
  { id: 'Leo', la: "Leo", en: "Lion", es: "Leo", fuente: "Leo o León", alt: ["León"] },
  { id: 'Lep', la: "Lepus", en: "Hare", es: "Liebre", fuente: "La Liebre", alt: ["Conejo"] },
  { id: 'Lib', la: "Libra", en: "Balance", es: "Libra", fuente: "Libra o Balanza", alt: ["Balanza"] },
  { id: 'Lup', la: "Lupus", en: "Wolf", es: "Lobo", fuente: "El Lobo", alt: [] },
  { id: 'Lyn', la: "Lynx", en: "Lynx", es: "Lince", fuente: "El Lince", alt: [] },
  { id: 'Lyr', la: "Lyra", en: "Lyre", es: "Lira", fuente: "La Lira", alt: [] },
  { id: 'Men', la: "Mensa", en: "Mensa", es: "Mesa", fuente: "La Mesa", alt: [] },
  { id: 'Mic', la: "Microscopium", en: "Microscope", es: "Microscopio", fuente: "El Microscopio", alt: [] },
  { id: 'Mon', la: "Monoceros", en: "Unicorn", es: "Unicornio", fuente: "El Unicornio", alt: [] },
  { id: 'Mus', la: "Musca", en: "Fly", es: "Mosca", fuente: "La Mosca", alt: [] },
  { id: 'Nor', la: "Norma", en: "Level", es: "Regla", fuente: "La Regla", alt: ["Escuadra"] },
  { id: 'Oct', la: "Octans", en: "Octant", es: "Octante", fuente: "El Octante", alt: ["Bastón"] },
  { id: 'Oph', la: "Ophiuchus", en: "Ophiuchus", es: "Ofiuco", fuente: "Ofiuco", alt: [] },
  { id: 'Ori', la: "Orion", en: "Orion", es: "Orión", fuente: "Orión", alt: [] },
  { id: 'Pav', la: "Pavo", en: "Peacock", es: "Pavo", fuente: "El Pavo", alt: [] },
  { id: 'Peg', la: "Pegasus", en: "Pegasus", es: "Pegaso", fuente: "Pegaso", alt: [] },
  { id: 'Per', la: "Perseus", en: "Perseus", es: "Perseo", fuente: "Perseo", alt: [] },
  { id: 'Phe', la: "Phoenix", en: "Phoenix", es: "Ave Fénix", fuente: "El Ave Fénix", alt: ["Fénix"] },
  { id: 'Pic', la: "Pictor", en: "Painter", es: "Caballete del Pintor", fuente: "El Caballete del Pintor", alt: ["Paleta del Pintor"] },
  { id: 'PsA', la: "Piscis Austrinus", en: "Southern Fish", es: "Pez Austral", fuente: "El Pez Austral", alt: [] },
  { id: 'Psc', la: "Pisces", en: "Fishes", es: "Piscis", fuente: "Piscis o Pez", alt: ["Pez","Peces"] },
  { id: 'Pup', la: "Puppis", en: "Poop Deck", es: "Popa", fuente: "La Popa", alt: [] },
  { id: 'Pyx', la: "Pyxis", en: "Compass", es: "Brújula", fuente: "La Brújula", alt: [] },
  { id: 'Ret', la: "Reticulum", en: "Net", es: "Retículo", fuente: "El Retículo", alt: [] },
  { id: 'Scl', la: "Sculptor", en: "Sculptor", es: "Escultor", fuente: "El Escultor", alt: [] },
  { id: 'Sco', la: "Scorpius", en: "Scorpion", es: "Escorpio", fuente: "Escorpio o Escorpión", alt: ["Escorpión"] },
  { id: 'Sct', la: "Scutum", en: "Shield", es: "Escudo", fuente: "El Escudo", alt: [] },
  { id: 'Ser', la: "Serpens", en: "Serpent", es: "Serpiente", fuente: "La Serpiente", alt: [] },
  { id: 'Sex', la: "Sextans", en: "Sextant", es: "Sextante", fuente: "El Sextante", alt: [] },
  { id: 'Sge', la: "Sagitta", en: "Arrow", es: "Flecha", fuente: "La Flecha", alt: [] },
  { id: 'Sgr', la: "Sagittarius", en: "Archer", es: "Sagitario", fuente: "Sagitario («arquero»)", alt: [] },
  { id: 'Tau', la: "Taurus", en: "Bull", es: "Tauro", fuente: "Tauro o Toro", alt: ["Toro"] },
  { id: 'Tel', la: "Telescopium", en: "Telescope", es: "Telescopio", fuente: "El Telescopio", alt: [] },
  { id: 'TrA', la: "Triangulum Australe", en: "Southern Triangle", es: "Triángulo Austral", fuente: "El Triángulo Austral", alt: [] },
  { id: 'Tri', la: "Triangulum", en: "Triangle", es: "Triángulo", fuente: "El Triángulo", alt: [] },
  { id: 'Tuc', la: "Tucana", en: "Toucan", es: "Tucán", fuente: "El Tucán", alt: [] },
  { id: 'UMa', la: "Ursa Major", en: "Big Dipper", es: "Osa Mayor", fuente: "La Osa Mayor", alt: [] },
  { id: 'UMi', la: "Ursa Minor", en: "Little Dipper", es: "Osa Menor", fuente: "La Osa Menor", alt: [] },
  { id: 'Vel', la: "Vela", en: "Sails", es: "Velas", fuente: "Las Velas", alt: ["Vela"] },
  { id: 'Vir', la: "Virgo", en: "Virgin", es: "Virgo", fuente: "Virgo o Virgen", alt: ["Virgen"] },
  { id: 'Vol', la: "Volans", en: "Flying Fish", es: "Pez Volador", fuente: "El Pez Volador", alt: [] },
  { id: 'Vul', la: "Vulpecula", en: "Little Fox", es: "Zorra", fuente: "La Zorra", alt: ["Zorro"] },
];
