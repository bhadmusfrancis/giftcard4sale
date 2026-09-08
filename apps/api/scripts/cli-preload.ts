import dns from "node:dns";
import workerThreads from "node:worker_threads";
import "../src/loadDbEnv";

// Local ISP DNS often cannot resolve some upstream hosts; use public resolvers for CLI jobs.
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

// tesseract.js workers inherit tsx --import and crash on .ts preload; spawn them clean.
const OriginalWorker = workerThreads.Worker;
(workerThreads as unknown as { Worker: typeof OriginalWorker }).Worker = class extends OriginalWorker {
  constructor(filename: string | URL, options?: ConstructorParameters<typeof OriginalWorker>[1]) {
    super(filename, { ...(options || {}), execArgv: [] });
  }
} as typeof OriginalWorker;
