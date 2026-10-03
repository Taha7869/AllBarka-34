# AllBarka gifting film

Prepared for the 3 October home-page refinement. The existing gift film remains on the storefront until a new rendered asset is available.

## Production brief

One silent, 8-second, 16:9 film at 1080p. A deep emerald dry-fruit gift box, half-open on green marble, champagne-gold satin ribbon, divided pistachio/almond/walnut/date/fig compartments and a warm bronze backdrop. Begin close on the bow and paper texture, gently dolly back while orbiting 12 degrees, rack focus to the harvests, and finish on a balanced three-quarter hamper composition. Keep all products and packaging physically stable. No text, logos, people, confetti or exaggerated effects.

## Generation status

Higgsfield Seedance 2.5 preflight estimated 96 credits. Submission returned `Requires plus plan or higher`; no job was created. The connected workspace reported Free plan, 9.85 credits and no spendable unlimited allowance. The owner confirmed this is the intended account and asked to leave the new film pending. No new generated film is claimed or substituted as completed work.

## Storefront delivery

Once an actual MP4 is ready, put the reviewed, web-optimized file in `public/videos/`, reference it from the existing user-played gifting video in `src/pages/HomePage.tsx`, and retain a lightweight poster. Test playback, mobile `playsInline`, fallback on errors, byte-range delivery and reduced-motion behavior. Do not load video bytes before the customer chooses to watch.
