#!/usr/bin/env node

import "dotenv/config";

import * as fs from "fs";
import * as path from "path";

import {
  Recipe,
  fetchQuery,
  getSchemaUid,
  parseRecipe,
  runProcessor,
  validateProcessorResult,
  validateSchemaItems,
} from "./index";

import { Command } from "commander";

let verbose = false; // Variable to store verbose flag

async function importRecipe(recipeFolder: string): Promise<Recipe> {
  const recipePath = path.join(recipeFolder, "recipe.js");

  if (!fs.existsSync(recipePath)) {
    throw new Error(`Recipe file not found: ${recipePath}`);
  }

  const absolutePath = path.resolve(recipePath);
  const recipeImport = await import(absolutePath);
  return parseRecipe(recipeImport.default);
}

// Loads and wraps the processor script for execution in QuickJS VM.
async function loadProcessor(recipeFolder: string): Promise<string> {
  const processorPath = path.join(recipeFolder, "processor.js");
  return fs.promises.readFile(processorPath, "utf8");
}

// Unified error logging function.
function logError(error: unknown): void {
  if (typeof error === "object" && error !== null) {
    if ("name" in error) console.log(error.name);
    if ("message" in error) console.log(error.message);
    if (verbose && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(error);
  }
}

type QueryCommandOptions = {
  index?: number;
};

function write(text: string) {
  process.stdout.write(text);
}

function writeln(text: string) {
  process.stdout.write(text + "\n");
}

async function queryCommand(
  recipeFolder: string,
  options?: QueryCommandOptions
) {
  try {
    const recipe = await importRecipe(recipeFolder);
    console.log("\nRecipe:", recipe.name);

    let queryResults;
    if (options?.index !== undefined) {
      write(`\nRunning query with index: ${options.index} `);
      const query = recipe.queries[options.index];
      queryResults = await fetchQuery(query);
    } else {
      write("\nRunning all queries: ");
      const queryPromises = recipe.queries.map(fetchQuery);
      queryResults = await Promise.all(queryPromises);
    }

    writeln("✅\n");
    console.log(JSON.stringify(queryResults, null, 2));
  } catch (error) {
    console.log("\n🛑 Query failed");
    logError(error);
  }
}

async function runCommand(recipeFolder: string) {
  try {
    const recipe = await importRecipe(recipeFolder);
    console.log("\nRecipe:", recipe.name);

    write("\n1/4 Running graphql queries... ");
    const queryPromises = recipe.queries.map(fetchQuery);
    const queryResults = await Promise.all(queryPromises);
    writeln("✅");

    if (verbose) {
      writeln("\nQuery results:");
      writeln(JSON.stringify(queryResults, null, 2));
    }

    write("\n2/4 Running processor... ");
    const processor = await loadProcessor(recipeFolder);
    const processorResult = await runProcessor({
      processor,
      queryResults,
    });
    writeln("✅");

    if (verbose) {
      writeln("\nProcessor result:");
      writeln(processorResult);
    }

    write("\n3/4 Validating processor result... ");
    const schemaItems = await validateProcessorResult({
      processorResult,
    });
    writeln("✅");

    if (verbose) {
      writeln("\nSchema items:");
      writeln(JSON.stringify(schemaItems, null, 2));
      console.log("Schema:", recipe.schema);
      console.log(
        "Schema UID:",
        getSchemaUid({
          schema: recipe.schema,
          resolver: recipe.resolver,
          revokable: recipe.revokable,
        })
      );
    }

    write("\n4/4 Validating schema items against schema... ");
    const schema = await validateSchemaItems({
      schemaItems,
      recipe,
    });
    writeln("✅\n");

    console.log("💥 Done! Recipe is ready to be deployed.");
  } catch (error) {
    console.log("\n🛑 Run failed");
    logError(error);
  }
}

const program = new Command();
program
  .version("0.0.1")
  .name("catts")
  .description("Supports the development of C-ATTS recipes.")
  .option(
    "-e, --eth-address <address>",
    "Ethereum address to use for queries. Defaults to the value of the USER_ETH_ADDRESS environment variable."
  )
  .option("-v, --verbose", "Enable verbose output");

program.hook("preAction", async (thisCommand) => {
  // Set verbose flag
  verbose = thisCommand.opts().verbose;

  // If -e option is set, override process.env.USER_ETH_ADDRESS
  const ethAddressOption = thisCommand.opts().ethAddress;
  if (ethAddressOption) {
    process.env.USER_ETH_ADDRESS = ethAddressOption;
  }

  // Ensure USER_ETH_ADDRESS is set
  if (!process.env.USER_ETH_ADDRESS) {
    console.error(
      "Error: USER_ETH_ADDRESS needs to be set, either via the -e option or by creating a .env file with USER_ETH_ADDRESS set. Place the .env file in the root of the project."
    );
    process.exit(1);
  }
});

program
  .command("query")
  .argument("<recipeFolder>", "Path to the recipe folder.")
  .option(
    "-i, --index <index>",
    "Index of query to run. Omit to run all queries"
  )
  .description("Fetch the query results from the specified recipe.")
  .action(async (recipeFolder, options) => {
    await queryCommand(recipeFolder, options);
  });

program
  .command("run")
  .argument("<recipeFolder>", "Path to the recipe folder.")
  .description("Run the specified recipe.")
  .action(async (recipeFolder) => {
    await runCommand(recipeFolder);
  });

program.parse(process.argv);
