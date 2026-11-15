// Compatibility entry point: hash-only acknowledgement is deliberately forbidden.
import { cli } from './translation_workflow.mjs';
try { cli(['review', ...process.argv.slice(2)]); } catch(error) { console.error(error.message); process.exitCode=1; }
