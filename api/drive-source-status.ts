import { z } from 'zod';
import { createRouter, publicQuery } from './middleware';
import { readSavedDriveSourceStatus } from './services/drive-source-status-store';

/** No arguments, mutations, publisher requests or user-specific values. Permission is an exact public-read allowlist entry. */
export const driveSourcesRouter = createRouter({
  status: publicQuery.input(z.undefined()).query(() => readSavedDriveSourceStatus()),
});
