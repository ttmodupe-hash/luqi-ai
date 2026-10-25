// Operator-only, local aggregate comparison. No provider or database requests.
import {compareProviderCosts} from "./provider-cost-review.mjs";
async function run() {
  try {
    if(process.argv.length!==2 || process.stdin.isTTY) throw Error("STDIN_REQUIRED");
    let content="";
    for await(const chunk of process.stdin) {
      content+=chunk.toString("utf8");
      if(Buffer.byteLength(content)>16384) throw Error("OVERSIZE");
    }
    const result=compareProviderCosts(JSON.parse(content));
    process.stdout.write(JSON.stringify(result,null,2)+"\n");
    if(result.status==="CAP_REVIEW_REQUIRED") process.exitCode=2;
    else if(result.status!=="OPERATOR_COMPARISON_ONLY") process.exitCode=3;
  } catch {
    // No echo of input, file path or billing values on failure.
    process.stderr.write("Invalid or insufficient aggregate review input.\n");
    process.exitCode=1;
  }
}
await run();
