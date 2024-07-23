import {
  SchemaEncoder,
  SchemaItem,
} from "@ethereum-attestation-service/eas-sdk";
import { solidityPackedKeccak256 } from "ethers";
import { z } from "zod";

/**
 * Zod schema for query variables. Defines the shape of query variables to be used
 * in GraphQL queries.
 */
export const queryVariablesSchema: z.ZodTypeAny = z.lazy(() =>
  z.record(z.union([queryVariablesSchema, z.string(), z.number()])),
);

/**
 * Defines the shape of query variables to be used in GraphQL queries.
 */
export type QueryVariables = z.infer<typeof queryVariablesSchema>;

/**
 * Zod schema for query variables. Defines the components of a GraphQL query,
 * including endpoint and variables.
 */
export const querySchema = z.object({
  endpoint: z.string(),
  query: z.string(),
  variables: z.record(z.unknown()),
});

/**
 * Defines the components of a GraphQL query, including endpoint and variables.
 */
export type Query = z.infer<typeof querySchema>;

/**
 * Zod schema for a recipe. Defines the structure of a recipe, including queries
 * and output schema.
 */
export const recipeSchema = z.object({
  // Min length 3
  // Max length 50
  // Only alphanumeric characters and hyphens
  // Lowercase
  name: z
    .string()
    .min(3)
    .max(50)
    .refine((val) => /^[a-z0-9-]+$/.test(val), {
      message: "Name can only contain alphanumeric characters and hyphens",
    }),
  // Min length 3
  // Max length 50
  displayName: z.string().min(3).max(50).optional(),
  // Min length 3
  // Max length 160
  description: z.string().min(3).max(160).optional(),
  // Keyword min length 3
  // Keyword max length 50
  keywords: z.array(z.string().min(3).max(50)).optional(),
  queries: z.array(querySchema),
  schema: z.string(),
  resolver: z.string(),
  revokable: z.boolean(),
});

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
const SchemaItem = z.object({
  name: z.string(),
  type: z.string(),
  value: SchemaValue,
});

export function parseRecipe(input: unknown): Recipe {
  return recipeSchema.parse(input);
}

function substitutePlaceholders(variables: QueryVariables): QueryVariables {
  const placeholders: { [key: string]: string } = {
    "{user_eth_address}": process.env.USER_ETH_ADDRESS || "",
  };

  function replacePlaceholders(obj: QueryVariables): QueryVariables {
    return Object.entries(obj).reduce<QueryVariables>((acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = Object.entries(placeholders).reduce(
          (str, [placeholder, actualValue]) => {
            return str.replace(new RegExp(placeholder, "g"), actualValue);
          },
          value,
        );
      } else if (typeof value === "object" && value !== null) {
        acc[key] = replacePlaceholders(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  return replacePlaceholders(variables);
}

/**
 * Fetches the result of a query from the GraphQl endpoint specified in the query.
 *
 * @returns The result of the query in JSON format.
 */
export async function fetchQuery(query: Query) {
  try {
    const variables = substitutePlaceholders(query.variables);

    const response = await fetch(query.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: query.query, variables }),
    });

    return response.json();
  } catch (error) {
    return error;
  }
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
 * Validates that the schema items match the schema specified in the recipe.
 */
export async function validateSchemaItems({
  schemaItems,
  recipe,
}: {
  schemaItems: SchemaItem[];
  recipe: Recipe;
}) {
  const schemaEncoder = new SchemaEncoder(recipe.schema);
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
    [schema, resolver, revokable],
  );
}
