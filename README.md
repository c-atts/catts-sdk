# C–ATTS SDK

This SDK facilitates the local development of C–ATTS recipes. It provides a set of functions for fetching query results, running processor scripts, and validating schema items against a recipe's schema. The SDK also provides a command-line tool for running recipes. Using the command-line tool is the recommended way to develop and test recipes.

> [!NOTE]  
> The SDK is a work in progress. Features and functionality may change without notice. C–ATTS has not yet been publicly released, so the SDK is not yet ready for general use.

## Installation

Install the package globally to be able to use the `catts` command-line tool.

```bash
npm install -g catts-sdk
```

## CLI Usage

### Querying

To fetch query results from a recipe, use the `query` command:

```bash
catts query <recipeFolder>
```

The `query` command will fetch the query results from the specified recipe and print them to the console. You can optionally specify the index of the query to run:

```bash
catts query <recipeFolder> -i <index>
```

### Running

To run a recipe, use the `run` command:

```bash
catts run <recipeFolder>
```

The `run` command will fetch the query results from the specified recipe, run the processor script, validate the schema items against the recipe's schema, and print the results to the console.

### Customizing the user address

The CLI needs to know a user address to fetch query results. By default, the SDK uses the `USER_ETH_ADDRESS` environment variable to fetch query results. If you want to use a different address, you can pass the `-e` or `--eth-address` option to the `query` or `run` commands. Alternatively, you can create a `.env` file in the root of your project with the `USER_ETH_ADDRESS` variable set to the desired address.

```bash
catts query <recipeFolder> -e <address>
catts run <recipeFolder> -e <address>
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any suggestions or improvements.

