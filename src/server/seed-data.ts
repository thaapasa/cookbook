import type { RecipeInput } from '../shared/recipe.ts';

export type SeedRecipe = RecipeInput & {
  notes?: { text: string; daysAgo: number }[];
};

export const seedRecipes: SeedRecipe[] = [
  {
    title: 'Lohikeitto',
    description: 'Kermainen, tillintuoksuinen arjen klassikko, joka valmistuu alle tunnissa.',
    servings: '4 annosta',
    activeMinutes: 20,
    totalMinutes: 45,
    source: 'https://www.example.com/reseptit/lohikeitto',
    tags: ['keitto', 'kala', 'arki'],
    ingredientGroups: [
      {
        name: 'Keittoon',
        ingredients: [
          { amount: '600 g', name: 'lohifilettä', note: 'nahaton ja ruodoton säästää aikaa' },
          { amount: '500–600 g', name: 'kiinteitä perunoita', note: 'esim. Siikli tai Annabelle' },
          { amount: '1', name: 'sipuli' },
          { amount: '1', name: 'porkkana' },
          { amount: '1 rkl', name: 'voita' },
          { amount: '1 l', name: 'vettä' },
          { amount: '1', name: 'kalaliemikuutio', note: 'esim. Knorr' },
          { amount: '6', name: 'maustepippuria' },
          { amount: '1', name: 'laakerinlehti' },
          { amount: '2 dl', name: 'kaurakermaa', note: 'ruoanvalmistukseen tarkoitettu' },
        ],
      },
      {
        name: 'Viimeistelyyn',
        ingredients: [
          { amount: '1 ruukku', name: 'tilliä', note: 'tuore; pakastetilli käy myös' },
          { name: 'suolaa' },
        ],
      },
    ],
    stepGroups: [
      {
        name: 'Keittopohja',
        steps: [
          'Kuori ja kuutioi perunat ja porkkana. Hienonna sipuli.',
          'Kuullota sipulia voissa kattilassa muutama minuutti.',
          'Lisää vesi, liemikuutio, maustepippurit ja laakerinlehti. Kiehauta.',
          'Lisää perunat ja porkkana. Keitä kannen alla noin 15 minuuttia, kunnes perunat ovat kypsiä.',
        ],
      },
      {
        name: 'Kala ja viimeistely',
        steps: [
          'Poista lohesta nahka ja ruodot ja leikkaa se isoiksi kuutioiksi.',
          'Lisää kaurakerma ja lohi. Hauduta miedolla lämmöllä 5–7 minuuttia. Älä anna kiehua voimakkaasti.',
          'Tarkista suola ja sekoita joukkoon hienonnettu tilli juuri ennen tarjoilua.',
        ],
      },
    ],
    notes: [
      { text: 'Lohi kannattaa lisätä vasta ihan lopuksi, niin se pysyy mehevänä.', daysAgo: 20 },
      {
        text: 'Kaurakermalla yhtä hyvää kuin kuohukermalla. Tuplasatsi riitti kahdeksi päiväksi.',
        daysAgo: 5,
      },
    ],
  },
  {
    title: 'Karjalanpiirakat',
    description: 'Ohuet ruiskuoret ja pehmeä riisipuurotäyte. Tarjoa munavoin kanssa.',
    servings: 'noin 20 kpl',
    activeMinutes: 60,
    totalMinutes: 90,
    source: 'Mummon reseptivihko',
    tags: ['leivonta', 'perinne'],
    ingredientGroups: [
      {
        name: 'Riisipuuro',
        ingredients: [
          { amount: '2 dl', name: 'vettä' },
          { amount: '2 dl', name: 'puuroriisiä' },
          { amount: '1 l', name: 'maitoa' },
          { amount: '1 tl', name: 'suolaa' },
        ],
      },
      {
        name: 'Kuoret',
        ingredients: [
          { amount: '2 dl', name: 'vettä' },
          { amount: '1 tl', name: 'suolaa' },
          { amount: '4 dl', name: 'ruisjauhoja' },
          { amount: '1 dl', name: 'vehnäjauhoja' },
        ],
      },
      {
        name: 'Voiteluun',
        ingredients: [
          { amount: '50 g', name: 'voita' },
          { amount: '1 dl', name: 'maitoa' },
        ],
      },
    ],
    stepGroups: [
      {
        name: 'Puuro',
        steps: [
          'Keitä riisiä vedessä, kunnes vesi on imeytynyt.',
          'Lisää maito ja keitä miedolla lämmöllä sekoittaen noin 40 minuuttia paksuksi puuroksi. Mausta suolalla ja jäähdytä.',
        ],
      },
      {
        name: 'Piirakat',
        steps: [
          'Sekoita vesi, suola ja jauhot tasaiseksi taikinaksi. Muotoile tangoksi ja leikkaa noin 20 palaksi.',
          'Kauli palat ohuiksi, noin 15 cm:n kokoisiksi kuoriksi.',
          'Levitä puuroa kuorille ja rypytä reunat.',
          'Paista 275-asteisessa uunissa 10–15 minuuttia.',
          'Voitele kuumat piirakat maito-voiseoksella ja peitä liinalla.',
        ],
      },
    ],
    notes: [{ text: 'Puuron voi keittää edellisenä iltana.', daysAgo: 40 }],
  },
  {
    title: 'Mustikkapiirakka',
    description: 'Murea pohja ja kermaviilitäyte. Toimii myös pakastemustikoilla.',
    servings: '1 piirakkavuoka (8 palaa)',
    activeMinutes: 20,
    totalMinutes: 60,
    tags: ['jälkiruoka', 'leivonta'],
    ingredientGroups: [
      {
        name: 'Pohja',
        ingredients: [
          { amount: '100 g', name: 'voita' },
          { amount: '1 dl', name: 'sokeria' },
          { amount: '1', name: 'kananmuna' },
          { amount: '2 dl', name: 'vehnäjauhoja' },
          { amount: '1 tl', name: 'leivinjauhetta' },
        ],
      },
      {
        name: 'Täyte',
        ingredients: [
          { amount: '3–4 dl', name: 'mustikoita' },
          { amount: '2 dl', name: 'kermaviiliä' },
          { amount: '1', name: 'kananmuna' },
          { amount: '0,5 dl', name: 'sokeria' },
          { amount: '1 tl', name: 'vaniljasokeria' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Vaahdota voi ja sokeri. Lisää muna ja jauhot, joihin on sekoitettu leivinjauhe.',
          'Painele taikina voideltuun piirakkavuokaan.',
          'Ripottele mustikat pohjan päälle.',
          'Sekoita kermaviili, muna ja sokerit ja kaada mustikoiden päälle.',
          'Paista 200-asteisessa uunissa noin 30 minuuttia.',
        ],
      },
    ],
  },
  {
    title: 'Pinaattiohukaiset',
    description: 'Arkiruoka, josta lapsetkin pitävät. Tarjoa puolukkasurvoksen kanssa.',
    servings: '4 annosta',
    activeMinutes: 30,
    totalMinutes: 30,
    tags: ['kasvis', 'arki'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '5 dl', name: 'maitoa' },
          { amount: '2,5 dl', name: 'vehnäjauhoja' },
          { amount: '2', name: 'kananmunaa' },
          { amount: '150 g', name: 'pakastepinaattia', note: 'sulatettuna' },
          { amount: '1 tl', name: 'suolaa' },
          { amount: '1 rkl', name: 'sulatettua voita' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Sekoita jauhot maitoon. Lisää munat, pinaatti, suola ja voi.',
          'Anna taikinan turvota 10 minuuttia.',
          'Paista pienet ohukaiset voidellulla pannulla molemmin puolin.',
        ],
      },
    ],
  },
  {
    title: 'Kaalikääryleet',
    description: 'Hidas sunnuntairuoka. Kääryleet paranevat seuraavana päivänä.',
    servings: '6 annosta',
    activeMinutes: 60,
    totalMinutes: 150,
    tags: ['perinne'],
    ingredientGroups: [
      {
        name: 'Kääryleet',
        ingredients: [
          { amount: '1', name: 'keräkaali', note: 'noin 1,5 kg' },
          { amount: '400 g', name: 'jauhelihaa', note: 'sika-nauta' },
          { amount: '1 dl', name: 'puuroriisiä' },
          { amount: '1', name: 'sipuli' },
          { amount: '1 tl', name: 'suolaa' },
          { amount: '0,5 tl', name: 'mustapippuria' },
        ],
      },
      {
        name: 'Pinnalle',
        ingredients: [
          { amount: '2 rkl', name: 'siirappia' },
          { amount: '2 rkl', name: 'voita' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Keitä riisi puolikypsäksi.',
          'Irrota kaalinlehdet ja kiehauta niitä suolalla maustetussa vedessä, kunnes ne taipuvat.',
          'Sekoita jauheliha, riisi, hienonnettu sipuli ja mausteet.',
          'Kääri täyte lehtien sisään ja asettele kääryleet uunivuokaan.',
          'Valuta pinnalle siirappia ja nokare voita. Paista 200 asteessa noin 1,5 tuntia. Valele välillä.',
        ],
      },
    ],
  },
  {
    title: 'Korvapuustit',
    servings: '1 pelti (24 kpl)',
    activeMinutes: 45,
    totalMinutes: 120,
    tags: ['leivonta'],
    ingredientGroups: [
      {
        name: 'Taikina',
        ingredients: [
          { amount: '5 dl', name: 'maitoa' },
          { amount: '50 g', name: 'hiivaa' },
          { amount: '2 dl', name: 'sokeria' },
          { amount: '1 rkl', name: 'kardemummaa', note: 'vastajauhettu' },
          { amount: '1 tl', name: 'suolaa' },
          { amount: '1', name: 'kananmuna' },
          { amount: 'noin 14 dl', name: 'vehnäjauhoja' },
          { amount: '200 g', name: 'voita', note: 'huoneenlämpöinen' },
        ],
      },
      {
        name: 'Täyte ja pinta',
        ingredients: [
          { amount: '100 g', name: 'voita' },
          { amount: '1 dl', name: 'sokeria' },
          { amount: '1 rkl', name: 'kanelia' },
          { amount: '1', name: 'kananmuna', note: 'voiteluun' },
          { name: 'raesokeria' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Liuota hiiva kädenlämpöiseen maitoon. Lisää sokeri, kardemumma, suola ja muna.',
          'Lisää jauhot vähitellen ja vaivaa. Lisää voi lopuksi ja vaivaa kimmoisaksi.',
          'Kohota liinan alla noin 45 minuuttia.',
          'Kauli taikina levyksi, levitä täyte ja kääri rullaksi. Leikkaa kolmiomaisiksi paloiksi.',
          'Kohota pellillä 30 minuuttia. Voitele munalla ja ripottele raesokeria.',
          'Paista 225 asteessa 10–12 minuuttia.',
        ],
      },
    ],
  },
  {
    title: 'Hernekeitto',
    description: 'Torstain perinne. Pannukakku jälkiruoaksi.',
    servings: '6–8 annosta',
    activeMinutes: 20,
    totalMinutes: 180,
    tags: ['keitto', 'perinne'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '500 g', name: 'kuivattuja herneitä', note: 'liota yön yli' },
          { amount: '2 l', name: 'vettä' },
          { amount: '500 g', name: 'savulapaa' },
          { amount: '1', name: 'sipuli' },
          { amount: '1 tl', name: 'meiramia' },
          { name: 'suolaa' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Huuhdo liotetut herneet ja kiehauta ne vedessä. Kuori vaahto pois.',
          'Lisää liha ja sipuli. Keitä miedolla lämmöllä 2,5–3 tuntia.',
          'Nosta liha pois, leikkaa paloiksi ja palauta keittoon.',
          'Mausta meiramilla ja suolalla. Tarjoa sinapin kanssa.',
        ],
      },
    ],
  },
  {
    title: 'Makaronilaatikko',
    servings: '6 annosta',
    activeMinutes: 15,
    totalMinutes: 60,
    tags: ['arki'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '400 g', name: 'makaronia' },
          { amount: '400 g', name: 'jauhelihaa' },
          { amount: '1', name: 'sipuli' },
          { amount: '3', name: 'kananmunaa' },
          { amount: '7 dl', name: 'maitoa' },
          { amount: '1,5 tl', name: 'suolaa' },
          { amount: '1 dl', name: 'juustoraastetta' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Keitä makaronit pakkauksen ohjeen mukaan.',
          'Ruskista jauheliha ja sipuli. Mausta suolalla.',
          'Sekoita makaronit ja jauheliha voideltuun uunivuokaan.',
          'Vatkaa munat ja maito ja kaada vuokaan. Ripottele pinnalle juustoraaste.',
          'Paista 200 asteessa noin 45 minuuttia.',
        ],
      },
    ],
  },
  {
    title: 'Kantarellikastike',
    description: 'Syksyn paras kastike. Tarjoa uusien perunoiden kanssa.',
    servings: '4 annosta',
    activeMinutes: 25,
    totalMinutes: 25,
    tags: ['kasvis', 'arki'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '1 l', name: 'kantarelleja', note: 'tuoreita' },
          { amount: '1', name: 'salottisipuli' },
          { amount: '2 rkl', name: 'voita' },
          { amount: '2 dl', name: 'kuohukermaa' },
          { name: 'suolaa' },
          { name: 'mustapippuria' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Puhdista ja paloittele sienet.',
          'Kuumenna sienet kuivalla pannulla, kunnes neste on haihtunut.',
          'Lisää voi ja hienonnettu sipuli ja paista muutama minuutti.',
          'Lisää kerma ja hauduta, kunnes kastike sakenee. Mausta.',
        ],
      },
    ],
  },
  {
    title: 'Joulutortut',
    servings: 'noin 30 kpl',
    activeMinutes: 30,
    totalMinutes: 60,
    tags: ['joulu', 'leivonta', 'jälkiruoka'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '1 kg', name: 'voitaikinaa', note: 'pakaste, sulatettuna' },
          { amount: '300 g', name: 'luumuhilloa' },
          { amount: '1', name: 'kananmuna', note: 'voiteluun' },
          { name: 'tomusokeria' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Kauli taikina ja leikkaa noin 8 cm:n neliöiksi.',
          'Tee kulmiin viillot kohti keskustaa ja nostele hilloa keskelle.',
          'Taita joka toinen kärki keskelle tähdeksi.',
          'Voitele munalla ja paista 225 asteessa noin 10 minuuttia.',
          'Siivilöi jäähtyneiden torttujen päälle tomusokeria.',
        ],
      },
    ],
  },
  {
    title: 'Rosolli',
    servings: '8 annosta',
    activeMinutes: 40,
    totalMinutes: 40,
    tags: ['joulu', 'kasvis'],
    ingredientGroups: [
      {
        name: 'Salaatti',
        ingredients: [
          { amount: '4', name: 'keitettyä punajuurta' },
          { amount: '3', name: 'keitettyä porkkanaa' },
          { amount: '3', name: 'keitettyä perunaa' },
          { amount: '1', name: 'suolakurkku' },
          { amount: '1', name: 'omena' },
          { amount: '1', name: 'sipuli' },
        ],
      },
      {
        name: 'Kastike',
        ingredients: [
          { amount: '2 dl', name: 'kuohukermaa' },
          { amount: '1 rkl', name: 'punajuuren keitinlientä' },
          { amount: '1 tl', name: 'sokeria' },
          { amount: '1 rkl', name: 'etikkaa' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Kuutioi kasvikset, kurkku ja omena pieniksi. Hienonna sipuli.',
          'Asettele aineet vadille riveihin tai sekoita kulhossa.',
          'Vaahdota kerma ja mausta se punajuuren liemellä, sokerilla ja etikalla.',
          'Tarjoa kastike erikseen.',
        ],
      },
    ],
  },
  {
    title: 'Uunilohi',
    description: 'Helppo arkiruoka. Valmistuu, kun perunat kiehuvat.',
    servings: '4 annosta',
    activeMinutes: 10,
    totalMinutes: 35,
    tags: ['kala', 'arki'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '600 g', name: 'lohifilettä' },
          { amount: '1', name: 'sitruuna' },
          { amount: '1 tl', name: 'suolaa' },
          { amount: '1 rkl', name: 'oliiviöljyä' },
          { name: 'tilliä' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Asettele lohi uunivuokaan nahkapuoli alaspäin.',
          'Mausta suolalla, sitruunankuorella ja tillillä. Valuta päälle öljy.',
          'Paista 200 asteessa 20–25 minuuttia, kunnes kala irtoaa lohkoiksi.',
        ],
      },
    ],
  },
  {
    title: 'Pannukakku',
    description: 'Uunipannukakku hernekeiton jälkiruoaksi.',
    servings: '1 pelti',
    activeMinutes: 10,
    totalMinutes: 40,
    tags: ['jälkiruoka', 'perinne'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '1 l', name: 'maitoa' },
          { amount: '4', name: 'kananmunaa' },
          { amount: '4 dl', name: 'vehnäjauhoja' },
          { amount: '0,5 dl', name: 'sokeria' },
          { amount: '1 tl', name: 'suolaa' },
          { amount: '50 g', name: 'voita' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Vatkaa munat ja maito. Lisää jauhot, sokeri ja suola. Anna turvota 15 minuuttia.',
          'Sulata voi uunipellillä uunissa ja kaada taikina pellille.',
          'Paista 225 asteessa noin 25 minuuttia.',
        ],
      },
    ],
  },
  {
    title: 'Kasvissosekeitto',
    servings: '4 annosta',
    totalMinutes: 40,
    tags: ['keitto', 'kasvis'],
    ingredientGroups: [
      {
        name: null,
        ingredients: [
          { amount: '500 g', name: 'kukkakaalia' },
          { amount: '2', name: 'porkkanaa' },
          { amount: '2', name: 'perunaa' },
          { amount: '1', name: 'sipuli' },
          { amount: '1 l', name: 'kasvislientä' },
          { amount: '1 dl', name: 'ruokakermaa' },
        ],
      },
    ],
    stepGroups: [
      {
        name: null,
        steps: [
          'Paloittele kasvikset ja keitä ne liemessä pehmeiksi.',
          'Soseuta sauvasekoittimella ja lisää kerma.',
          'Mausta suolalla ja pippurilla.',
        ],
      },
    ],
  },
];
