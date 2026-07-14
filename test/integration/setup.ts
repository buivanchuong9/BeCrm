import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env.test'), override: true });

jest.setTimeout(30_000);
