import { exec } from 'child_process';
import fs from 'fs';

console.log("Starting test execution...");
exec('npx vitest JuryView --run', (error, stdout, stderr) => {
    console.log("Test execution complete.");
    const output = (stdout || '') + "\n" + (stderr || '');
    const failures = output.includes("FAIL") ? "FAILURES FOUND" : "NO FAILURES";
    console.log(`Status: ${failures}`);

    if (output.includes("FAIL")) {
        console.log("--- FAILURE LOG START ---");
        // Find indices of FAIL
        const failIndex = output.indexOf("FAIL");
        console.log(output.substring(Math.max(0, failIndex - 500), failIndex + 2000));
        console.log("--- FAILURE LOG END ---");
    } else {
        console.log("All tests passed!");
        console.log(output.slice(-500));
    }
    process.exit(0);
});
