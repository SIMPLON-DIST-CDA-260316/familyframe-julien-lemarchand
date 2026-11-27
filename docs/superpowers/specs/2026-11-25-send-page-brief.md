# Step 17 · Send page: brief

Addendum to [2026-11-25-steps-13-16-brief.md](2026-11-25-steps-13-16-brief.md), agreed with Julien on 2026-11-25 after he tested steps 13 and 14 on his phone. It does not rewrite that brief: it adds a step, delivered after step 14 and before steps 15 and 16.

## Why

The « Ajouter » panel mixed two intents, keeping a photo and giving one, and asked for the source before the intent. On desktop the « Ajouter » button in the library header also led to sending, which made it worse. Julien: the library is for looking at photos, close to the frame; sending deserves its own page, with a history.

## Decisions

- **Library = keep.** The FAB « + » (phones) and the header « Ajouter » (desktop) only add to my library: they open the source choice directly (« Prendre une photo », « Choisir des images »). « Envoyer à un ami » leaves that panel.
- **New page « Envoyer »**, intent first:
  1. A primary « Envoyer une photo » button.
  2. Pick the photo from one of three sources: the camera, the device gallery, or my FamilyFrame library.
  3. Pick friends and an optional message (the existing send panel rules: R-PAR-*).
  4. Send.
- **No copy in my library** for a photo sent from the device (R-PAR-20 stays). No checkbox.
- **Contextual entry kept:** « ⋯ → Envoyer » on a photo in the library or the viewer stays. It opens the same send flow. Two entries, one flow.
- **Tab bar:** Bibliothèque · Envoyer · Cadre · Amis. « Compte » leaves the tabs, since the avatar menu in the top bar already leads there. On desktop, « Envoyer » joins the top navigation.
- **History, mail-like:** below the button, my sent photos: thumbnail, recipients, date, message, newest first.
  - It is mine. It does not tell me whether a friend kept or deleted the photo (privacy).
  - A new « send » record: sender, recipients, the image (`cloudinaryId`, url), message, date. One record per send action, even to several friends.
  - The image deletion count includes sends: a Cloudinary image is destroyed only when no photo and no send uses it any more. A friend deleting the photo leaves my history intact.
  - I can delete a line of my history, like a sent mail, without touching my friends' photos.
  - No retention limit for now. Older sends (before this step) leave no trace: history starts with this step.

## Inspiration from Google Photos (browsed 2026-11-25)

Julien asked to look at how Google Photos organises the same entities (photos, albums, sharing), to take what fits without copying the product.

- **Intent-first « + » menu.** Its « + » opens a menu in two labelled groups: « Créer » (album, share with a contact…) and « Ajouter des photos » (import, other sources). Same idea as our split: keep (library) and give (Envoyer).
- **Send history as a feed.** Its activity page lists each send as one entry: « X a envoyé 2 photos à vous, Y et Z · il y a 3 j », with thumbnails underneath and a link to the conversation. Our history follows that shape, from the sender's side: one entry per send action, with recipients, relative date, thumbnails and message. No comments or replies (out of scope).
