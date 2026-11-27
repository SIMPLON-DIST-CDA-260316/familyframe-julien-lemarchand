# Events: parked idea

Status: **parked** on 2026-11-25. Julien likes the feature but prefers to stabilise the existing product first; it may be built later. Agreed with him after the mobile-first discussion; nothing here is scheduled.

A member creates an « Événement » (wedding, party…). Guests without an account send their photos from their phone through a QR code, during the event. The organiser is the recipient: guests give their photos.

Rules:

- Any member can create one: name, maximum guests (200 by default, 500 at most), Surprise or Live mode (changeable later). It creates a dedicated collection and is open at creation.
- One invitation link per event, shown as a QR code. Any participant (organiser, member, guest) can show the QR: invitations spread in a chain. The organiser can regenerate the link: the old one stops working, guests already in stay.
- On scan: « J'ai un compte, me connecter » or « Continuer comme invité » (first name of 1 to 30 characters required, selfie optional). A guest has a temporary session limited to this event: send photos with an optional message, show the QR. Access is refused everywhere else, with tests.
- A logged-in member who joins: their photos go to the event collection, and a copy stays in their own library.
- A guest does not see the others' photos. They see a counter « Vous avez envoyé N photos ». An « Annuler » button for 10 s after each upload; after that only the organiser can delete.
- Guest limit reached: clear message, nobody else gets in. Photos per guest: Claude sets the limit in the spec. Step 14's downscale always applies.
- Surprise mode: photos are not shown, the organiser discovers them with the photo mail reveal screen (« Vous avez N nouvelles photos »).
- Live mode: a wall through a secret read-only link (no login, can be regenerated), fed in real time, with an option to show the QR code in a corner.
- Closing: by the organiser, or automatically after 48 h. Final, no reopening. On close: guest sessions cut at once (sockets included), link and wall disabled, photos belong to the organiser with « Envoyée par <prénom> (invité) », selfies deleted (Cloudinary included), first name kept. A QR scanned afterwards shows « Événement terminé ».

Proposed split (adjust if needed, justified in the spec):

- 16: server (model, link and regeneration, guest sessions, roles and refusals, limits, manual and automatic closing, cleanup).
- 17: guest journey (arrival screen, first name and selfie, upload, undo, counter, QR, « Événement terminé »).
- 18: organiser side (creation, settings, QR, list and delete, closing, Surprise reveal, copy for members).
- 19: Live wall (secret link, real time, QR option).
