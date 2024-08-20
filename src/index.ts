import {
  SchemaEncoder,
  SchemaItem,
} from "@ethereum-attestation-service/eas-sdk";
import { solidityPackedKeccak256 } from "ethers";
import { z } from "zod";

// SDK requests are proxied through the cloudflare caching worker to ensure
// consistent results with the smart contract canister
const CATTS_GQL_PROXY_URL = "https://query.catts.run";

/**
 * Zod schema for query variables. Defines the shape of query variables to be used
 * in GraphQL queries.
 */
export const queryVariablesSchema: z.ZodTypeAny = z.lazy(() =>
  z.record(z.union([queryVariablesSchema, z.string(), z.number()]))
);

/**
 * Defines the shape of query variables to be used in GraphQL queries.
 */
export type QueryVariables = z.infer<typeof queryVariablesSchema>;

// Custom validation function for the name
const validateRecipeName = (val: string) => {
  if (val.startsWith("-") || val.endsWith("-")) {
    return false;
  }
  if (/^\d/.test(val)) {
    return false;
  }
  return /^[a-z0-9-]+$/.test(val);
};

// Custom validation function for keywords
const validateKeyword = (keyword: string) => {
  return /^[a-z0-9-]+$/.test(keyword);
};

const toString = z.preprocess((input) => {
  if (typeof input === "object") {
    return JSON.stringify(input);
  }
  throw new Error("Expected 'variables' to be an object");
}, z.string());

/**
 * Zod schema for query variables. Defines the components of a GraphQL query,
 * including endpoint and variables.
 */
export const querySchema = z
  .object({
    url: z
      .string()
      .min(1, { message: "Endpoint must be at least 1 character long" })
      .max(255, { message: "Endpoint must be at most 255 characters long" }),

    filter: z.string().optional().nullable(),

    headers: z.any().optional().nullable(),

    body: z
      .object({
        query: z
          .string()
          .min(1, { message: "Query must be at least 1 character long" })
          .max(1024, { message: "Query must be at most 1024 characters long" }),

        variables: z.any(),
      })
      .optional()
      .nullable(),
  })
  .strict();

/**
 * Defines the components of a GraphQL query, including endpoint and variables.
 */
export type Query = z.infer<typeof querySchema>;

/**
 * Zod schema for an array of queries.
 */
export const queriesSchema = z.array(querySchema);

/**
 * An array of queries.
 */
export type Queries = z.infer<typeof queriesSchema>;

/**
 * Zod schema for a recipe. Defines the structure of a recipe, including queries
 * and output schema.
 */
export const recipeSchema = z
  .object({
    // Name validation
    name: z
      .string()
      .min(3, { message: "Name must be at least 3 characters long" })
      .max(50, { message: "Name must be at most 50 characters long" })
      .refine((val) => validateRecipeName(val), {
        message:
          "Name must be lowercase, alphanumeric, may contain hyphens, must not start or end with a hyphen, and must not start with a digit",
      }),

    // Description validation
    description: z
      .string()
      .min(3, { message: "Description must be at least 3 characters long" })
      .max(160, { message: "Description must be at most 160 characters long" })
      .optional(),

    // Keywords validation
    keywords: z
      .array(
        z
          .string()
          .min(3, {
            message: "Each keyword must be at least 3 characters long",
          })
          .max(50, {
            message: "Each keyword must be at most 50 characters long",
          })
          .refine((keyword) => validateKeyword(keyword), {
            message:
              "Each keyword must be lowercase, alphanumeric, and may contain hyphens",
          })
      )
      .optional()
      .refine((keywords) => keywords && keywords.length > 0, {
        message: "Keywords must not be empty",
        path: ["keywords"], // Specify the path for the error message
      }),

    // Queries validation
    queries: z.array(querySchema),

    // Schema validation (length constraints)
    schema: z
      .string()
      .min(1, { message: "Schema must be at least 1 character long" })
      .max(512, { message: "Schema must be at most 512 characters long" }),

    // Resolver validation (length constraint, exactly 42 characters)
    resolver: z
      .string()
      .length(42, { message: "Resolver must be exactly 42 characters long" }),

    // Revokable validation
    revokable: z.boolean().refine((val) => val === false, {
      message:
        "'revokable' should be false, revokable attestations are not yet supported",
    }),
  })
  .strict();

/**
 * Defines the structure of a recipe, including queries and output schema.
 */
export type Recipe = z.infer<typeof recipeSchema>;

// Define the basic schema value types
const schemaValueBase = z.union([
  z.string(),
  z.boolean(),
  z.number(),
  z.bigint(),
]);

