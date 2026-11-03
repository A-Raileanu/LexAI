// Lansatorul serviciilor în aplicația împachetată (rulat cu Node-ul din Electron).
// - ELECTRON_RUN_AS_NODE contează doar la pornirea procesului: nu îl dăm mai departe
//   proceselor copil (CLI-ul Claude, serverul MCP);
// - stdin e o țeavă de la procesul principal: când se închide (aplicația a murit fără să
//   ne oprească), serviciul se oprește singur, ca să nu rămână procese orfane.
import { pathToFileURL } from "node:url";

delete process.env.ELECTRON_RUN_AS_NODE;
process.stdin.on("end", () => process.kill(process.pid, "SIGTERM"));
process.stdin.on("error", () => {});
process.stdin.resume();

const entry = process.argv[2];
process.argv.splice(2, 1);
await import(pathToFileURL(entry).href);
