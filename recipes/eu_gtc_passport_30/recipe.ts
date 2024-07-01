import { Recipe, graphql } from "../../lib";

const recipe: Recipe = {
  name: "eu_gtc_passport_30",
  queries: [
    {
      endpoint: "https://optimism.easscan.org/graphql",
      query: graphql(`
        query PassportQuery($where: AttestationWhereInput, $take: Int) {
          attestations(where: $where, take: $take) {
            decodedDataJson
          }
        }
      `),
      variables: {
        where: {
          schemaId: {
            equals:
              "0x6ab5d34260fca0cfcf0e76e96d439cace6aa7c3c019d7c4580ed52c6845e9c89",
          },
          recipient: {
            equals: "{user_eth_address}",
            mode: "insensitive",
          },
        },
        take: 1,
      },
    },
    {
      endpoint: "https://base.easscan.org/graphql",
      query: graphql(`
        query CountryQuery($where: AttestationWhereInput, $take: Int) {
          attestations(where: $where, take: $take) {
            decodedDataJson
          }
        }
      `),
      variables: {
        where: {
          schemaId: {
            equals:
              "0x1801901fabd0e6189356b4fb52bb0ab855276d84f7ec140839fbd1f6801ca065",
          },
          recipient: {
            equals: "{user_eth_address}",
            mode: "insensitive",
          },
        },
        take: 1,
      },
    },
  ],
  schema: "bool eu_gtc_passport_30",
  resolver: "0x0000000000000000000000000000000000000000",
  revokable: false,
};

export default recipe;
