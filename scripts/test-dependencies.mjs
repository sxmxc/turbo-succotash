import { composeArgs, docker } from "./compose.mjs";
function probe(service, port, expected) {
  const code = `for(const [path,status] of [['/healthz',200],['/readyz',${expected}]]){const r=await fetch('http://127.0.0.1:${port}'+path,{signal:AbortSignal.timeout(5000)});if(r.status!==status)throw new Error(path+': '+r.status+' expected '+status);}`;
  docker([
    ...composeArgs,
    "exec",
    "-T",
    service,
    "node",
    "--input-type=module",
    "-e",
    code,
  ]);
}
try {
  docker([...composeArgs, "stop", "postgres"]);
  for (const [service, port] of [
    ["identity", 3001],
    ["api", 3002],
    ["realtime", 3003],
  ])
    probe(service, port, 503);
} finally {
  docker([...composeArgs, "up", "-d", "--wait", "postgres"]);
}
for (const [service, port] of [
  ["identity", 3001],
  ["api", 3002],
  ["realtime", 3003],
])
  probe(service, port, 200);
console.log(
  "Dependency failure/recovery passed: all services stay live, become unready, then recover.",
);
