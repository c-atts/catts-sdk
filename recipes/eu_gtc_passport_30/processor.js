const EU_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

if (!queryResult[0].attestations[0]) {
  throw new Error("Couldn't find a Gitcoin Passport score for this address.");
}

if (!queryResult[1].attestations[0]) {
  throw new Error("Couldn't find country of residence for this address.");
}

const scoreHex = JSON.parse(queryResult[0].attestations[0].decodedDataJson)[0]
  .value.value.hex;
const score = BigInt(scoreHex);
const requiredScore = BigInt("30000000000000000000");
const country = JSON.parse(queryResult[1].attestations[0].decodedDataJson)[0]
  .value.value;
const eligible = EU_COUNTRIES.includes(country) && score >= requiredScore;

if (!eligible) throw new Error("Not eligible for eu_gtc_passport_30");

return JSON.stringify([
  { name: "eu_gtc_passport_30", type: "bool", value: true },
]);
