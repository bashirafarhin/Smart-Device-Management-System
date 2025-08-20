import type { Request, Response, NextFunction } from "express";

export const responseTimeLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startHrTime = process.hrtime(); // high-resolution start time

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(startHrTime);
    const durationInMs = (seconds * 1e3 + nanoseconds / 1e6).toFixed(2);

    // console.log(
    //   `[ResponseTime] ${req.method} ${req.originalUrl} - ${durationInMs} ms`
    // );

    // Optional: flag slow endpoints
    if (Number(durationInMs) > 500) {
      console.warn(
        `[SlowEndpoint] ${req.method} ${req.originalUrl} took ${durationInMs} ms`
      );
    }
  });

  next();
};