// Define the more complex schema value types
const schemaValueComplex = z.union([
  z.record(z.unknown()), // Record<string, unknown>
  z.array(z.record(z.unknown())), // Record<string, unknown>[]
  z.array(z.unknown()), // unknown[]
]);

// Combine the base and complex schemas into a single SchemaValue schema
const SchemaValue = z.union([schemaValueBase, schemaValueComplex]);

// Define the SchemaItem schema
const SchemaItem = z
  .object({
    name: z.string(),
    type: z.string(),
    value: SchemaValue,
  })
  .strict();

export function parseRecipe(input: unknown): Recipe {
  return recipeSchema.parse(input);
}

function substitutePlaceholders(args: FetchQueryArgs): Query {
  const placeholders: { [key: string]: string } = {
    "{user_eth_address}":
      args.placeHolderValues?.userEthAddress ||
      "0x0000000000000000000000000000000000000000",
    "{user_eth_address_lowercase}":
      args.placeHolderValues?.userEthAddress?.toLowerCase() ||
      "0x0000000000000000000000000000000000000000",
  };

  let url = args.query.url;
  for (const [key, value] of Object.entries(placeholders)) {
    url = url.split(key).join(value);
  }

  let query = {
    ...args.query,
    url,
  };

  if (args.query.filter) {
    let filter = args.query.filter;
    for (const [key, value] of Object.entries(placeholders)) {
      filter = filter.split(key).join(value);
    }
    query = {
      ...query,
      filter,
    };
  }

  if (args.query.headers) {
    let headers = JSON.stringify(args.query.headers);
    for (const [key, value] of Object.entries(placeholders)) {
      headers = headers.split(key).join(value);
    }
    query = {
      ...query,
      headers: JSON.parse(headers),
    };
  }

  if (args.query.body?.variables) {
    let variables = JSON.stringify(args.query.body.variables);
    for (const [key, value] of Object.entries(placeholders)) {
      variables = variables.split(key).join(value);
    }
    query = {
      ...query,
      body: {
        ...args.query.body,
        variables: JSON.parse(variables),
      },
    };
  }

  return query;
}

type FetchQueryArgs = {
  query: Query;
  cacheKey?: string;
  placeHolderValues?: {
    userEthAddress?: string;
  };
  proxyUrl?: string;
  verbose?: boolean;
};

/**
 * Fetches the result of a query from the GraphQl endpoint specified in the query.
 *
 * @returns The result of the query in JSON format.
 */

export async function fetchQuery(args: FetchQueryArgs) {
  const query = substitutePlaceholders(args);

  let proxyUrl = args?.proxyUrl || CATTS_GQL_PROXY_URL;

  const cacheKey =
    args?.cacheKey || Math.random().toString(36).substring(2, 15);

  proxyUrl = `${proxyUrl}/${cacheKey}`;

  const options = {
    method: "POST",
    body: JSON.stringify(query),
  };

  if (args?.verbose) {
    console.log("Query:", query);
  }

  const response = await fetch(proxyUrl, options);

  if (args?.verbose) {
    console.log("Response status:", response.status);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch query from ${proxyUrl}`);
  }

  return response.json();
}

/**
 * Validates that the processor result matches the output schema specified in the recipe.
 *
 * @param processorResult The raw result of the processor script as a string.
 *
 * @returns The result of the processor script in JSON format. On success, the output should  match outputSchema specified in the recipe.
 */
export async function validateProcessorResult({
  processorResult,
}: {
  processorResult: string;
}): Promise<SchemaItem[]> {
  if (typeof processorResult !== "string") {
    throw new Error("Processor result must be a string");
  }

  const json = JSON.parse(processorResult);

  if (!Array.isArray(json)) {
    throw new Error("Processor result must be an array");
  }

  if (json.length === 0) {
    throw new Error("Processor returned an empty array");
  }

  let schemaItems: SchemaItem[];
  try {
    schemaItems = json.map((item: any) => SchemaItem.parse(item));
  } catch (error) {
    throw new Error("Invalid processor result");
  }

  return schemaItems;
}

/**
 * Validates that an array of schema items matches what is expected by the schema.
 */
export async function validateSchemaItems({
  schemaItems,
  schema,
}: {
  schemaItems: SchemaItem[];
  schema: string;
}) {
  const schemaEncoder = new SchemaEncoder(schema);
  return schemaEncoder.encodeData(schemaItems);
}

/**
 * An EAS schema UID is a hash of the schema, resolver and revokable flag.
 */
export function getSchemaUid({
  schema,
  resolver,
  revokable,
}: {
  schema: string;
  resolver: string;
  revokable: boolean;
}) {
  return solidityPackedKeccak256(
    ["string", "address", "bool"],
    [schema, resolver, revokable]
  );
}
