// utils/requisition.sample.js
// Sample mock data + expected output — run with: node utils/requisition.sample.js

const {
  calculateTotalPax,
  generateRecipeWiseBreakdown,
  consolidateIngredients,
} = require('./requisition');

// ─── Mock data ────────────────────────────────────────────────────────────────

const recipes = [
  {
    id: 'recipe-001',
    name: 'Veg Pulao',
    standardPax: 100,
    ingredients: [
      { ingredientId: 'ing-001', ingredientName: 'Basmati Rice',   quantity: 10,  uom: 'kg'  },
      { ingredientId: 'ing-002', ingredientName: 'Onion',          quantity: 5,   uom: 'kg'  },
      { ingredientId: 'ing-003', ingredientName: 'Refined Oil',    quantity: 2,   uom: 'ltr' },
    ],
  },
  {
    id: 'recipe-002',
    name: 'Poha',
    standardPax: 50,
    ingredients: [
      { ingredientId: 'ing-004', ingredientName: 'Poha (Flattened Rice)', quantity: 8,  uom: 'kg'  },
      { ingredientId: 'ing-002', ingredientName: 'Onion',                 quantity: 3,  uom: 'kg'  }, // <-- overlaps with recipe-001
      { ingredientId: 'ing-003', ingredientName: 'Refined Oil',           quantity: 1,  uom: 'ltr' }, // <-- overlaps with recipe-001
    ],
  },
];

const paxEntries = [
  {
    recipeId:   'recipe-001',
    recipeName: 'Veg Pulao',
    enteredPax: 200,           // scaleFactor = 200/100 = 2.0
    date:       '2026-04-06',
    mealType:   'LUNCH',
    unitName:   'Capgemini',
  },
  {
    recipeId:   'recipe-002',
    recipeName: 'Poha',
    enteredPax: 150,           // scaleFactor = 150/50 = 3.0
    date:       '2026-04-06',
    mealType:   'BREAKFAST',
    unitName:   'Infosys',
  },
];

// ─── Run calculations ─────────────────────────────────────────────────────────

const totalPax             = calculateTotalPax(paxEntries);          // 350
const recipeBreakdown      = generateRecipeWiseBreakdown(paxEntries, recipes);
const consolidatedIngredients = consolidateIngredients(recipeBreakdown);

// ─── Expected JSON output ─────────────────────────────────────────────────────

const expectedOutput = {
  totalPax: 350,

  recipeBreakdown: [
    {
      recipeId:    'recipe-001',
      recipeName:  'Veg Pulao',
      date:        '2026-04-06',
      mealType:    'LUNCH',
      unitName:    'Capgemini',
      enteredPax:  200,
      standardPax: 100,
      scaleFactor: 2,
      scaledIngredients: [
        { ingredientId: 'ing-001', ingredientName: 'Basmati Rice', uom: 'kg',  scaledQty: 20   },
        { ingredientId: 'ing-002', ingredientName: 'Onion',        uom: 'kg',  scaledQty: 10   },
        { ingredientId: 'ing-003', ingredientName: 'Refined Oil',  uom: 'ltr', scaledQty: 4    },
      ],
    },
    {
      recipeId:    'recipe-002',
      recipeName:  'Poha',
      date:        '2026-04-06',
      mealType:    'BREAKFAST',
      unitName:    'Infosys',
      enteredPax:  150,
      standardPax: 50,
      scaleFactor: 3,
      scaledIngredients: [
        { ingredientId: 'ing-004', ingredientName: 'Poha (Flattened Rice)', uom: 'kg',  scaledQty: 24 },
        { ingredientId: 'ing-002', ingredientName: 'Onion',                 uom: 'kg',  scaledQty: 9  },
        { ingredientId: 'ing-003', ingredientName: 'Refined Oil',           uom: 'ltr', scaledQty: 3  },
      ],
    },
  ],

  consolidatedIngredients: [
    // sorted alphabetically; overlapping ing-002 + ing-003 are summed
    { ingredientId: 'ing-001', ingredientName: 'Basmati Rice',          uom: 'kg',  totalQty: 20 },
    { ingredientId: 'ing-002', ingredientName: 'Onion',                 uom: 'kg',  totalQty: 19 }, // 10 + 9
    { ingredientId: 'ing-004', ingredientName: 'Poha (Flattened Rice)', uom: 'kg',  totalQty: 24 },
    { ingredientId: 'ing-003', ingredientName: 'Refined Oil',           uom: 'ltr', totalQty: 7  }, // 4 + 3
  ],
};

// ─── Verify ──────────────────────────────────────────────────────────────────

console.log('=== ACTUAL OUTPUT ===');
console.log(JSON.stringify({ totalPax, recipeBreakdown, consolidatedIngredients }, null, 2));

console.log('\n=== EXPECTED OUTPUT ===');
console.log(JSON.stringify(expectedOutput, null, 2));

console.log('\n=== CHECKS ===');
console.log('totalPax match         :', totalPax === expectedOutput.totalPax);
console.log('Onion consolidated     :', consolidatedIngredients.find(i => i.ingredientId === 'ing-002')?.totalQty === 19);
console.log('Refined Oil consolidated:', consolidatedIngredients.find(i => i.ingredientId === 'ing-003')?.totalQty === 7);
