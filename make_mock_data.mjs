import { writeFileSync } from "node:fs";

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const d = (daysAgo, hour = 10) => new Date(now - daysAgo * day - (24 - hour) * 3600e3).toISOString();

const L = (kind, address, city, zip, price, beds, baths, sqft, year, type, daysAgo, lot = null) => ({
  id: `mock-${address.replace(/\W+/g, "-")}`,
  kind, address: `${address}, ${city}, CA ${zip}`, city, state: "CA", zip,
  price, bedrooms: beds, bathrooms: baths, squareFootage: sqft, lotSize: lot,
  yearBuilt: year, propertyType: type, listedDate: d(daysAgo),
  daysOnMarket: daysAgo, status: "Active",
});

const listings = [
  L("sale", "742 Bryant St", "Palo Alto", "94301", 2850000, 4, 3, 2240, 1932, "Single Family", 0, 6200),
  L("sale", "118 Camellia Way", "Mountain View", "94043", 1620000, 3, 2, 1480, 1968, "Single Family", 1, 5400),
  L("sale", "2205 Shoreline Ct", "San Mateo", "94404", 1180000, 2, 2, 1210, 1988, "Condo", 1),
  L("sale", "3417 Maplewood Ave", "San Jose", "95117", 1385000, 3, 2, 1560, 1961, "Single Family", 2, 6000),
  L("sale", "870 Vermont St", "San Francisco", "94107", 1495000, 3, 2, 1690, 1908, "Townhouse", 3),
  L("sale", "5562 Lawton Ave", "Oakland", "94618", 1240000, 3, 1.5, 1710, 1915, "Single Family", 4, 4300),
  L("sale", "1919 Addison St", "Berkeley", "94704", 998000, 2, 1, 1120, 1924, "Condo", 5),
  L("sale", "44210 Glendora Dr", "Fremont", "94539", 1890000, 4, 3, 2380, 1979, "Single Family", 6, 8100),
  L("rental", "455 Forest Ave, Apt 3", "Palo Alto", "94301", 3450, 2, 1, 940, 1962, "Apartment", 0),
  L("rental", "101 San Antonio Rd, Unit 812", "Mountain View", "94040", 3980, 2, 2, 1105, 2016, "Apartment", 1),
  L("rental", "228 Grand Ave", "Oakland", "94610", 2650, 1, 1, 720, 1928, "Apartment", 2),
  L("rental", "77 Bluxome St, Unit 415", "San Francisco", "94107", 3720, 1, 1, 810, 2004, "Condo", 2),
  L("rental", "1560 Jackson St", "San Jose", "95112", 3100, 3, 2, 1350, 1955, "Single Family", 3),
  L("rental", "615 Arballo Dr", "San Francisco", "94132", 4550, 3, 2, 1440, 1972, "Townhouse", 4),
  L("rental", "39600 Fremont Blvd, Apt 210", "Fremont", "94538", 2480, 1, 1, 690, 1998, "Apartment", 5),
  L("rental", "2728 Milvia St", "Berkeley", "94703", 2890, 2, 1, 860, 1940, "Apartment", 6),
];

writeFileSync("data/listings.json", JSON.stringify({
  mock: true,
  updatedAt: new Date().toISOString(),
  search: { latitude: 37.55, longitude: -122.15, radius: 30 },
  daysOld: 7,
  count: listings.length,
  listings,
}, null, 2));
console.log(`Wrote ${listings.length} mock listings`);
