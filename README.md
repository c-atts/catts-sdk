# C–ATTS SDK

This SDK simplifies the development of C–ATTS recipes. It provides a set of functions for fetching query results, running processor scripts, and validating schema items against a recipe's schema.

When developing recipes, most likey you will want to use the pre-packaged `catts` CLI tool instead of this SDK. The tool fetches query results, runs processor scripts, and validates schema items against the recipe's schema. You can find the CLI tool here: [catts-cli](https://github.com/c-atts/catts-cli).

> [!NOTE]
> The SDK is a work in progress. Features and functionality may change without notice. C–ATTS has not yet been publicly released, so the SDK is not yet ready for general use.

For some examples of recipes, see the [catts-recipes](https://github.com/c-atts/catts-recipes) repository.

## What is C–ATTS?

C–ATTS, or Composite Attestations, is a new type of attestation that combines data from multiple sources to form a unified and verifiable credential.

To learn more, see the [C–ATTS website](https://catts.run).

## Installation

```bash
npm i catts-sdk
```

## Usage

## Usage

### `parseRecipe(input: unknown): Recipe`

- **Description**: Parses the provided input to ensure it matches the expected recipe structure.
- **Parameters**:
  - `input` (unknown): The input to be parsed.
- **Returns**: `Recipe` object if the input is valid.

### `fetchQuery(query: Query): Promise<any>`

- **Description**: Fetches the result of a GraphQL query from the specified endpoint.
- **Parameters**:
  - `query` (Query): The GraphQL query, including endpoint, query string, and variables.
- **Returns**: The result of the query in JSON format.

### `runProcessor({ processor, queryResults }: { processor: string, queryResults: any }): Promise<string>`

- **Description**: Executes a processor script against query results and returns the raw result.
- **Parameters**:
  - `processor` (string): The processor JavaScript code to be executed.
  - `queryResults` (any): An array of query results in JSON format.
- **Returns**: The raw result of the processor script as a string.

### `validateProcessorResult({ processorResult }: { processorResult: string }): Promise<SchemaItem[]>`

- **Description**: Validates that the processor result matches the expected output schema specified in the recipe.
- **Parameters**:
  - `processorResult` (string): The raw result of the processor script as a string.
- **Returns**: An array of `SchemaItem` objects if the processor result is valid.

### `validateSchemaItems({ schemaItems, recipe }: { schemaItems: SchemaItem[], recipe: Recipe }): Promise<any>`

- **Description**: Validates that the schema items match the schema specified in the recipe.
- **Parameters**:
  - `schemaItems` (SchemaItem[]): An array of schema items to be validated.
  - `recipe` (Recipe): The recipe containing the schema to validate against.
- **Returns**: The result of the schema validation.

### `getSchemaUid({ schema, resolver, revokable }: { schema: string, resolver: string, revokable: boolean }): string`

- **Description**: Generates a unique schema UID by hashing the schema, resolver, and revokable flag.
- **Parameters**:
  - `schema` (string): The schema string.
  - `resolver` (string): The resolver address.
  - `revokable` (boolean): The revokable flag.
- **Returns**: A string representing the schema UID.

## Example

```typescript
import { fetchQuery, runProcessor, validateProcessorResult, validateSchemaItems, getSchemaUid } from 'catts-sdk';

// Example usage of fetchQuery
const query = {
  endpoint: 'https://api.example.com/graphql',
  query: `
    query ($id: ID!) {
      user(id: $id) {
        name
        email
      }
    }
  `,
  variables: { id: '12345' },
};

fetchQuery(query).then(result => console.log(result));

// Example usage of runProcessor
const processor = `
  return queryResult.map(user => ({
    name: user.name,
    email: user.email,
  }));
`;

runProcessor({ processor, queryResults: [{ name: 'John Doe', email: 'john.doe@example.com' }] })
  .then(result => console.log(result));

// Example usage of validateProcessorResult
const processorResult = '[{"name": "John Doe", "email": "john.doe@example.com"}]';
validateProcessorResult({ processorResult })
  .then(schemaItems => console.log(schemaItems));

// Example usage of getSchemaUid
const schemaUid = getSchemaUid({ schema: 'userSchema', resolver: '0x1234567890abcdef', revokable: true });
console.log(schemaUid);
```

## Author

- [kristofer@kristoferlund.se](mailto:kristofer@kristoferlund.se)
- Twitter: [@kristoferlund](https://twitter.com/kristoferlund)
- Discord: kristoferkristofer
- Telegram: [@kristoferkristofer](https://t.me/kristoferkristofer)

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any suggestions or improvements.
