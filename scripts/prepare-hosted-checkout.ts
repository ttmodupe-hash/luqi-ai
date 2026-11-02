/** Offline public-offer validation. Does not contact a processor, verify a
 * merchant, activate a flag, read credentials or collect money. */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { hostedOfferSchema } from '../src/lib/hosted-checkout';
import { hostedOfferDigest } from '../api/hosted-checkout';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('One public offer file required');
    const raw = readFileSync(process.argv[2]);
    if (raw.byteLength > 16_384) throw new Error('Offer too large');
    const offer = hostedOfferSchema.parse(JSON.parse(raw.toString('utf8')));
    console.log(JSON.stringify({ offer, offerSha256: hostedOfferDigest(offer),
      merchantVerification: 'not_performed', configurationChanged: false }, null, 2));
  } catch {
    console.error('Public offer is missing or invalid. No merchant check, payment or configuration change was performed.');
    process.exitCode = 1;
  }
}
