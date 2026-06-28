import "dotenv/config";
import { Evolve } from "@evolvingmachines/sdk";

// Gateway mode: new Evolve() auto-resolves EVOLVE_API_KEY from .env.
// Model defaults to "opus"; override with .withAgent({ type: "claude", model: "sonnet" }).
const agent = new Evolve();

// Stream live output (text chunks, tool calls, results).
agent.on("content", (event) => console.log(event));

await agent.run({
  prompt: "Create hello.txt with the text 'Hello World'.",
});

// The agent writes results into the sandbox's output/ folder.
const output = await agent.getOutputFiles();
console.log("Output files:", Object.keys(output.files));

// Always tear down the sandbox.
await agent.kill();
