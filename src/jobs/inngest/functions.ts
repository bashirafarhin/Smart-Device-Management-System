import { Inngest } from "inngest";

import {
  findInactiveDevices,
  deactivateDevice,
} from "../../services/device.service";

export const inngest = new Inngest({ id: "my-app" });

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
