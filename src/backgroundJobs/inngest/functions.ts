// import { inngest } from "./index";
import Job from "../../models/job.model";

import { Inngest } from "inngest";

// Create an Inngest instance/client
export const inngest = new Inngest({ id: "my-app" });

import {
  findInactiveDevices,
  deactivateDevice,
} from "../../services/device.service";

export const autoDeactivateDevices = inngest.createFunction(
  { id: "auto-deactivate-devices" },
  { event: "cron/daily" },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const inactiveDevices = await step.run("find-inactive", async () => {
      return findInactiveDevices(cutoff);
    });
    console.log("inactive", inactiveDevices);

    await Promise.all(
      inactiveDevices.map((deviceId) =>
        step.run(`deactivate-${deviceId}`, async () =>
          deactivateDevice(deviceId)
        )
      )
    );

    return { deactivated: inactiveDevices.length };
  }
);

export const largeExportJob = inngest.createFunction(
  {
    id: "large-export-job",
    concurrency: {
      limit: 1, // Only 1 job at a time per user
      key: "event.data.userId", // Concurrency tracked by userId
    },
  },
  { event: "export/large" },
  async ({ event, step, logger }) => {
    const { jobId, userId, deviceId, startDate, endDate, format } = event.data;

    logger.info(`Started processing job ${jobId} for user ${userId}`);

    // Update job status to "processing"
    await Job.updateOne(
      { jobId },
      { status: "processing", updatedAt: new Date() }
    );

    // Simulate export process delay
    await step.sleep("export-processing", "300s"); // 5 minutes

    // TODO: Replace the following with real export file generation and uploading
    const fileUrl = `https://example.com/exports/${jobId}.${format}`;

    // Update job status to "completed" and save file URL
    await Job.updateOne(
      { jobId },
      { status: "completed", fileUrl, updatedAt: new Date() }
    );

    logger.info(
      `Completed job ${jobId} for user ${userId}, file available at ${fileUrl}`
    );

    // Simulate email notification via log
    logger.info(`Simulated email sent to user ${userId} with export link`);

    // when completed we can send the email with the file URL

    return { fileUrl };
  }
);
