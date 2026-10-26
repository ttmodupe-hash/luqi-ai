#!/usr/bin/env node
/** Operator-only local stdin parser: never fetches, edits or prints supplied evidence. */
import { inspectP0Evidence } from "./p0-operator-handoff.mjs";
async function main(){
 try{
  if(process.argv.length!==2||process.stdin.isTTY)throw Error("STDIN_REQUIRED");
  const chunks=[];let size=0;
  for await(const chunk of process.stdin){
    size+=Buffer.byteLength(chunk);
    if(size>12*1024)throw Error("INPUT_TOO_LARGE");
    chunks.push(chunk);
  }
  const result=inspectP0Evidence(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
  process.exitCode=result.status==="HUMAN_SIGNOFF_REQUIRED"?0:2;
 }catch{
  // No echo of private reference, path, account, invoice, or credential.
  process.stderr.write("Invalid or unsafe redacted operator-evidence packet.\n");
  process.exitCode=1;
 }
}
await main();
