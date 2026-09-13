// Real payloads captured from Roblox's public catalog API
// (economy.roblox.com/v2/assets/{id}/details) for Snowy'sz community 370302186
// assets. They are used verbatim so the tracker is tested against the exact
// shape Roblox returns, including CollectiblesItemDetails.TotalQuantity.

const brownHairFieryHorns = {
  TargetId: 110236444124364,
  ProductType: 'Collectible Item',
  AssetId: 110236444124364,
  ProductId: 3712630282,
  Name: '[⏳CHEAP] Brown Hair + Fiery Horns Crown Clockwork',
  AssetTypeId: 41,
  Creator: { Id: 10200745682, Name: "Snowy'sz", CreatorType: 'Group', CreatorTargetId: 370302186 },
  PriceInRobux: 65,
  IsForSale: true,
  IsPublicDomain: false,
  IsLimited: false,
  IsLimitedUnique: true,
  Remaining: 2952,
  CollectibleItemId: '255def10-f3cc-40e7-b177-27e421e1f1bc',
  CollectiblesItemDetails: {
    CollectibleLowestResalePrice: null,
    IsForSale: true,
    TotalQuantity: 3000,
    IsLimited: true,
  },
};

const silverStarCrown = {
  TargetId: 127292656833623,
  ProductType: 'Collectible Item',
  AssetId: 127292656833623,
  ProductId: 3554788529,
  Name: 'Silver Star Crown',
  AssetTypeId: 8,
  Creator: { Id: 10200745682, Name: "Snowy'sz", CreatorType: 'Group', CreatorTargetId: 370302186 },
  PriceInRobux: 95,
  IsForSale: true,
  IsLimited: false,
  IsLimitedUnique: true,
  Remaining: 2864,
  CollectibleItemId: '6e50869e-0701-4988-aed8-0cae4b2bcd67',
  CollectiblesItemDetails: {
    CollectibleLowestResalePrice: 1000,
    IsForSale: true,
    TotalQuantity: 3000,
    IsLimited: true,
  },
};

// Limited 3,000-copy run that is fully sold out (Remaining 0, IsForSale false).
const soldOutDashie = {
  TargetId: 88969785096775,
  ProductType: 'Collectible Item',
  AssetId: 88969785096775,
  ProductId: 3535772287,
  Name: '-',
  AssetTypeId: 41,
  Creator: { Id: 10200745682, Name: "Snowy'sz", CreatorType: 'Group', CreatorTargetId: 370302186 },
  PriceInRobux: 1,
  IsForSale: false,
  IsLimited: false,
  IsLimitedUnique: true,
  Remaining: 0,
  CollectibleItemId: 'dcd0945a-3052-4ac0-8a2d-811aae6ec4f5',
  CollectiblesItemDetails: {
    CollectibleLowestResalePrice: 120,
    IsForSale: false,
    TotalQuantity: 3000,
    IsLimited: true,
  },
};

// Limited 3,000-copy run, sold out.
const soldOutClockworkShades = {
  TargetId: 128185863037271,
  ProductType: 'Collectible Item',
  AssetId: 128185863037271,
  ProductId: 3493443068,
  Name: 'Clockwork Shades',
  AssetTypeId: 42,
  Creator: { Id: 10200745682, Name: "Snowy'sz", CreatorType: 'Group', CreatorTargetId: 370302186 },
  PriceInRobux: 95,
  IsForSale: true,
  IsLimited: false,
  IsLimitedUnique: true,
  Remaining: 0,
  CollectibleItemId: '2c282bf9-b8a8-40dd-b95e-2ede6dcf22b5',
  CollectiblesItemDetails: {
    CollectibleLowestResalePrice: 400,
    IsForSale: true,
    TotalQuantity: 3000,
    IsLimited: true,
  },
};

// Normal (non-limited) UGC: no limited flag anywhere, TotalQuantity 0.
const nonLimitedRainbowHorns = {
  TargetId: 80550135091196,
  ProductType: 'Collectible Item',
  AssetId: 80550135091196,
  ProductId: 3605411430,
  Name: 'Animated Rainbow Horns',
  AssetTypeId: 8,
  Creator: { Id: 10200745682, Name: "Snowy'sz", CreatorType: 'Group', CreatorTargetId: 370302186 },
  PriceInRobux: 95,
  IsForSale: true,
  IsLimited: false,
  IsLimitedUnique: false,
  Remaining: 0,
  CollectibleItemId: 'd39d1258-c4d2-4f5b-a7c5-f52e9b250323',
  CollectiblesItemDetails: {
    CollectibleLowestResalePrice: null,
    IsForSale: true,
    TotalQuantity: 0,
    IsLimited: false,
  },
};

const nonLimitedTornadoHat = {
  ...nonLimitedRainbowHorns,
  TargetId: 137668363946214,
  AssetId: 137668363946214,
  ProductId: 3605410735,
  Name: 'Animated Rainbow Spiral Tornado Hat',
  CollectibleItemId: '1d07e14b-7173-45a0-9bfa-b151628bd6e8',
};

// API-shaped but synthetic: a limited run that is NOT 3,000 copies.
const smallRunLimited = {
  ...silverStarCrown,
  TargetId: 70000000000001,
  AssetId: 70000000000001,
  Name: 'Smaller Test Run Crown',
  Remaining: 120,
  CollectiblesItemDetails: { ...silverStarCrown.CollectiblesItemDetails, TotalQuantity: 2500 },
};

// Classic limited (pre-collectible shape): no CollectiblesItemDetails at all,
// so Roblox never reports a total print run.
const classicLimited = {
  TargetId: 1028606,
  ProductType: 'Limited Item',
  AssetId: 1028606,
  Name: 'Classic Sparkle Time Fedora',
  AssetTypeId: 8,
  PriceInRobux: null,
  IsForSale: false,
  IsLimited: true,
  IsLimitedUnique: false,
  Remaining: 12,
};

module.exports = {
  brownHairFieryHorns,
  silverStarCrown,
  soldOutDashie,
  soldOutClockworkShades,
  nonLimitedRainbowHorns,
  nonLimitedTornadoHat,
  smallRunLimited,
  classicLimited,
};
