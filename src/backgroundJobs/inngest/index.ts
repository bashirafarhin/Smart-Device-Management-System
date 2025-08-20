import { Inngest } from "inngest";
import { autoDeactivateDevices, largeExportJob } from "./functions";

// Create an Inngest instance/client
export const inngest = new Inngest({ id: "my-app" });

// Define your functions here or export an empty array for now
export const functions = [autoDeactivateDevices, largeExportJob];
