---
plan: mobile-first
status: done
spec: docs/superpowers/specs/2026-11-25-mobile-first-design.md
branch: feat/mobile-tabbar (PR A), feat/mobile-touch-targets (PR B), feat/frame-wake-lock (PR C), feat/viewer-chrome (PR D), feat/library-surface (PR E)
worktree: false
tasks_total: 18
tasks_done: 18
current_task: null
last_commit: null
last_updated: 2026-11-25
---

# Mobile-first (Step 13) Implementation Plan

> **For agentic workers:** this plan was built while executing it, in a throwaway clone; every task below is a final diff (`git show` output, after formatting and the fresh-context review). Replaying it means applying each diff and running its gates.

**Working agreement (mandatory):** keep this plan in sync with reality. Append every divergence to the Drift Log. When a drift changes a decision of the spec, add a new spec doc rather than rewriting this one.

**Goal:** the app is comfortable on a phone. A bottom tab bar replaces the ☰ menu below `md`, « Ajouter » becomes a floating button on the library page, every control is finger-sized under a coarse pointer, nothing sits under the notch or the home bar, the frame keeps the screen awake, and the in-app viewer's controls step aside so the photo is alone. The desktop stays as it was.

**Architecture:** a `TabBarLayout` route (`App.tsx`) renders `MobileTabBar` under the pages that have it and pads them by `--tab-bar-height`; the avatar menu (`UserMenu`) shows on every width and takes over the ☰ content. Touch sizes live in the shadcn primitives (`ui/button`, `ui/toggle`, `ui/input`, `ui/dropdown-menu`) as `pointer-coarse:` variants. Safe areas are Tailwind arbitrary values over `env(safe-area-inset-*)`, enabled by `viewport-fit=cover`. `useScreenWakeLock` (frame) and `useViewerChrome` (viewer) are two small hooks.

**Tech Stack:** React 19, React Router 7, Radix (shadcn), Embla 8 (shadcn `carousel`), sonner, lucide-react, Tailwind 4, Biome 2. Server untouched.

## Global Constraints

- **No new dependency.** **Server untouched:** no Bruno, no unit test change.
- **Never Docker, never start the API or Vite, never `pnpm db:push` / `db:seed`, never read `.env` files** (controller's hard rules for this step).
- **No client test runner:** client tasks are verified by `pnpm check`, `pnpm typecheck`, `pnpm build` and the Chrome checklist; gestures by the author on a real phone.
- **TypeScript (AGENTS.md):** no `as` casts, explicit return types on exported functions, literal unions rather than `enum`.
- **Code rules (`.claude/rules/`):** comment why, never what; every function at most 30 lines, every file at most 300 lines; constants in UPPER_SNAKE_CASE.
- **UI:** French strings; 44 px touch targets on coarse pointers, fine-pointer sizes unchanged; works at 360 px with no horizontal page scroll; desktop (`md` and up) unchanged except where the spec says.
- **Same commit rules:** user-visible change → `docs/produit/` (French, no technical terms; a rule new in this stack is edited in place, an older one is amended or marked « Remplacée »); flow change → `ARCHITECTURE.md`.
- **Biome formats Markdown:** `pnpm check:fix` after a docs edit; the diffs below are after formatting. Plans are not formatted.
- **Commits:** atomic, Conventional Commits in English, message in a scratchpad file passed with `git commit -F`, ending with the two attribution lines. Never `--no-verify`. The clone's `.npmrc` (virtual store outside the clone) is never committed.
- **Docker files are the author's work:** never touch `server/Dockerfile`, `server/.dockerignore`, `compose.yaml`, `NOTE.md`, `.vscode/settings.json`.

## Interfaces

- `MobileTabBar(): JSX.Element` (`components/nav/MobileTabBar.tsx`); `MobileNav` deleted.
- `AddPhotoFab({ onAdd }: { onAdd: () => void }): JSX.Element` (`components/library/AddPhotoFab.tsx`).
- `useScreenWakeLock(): void` (`hooks/useScreenWakeLock.ts`).
- `useViewerChrome(): ViewerChrome` with `ViewerChrome = { isVisible: boolean; onPhotoPointerDown: (event: PointerEvent) => void; onPhotoClick: () => void }` (`hooks/useViewerChrome.ts`).
- `chromeClasses(isVisible: boolean): string` (`components/viewer/viewerClasses.ts`).
- Props added: `ViewerTopBar.isVisible`, `ViewerCaption.isVisible`, `ViewerCarousel.chrome`.
- CSS: `--tab-bar-height: 4rem` and `--toast-bottom` (`index.css`); the `[data-viewer-controls]` attribute marks the viewer's controls.
- `useHideOnScrollDown(): HideOnScrollDown` with `HideOnScrollDown = { isHidden: boolean; ref: RefObject<HTMLButtonElement | null>; onFocus: () => void }` (`hooks/useHideOnScrollDown.ts`); `PhotoActionsMenu` prop `theme?: 'dark' | 'app'`.
- Removed: `COARSE_POINTER_TARGET_CLASSES` (`components/frame/controlClasses.ts`).

## Stack and branches

- **PR A `feat/mobile-tabbar`** on top of `feat/library-collections` (d58d3b8): the brief, the spec and this plan, then Tasks 1 to 3d.
- **PR B `feat/mobile-touch-targets`**: Tasks 4 and 5.
- **PR C `feat/frame-wake-lock`**: Tasks 6 and 6a.
- **PR D `feat/viewer-chrome`**: Tasks 7 to 7c.
- **PR E `feat/library-surface`** (after the author's phone test, added on top once PRs A to D were in the repo): Tasks 8 to 10, with this plan's follow-ups.

## Baselines

- `pnpm test` at d58d3b8: `Test Files  25 passed (25)`, `Tests  301 passed (301)`; unchanged by every task (client only).
- Each task's gate: `pnpm check` (Biome, 343 files at the tip) and `pnpm typecheck` green; `pnpm build` green at the tip.

### Task 0: Brief, spec and plan

**Commit:** `docs: spec and plan for the mobile-first step`

**Scope:** `docs/superpowers/specs/2026-11-25-steps-13-16-brief.md` (copied from the author's repo, formatted by Biome), the spec, this plan. No diff below: the files are the documents themselves.

---

## `feat/mobile-tabbar`

### Task 1: Safe areas and colour metas

**Commit:** `feat(client): keep controls clear of the notch and the home bar`

**Scope:** `index.html` metas, `:root` colour scheme, safe-area padding on the top bar, page content, bottom sheet, frame, viewer and mail reveal; R-APP-56, R-APP-57.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/index.html b/client/index.html
index b44d935..e61e466 100644
--- a/client/index.html
+++ b/client/index.html
@@ -3,7 +3,12 @@
   <head>
     <meta charset="UTF-8" />
     <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
-    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
+    <!-- cover: the page reaches under the notch and the home bar; the safe-area insets keep the controls clear of them. -->
+    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
+    <!-- Before the stylesheet loads, the page already takes the device's light or dark colours. -->
+    <meta name="color-scheme" content="light dark" />
+    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
+    <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
     <title>FamilyFrame</title>
   </head>
   <body>
diff --git a/client/src/App.tsx b/client/src/App.tsx
index fd685b3..3aae26a 100644
--- a/client/src/App.tsx
+++ b/client/src/App.tsx
@@ -27,12 +27,15 @@ function LoggedInLayout(): JSX.Element {
   )
 }
 
-// The frame is full screen: only the other pages get the account bar.
+// The frame is full screen: only the other pages get the account bar. A phone held sideways puts
+// its notch on a side: the pages stay clear of it.
 function AccountBarLayout(): JSX.Element {
   return (
     <>
       <AccountBar />
-      <Outlet />
+      <div className="pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
+        <Outlet />
+      </div>
     </>
   )
 }
diff --git a/client/src/components/auth/AccountBar.tsx b/client/src/components/auth/AccountBar.tsx
index 95b71c7..45140dc 100644
--- a/client/src/components/auth/AccountBar.tsx
+++ b/client/src/components/auth/AccountBar.tsx
@@ -6,8 +6,9 @@ import { MobileNav } from '@/components/nav/MobileNav.tsx'
 
 export function AccountBar(): JSX.Element {
   return (
-    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
-      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
+    // The bar's own background runs under the notch; its content stays below it.
+    <header className="sticky top-0 z-20 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
+      <div className="mx-auto flex max-w-5xl items-center gap-3 py-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
         <MobileNav />
         <Link to="/" className="mr-4 text-lg font-semibold tracking-tight">
           FamilyFrame
diff --git a/client/src/components/frame/FrameNotices.tsx b/client/src/components/frame/FrameNotices.tsx
index 3280bcf..3b85523 100644
--- a/client/src/components/frame/FrameNotices.tsx
+++ b/client/src/components/frame/FrameNotices.tsx
@@ -18,7 +18,7 @@ export function FrameNotices({
   onShowNewest,
 }: FrameNoticesProps): JSX.Element {
   return (
-    <div className="fixed top-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3">
+    <div className="fixed top-[calc(1.5rem_+_env(safe-area-inset-top))] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3">
       <WaitingPhotosBadge count={waitingCount} onSelect={onReveal} />
       <NewPhotosBadge count={newPhotoCount} onSelect={onShowNewest} />
     </div>
diff --git a/client/src/components/frame/FrameStatusScreen.tsx b/client/src/components/frame/FrameStatusScreen.tsx
index d9816c6..f0998c6 100644
--- a/client/src/components/frame/FrameStatusScreen.tsx
+++ b/client/src/components/frame/FrameStatusScreen.tsx
@@ -72,7 +72,7 @@ export function FrameStatusScreen({
       )}
     >
       {/* Where the slideshow has it: a frame stuck on loading can still go full screen. */}
-      <div className="fixed top-0 right-0 px-6 py-4">
+      <div className="fixed top-0 right-0 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-4 pl-6">
         <FullscreenButton />
       </div>
       <div className="flex flex-col items-center gap-4 px-6 text-center">
diff --git a/client/src/components/frame/PhotoView.tsx b/client/src/components/frame/PhotoView.tsx
index 0217940..922410c 100644
--- a/client/src/components/frame/PhotoView.tsx
+++ b/client/src/components/frame/PhotoView.tsx
@@ -34,7 +34,8 @@ type BottomOverlayProps = {
 
 function BottomOverlay({ captionPhoto, children }: BottomOverlayProps): JSX.Element {
   return (
-    <div className="pointer-events-none absolute inset-x-0 bottom-0 isolate">
+    // The caption and the buttons stay above the home bar and beside a sideways notch.
+    <div className="pointer-events-none absolute inset-x-0 bottom-0 isolate pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
       {/* The shade is there for the controls: at rest it fades out with them (FramePage sets data-idle). */}
       <div
         aria-hidden
diff --git a/client/src/components/frame/SlideshowTopBar.tsx b/client/src/components/frame/SlideshowTopBar.tsx
index 9157ec2..4356404 100644
--- a/client/src/components/frame/SlideshowTopBar.tsx
+++ b/client/src/components/frame/SlideshowTopBar.tsx
@@ -24,7 +24,8 @@ export function SlideshowTopBar({
     <ControlsBar
       edge="top"
       isVisible={isVisible}
-      className="fixed inset-x-0 top-0 z-10 justify-between"
+      // Clear of the notch, and of the rounded corners of a phone held sideways.
+      className="fixed inset-x-0 top-0 z-10 justify-between pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pl-[max(1.5rem,env(safe-area-inset-left))]"
     >
       <CloseButton onClose={onClose} />
       <div className="flex items-center gap-2">
diff --git a/client/src/components/mail/MailRevealDialog.tsx b/client/src/components/mail/MailRevealDialog.tsx
index ca5f3e8..ffc4495 100644
--- a/client/src/components/mail/MailRevealDialog.tsx
+++ b/client/src/components/mail/MailRevealDialog.tsx
@@ -40,7 +40,7 @@ function RevealedPhoto({ photo }: { photo: Photo }): JSX.Element {
 
 function RevealTopBar({ position, count }: { position: number; count: number }): JSX.Element {
   return (
-    <div className="flex items-center gap-2 px-4 py-3">
+    <div className="flex items-center gap-2 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))]">
       <DialogPrimitive.Close asChild>
         <Button variant="ghost" size="icon-lg" aria-label="Fermer">
           <XIcon />
@@ -74,7 +74,8 @@ export function MailRevealDialog({ photos, onOpen, onClose }: MailRevealDialogPr
         {/* Above the photo viewer and the frame's buttons: the reveal has the whole screen. */}
         <DialogPrimitive.Content
           aria-describedby={undefined}
-          className="dark fixed inset-0 z-50 flex flex-col gap-6 bg-frame-background pb-8 text-foreground outline-none"
+          // pb: « Suivante » stays above the home bar.
+          className="dark fixed inset-0 z-50 flex flex-col gap-6 bg-frame-background pb-[calc(2rem_+_env(safe-area-inset-bottom))] text-foreground outline-none"
         >
           <RevealTopBar position={index + 1} count={photos.length} />
           {/* The key restarts the reveal animation for each photo. */}
diff --git a/client/src/components/panel/ResponsivePanel.tsx b/client/src/components/panel/ResponsivePanel.tsx
index c325c20..fe4e6d6 100644
--- a/client/src/components/panel/ResponsivePanel.tsx
+++ b/client/src/components/panel/ResponsivePanel.tsx
@@ -30,7 +30,7 @@ function DesktopDialog({
   )
 }
 
-// A phone gets the sheet from the bottom, under the thumb.
+// A phone gets the sheet from the bottom, under the thumb; its last button stays above the home bar.
 function PhoneSheet({
   onClose,
   onCloseAutoFocus,
@@ -43,7 +43,7 @@ function PhoneSheet({
         side="bottom"
         // bg-popover matches the ring offset of the friend avatars, as in the dialog.
         className={cn(
-          'max-h-[90svh] rounded-t-2xl bg-popover px-4 pt-4 pb-6 text-popover-foreground',
+          'max-h-[90svh] rounded-t-2xl bg-popover px-4 pt-4 pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] text-popover-foreground',
           className,
         )}
         onCloseAutoFocus={onCloseAutoFocus}
diff --git a/client/src/components/viewer/ViewerCaption.tsx b/client/src/components/viewer/ViewerCaption.tsx
index 9a5a888..69487f0 100644
--- a/client/src/components/viewer/ViewerCaption.tsx
+++ b/client/src/components/viewer/ViewerCaption.tsx
@@ -8,8 +8,9 @@ type ViewerCaptionProps = {
 
 export function ViewerCaption({ photo }: ViewerCaptionProps): JSX.Element {
   return (
-    // Swipes over the caption must still reach the carousel underneath.
-    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-6 pt-16 pb-6 text-white">
+    // Swipes over the caption must still reach the carousel underneath. The text stays above the
+    // home bar and beside a sideways notch.
+    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent pt-16 pr-[max(1.5rem,env(safe-area-inset-right))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] text-white">
       <p className="text-lg font-medium tabular-nums drop-shadow-md">
         <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
       </p>
diff --git a/client/src/components/viewer/ViewerCarousel.tsx b/client/src/components/viewer/ViewerCarousel.tsx
index 775f80b..a842168 100644
--- a/client/src/components/viewer/ViewerCarousel.tsx
+++ b/client/src/components/viewer/ViewerCarousel.tsx
@@ -56,12 +56,12 @@ export function ViewerCarousel({
       <CarouselPrevious
         variant="ghost"
         aria-label="Photo précédente"
-        className={cn(ARROW_CLASSES, 'left-4')}
+        className={cn(ARROW_CLASSES, 'left-[max(1rem,env(safe-area-inset-left))]')}
       />
       <CarouselNext
         variant="ghost"
         aria-label="Photo suivante"
-        className={cn(ARROW_CLASSES, 'right-4')}
+        className={cn(ARROW_CLASSES, 'right-[max(1rem,env(safe-area-inset-right))]')}
       />
     </Carousel>
   )
diff --git a/client/src/components/viewer/ViewerTopBar.tsx b/client/src/components/viewer/ViewerTopBar.tsx
index a08c95a..e74432e 100644
--- a/client/src/components/viewer/ViewerTopBar.tsx
+++ b/client/src/components/viewer/ViewerTopBar.tsx
@@ -50,8 +50,9 @@ export function ViewerTopBar({
 }: ViewerTopBarProps): JSX.Element {
   return (
     // ✕ top left and the actions top right, as on the slideshow. The row spans the screen: only
-    // its buttons take pointers, swipes beside them reach the carousel.
-    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent px-4 py-3 *:pointer-events-auto">
+    // its buttons take pointers, swipes beside them reach the carousel. Its shade runs under the
+    // notch, its buttons stay below it.
+    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))] *:pointer-events-auto">
       <CloseViewerButton onClose={onClose} />
       <p aria-live="polite" className="mx-auto text-sm text-white/80 tabular-nums">
         {counter}
diff --git a/client/src/index.css b/client/src/index.css
index 445281a..c1361f0 100644
--- a/client/src/index.css
+++ b/client/src/index.css
@@ -6,6 +6,8 @@
 @custom-variant dark (&:is(.dark *));
 
 :root {
+  /* The color-scheme meta lets the browser pick dark: a page left light by the theme keeps light controls. */
+  color-scheme: light;
   --background: oklch(1 0 0);
   --foreground: oklch(0.145 0 0);
   --card: oklch(1 0 0);
diff --git a/docs/produit/apparence-et-navigation.md b/docs/produit/apparence-et-navigation.md
index f24b152..98d0364 100644
--- a/docs/produit/apparence-et-navigation.md
+++ b/docs/produit/apparence-et-navigation.md
@@ -101,6 +101,25 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 - Choisir d'autres couleurs.
 - Retrouver son thème sur un nouvel appareil sans le choisir de nouveau.
 
+## Écran de téléphone
+
+**Ce que l'on peut faire**
+
+- Utiliser l'application sur toute la surface de l'écran d'un téléphone, encoche et coins arrondis compris.
+
+**Règles**
+
+1. R-APP-56 · Sur un téléphone à encoche, à coins arrondis ou à barre de navigation en bas, l'application occupe tout l'écran, mais aucun bouton ni texte ne passe sous l'encoche, dans un coin ou sous cette barre : la barre du haut, les panneaux qui montent du bas, la photo ouverte en grand, la découverte des photos reçues et le cadre gardent leurs boutons et leurs légendes dans la partie utilisable de l'écran, téléphone tenu droit ou couché.
+2. R-APP-57 · La barre du navigateur, autour de l'adresse, prend la couleur claire ou sombre du réglage de l'appareil, et la page s'affiche dans ces couleurs dès son ouverture. Avec un thème choisi à l'inverse de l'appareil (« Sombre » sur un appareil réglé en clair, par exemple), la barre du navigateur garde la couleur de l'appareil.
+
+**Messages affichés**
+
+Aucun message.
+
+**Ce qui n'est pas possible**
+
+- Choisir la couleur de la barre du navigateur.
+
 ## Page introuvable
 
 **Ce que l'on peut faire**
~~~~

### Task 2: Bottom tab bar instead of the burger menu

**Commit:** `feat(client): bottom tab bar on phones instead of the burger menu`

**Scope:** `MobileTabBar`, `TabBarLayout`, `--tab-bar-height`, avatar menu on every width with « Invitations » for the admin on a phone, toasts above the bar, `MobileNav` deleted; product docs (R-APP-12, R-APP-60 to -66, R-APP-20/-21 and R-PRF-02 « Remplacée », amended rules), ARCHITECTURE, README.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 1388c25..75aea37 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -50,12 +50,12 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 | `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
 | `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
 | `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et le menu mobile : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et l'onglet « Compte » du téléphone : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
 | `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
-Plein écran (`client/src/fullscreen.ts`) : le navigateur ne l'accorde que pendant un geste de la personne, donc les trois entrées (lien « Cadre » de la barre, « Mode cadre » de la bibliothèque et de la visionneuse) appellent `enterFullscreen()` dans le clic lui-même, avant la navigation ; c'est tout le document qui passe en plein écran, et la navigation de l'application, sans rechargement, l'y laisse. Un refus (réglage du navigateur, iPhone qui n'a pas de plein écran d'élément) est ignoré : le cadre fonctionne dans la fenêtre. En plein écran, le navigateur garde Échap pour lui : `useFrameFullscreen` écoute `fullscreenchange` et quitte le cadre quand le plein écran se termine, quelle qu'en soit la cause, sauf si un menu ou une fenêtre est ouvert (`isOverlayOpen`) : cet Échap visait la fenêtre, le cadre reste, hors plein écran ; au démontage (✕, retour arrière, lien), il retire son écouteur puis sort du plein écran, pour que la bibliothèque n'y reste jamais. Hors plein écran, Échap quitte le cadre comme avant (`useEscapeToClose`). Un cadre ouvert directement sur `/frame` n'a pas eu de clic : un bouton « Plein écran » (`components/frame/FullscreenButton.tsx`, état lu par `useIsFullscreen` avec `useSyncExternalStore`) s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo, tant que le document n'est pas en plein écran.
+Plein écran (`client/src/fullscreen.ts`) : le navigateur ne l'accorde que pendant un geste de la personne, donc les entrées (lien « Cadre » de la barre du haut et de la barre d'onglets, « Mode cadre » de la bibliothèque et de la visionneuse) appellent `enterFullscreen()` dans le clic lui-même, avant la navigation ; c'est tout le document qui passe en plein écran, et la navigation de l'application, sans rechargement, l'y laisse. Un refus (réglage du navigateur, iPhone qui n'a pas de plein écran d'élément) est ignoré : le cadre fonctionne dans la fenêtre. En plein écran, le navigateur garde Échap pour lui : `useFrameFullscreen` écoute `fullscreenchange` et quitte le cadre quand le plein écran se termine, quelle qu'en soit la cause, sauf si un menu ou une fenêtre est ouvert (`isOverlayOpen`) : cet Échap visait la fenêtre, le cadre reste, hors plein écran ; au démontage (✕, retour arrière, lien), il retire son écouteur puis sort du plein écran, pour que la bibliothèque n'y reste jamais. Hors plein écran, Échap quitte le cadre comme avant (`useEscapeToClose`). Un cadre ouvert directement sur `/frame` n'a pas eu de clic : un bouton « Plein écran » (`components/frame/FullscreenButton.tsx`, état lu par `useIsFullscreen` avec `useSyncExternalStore`) s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo, tant que le document n'est pas en plein écran.
 
 Réglages du cadre (`client/src/frameSettings.ts`) : le modèle d'affichage, l'ordre de lecture, la vitesse et la source des photos sont gardés par appareil dans le `localStorage` (clé `familyframe.frame-settings`, un objet JSON). Chaque valeur est vérifiée seule à la lecture : une valeur inconnue revient à sa valeur par défaut sans effacer les autres. Chaque accès est dans un `try/catch` : en navigation privée, ou si le stockage est bloqué, les choix valent pour la visite. `useFrameSettings` relit le stockage sur l'événement `storage`, que le navigateur envoie aux autres onglets du même site. La pause et le bandeau de vignettes restent en mémoire (`useSlideshowSettings`) : ils reviennent à leur valeur par défaut à chaque ouverture.
 
@@ -75,7 +75,7 @@ Modèles d'affichage (`components/frame/templateClasses.ts`) : une table de clas
 
 Courrier photo (`components/mail/`) : « Découvrir » copie la liste des photos en attente (`useMailReveal`), de la plus ancienne à la plus récente, et l'ouvre dans `MailRevealDialog`, une fenêtre plein écran (`z-50`, au-dessus de la visionneuse). Chaque photo est ouverte (`POST /api/photos/:id/open`) dès qu'elle s'affiche, sans attendre la réponse ; un échec la laisse en attente pour la découverte suivante. Une photo arrivée pendant la découverte attend la suivante.
 
-Le menu du compte (avatar sur ordinateur, ☰ sur mobile) mène à « Préférences » (`/settings`). Chaque carte enregistre seule (`hooks/useAccountSave.ts`) puis remplace l'utilisateur dans `AuthContext` (`replaceUser`) : la barre et les menus montrent aussitôt le nouveau nom. `UserAvatar` affiche la photo de profil quand `avatarUrl` existe, l'initiale sinon (barre, menus, listes d'amis, fenêtre d'envoi).
+Navigation : la barre du haut (`AccountBar`) garde « FamilyFrame » et le menu du compte (avatar, `UserMenu`) sur toutes les largeurs ; à partir de `md` elle liste aussi les pages (`DesktopNav`). Sous `md`, une barre d'onglets en bas de l'écran (`components/nav/MobileTabBar.tsx`) mène à `/`, `/friends`, `/frame` et `/settings` ; la route parente `TabBarLayout` (`App.tsx`) l'affiche sur ces pages et sur `/admin/invitations`, pas sur la 404, le cadre ni les pages publiques, et réserve en bas de page sa hauteur (`--tab-bar-height`, `index.css`) plus la zone de sécurité du bas. Sous `md`, le menu du compte ajoute « Invitations » pour l'admin. Les zones de sécurité des téléphones (`viewport-fit=cover` dans `index.html`, `env(safe-area-inset-*)` en valeurs Tailwind arbitraires) gardent barres, panneaux, cadre et visionneuse hors de l'encoche et de la barre d'accueil. Le menu du compte mène à « Préférences » (`/settings`). Chaque carte enregistre seule (`hooks/useAccountSave.ts`) puis remplace l'utilisateur dans `AuthContext` (`replaceUser`) : la barre et les menus montrent aussitôt le nouveau nom. `UserAvatar` affiche la photo de profil quand `avatarUrl` existe, l'initiale sinon (barre, menus, listes d'amis, fenêtre d'envoi).
 
 Thème : le menu du compte propose aussi Clair, Sombre ou Système (par défaut). Le choix est gardé dans le `localStorage` du navigateur (`client/src/theme.ts`), qui pose ou retire la classe `.dark` sur `<html>` ; en navigation privée, ou si le stockage est bloqué, le choix vaut pour la visite seulement.
 
diff --git a/README.md b/README.md
index 18cb496..fc05d31 100644
--- a/README.md
+++ b/README.md
@@ -69,7 +69,7 @@ Ajouter un ami : ouvrir « Amis » depuis la bibliothèque et saisir l'adresse e
 
 Envoyer une photo à un ami : dans la bibliothèque ou sur le cadre, le menu « … » d'une photo propose « Envoyer à un ami » ; dans le panneau « Ajouter » de la bibliothèque, choisir un fichier puis « Envoyer à un ami » plutôt que « Ajouter à ma bibliothèque ». Le panneau « Envoyer à des proches » montre les amis acceptés : toucher ceux qui doivent la recevoir, puis « Envoyer à N personnes » ; une notification confirme à qui elle est partie. Un message facultatif (200 caractères au plus) peut l'accompagner. La photo n'entre que chez l'ami, comme une lettre non ouverte : sa bibliothèque annonce « Vous avez 1 nouvelle photo », et « Découvrir » la montre en grand avec « Envoyée par », votre nom et votre message, avant qu'elle rejoigne sa bibliothèque et son cadre. Le cadre affiche la même annonce en haut de l'écran et lance la découverte d'un toucher. Chacun supprime ses photos de son côté : retirer l'ami ou supprimer l'original ne retire pas la photo reçue.
 
-Modifier son compte : « Préférences », dans le menu du compte (l'avatar en haut à droite, ou ☰ sur mobile). Chaque carte de compte a son « Enregistrer » : photo de profil (JPEG, PNG ou WebP, recadrée en carré), nom affiché et mot de passe ; la carte « Cadre de cet appareil » s'applique dès qu'on choisit. L'adresse e-mail ne se modifie pas encore. Changer de mot de passe déconnecte les autres appareils du compte : le cadre revient à la page de connexion à son prochain rechargement des photos (au plus tard le lendemain) ou à sa prochaine reconnexion ; s'y reconnecter avec le nouveau mot de passe.
+Modifier son compte : « Préférences », dans le menu du compte (l'avatar en haut à droite ; sur mobile, aussi l'onglet « Compte »). Chaque carte de compte a son « Enregistrer » : photo de profil (JPEG, PNG ou WebP, recadrée en carré), nom affiché et mot de passe ; la carte « Cadre de cet appareil » s'applique dès qu'on choisit. L'adresse e-mail ne se modifie pas encore. Changer de mot de passe déconnecte les autres appareils du compte : le cadre revient à la page de connexion à son prochain rechargement des photos (au plus tard le lendemain) ou à sa prochaine reconnexion ; s'y reconnecter avec le nouveau mot de passe.
 
 Depuis un smartphone sur le même réseau : `http://<ip-du-pc>:5180` (le pare-feu Windows doit autoriser Node sur les réseaux privés, et le Wi-Fi ne doit pas isoler les appareils entre eux).
 
diff --git a/client/src/App.tsx b/client/src/App.tsx
index 3aae26a..b8c5bdb 100644
--- a/client/src/App.tsx
+++ b/client/src/App.tsx
@@ -5,6 +5,7 @@ import { RequireAdmin } from './auth/RequireAdmin.tsx'
 import { RequireAuth } from './auth/RequireAuth.tsx'
 import { CollectionsProvider } from './collections/CollectionsProvider.tsx'
 import { AccountBar } from './components/auth/AccountBar.tsx'
+import { MobileTabBar } from './components/nav/MobileTabBar.tsx'
 import { Toaster } from './components/ui/sonner.tsx'
 import AdminInvitationsPage from './pages/AdminInvitationsPage.tsx'
 import FramePage from './pages/FramePage.tsx'
@@ -40,6 +41,19 @@ function AccountBarLayout(): JSX.Element {
   )
 }
 
+// The app's own pages get the phone's tab bar; the 404 page does not, it is no place to go back to.
+// The pages leave room for the bar (and the home bar under it) so their end stays reachable.
+function TabBarLayout(): JSX.Element {
+  return (
+    <>
+      <div className="max-md:pb-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom))]">
+        <Outlet />
+      </div>
+      <MobileTabBar />
+    </>
+  )
+}
+
 function AppRoutes(): JSX.Element {
   return (
     <Routes>
@@ -48,17 +62,19 @@ function AppRoutes(): JSX.Element {
       <Route element={<LoggedInLayout />}>
         <Route path="/frame" element={<FramePage />} />
         <Route element={<AccountBarLayout />}>
-          <Route path="/" element={<LibraryPage />} />
-          <Route path="/friends" element={<FriendsPage />} />
-          <Route path="/settings" element={<SettingsPage />} />
-          <Route
-            path="/admin/invitations"
-            element={
-              <RequireAdmin>
-                <AdminInvitationsPage />
-              </RequireAdmin>
-            }
-          />
+          <Route element={<TabBarLayout />}>
+            <Route path="/" element={<LibraryPage />} />
+            <Route path="/friends" element={<FriendsPage />} />
+            <Route path="/settings" element={<SettingsPage />} />
+            <Route
+              path="/admin/invitations"
+              element={
+                <RequireAdmin>
+                  <AdminInvitationsPage />
+                </RequireAdmin>
+              }
+            />
+          </Route>
           {/* Behind RequireAuth: a logged-out visitor goes to /login, as for any other page. */}
           <Route path="*" element={<NotFoundPage />} />
         </Route>
diff --git a/client/src/components/auth/AccountBar.tsx b/client/src/components/auth/AccountBar.tsx
index 45140dc..cfdf2bf 100644
--- a/client/src/components/auth/AccountBar.tsx
+++ b/client/src/components/auth/AccountBar.tsx
@@ -2,20 +2,18 @@ import type { JSX } from 'react'
 import { Link } from 'react-router'
 import { UserMenu } from '@/components/auth/UserMenu.tsx'
 import { DesktopNav } from '@/components/nav/DesktopNav.tsx'
-import { MobileNav } from '@/components/nav/MobileNav.tsx'
 
 export function AccountBar(): JSX.Element {
   return (
     // The bar's own background runs under the notch; its content stays below it.
     <header className="sticky top-0 z-20 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
       <div className="mx-auto flex max-w-5xl items-center gap-3 py-3 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
-        <MobileNav />
         <Link to="/" className="mr-4 text-lg font-semibold tracking-tight">
           FamilyFrame
         </Link>
         <DesktopNav />
-        {/* On mobile the burger menu holds the account and the logout. */}
-        <div className="ml-auto hidden md:block">
+        {/* On a phone too: the tab bar holds the pages, this menu the account and the logout. */}
+        <div className="ml-auto">
           <UserMenu />
         </div>
       </div>
diff --git a/client/src/components/auth/UserMenu.tsx b/client/src/components/auth/UserMenu.tsx
index 2ace71b..f9f921d 100644
--- a/client/src/components/auth/UserMenu.tsx
+++ b/client/src/components/auth/UserMenu.tsx
@@ -1,4 +1,4 @@
-import { LogOutIcon, SettingsIcon } from 'lucide-react'
+import { LogOutIcon, SettingsIcon, UserPlusIcon } from 'lucide-react'
 import type { JSX } from 'react'
 import { Link } from 'react-router'
 import { useAuth } from '@/auth/AuthContext.ts'
@@ -14,6 +14,18 @@ import {
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu.tsx'
 
+// On a computer the top bar lists « Invitations »; a phone's tab bar has no room for it.
+function PhoneInvitationsItem(): JSX.Element {
+  return (
+    <DropdownMenuItem asChild className="md:hidden">
+      <Link to="/admin/invitations">
+        <UserPlusIcon aria-hidden />
+        Invitations
+      </Link>
+    </DropdownMenuItem>
+  )
+}
+
 export function UserMenu(): JSX.Element | null {
   const { user, logout } = useAuth()
   if (user === null) return null
@@ -21,7 +33,8 @@ export function UserMenu(): JSX.Element | null {
   return (
     <DropdownMenu>
       <DropdownMenuTrigger
-        className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
+        // A finger gets 44 px around the avatar; a mouse keeps the avatar's own size.
+        className="grid place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-11"
         aria-label="Menu du compte"
       >
         <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
@@ -37,6 +50,7 @@ export function UserMenu(): JSX.Element | null {
             Préférences
           </Link>
         </DropdownMenuItem>
+        {user.role === 'admin' && <PhoneInvitationsItem />}
         <ThemeToggle />
         <DropdownMenuSeparator />
         <DropdownMenuItem onSelect={logout}>
diff --git a/client/src/components/nav/MobileNav.tsx b/client/src/components/nav/MobileNav.tsx
deleted file mode 100644
index 275b84a..0000000
--- a/client/src/components/nav/MobileNav.tsx
+++ /dev/null
@@ -1,80 +0,0 @@
-import { MenuIcon, SettingsIcon } from 'lucide-react'
-import { type JSX, useState } from 'react'
-import { NavLink } from 'react-router'
-import { LogoutButton } from '@/components/auth/LogoutButton.tsx'
-import { UserBadge } from '@/components/auth/UserBadge.tsx'
-import { useNavItems } from '@/components/nav/navItems.ts'
-import { ThemeToggle } from '@/components/theme/ThemeToggle.tsx'
-import { Button } from '@/components/ui/button.tsx'
-import {
-  Sheet,
-  SheetContent,
-  SheetDescription,
-  SheetHeader,
-  SheetTitle,
-  SheetTrigger,
-} from '@/components/ui/sheet.tsx'
-import { cn } from '@/lib/utils.ts'
-
-function navLinkClasses({ isActive }: { isActive: boolean }): string {
-  return cn(
-    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted',
-    isActive && 'bg-muted text-foreground',
-  )
-}
-
-// onNavigate closes the sheet; an item's own onClick (the frame's full screen) runs in the same click.
-function MobileNavLinks({ onNavigate }: { onNavigate: () => void }): JSX.Element {
-  const items = useNavItems()
-  return (
-    <nav className="flex flex-col gap-1 px-2">
-      {items.map(({ to, label, icon: Icon, onClick }) => (
-        // end: "/" would otherwise stay active on every page.
-        <NavLink
-          key={to}
-          to={to}
-          end
-          className={navLinkClasses}
-          onClick={() => {
-            onNavigate()
-            onClick?.()
-          }}
-        >
-          <Icon aria-hidden className="size-4" />
-          {label}
-        </NavLink>
-      ))}
-    </nav>
-  )
-}
-
-export function MobileNav(): JSX.Element {
-  const [isOpen, setIsOpen] = useState(false)
-
-  return (
-    <Sheet open={isOpen} onOpenChange={setIsOpen}>
-      <SheetTrigger asChild>
-        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
-          <MenuIcon />
-        </Button>
-      </SheetTrigger>
-      <SheetContent side="left" className="w-72">
-        <SheetHeader className="border-b">
-          <SheetTitle>FamilyFrame</SheetTitle>
-          <SheetDescription className="sr-only">Navigation</SheetDescription>
-          <UserBadge />
-        </SheetHeader>
-        <MobileNavLinks onNavigate={() => setIsOpen(false)} />
-        <div className="mt-auto flex flex-col border-t p-2">
-          {/* With the account actions, not in the pages list: it is about me, not a place. */}
-          <NavLink to="/settings" className={navLinkClasses} onClick={() => setIsOpen(false)}>
-            <SettingsIcon aria-hidden className="size-4" />
-            Préférences
-          </NavLink>
-          <ThemeToggle />
-          <LogoutButton />
-        </div>
-      </SheetContent>
-    </Sheet>
-  )
-}
diff --git a/client/src/components/nav/MobileTabBar.tsx b/client/src/components/nav/MobileTabBar.tsx
new file mode 100644
index 0000000..975db2d
--- /dev/null
+++ b/client/src/components/nav/MobileTabBar.tsx
@@ -0,0 +1,79 @@
+import {
+  CircleUserRoundIcon,
+  ImagesIcon,
+  type LucideIcon,
+  MonitorIcon,
+  UsersIcon,
+} from 'lucide-react'
+import type { JSX } from 'react'
+import { NavLink, useLocation } from 'react-router'
+import { enterFullscreen } from '@/fullscreen.ts'
+import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'
+
+type Tab = { to: string; label: string; icon: LucideIcon }
+
+const LIBRARY_TAB: Tab = { to: '/', label: 'Bibliothèque', icon: ImagesIcon }
+const FRIENDS_TAB: Tab = { to: '/friends', label: 'Amis', icon: UsersIcon }
+const ACCOUNT_TAB: Tab = { to: '/settings', label: 'Compte', icon: CircleUserRoundIcon }
+
+// NavLink sets aria-current="page" on the active tab: the styles read it.
+const TAB_CLASSES =
+  'group flex h-(--tab-bar-height) flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:text-foreground'
+const ICON_PILL_CLASSES =
+  'flex h-7 w-12 items-center justify-center rounded-full transition-colors group-aria-[current=page]:bg-muted'
+
+function TabLink({ to, label, icon: Icon }: Tab): JSX.Element {
+  return (
+    // end: "/" would otherwise stay active on every page.
+    <NavLink to={to} end className={TAB_CLASSES}>
+      <span className={ICON_PILL_CLASSES}>
+        <Icon aria-hidden className="size-5" />
+      </span>
+      {label}
+    </NavLink>
+  )
+}
+
+// Full screen is asked in the click itself: browsers grant it only during a user gesture. From
+// the library, the state lets leaving the frame go back to that library entry, as « Mode cadre ».
+function FrameTabLink(): JSX.Element {
+  const { pathname } = useLocation()
+  return (
+    <NavLink
+      to="/frame"
+      state={pathname === '/' ? LIBRARY_BELOW_STATE : null}
+      onClick={enterFullscreen}
+      className={TAB_CLASSES}
+    >
+      <span className={ICON_PILL_CLASSES}>
+        <MonitorIcon aria-hidden className="size-5" />
+      </span>
+      Cadre
+    </NavLink>
+  )
+}
+
+// Below md only: a phone's thumb reaches the bottom edge, not a menu in the top corner.
+export function MobileTabBar(): JSX.Element {
+  return (
+    <nav
+      aria-label="Navigation principale"
+      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur md:hidden"
+    >
+      <ul className="grid grid-cols-4">
+        <li>
+          <TabLink {...LIBRARY_TAB} />
+        </li>
+        <li>
+          <TabLink {...FRIENDS_TAB} />
+        </li>
+        <li>
+          <FrameTabLink />
+        </li>
+        <li>
+          <TabLink {...ACCOUNT_TAB} />
+        </li>
+      </ul>
+    </nav>
+  )
+}
diff --git a/client/src/components/theme/ThemeToggle.tsx b/client/src/components/theme/ThemeToggle.tsx
index aa1be6f..ce0ac05 100644
--- a/client/src/components/theme/ThemeToggle.tsx
+++ b/client/src/components/theme/ThemeToggle.tsx
@@ -16,7 +16,7 @@ const THEME_OPTIONS: ThemeOption[] = [
   { value: 'system', label: 'Système', icon: MonitorIcon },
 ]
 
-// Lives in the account menus: the desktop avatar menu and the mobile burger.
+// Lives in the avatar menu, on a computer and on a phone.
 export function ThemeToggle(): JSX.Element {
   const [preference, setPreference] = useState(readThemePreference)
 
diff --git a/client/src/components/ui/sonner.tsx b/client/src/components/ui/sonner.tsx
index a8aee03..9c668ed 100644
--- a/client/src/components/ui/sonner.tsx
+++ b/client/src/components/ui/sonner.tsx
@@ -17,6 +17,9 @@ const THEME_TOKENS: React.CSSProperties & Record<`--${string}`, string> = {
   '--border-radius': 'var(--radius)',
 }
 
+// On a phone, toasts rise above the tab bar and the home bar instead of covering them.
+const MOBILE_OFFSET = { bottom: 'calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 16px)' }
+
 function Toaster({ ...props }: ToasterProps) {
   const theme = useAppliedTheme()
 
@@ -32,6 +35,7 @@ function Toaster({ ...props }: ToasterProps) {
         loading: <Loader2Icon className="size-4 animate-spin" />,
       }}
       style={THEME_TOKENS}
+      mobileOffset={MOBILE_OFFSET}
       {...props}
     />
   )
diff --git a/client/src/index.css b/client/src/index.css
index c1361f0..9860928 100644
--- a/client/src/index.css
+++ b/client/src/index.css
@@ -8,6 +8,8 @@
 :root {
   /* The color-scheme meta lets the browser pick dark: a page left light by the theme keeps light controls. */
   color-scheme: light;
+  /* One height for the phone's tab bar, the room the pages leave for it, and what floats above it. */
+  --tab-bar-height: 4rem;
   --background: oklch(1 0 0);
   --foreground: oklch(0.145 0 0);
   --card: oklch(1 0 0);
diff --git a/docs/produit/amis.md b/docs/produit/amis.md
index 65044d6..0502c13 100644
--- a/docs/produit/amis.md
+++ b/docs/produit/amis.md
@@ -6,7 +6,7 @@ Deux membres deviennent amis quand l'un envoie une demande et que l'autre l'acce
 
 **Ce que l'on peut faire**
 
-- Ouvrir la page « Amis » depuis la barre du haut, ou le menu ☰ sur un téléphone ; c'est le seul endroit où gérer ses amis. Le panneau d'envoi d'une photo, sans ami, propose « Ajouter un ami », qui mène ici.
+- Ouvrir la page « Amis » depuis la barre du haut, ou l'onglet « Amis » sur un téléphone ; c'est le seul endroit où gérer ses amis. Le panneau d'envoi d'une photo, sans ami, propose « Ajouter un ami », qui mène ici.
 - Basculer entre deux vues : « Mes amis » et « En attente », chacune avec son nombre.
 - Dans « En attente », voir séparément les « Demandes reçues » et les « Demandes envoyées », chacune avec son nombre.
 
diff --git a/docs/produit/apparence-et-navigation.md b/docs/produit/apparence-et-navigation.md
index 98d0364..2c9f870 100644
--- a/docs/produit/apparence-et-navigation.md
+++ b/docs/produit/apparence-et-navigation.md
@@ -7,7 +7,7 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 **Ce que l'on peut faire**
 
 - Revenir à sa bibliothèque en touchant « FamilyFrame ».
-- Aller sur « Ma bibliothèque », « Cadre » ou « Amis » ; l'administrateur a en plus « Invitations ».
+- Sur un ordinateur, aller sur « Ma bibliothèque », « Cadre » ou « Amis » ; l'administrateur a en plus « Invitations ». Sur un téléphone, ces pages sont dans la barre d'onglets en bas de l'écran (voir [Barre d'onglets](#barre-donglets-téléphone)).
 
 **Règles**
 
@@ -15,7 +15,7 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 2. R-APP-02 · Elle reste visible en haut de l'écran quand on fait défiler la page.
 3. R-APP-03 · L'entrée de la page où l'on se trouve est mise en évidence.
 4. R-APP-04 · L'entrée « Invitations » n'apparaît que pour l'administrateur.
-5. R-APP-05 · Sur un écran large (ordinateur), les entrées s'affichent dans la barre et le menu du compte est à droite. Sur un écran étroit (téléphone), elles sont regroupées dans le menu mobile.
+5. R-APP-05 · Sur un écran large (ordinateur), les entrées s'affichent dans la barre et le menu du compte est à droite. Sur un écran étroit (téléphone), la barre ne garde que « FamilyFrame » et le menu du compte, à droite ; les entrées sont dans la barre d'onglets (R-APP-60).
 
 **Messages affichés**
 
@@ -27,60 +27,75 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 
 - Personnaliser ou réordonner les entrées.
 
-## Menu du compte (écran large)
+## Menu du compte
 
 **Ce que l'on peut faire**
 
-- Ouvrir le menu en touchant le rond de son profil (sa photo, ou son initiale), à droite de la barre.
+- Ouvrir le menu en touchant le rond de son profil (sa photo, ou son initiale), à droite de la barre du haut, sur un ordinateur comme sur un téléphone.
 - Y voir son nom, son adresse e-mail et, pour l'administrateur, la mention « Admin ».
 - Y ouvrir ses « Préférences », choisir son thème et se déconnecter.
+- Sur un téléphone, pour l'administrateur, y ouvrir aussi « Invitations ».
 
 **Règles**
 
 1. R-APP-10 · Remplacée : le rond affiche la photo de profil quand il y en a une (R-APP-55). Il affichait la première lettre du nom, en majuscule.
-2. R-APP-11 · La mention « Admin » s'affiche à côté du nom de l'administrateur, dans le menu du compte et dans le menu mobile.
+2. R-APP-11 · La mention « Admin » s'affiche à côté du nom de l'administrateur, dans le menu du compte.
 3. R-APP-55 · Le rond de profil, dans le menu du compte, montre la photo de profil de la personne quand elle en a une, et sa première lettre en majuscule sinon. « Préférences » ouvre la page décrite dans [preferences.md](preferences.md).
+4. R-APP-12 · Sur un téléphone, le menu du compte propose aussi « Invitations » à l'administrateur, juste sous « Préférences » : la barre d'onglets n'a pas cette entrée. Sur un ordinateur, « Invitations » reste dans la barre du haut et n'est pas répété dans le menu.
 
 **Messages affichés**
 
-| Situation                       | Message                                                                                     |
-| ------------------------------- | ------------------------------------------------------------------------------------------- |
-| Nom du bouton (lecture d'écran) | « Menu du compte »                                                                          |
-| Contenu                         | [nom], « Admin » (administrateur), [e-mail], « Préférences », « Thème », « Se déconnecter » |
+| Situation                       | Message                                                                                                                                         |
+| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
+| Nom du bouton (lecture d'écran) | « Menu du compte »                                                                                                                              |
+| Contenu                         | [nom], « Admin » (administrateur), [e-mail], « Préférences », « Invitations » (administrateur, sur un téléphone), « Thème », « Se déconnecter » |
 
 **Ce qui n'est pas possible**
 
 - Rien de particulier.
 
-## Menu mobile (écran étroit)
+## Barre d'onglets (téléphone)
 
 **Ce que l'on peut faire**
 
-- Ouvrir le menu avec le bouton à trois traits, à gauche de la barre : il glisse depuis le bord gauche.
-- Y retrouver son nom, son adresse e-mail, les entrées de navigation, « Préférences », le choix du thème et « Se déconnecter ».
+- Sur un téléphone, aller d'un toucher sur « Bibliothèque », « Amis », « Cadre » ou « Compte », avec la barre d'onglets en bas de l'écran, sous le pouce.
 
 **Règles**
 
-1. R-APP-20 · Toucher une entrée de navigation ferme le menu et ouvre la page.
-2. R-APP-21 · Le menu se ferme aussi en touchant à côté ou avec sa croix.
+1. R-APP-60 · Sur un écran étroit (téléphone), une barre d'onglets en bas de l'écran remplace l'ancien menu à trois traits : « Bibliothèque », « Amis », « Cadre », « Compte ». Sur un écran large (ordinateur), il n'y a pas de barre d'onglets : rien ne change.
+2. R-APP-61 · La barre d'onglets est présente sur la bibliothèque, la page « Amis », les préférences et la page des invitations. Elle n'apparaît ni sur le cadre, ni sur la page de connexion, ni sur la page d'invitation, ni sur la page introuvable.
+3. R-APP-62 · L'onglet de la page où l'on se trouve est mis en évidence. Sur la page des invitations, qui s'ouvre depuis le menu du compte (R-APP-12), aucun onglet ne l'est.
+4. R-APP-63 · « Compte » ouvre la page « Préférences » (voir [preferences.md](preferences.md)). Le thème et « Se déconnecter » restent dans le menu du compte (rond de profil, en haut à droite).
+5. R-APP-64 · « Cadre » ouvre le cadre en plein écran, comme « Mode cadre » (R-CAD-58). Ouvert depuis la bibliothèque, quitter le cadre ramène à cette bibliothèque.
+6. R-APP-65 · La barre d'onglets reste en bas de l'écran quand on fait défiler la page, et la fin de chaque page reste visible au-dessus d'elle.
+7. R-APP-66 · Sur un téléphone, les courtes notifications (R-APP-53) s'affichent au-dessus de la barre d'onglets, sans la cacher.
 
 **Messages affichés**
 
-| Situation                       | Message            |
-| ------------------------------- | ------------------ |
-| Nom du bouton (lecture d'écran) | « Ouvrir le menu » |
-| Titre du menu                   | « FamilyFrame »    |
-| Entrée du compte                | « Préférences »    |
+| Situation                         | Message                                           |
+| --------------------------------- | ------------------------------------------------- |
+| Onglets                           | « Bibliothèque », « Amis », « Cadre », « Compte » |
+| Nom de la barre (lecture d'écran) | « Navigation principale »                         |
 
 **Ce qui n'est pas possible**
 
-- Rien de plus que dans le menu du compte et la barre du haut.
+- Personnaliser ou réordonner les onglets.
+- Ouvrir « Invitations » depuis la barre d'onglets : l'entrée est dans le menu du compte (R-APP-12).
+
+## Menu mobile (retiré)
+
+Le menu à trois traits a laissé sa place à la barre d'onglets (R-APP-60) et au menu du compte, désormais affiché aussi sur un téléphone. Les règles ci-dessous gardent leur numéro.
+
+**Règles**
+
+1. R-APP-20 · Remplacée : le menu mobile n'existe plus ; un onglet ouvre directement sa page (R-APP-60).
+2. R-APP-21 · Remplacée : le menu mobile n'existe plus ; le menu du compte se ferme en touchant à côté, comme sur un ordinateur.
 
 ## Thème clair, sombre ou système
 
 **Ce que l'on peut faire**
 
-- Choisir, dans le menu du compte ou le menu mobile, sur la ligne « Thème » : « Clair », « Sombre » ou « Système ».
+- Choisir, dans le menu du compte, sur la ligne « Thème » : « Clair », « Sombre » ou « Système ».
 
 **Règles**
 
@@ -128,7 +143,7 @@ Aucun message.
 
 **Règles**
 
-1. R-APP-40 · Toute adresse inconnue de l'application, ouverte en étant connecté, affiche la page introuvable, avec la barre du haut.
+1. R-APP-40 · Toute adresse inconnue de l'application, ouverte en étant connecté, affiche la page introuvable, avec la barre du haut mais sans la barre d'onglets du téléphone.
 2. R-APP-41 · Sans être connecté, une adresse inconnue mène d'abord à la page de connexion (R-CNX-31).
 
 **Messages affichés**
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 907b172..a959678 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -1,6 +1,6 @@
 # Bibliothèque
 
-La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée. C'est la page d'accueil de l'application une fois connecté (« Ma bibliothèque » dans le menu, « Bibliothèque » en titre de la page). La page est consacrée aux photos : les amis se gèrent sur la page « Amis » (voir [amis.md](amis.md)). Le cadre affiche ces mêmes photos (voir [cadre.md](cadre.md)) ; l'envoi à un ami est décrit dans [partage.md](partage.md).
+La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajoutées et celles que ses amis lui ont envoyées. Elle est privée. C'est la page d'accueil de l'application une fois connecté (« Ma bibliothèque » dans la barre du haut, l'onglet « Bibliothèque » sur un téléphone, « Bibliothèque » en titre de la page). La page est consacrée aux photos : les amis se gèrent sur la page « Amis » (voir [amis.md](amis.md)). Le cadre affiche ces mêmes photos (voir [cadre.md](cadre.md)) ; l'envoi à un ami est décrit dans [partage.md](partage.md).
 
 ## Ajouter une photo
 
@@ -84,7 +84,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 14. R-BIB-39 · Supprimer la photo affichée montre la suivante ; s'il n'en reste aucune, la photo se ferme.
 15. R-BIB-40 · Le bouton retour du téléphone ferme la photo.
 16. R-BIB-41 · Un lien vers une photo qui n'existe plus ramène simplement à la bibliothèque.
-17. R-BIB-45 · La bibliothèque ne propose ni la gestion des amis ni les invitations : « Amis » et, pour l'administrateur, « Invitations » sont dans le menu (barre du haut, ou ☰ sur un téléphone).
+17. R-BIB-45 · La bibliothèque ne propose ni la gestion des amis ni les invitations : « Amis » et, pour l'administrateur, « Invitations » sont dans la barre du haut sur un ordinateur ; sur un téléphone, « Amis » est un onglet de la barre d'onglets et « Invitations » est dans le menu du compte.
 18. R-BIB-46 · Le nombre de photos s'affiche sous le titre (« 12 photos ») ; « Plus de 30 photos » tant que des photos plus anciennes ne sont pas encore chargées. Dans une collection, il compte les photos de cette collection ; il disparaît quand la collection ne peut pas s'afficher (« Cette collection n'existe plus. »).
 19. R-BIB-47 · Une bibliothèque vide propose « Ajouter une photo », qui ouvre le même panneau que « Ajouter ».
 20. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index a9569fb..d807583 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -1,6 +1,6 @@
 # Cadre
 
-Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)), ou celles d'une de ses collections (voir [collections.md](collections.md)), et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut, ou avec « Mode cadre » depuis la bibliothèque ou une photo ouverte : il passe alors en plein écran. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.
+Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)), ou celles d'une de ses collections (voir [collections.md](collections.md)), et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut (l'onglet « Cadre » sur un téléphone), ou avec « Mode cadre » depuis la bibliothèque ou une photo ouverte : il passe alors en plein écran. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.
 
 ## Mettre en place un cadre
 
@@ -8,7 +8,7 @@ Le cadre est la page à laisser affichée en plein écran sur l'appareil posé c
 
 - Se connecter sur l'appareil du cadre avec le compte dont on veut afficher les photos, puis ouvrir « Cadre ».
 - Laisser l'appareil allumé : le cadre reste connecté et à jour sans intervention.
-- Ouvrir le cadre en plein écran d'un seul toucher, depuis la barre du haut, la bibliothèque ou une photo ouverte.
+- Ouvrir le cadre en plein écran d'un seul toucher, depuis la barre du haut (ou la barre d'onglets d'un téléphone), la bibliothèque ou une photo ouverte.
 - Passer en plein écran avec le bouton « Plein écran » quand le cadre a été ouvert directement (au démarrage de l'appareil, par exemple).
 - Quitter le cadre (✕, Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo qui était affichée.
 
@@ -16,7 +16,7 @@ Le cadre est la page à laisser affichée en plein écran sur l'appareil posé c
 
 1. R-CAD-01 · Un cadre affiche les photos d'un seul compte : celui qui y est connecté.
 2. R-CAD-02 · Le cadre est toujours sombre, quel que soit le thème choisi, pour mettre les photos en valeur.
-3. R-CAD-03 · Le cadre occupe toute la page : la barre du haut et les menus de l'application n'y sont pas affichés.
+3. R-CAD-03 · Le cadre occupe toute la page : la barre du haut, la barre d'onglets du téléphone et les menus de l'application n'y sont pas affichés.
 4. R-CAD-04 · Le cadre affiche toutes les photos de la bibliothèque, ou de la sélection du jour ou de la collection choisie (R-CAD-77), des plus récentes aux plus anciennes, sans limite de nombre : les anciennes photos ne disparaissent jamais du cadre.
 5. R-CAD-05 · Le cadre recharge toutes ses photos une fois par jour. Cela garde sa connexion active (voir [comptes-et-connexion.md](comptes-et-connexion.md#rester-connecté)) : un cadre allumé en continu ne se déconnecte jamais.
 6. R-CAD-06 · Un cadre rallumé alors que le réseau n'est pas encore prêt attend et réessaie seul toutes les 5 secondes, sans afficher la page de connexion (R-CNX-16).
@@ -27,7 +27,7 @@ Le cadre est la page à laisser affichée en plein écran sur l'appareil posé c
 11. R-CAD-55 · Sans photo à montrer, le cadre dit pourquoi : chargement en cours, aucune photo encore, collection lue vide (R-CAD-82), ou chargement impossible ; il réessaie tout seul quand la connexion revient.
 12. R-CAD-56 · Un bouton « Retour à la bibliothèque » permet toujours de sortir du cadre.
 13. R-CAD-57 · Lancé depuis une photo, le diaporama commence par cette photo.
-14. R-CAD-58 · Ouvert depuis l'application (« Cadre » dans la barre du haut, « Mode cadre » dans la bibliothèque ou sur une photo ouverte), le cadre passe en plein écran. Sur un appareil qui ne le permet pas (iPhone), ou si le navigateur le refuse, le cadre s'affiche dans la page, sans message.
+14. R-CAD-58 · Ouvert depuis l'application (« Cadre » dans la barre du haut ou dans la barre d'onglets d'un téléphone, « Mode cadre » dans la bibliothèque ou sur une photo ouverte), le cadre passe en plein écran. Sur un appareil qui ne le permet pas (iPhone), ou si le navigateur le refuse, le cadre s'affiche dans la page, sans message.
 15. R-CAD-59 · Sortir du plein écran, de n'importe quelle façon (✕, touche Échap, touche F11, geste de l'appareil), quitte le cadre : on revient à la bibliothèque, sur la photo qui était affichée, ou à la bibliothèque seule s'il n'y avait pas de photo. Exception : si un menu ou une fenêtre est ouvert (menu « … », « Envoyer à des proches », « Supprimer cette photo ? »), sortir du plein écran ne quitte pas le cadre, car la touche Échap visait ce menu : le cadre reste affiché, hors plein écran, et le bouton « Plein écran » revient.
 16. R-CAD-60 · Quitter le cadre autrement (bouton retour du navigateur, « Retour à la bibliothèque ») sort aussi du plein écran : la bibliothèque ne reste jamais en plein écran.
 17. R-CAD-61 · Tant que le cadre n'est pas en plein écran, un bouton « Plein écran » s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo. Sur le diaporama, il s'efface avec les autres boutons (R-CAD-24). Il n'apparaît pas sur un appareil qui ne permet pas le plein écran.
diff --git a/docs/produit/comptes-et-connexion.md b/docs/produit/comptes-et-connexion.md
index 01fd91e..bdbbd3f 100644
--- a/docs/produit/comptes-et-connexion.md
+++ b/docs/produit/comptes-et-connexion.md
@@ -71,7 +71,7 @@ Comment on entre dans FamilyFrame, combien de temps on y reste connecté et comm
 
 **Ce que l'on peut faire**
 
-- Se déconnecter avec « Se déconnecter », depuis le menu du compte (ordinateur), le menu mobile (téléphone) ou la page d'invitation quand on y arrive déjà connecté.
+- Se déconnecter avec « Se déconnecter », depuis le menu du compte (rond de profil en haut à droite, sur un ordinateur comme sur un téléphone) ou la page d'invitation quand on y arrive déjà connecté.
 
 **Règles**
 
diff --git a/docs/produit/invitations.md b/docs/produit/invitations.md
index 06b1997..931f457 100644
--- a/docs/produit/invitations.md
+++ b/docs/produit/invitations.md
@@ -6,7 +6,7 @@ Personne ne s'inscrit seul dans FamilyFrame : l'administrateur crée un lien d'i
 
 **Ce que l'on peut faire**
 
-- Ouvrir la page « Invitations » depuis la barre du haut (entrée « Invitations ») ou depuis la bibliothèque (bouton « Inviter un proche sur FamilyFrame »). Ces deux accès n'apparaissent que pour l'administrateur.
+- Ouvrir la page « Invitations » depuis la barre du haut (entrée « Invitations » ; sur un téléphone, dans le menu du compte) ou depuis la bibliothèque (bouton « Inviter un proche sur FamilyFrame »). Ces deux accès n'apparaissent que pour l'administrateur.
 - Saisir l'adresse e-mail de la personne à inviter et créer le lien.
 - Copier le lien d'un clic avec « Copier le lien », ou le sélectionner pour le copier à la main.
 - Transmettre le lien soi-même, par le moyen de son choix (SMS, message, e-mail personnel).
diff --git a/docs/produit/preferences.md b/docs/produit/preferences.md
index 60569e8..83bd689 100644
--- a/docs/produit/preferences.md
+++ b/docs/produit/preferences.md
@@ -6,13 +6,13 @@ La page où chacun règle son compte : sa photo de profil, son nom affiché et s
 
 **Ce que l'on peut faire**
 
-- Ouvrir la page « Préférences » depuis le menu du compte (écran large) ou depuis le menu mobile (écran étroit).
+- Ouvrir la page « Préférences » depuis le menu du compte, ou avec l'onglet « Compte » de la barre d'onglets sur un téléphone.
 
 **Règles**
 
-1. R-PRF-01 · L'entrée « Préférences » est dans le menu du compte, juste au-dessus du choix du thème ; dans le menu mobile, elle est avec « Se déconnecter », sous la liste des pages.
-2. R-PRF-02 · Toucher « Préférences » dans le menu mobile ferme le menu et ouvre la page.
-3. R-PRF-03 · La page est réservée aux personnes connectées, comme les autres pages (R-CNX-30). Elle a la barre du haut.
+1. R-PRF-01 · L'entrée « Préférences » est dans le menu du compte, juste au-dessus du choix du thème, sur un ordinateur comme sur un téléphone. Sur un téléphone, l'onglet « Compte » ouvre aussi la page (R-APP-63).
+2. R-PRF-02 · Remplacée : le menu mobile n'existe plus ; l'onglet « Compte » ouvre la page d'un toucher (R-APP-63).
+3. R-PRF-03 · La page est réservée aux personnes connectées, comme les autres pages (R-CNX-30). Elle a la barre du haut et, sur un téléphone, la barre d'onglets, « Compte » mis en évidence.
 4. R-PRF-04 · Chaque encart s'enregistre seul : « Enregistrer » n'envoie que les changements de son encart, ce qui est saisi dans les autres reste en place. L'encart « Cadre de cet appareil » n'a pas de bouton : un choix s'applique aussitôt (R-PRF-50).
 
 **Messages affichés**
@@ -20,7 +20,7 @@ La page où chacun règle son compte : sa photo de profil, son nom affiché et s
 | Situation           | Message                                                                                      |
 | ------------------- | -------------------------------------------------------------------------------------------- |
 | En-tête de la page  | « Préférences » — « Votre profil, la sécurité de votre compte et le cadre de cet appareil. » |
-| Entrée des menus    | « Préférences »                                                                              |
+| Entrée des menus    | « Préférences » (menu du compte), « Compte » (barre d'onglets)                               |
 | Pendant l'envoi     | « Enregistrement… » (sur le bouton « Enregistrer »)                                          |
 | Enregistrement fait | « Enregistré. »                                                                              |
 
~~~~

### Task 3: Floating add button

**Commit:** `feat(client): floating add button within the thumb's reach on phones`

**Scope:** `AddPhotoFab`; the header's « Ajouter » and « Mode cadre » hidden below `md`; bottom padding of the library page; R-BIB-48.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 75aea37..60732cd 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -43,15 +43,15 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 ## Pages
 
-| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
-| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
-| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
-| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
-| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
-| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
-| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et l'onglet « Compte » du téléphone : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
-| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+| Chemin               | Page                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `/login`             | connexion : e-mail et mot de passe ; renvoie ensuite vers la page demandée                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
+| `/invite/:token`     | invitation (publique) : « Rejoindre FamilyFrame », choix du nom et du mot de passe (saisi deux fois, il n'y a pas de réinitialisation), puis la bibliothèque, connecté ; déjà connecté, une carte propose de se déconnecter d'abord                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
+| `/`                  | bibliothèque, consacrée aux photos (les amis sont sur `/friends`) : en tête « Bibliothèque », le nombre de photos (« Plus de N photos » tant que des pages restent), « Ajouter », « Mode cadre » et le choix vignettes/liste (`LibraryHeader`) ; sous `md`, « Ajouter » devient un bouton flottant en bas à droite (`AddPhotoFab`) et « Mode cadre » laisse la place à l'onglet « Cadre » ; « Ajouter » ouvre le panneau « Ajouter une photo » (`AddPhotoPanel`, feuille par le bas sur mobile, fenêtre au centre sur ordinateur, comme le panneau d'envoi : `ResponsivePanel`) : « Prendre une photo » ou « Choisir une image » (JPEG, PNG ou WebP, les formats acceptés par le serveur), puis « Ajouter à ma bibliothèque » ou « Envoyer à un ami », qui ferme le panneau et ouvre celui de l'envoi, pour l'ami seulement ; puis, quand des photos reçues attendent, l'annonce compacte « Vous avez N nouvelles photos » et « Découvrir » (`components/mail/`), puis la rangée de collections « Toutes », « Noël »…, « Nouvelle collection » (`components/collections/CollectionChips`, des liens `/?collection=<id>` qui défilent de côté : retour et rechargement gardent la collection ; `useSelectedCollection` la retrouve dans la liste, « Cette collection n'existe plus. » sinon ; la collection affichée a son nom et un menu « … » « Lire sur le cadre » (enregistre la collection comme source du cadre de l'appareil, puis ouvre `/frame` en plein écran) / « Renommer » / « Supprimer » (`SelectedCollectionBar`, retour à `/` après suppression)), puis les photos du compte ou de la collection choisie (`usePhotoLibrary` passe `collectionId` à `GET /api/photos` et recharge la collection sur `collections:changed` ; une photo ajoutée depuis une collection y est rangée, `useLibraryUpload`) en vignettes ou en liste (choix mémorisé par appareil ; vide : « Ajouter une photo »), 30 par page avec « Charger plus » ; une photo s'ouvre en grand dans la visionneuse (`/?photo=<id>`, `components/viewer/` ; `collection` reste dans l'adresse et la visionneuse ne parcourt que les photos affichées) : balayage, flèches ou clavier pour passer à la suivante, « 3 / 42 » (« 30+ » tant que des pages restent), date et « Envoyée par X », ✕ ou Échap pour revenir à la vignette de la dernière photo vue ; ▶ « Mode cadre » lance le diaporama depuis la photo affichée ; son menu « … » propose « Lancer la radio », « Envoyer à un ami », « Collections » (une case par collection, et « Nouvelle collection… » qui y range la photo, `CollectionsSubmenu`) et « Supprimer », comme celui des vignettes, de la liste et du diaporama ; « Amis », « Invitations » (admin seulement) et « Se déconnecter » |
+| `/frame`             | cadre : le diaporama plein écran de toute la bibliothèque du compte connecté (toutes les pages, 100 photos par requête), de la sélection du jour, d'une de ses collections ou d'une radio (`/frame?radio=<id>`), avec en haut la pastille « Vous avez N nouvelles photos » qui lance la même découverte que la bibliothèque (`FrameNotices`, au-dessus de la pastille des nouvelles photos ; « Des photos vous attendent. » quand la bibliothèque est vide), celui qu'un cadre ouvre au démarrage ; ouvert depuis l'application, il passe en plein écran, et sortir du plein écran (Échap, F11) quitte le cadre ; son menu « … » propose « Photos » (Toute la bibliothèque, Sélection du jour, puis chaque collection), « Affichage » (Ajusté, Plein format, Passe-partout, Polaroïd), « Lecture » (Dans l'ordre, Aléatoire) et « Vitesse », retenus par appareil ; `/frame?photo=<id>` commence sur cette photo ; tant qu'une radio joue, « Photos » la montre en tête, cochée (« Radio ») ; ✕ « Quitter le mode cadre » ou Échap revient à la bibliothèque, visionneuse ouverte sur la photo affichée ; sans photo, un écran dit « Chargement des photos… », « En attente de la première photo… », « Cette collection est vide. » ou « Les photos n'ont pas pu être chargées. », avec « Retour à la bibliothèque »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+| `/friends`           | amis : un e-mail exact envoie une demande (« Envoyer la demande ») ; « Demandes reçues » (« Accepter », « Refuser ») et « Demandes envoyées » (« Annuler ») quand elles ne sont pas vides ; « Mes amis » avec « Retirer », qui demande confirmation ; les listes se rechargent après chaque action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+| `/settings`          | préférences, ouvertes par « Préférences » dans le menu du compte et l'onglet « Compte » du téléphone : une carte par réglage, chacune enregistrée seule ; « Photo de profil » (aperçu, « Changer la photo », « Retirer ») ; « Nom affiché » (prérempli) ; « Adresse e-mail » en lecture seule, avec un badge « Bientôt » ; « Mot de passe » (actuel, nouveau saisi deux fois), qui prévient que les autres appareils, le cadre compris, devront se reconnecter ; « Cadre de cet appareil » : photos lues (« Toute la bibliothèque », « Sélection du jour » ou une collection), modèle d'affichage, ordre et vitesse du cadre, retenus aussitôt sans « Enregistrer », dans ce navigateur (`useFrameSettings`, comme le menu du cadre)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+| `/admin/invitations` | invitations (admin) : un e-mail donne un lien à transmettre soi-même, affiché une seule fois avec « Copier le lien » ; liste des invitations avec leur état (« En attente », « Utilisée », « Expirée »)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
diff --git a/client/src/components/library/AddPhotoFab.tsx b/client/src/components/library/AddPhotoFab.tsx
new file mode 100644
index 0000000..7db39bb
--- /dev/null
+++ b/client/src/components/library/AddPhotoFab.tsx
@@ -0,0 +1,22 @@
+import { PlusIcon } from 'lucide-react'
+import type { JSX } from 'react'
+import { Button } from '@/components/ui/button.tsx'
+
+type AddPhotoFabProps = {
+  onAdd: () => void
+}
+
+// A phone's « Ajouter », where the thumb rests: bottom right, above the tab bar and the home bar.
+// A computer keeps the button in the header.
+export function AddPhotoFab({ onAdd }: AddPhotoFabProps): JSX.Element {
+  return (
+    <Button
+      onClick={onAdd}
+      aria-label="Ajouter une photo"
+      title="Ajouter une photo"
+      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom)_+_1rem)] z-20 size-14 rounded-full shadow-lg md:hidden"
+    >
+      <PlusIcon aria-hidden className="size-6" />
+    </Button>
+  )
+}
diff --git a/client/src/components/library/LibraryHeader.tsx b/client/src/components/library/LibraryHeader.tsx
index 58a5708..26810b5 100644
--- a/client/src/components/library/LibraryHeader.tsx
+++ b/client/src/components/library/LibraryHeader.tsx
@@ -23,7 +23,8 @@ function FrameModeButton(): JSX.Element {
     <Button
       asChild
       size="lg"
-      className="rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85 pointer-coarse:h-11"
+      // A phone opens the frame from the tab bar instead.
+      className="hidden rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85 pointer-coarse:h-11 md:inline-flex"
     >
       {/* The state: leaving the frame comes back to this library entry. Full screen is asked on
           the click itself: browsers grant it only during a user gesture. */}
@@ -43,7 +44,7 @@ export function LibraryHeader({
   showsCount,
 }: LibraryHeaderProps): JSX.Element {
   return (
-    // Wraps on a phone: the actions go under the title there.
+    // A phone has the floating « Ajouter » and the Cadre tab: only the layout toggle stays here.
     <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
       <div className="flex min-w-0 flex-col">
         <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
@@ -54,7 +55,7 @@ export function LibraryHeader({
         </p>
       </div>
       <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
-        <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
+        <Button size="lg" className="hidden pointer-coarse:h-11 md:inline-flex" onClick={onAdd}>
           <PlusIcon aria-hidden data-icon="inline-start" />
           Ajouter
         </Button>
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index 42375e6..cef87ec 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -1,6 +1,7 @@
 import { type JSX, type RefObject, useRef, useState } from 'react'
 import { CollectionChips } from '@/components/collections/CollectionChips.tsx'
 import { SelectedCollectionBar } from '@/components/collections/SelectedCollectionBar.tsx'
+import { AddPhotoFab } from '@/components/library/AddPhotoFab.tsx'
 import { AddPhotoPanel } from '@/components/library/AddPhotoPanel.tsx'
 import { LibraryHeader } from '@/components/library/LibraryHeader.tsx'
 import {
@@ -116,7 +117,8 @@ export default function LibraryPage(): JSX.Element {
   const allChipRef = useRef<HTMLAnchorElement>(null)
 
   return (
-    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:py-10">
+    // max-md:pb-24: the floating « Ajouter » never covers the last photos or « Charger plus ».
+    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 max-md:pb-24 sm:gap-6 sm:py-10">
       <LibraryContent
         selected={selected}
         library={library}
@@ -132,6 +134,7 @@ export default function LibraryPage(): JSX.Element {
         onUploaded={handleUploaded}
         isShowingPhotos={isShowingPhotos(selected)}
       />
+      <AddPhotoFab onAdd={() => setIsAdding(true)} />
     </main>
   )
 }
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index a959678..36e9e2c 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -6,7 +6,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 
 **Ce que l'on peut faire**
 
-- Toucher « Ajouter », en haut de la bibliothèque : le panneau « Ajouter une photo » s'ouvre, par le bas de l'écran sur un téléphone, au centre sur un ordinateur.
+- Toucher « Ajouter », en haut de la bibliothèque sur un ordinateur, ou le bouton rond « + » en bas à droite de l'écran sur un téléphone : le panneau « Ajouter une photo » s'ouvre, par le bas de l'écran sur un téléphone, au centre sur un ordinateur.
 - Dans ce panneau, prendre une photo avec l'appareil photo du téléphone (« Prendre une photo ») ou choisir une image déjà enregistrée (« Choisir une image »).
 - Voir un aperçu de la photo choisie avant de l'envoyer.
 - L'ajouter à sa bibliothèque avec « Ajouter à ma bibliothèque », ou l'envoyer directement à un ami avec « Envoyer à un ami » (voir [partage.md](partage.md#envoyer-une-photo-depuis-son-appareil)).
@@ -28,6 +28,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 13. R-BIB-12 · Après un ajout réussi, le panneau se ferme, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page. Ajoutée pendant qu'une collection est affichée, elle est aussi rangée dans cette collection (R-COL-21).
 14. R-BIB-13 · Après un échec, la photo reste choisie dans le panneau et un message explique la raison.
 15. R-BIB-44 · Fermer le panneau sans rien envoyer abandonne la photo choisie : il s'ouvre vide la fois suivante.
+16. R-BIB-48 · Sur un téléphone, « Ajouter » est un bouton rond « + » qui reste en bas à droite de l'écran, au-dessus de la barre d'onglets, pendant que l'on fait défiler les photos ; il n'apparaît que sur la bibliothèque. L'en-tête n'y montre plus « Ajouter » ni « Mode cadre » : le cadre s'ouvre avec l'onglet « Cadre » (R-APP-64). La fin de la page reste visible au-dessus du bouton.
 
 **Messages affichés**
 
@@ -61,7 +62,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Charger les photos plus anciennes avec « Charger plus ».
 - Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
 - Ouvrir le menu « … » d'une photo pour lancer sa radio sur le cadre (voir [cadre.md](cadre.md#radio)), l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
-- Lancer le mode cadre, en plein écran, depuis la bibliothèque, ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
+- Lancer le mode cadre, en plein écran, depuis la bibliothèque (« Mode cadre » sur un ordinateur, l'onglet « Cadre » sur un téléphone), ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
 - Découvrir les photos envoyées par ses proches depuis l'annonce placée sous l'en-tête (voir [partage.md](partage.md#recevoir-une-photo)).
 - N'afficher que les photos d'une collection, depuis la rangée « Toutes », « Noël », « Les vacances »… placée sous l'annonce (voir [collections.md](collections.md#parcourir-une-collection)).
 - Créer une collection au bout de cette rangée, et renommer, supprimer ou lire sur le cadre la collection affichée (voir [collections.md](collections.md)).
@@ -91,15 +92,16 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 
 **Messages affichés**
 
-| Situation                                 | Message                                                                                                        |
-| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
-| En-tête                                   | « Bibliothèque », le nombre de photos, et les boutons « Ajouter » et « Mode cadre »                            |
-| Chargement de la bibliothèque             | « Chargement… »                                                                                                |
-| Bibliothèque vide                         | « Aucune photo pour l'instant. » et le bouton « Ajouter une photo »                                            |
-| Photo en cours d'arrivée                  | « Chargement… »                                                                                                |
-| Chargement des photos suivantes           | « Chargement… » (sur le bouton « Charger plus »)                                                               |
-| Photos reçues en attente                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo)) |
-| Description d'une photo (lecture d'écran) | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                              |
+| Situation                                                 | Message                                                                                                        |
+| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
+| En-tête                                                   | « Bibliothèque », le nombre de photos, et les boutons « Ajouter » et « Mode cadre » (ordinateur)               |
+| Bouton d'ajout sur un téléphone (survol, lecture d'écran) | « Ajouter une photo »                                                                                          |
+| Chargement de la bibliothèque                             | « Chargement… »                                                                                                |
+| Bibliothèque vide                                         | « Aucune photo pour l'instant. » et le bouton « Ajouter une photo »                                            |
+| Photo en cours d'arrivée                                  | « Chargement… »                                                                                                |
+| Chargement des photos suivantes                           | « Chargement… » (sur le bouton « Charger plus »)                                                               |
+| Photos reçues en attente                                  | « Vous avez N nouvelles photos » et le bouton « Découvrir » (voir [partage.md](partage.md#recevoir-une-photo)) |
+| Description d'une photo (lecture d'écran)                 | « Photo du 24 novembre 2026 » ou « Photo envoyée par [nom], du 24 novembre 2026 »                              |
 
 **Ce qui n'est pas possible**
 
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index d807583..a8e8476 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -1,6 +1,6 @@
 # Cadre
 
-Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)), ou celles d'une de ses collections (voir [collections.md](collections.md)), et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut (l'onglet « Cadre » sur un téléphone), ou avec « Mode cadre » depuis la bibliothèque ou une photo ouverte : il passe alors en plein écran. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.
+Le cadre est la page à laisser affichée en plein écran sur l'appareil posé chez soi (tablette, vieil ordinateur, télévision). Il montre toutes les photos de la bibliothèque du compte connecté (voir [bibliotheque.md](bibliotheque.md)), ou celles d'une de ses collections (voir [collections.md](collections.md)), et reçoit les nouvelles en direct. On l'ouvre avec l'entrée « Cadre » de la barre du haut (l'onglet « Cadre » sur un téléphone), ou avec « Mode cadre » depuis la bibliothèque (sur un ordinateur) ou une photo ouverte : il passe alors en plein écran. Il n'affiche que le diaporama (une photo à la fois) ; les vignettes et la liste sont dans la bibliothèque.
 
 ## Mettre en place un cadre
 
~~~~

### Task 3a: Review fix: bottom padding between sm and md

**Commit:** `fix(client): keep the add button clear of the last photos between sm and md`

**Scope:** Library page padding written per side (`pt-6 pb-24 sm:pt-10 md:pb-10`). Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/pages/LibraryPage.tsx b/client/src/pages/LibraryPage.tsx
index cef87ec..3103c08 100644
--- a/client/src/pages/LibraryPage.tsx
+++ b/client/src/pages/LibraryPage.tsx
@@ -117,8 +117,9 @@ export default function LibraryPage(): JSX.Element {
   const allChipRef = useRef<HTMLAnchorElement>(null)
 
   return (
-    // max-md:pb-24: the floating « Ajouter » never covers the last photos or « Charger plus ».
-    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 max-md:pb-24 sm:gap-6 sm:py-10">
+    // pb-24 below md: the floating « Ajouter » never covers the last photos or « Charger plus ».
+    // Written per side so sm:pt-10 cannot undo it between sm and md.
+    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pt-6 pb-24 sm:gap-6 sm:pt-10 md:pb-10">
       <LibraryContent
         selected={selected}
         library={library}
~~~~

### Task 3b: Review fix: toasts above the tab bar up to md

**Commit:** `fix(client): raise toasts above the tab bar up to md`

**Scope:** `--toast-bottom` in `index.css`, read by both Sonner offsets; R-APP-66. Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/ui/sonner.tsx b/client/src/components/ui/sonner.tsx
index 9c668ed..69029aa 100644
--- a/client/src/components/ui/sonner.tsx
+++ b/client/src/components/ui/sonner.tsx
@@ -17,8 +17,9 @@ const THEME_TOKENS: React.CSSProperties & Record<`--${string}`, string> = {
   '--border-radius': 'var(--radius)',
 }
 
-// On a phone, toasts rise above the tab bar and the home bar instead of covering them.
-const MOBILE_OFFSET = { bottom: 'calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 16px)' }
+// Sonner switches to its mobile offset only up to 600 px, the tab bar shows up to md: both
+// offsets read --toast-bottom, which index.css sets per width.
+const TOAST_OFFSET = { bottom: 'var(--toast-bottom)' }
 
 function Toaster({ ...props }: ToasterProps) {
   const theme = useAppliedTheme()
@@ -35,7 +36,8 @@ function Toaster({ ...props }: ToasterProps) {
         loading: <Loader2Icon className="size-4 animate-spin" />,
       }}
       style={THEME_TOKENS}
-      mobileOffset={MOBILE_OFFSET}
+      offset={TOAST_OFFSET}
+      mobileOffset={TOAST_OFFSET}
       {...props}
     />
   )
diff --git a/client/src/index.css b/client/src/index.css
index 9860928..b4230c6 100644
--- a/client/src/index.css
+++ b/client/src/index.css
@@ -10,6 +10,8 @@
   color-scheme: light;
   /* One height for the phone's tab bar, the room the pages leave for it, and what floats above it. */
   --tab-bar-height: 4rem;
+  /* Toasts rise above the tab bar and the home bar while the bar shows (below md). */
+  --toast-bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 16px);
   --background: oklch(1 0 0);
   --foreground: oklch(0.145 0 0);
   --card: oklch(1 0 0);
@@ -111,6 +113,13 @@
   }
 }
 
+/* md and up: no tab bar, Sonner's own desktop offset. */
+@media (width >= 48rem) {
+  :root {
+    --toast-bottom: 24px;
+  }
+}
+
 .dark {
   color-scheme: dark;
   --background: oklch(0.145 0 0);
diff --git a/docs/produit/apparence-et-navigation.md b/docs/produit/apparence-et-navigation.md
index 2c9f870..a99db65 100644
--- a/docs/produit/apparence-et-navigation.md
+++ b/docs/produit/apparence-et-navigation.md
@@ -68,7 +68,7 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 4. R-APP-63 · « Compte » ouvre la page « Préférences » (voir [preferences.md](preferences.md)). Le thème et « Se déconnecter » restent dans le menu du compte (rond de profil, en haut à droite).
 5. R-APP-64 · « Cadre » ouvre le cadre en plein écran, comme « Mode cadre » (R-CAD-58). Ouvert depuis la bibliothèque, quitter le cadre ramène à cette bibliothèque.
 6. R-APP-65 · La barre d'onglets reste en bas de l'écran quand on fait défiler la page, et la fin de chaque page reste visible au-dessus d'elle.
-7. R-APP-66 · Sur un téléphone, les courtes notifications (R-APP-53) s'affichent au-dessus de la barre d'onglets, sans la cacher.
+7. R-APP-66 · Tant que la barre d'onglets est affichée (écran étroit), les courtes notifications (R-APP-53) s'affichent au-dessus d'elle, sans la cacher, quelle que soit la largeur de l'écran.
 
 **Messages affichés**
 
~~~~

### Task 3c: Review fix: navigation rules in number order

**Commit:** `docs: put the navigation rules back in number order`

**Scope:** `apparence-et-navigation.md` sections and rules reordered; R-PRF-01. Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/docs/produit/apparence-et-navigation.md b/docs/produit/apparence-et-navigation.md
index a99db65..d844343 100644
--- a/docs/produit/apparence-et-navigation.md
+++ b/docs/produit/apparence-et-navigation.md
@@ -40,8 +40,8 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 
 1. R-APP-10 · Remplacée : le rond affiche la photo de profil quand il y en a une (R-APP-55). Il affichait la première lettre du nom, en majuscule.
 2. R-APP-11 · La mention « Admin » s'affiche à côté du nom de l'administrateur, dans le menu du compte.
-3. R-APP-55 · Le rond de profil, dans le menu du compte, montre la photo de profil de la personne quand elle en a une, et sa première lettre en majuscule sinon. « Préférences » ouvre la page décrite dans [preferences.md](preferences.md).
-4. R-APP-12 · Sur un téléphone, le menu du compte propose aussi « Invitations » à l'administrateur, juste sous « Préférences » : la barre d'onglets n'a pas cette entrée. Sur un ordinateur, « Invitations » reste dans la barre du haut et n'est pas répété dans le menu.
+3. R-APP-12 · Sur un téléphone, le menu du compte propose aussi « Invitations » à l'administrateur, juste sous « Préférences » : la barre d'onglets n'a pas cette entrée. Sur un ordinateur, « Invitations » reste dans la barre du haut et n'est pas répété dans le menu.
+4. R-APP-55 · Le rond de profil, dans le menu du compte, montre la photo de profil de la personne quand elle en a une, et sa première lettre en majuscule sinon. « Préférences » ouvre la page décrite dans [preferences.md](preferences.md).
 
 **Messages affichés**
 
@@ -54,34 +54,6 @@ Comment on se déplace dans l'application, comment on choisit son thème, et les
 
 - Rien de particulier.
 
-## Barre d'onglets (téléphone)
-
-**Ce que l'on peut faire**
-
-- Sur un téléphone, aller d'un toucher sur « Bibliothèque », « Amis », « Cadre » ou « Compte », avec la barre d'onglets en bas de l'écran, sous le pouce.
-
-**Règles**
-
-1. R-APP-60 · Sur un écran étroit (téléphone), une barre d'onglets en bas de l'écran remplace l'ancien menu à trois traits : « Bibliothèque », « Amis », « Cadre », « Compte ». Sur un écran large (ordinateur), il n'y a pas de barre d'onglets : rien ne change.
-2. R-APP-61 · La barre d'onglets est présente sur la bibliothèque, la page « Amis », les préférences et la page des invitations. Elle n'apparaît ni sur le cadre, ni sur la page de connexion, ni sur la page d'invitation, ni sur la page introuvable.
-3. R-APP-62 · L'onglet de la page où l'on se trouve est mis en évidence. Sur la page des invitations, qui s'ouvre depuis le menu du compte (R-APP-12), aucun onglet ne l'est.
-4. R-APP-63 · « Compte » ouvre la page « Préférences » (voir [preferences.md](preferences.md)). Le thème et « Se déconnecter » restent dans le menu du compte (rond de profil, en haut à droite).
-5. R-APP-64 · « Cadre » ouvre le cadre en plein écran, comme « Mode cadre » (R-CAD-58). Ouvert depuis la bibliothèque, quitter le cadre ramène à cette bibliothèque.
-6. R-APP-65 · La barre d'onglets reste en bas de l'écran quand on fait défiler la page, et la fin de chaque page reste visible au-dessus d'elle.
-7. R-APP-66 · Tant que la barre d'onglets est affichée (écran étroit), les courtes notifications (R-APP-53) s'affichent au-dessus d'elle, sans la cacher, quelle que soit la largeur de l'écran.
-
-**Messages affichés**
-
-| Situation                         | Message                                           |
-| --------------------------------- | ------------------------------------------------- |
-| Onglets                           | « Bibliothèque », « Amis », « Cadre », « Compte » |
-| Nom de la barre (lecture d'écran) | « Navigation principale »                         |
-
-**Ce qui n'est pas possible**
-
-- Personnaliser ou réordonner les onglets.
-- Ouvrir « Invitations » depuis la barre d'onglets : l'entrée est dans le menu du compte (R-APP-12).
-
 ## Menu mobile (retiré)
 
 Le menu à trois traits a laissé sa place à la barre d'onglets (R-APP-60) et au menu du compte, désormais affiché aussi sur un téléphone. Les règles ci-dessous gardent leur numéro.
@@ -116,25 +88,6 @@ Le menu à trois traits a laissé sa place à la barre d'onglets (R-APP-60) et a
 - Choisir d'autres couleurs.
 - Retrouver son thème sur un nouvel appareil sans le choisir de nouveau.
 
-## Écran de téléphone
-
-**Ce que l'on peut faire**
-
-- Utiliser l'application sur toute la surface de l'écran d'un téléphone, encoche et coins arrondis compris.
-
-**Règles**
-
-1. R-APP-56 · Sur un téléphone à encoche, à coins arrondis ou à barre de navigation en bas, l'application occupe tout l'écran, mais aucun bouton ni texte ne passe sous l'encoche, dans un coin ou sous cette barre : la barre du haut, les panneaux qui montent du bas, la photo ouverte en grand, la découverte des photos reçues et le cadre gardent leurs boutons et leurs légendes dans la partie utilisable de l'écran, téléphone tenu droit ou couché.
-2. R-APP-57 · La barre du navigateur, autour de l'adresse, prend la couleur claire ou sombre du réglage de l'appareil, et la page s'affiche dans ces couleurs dès son ouverture. Avec un thème choisi à l'inverse de l'appareil (« Sombre » sur un appareil réglé en clair, par exemple), la barre du navigateur garde la couleur de l'appareil.
-
-**Messages affichés**
-
-Aucun message.
-
-**Ce qui n'est pas possible**
-
-- Choisir la couleur de la barre du navigateur.
-
 ## Page introuvable
 
 **Ce que l'on peut faire**
@@ -182,3 +135,50 @@ Aucun message.
 **Ce qui n'est pas possible**
 
 - Signaler un problème depuis l'application.
+
+## Écran de téléphone
+
+**Ce que l'on peut faire**
+
+- Utiliser l'application sur toute la surface de l'écran d'un téléphone, encoche et coins arrondis compris.
+
+**Règles**
+
+1. R-APP-56 · Sur un téléphone à encoche, à coins arrondis ou à barre de navigation en bas, l'application occupe tout l'écran, mais aucun bouton ni texte ne passe sous l'encoche, dans un coin ou sous cette barre : la barre du haut, les panneaux qui montent du bas, la photo ouverte en grand, la découverte des photos reçues et le cadre gardent leurs boutons et leurs légendes dans la partie utilisable de l'écran, téléphone tenu droit ou couché.
+2. R-APP-57 · La barre du navigateur, autour de l'adresse, prend la couleur claire ou sombre du réglage de l'appareil, et la page s'affiche dans ces couleurs dès son ouverture. Avec un thème choisi à l'inverse de l'appareil (« Sombre » sur un appareil réglé en clair, par exemple), la barre du navigateur garde la couleur de l'appareil.
+
+**Messages affichés**
+
+Aucun message.
+
+**Ce qui n'est pas possible**
+
+- Choisir la couleur de la barre du navigateur.
+
+## Barre d'onglets (téléphone)
+
+**Ce que l'on peut faire**
+
+- Sur un téléphone, aller d'un toucher sur « Bibliothèque », « Amis », « Cadre » ou « Compte », avec la barre d'onglets en bas de l'écran, sous le pouce.
+
+**Règles**
+
+1. R-APP-60 · Sur un écran étroit (téléphone), une barre d'onglets en bas de l'écran remplace l'ancien menu à trois traits : « Bibliothèque », « Amis », « Cadre », « Compte ». Sur un écran large (ordinateur), il n'y a pas de barre d'onglets : rien ne change.
+2. R-APP-61 · La barre d'onglets est présente sur la bibliothèque, la page « Amis », les préférences et la page des invitations. Elle n'apparaît ni sur le cadre, ni sur la page de connexion, ni sur la page d'invitation, ni sur la page introuvable.
+3. R-APP-62 · L'onglet de la page où l'on se trouve est mis en évidence. Sur la page des invitations, qui s'ouvre depuis le menu du compte (R-APP-12), aucun onglet ne l'est.
+4. R-APP-63 · « Compte » ouvre la page « Préférences » (voir [preferences.md](preferences.md)). Le thème et « Se déconnecter » restent dans le menu du compte (rond de profil, en haut à droite).
+5. R-APP-64 · « Cadre » ouvre le cadre en plein écran, comme « Mode cadre » (R-CAD-58). Ouvert depuis la bibliothèque, quitter le cadre ramène à cette bibliothèque.
+6. R-APP-65 · La barre d'onglets reste en bas de l'écran quand on fait défiler la page, et la fin de chaque page reste visible au-dessus d'elle.
+7. R-APP-66 · Tant que la barre d'onglets est affichée (écran étroit), les courtes notifications (R-APP-53) s'affichent au-dessus d'elle, sans la cacher, quelle que soit la largeur de l'écran.
+
+**Messages affichés**
+
+| Situation                         | Message                                           |
+| --------------------------------- | ------------------------------------------------- |
+| Onglets                           | « Bibliothèque », « Amis », « Cadre », « Compte » |
+| Nom de la barre (lecture d'écran) | « Navigation principale »                         |
+
+**Ce qui n'est pas possible**
+
+- Personnaliser ou réordonner les onglets.
+- Ouvrir « Invitations » depuis la barre d'onglets : l'entrée est dans le menu du compte (R-APP-12).
diff --git a/docs/produit/preferences.md b/docs/produit/preferences.md
index 83bd689..2711daf 100644
--- a/docs/produit/preferences.md
+++ b/docs/produit/preferences.md
@@ -10,7 +10,7 @@ La page où chacun règle son compte : sa photo de profil, son nom affiché et s
 
 **Règles**
 
-1. R-PRF-01 · L'entrée « Préférences » est dans le menu du compte, juste au-dessus du choix du thème, sur un ordinateur comme sur un téléphone. Sur un téléphone, l'onglet « Compte » ouvre aussi la page (R-APP-63).
+1. R-PRF-01 · L'entrée « Préférences » est dans le menu du compte, au-dessus du choix du thème, sur un ordinateur comme sur un téléphone ; sur un téléphone, l'administrateur a « Invitations » entre les deux (R-APP-12). Sur un téléphone, l'onglet « Compte » ouvre aussi la page (R-APP-63).
 2. R-PRF-02 · Remplacée : le menu mobile n'existe plus ; l'onglet « Compte » ouvre la page d'un toucher (R-APP-63).
 3. R-PRF-03 · La page est réservée aux personnes connectées, comme les autres pages (R-CNX-30). Elle a la barre du haut et, sur un téléphone, la barre d'onglets, « Compte » mis en évidence.
 4. R-PRF-04 · Chaque encart s'enregistre seul : « Enregistrer » n'envoie que les changements de son encart, ce qui est saisi dans les autres reste en place. L'encart « Cadre de cet appareil » n'a pas de bouton : un choix s'applique aussitôt (R-PRF-50).
~~~~

### Task 3d: Review fix: desktop avatar trigger unchanged

**Commit:** `fix(client): keep the desktop avatar trigger as it was`

**Scope:** `pointer-coarse:grid` on the avatar trigger. Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/auth/UserMenu.tsx b/client/src/components/auth/UserMenu.tsx
index f9f921d..fe06b8b 100644
--- a/client/src/components/auth/UserMenu.tsx
+++ b/client/src/components/auth/UserMenu.tsx
@@ -34,7 +34,7 @@ export function UserMenu(): JSX.Element | null {
     <DropdownMenu>
       <DropdownMenuTrigger
         // A finger gets 44 px around the avatar; a mouse keeps the avatar's own size.
-        className="grid place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:size-11"
+        className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:grid pointer-coarse:size-11 pointer-coarse:place-items-center"
         aria-label="Menu du compte"
       >
         <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
~~~~

---

## `feat/mobile-touch-targets`

### Task 4: Finger-sized primitives

**Commit:** `feat(client): finger-sized controls on touch screens`

**Scope:** `pointer-coarse:` sizes in `ui/button`, `ui/toggle`, `ui/input`, `ui/dropdown-menu`; hand fixes (password eye, setting choices, frame badges, FAB, upload pick buttons); R-APP-54 amended.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/form/PasswordInput.tsx b/client/src/components/form/PasswordInput.tsx
index e684436..fbb2fe9 100644
--- a/client/src/components/form/PasswordInput.tsx
+++ b/client/src/components/form/PasswordInput.tsx
@@ -10,13 +10,17 @@ export function PasswordInput(props: PasswordInputProps): JSX.Element {
 
   return (
     <div className="relative">
-      <Input {...props} type={isVisible ? 'text' : 'password'} className="pr-9" />
+      <Input
+        {...props}
+        type={isVisible ? 'text' : 'password'}
+        className="pr-9 pointer-coarse:pr-11"
+      />
       <button
         type="button"
         onClick={() => setIsVisible((visible) => !visible)}
         aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
         aria-pressed={isVisible}
-        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
+        className="absolute inset-y-0 right-0 flex w-9 items-center pointer-coarse:w-11 justify-center text-muted-foreground hover:text-foreground"
       >
         <Icon className="size-4" />
       </button>
diff --git a/client/src/components/frame/NewPhotosBadge.tsx b/client/src/components/frame/NewPhotosBadge.tsx
index a34af4c..1780ffa 100644
--- a/client/src/components/frame/NewPhotosBadge.tsx
+++ b/client/src/components/frame/NewPhotosBadge.tsx
@@ -17,7 +17,7 @@ export function NewPhotosBadge({ count, onSelect }: NewPhotosBadgeProps): JSX.El
       {count > 0 && (
         <Badge
           asChild
-          className="h-auto gap-2 rounded-full bg-frame-accent px-5 py-2 text-base font-medium text-black shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
+          className="h-auto gap-2 rounded-full pointer-coarse:min-h-11 bg-frame-accent px-5 py-2 text-base font-medium text-black shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
         >
           <button type="button" onClick={onSelect}>
             <span
diff --git a/client/src/components/frame/WaitingPhotosBadge.tsx b/client/src/components/frame/WaitingPhotosBadge.tsx
index 952d119..11830b5 100644
--- a/client/src/components/frame/WaitingPhotosBadge.tsx
+++ b/client/src/components/frame/WaitingPhotosBadge.tsx
@@ -16,7 +16,7 @@ export function WaitingPhotosBadge({ count, onSelect }: WaitingPhotosBadgeProps)
       {count > 0 && (
         <Badge
           asChild
-          className="h-auto gap-2 rounded-full bg-frame-print px-5 py-2 text-base font-medium text-black shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
+          className="h-auto gap-2 rounded-full pointer-coarse:min-h-11 bg-frame-print px-5 py-2 text-base font-medium text-black shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
         >
           <button type="button" onClick={onSelect}>
             <MailIcon aria-hidden className="size-4" />
diff --git a/client/src/components/library/AddPhotoFab.tsx b/client/src/components/library/AddPhotoFab.tsx
index 7db39bb..189b9e3 100644
--- a/client/src/components/library/AddPhotoFab.tsx
+++ b/client/src/components/library/AddPhotoFab.tsx
@@ -7,14 +7,14 @@ type AddPhotoFabProps = {
 }
 
 // A phone's « Ajouter », where the thumb rests: bottom right, above the tab bar and the home bar.
-// A computer keeps the button in the header.
+// A computer keeps the button in the header. pointer-coarse:size-14 beats the Button's coarse h-11.
 export function AddPhotoFab({ onAdd }: AddPhotoFabProps): JSX.Element {
   return (
     <Button
       onClick={onAdd}
       aria-label="Ajouter une photo"
       title="Ajouter une photo"
-      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom)_+_1rem)] z-20 size-14 rounded-full shadow-lg md:hidden"
+      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom)_+_1rem)] z-20 size-14 rounded-full pointer-coarse:size-14 shadow-lg md:hidden"
     >
       <PlusIcon aria-hidden className="size-6" />
     </Button>
diff --git a/client/src/components/library/UploadForm.tsx b/client/src/components/library/UploadForm.tsx
index d53e110..2777d32 100644
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@ -74,7 +74,8 @@ function PickButton({ label, icon, capture, onChange }: PickButtonProps): JSX.El
       <Button
         type="button"
         variant="outline"
-        className="h-20 flex-col gap-2 whitespace-normal"
+        // pointer-coarse:h-20 beats the Button's coarse h-11: the big tile stays big under a finger.
+        className="h-20 flex-col gap-2 whitespace-normal pointer-coarse:h-20"
         onClick={() => inputRef.current?.click()}
       >
         {icon}
diff --git a/client/src/components/settings/SettingToggleGroup.tsx b/client/src/components/settings/SettingToggleGroup.tsx
index 1bd82b7..839be77 100644
--- a/client/src/components/settings/SettingToggleGroup.tsx
+++ b/client/src/components/settings/SettingToggleGroup.tsx
@@ -7,7 +7,8 @@ import { cn } from '@/lib/utils.ts'
 // A collection's name can be long: the item grows and wraps instead of leaving the card.
 const ITEM_CLASSES = cn(
   'data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90',
-  'h-auto min-h-8 shrink py-1 whitespace-normal wrap-anywhere',
+  // h-auto beats the toggle's coarse h-11: a long label wraps instead of overflowing.
+  'h-auto min-h-8 shrink py-1 whitespace-normal wrap-anywhere pointer-coarse:h-auto pointer-coarse:min-h-11',
 )
 
 type SettingToggleGroupProps<Value extends string | number> = {
diff --git a/client/src/components/ui/button.tsx b/client/src/components/ui/button.tsx
index c553854..a360f22 100644
--- a/client/src/components/ui/button.tsx
+++ b/client/src/components/ui/button.tsx
@@ -3,6 +3,7 @@ import { cn } from 'cn'
 import { Slot } from 'radix-ui'
 import type * as React from 'react'
 
+// pointer-coarse: a finger needs about 44px (WCAG 2.5.5); a mouse keeps the compact sizes.
 const buttonVariants = cva(
   "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
   {
@@ -21,16 +22,16 @@ const buttonVariants = cva(
       },
       size: {
         default:
-          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
-        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
-        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
-        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
-        icon: 'size-8',
+          'h-8 gap-1.5 px-2.5 pointer-coarse:h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
+        xs: "h-6 pointer-coarse:h-11 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
+        sm: "h-7 pointer-coarse:h-11 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
+        lg: 'h-9 gap-1.5 px-2.5 pointer-coarse:h-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
+        icon: 'size-8 pointer-coarse:size-11',
         'icon-xs':
-          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
+          "size-6 pointer-coarse:size-11 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
         'icon-sm':
-          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
-        'icon-lg': 'size-9',
+          'size-7 pointer-coarse:size-11 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
+        'icon-lg': 'size-9 pointer-coarse:size-11',
       },
     },
     defaultVariants: {
diff --git a/client/src/components/ui/dropdown-menu.tsx b/client/src/components/ui/dropdown-menu.tsx
index 4a87bfe..c43e9cb 100644
--- a/client/src/components/ui/dropdown-menu.tsx
+++ b/client/src/components/ui/dropdown-menu.tsx
@@ -60,7 +60,7 @@ function DropdownMenuItem({
       data-inset={inset}
       data-variant={variant}
       className={cn(
-        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
+        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm pointer-coarse:min-h-11 outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
         className,
       )}
       {...props}
@@ -82,7 +82,7 @@ function DropdownMenuCheckboxItem({
       data-slot="dropdown-menu-checkbox-item"
       data-inset={inset}
       className={cn(
-        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
+        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm pointer-coarse:min-h-11 outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
         className,
       )}
       checked={checked}
@@ -120,7 +120,7 @@ function DropdownMenuRadioItem({
       data-slot="dropdown-menu-radio-item"
       data-inset={inset}
       className={cn(
-        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
+        "relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm pointer-coarse:min-h-11 outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
         className,
       )}
       {...props}
@@ -201,7 +201,7 @@ function DropdownMenuSubTrigger({
       data-slot="dropdown-menu-sub-trigger"
       data-inset={inset}
       className={cn(
-        "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
+        "flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm pointer-coarse:min-h-11 outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
         className,
       )}
       {...props}
diff --git a/client/src/components/ui/input.tsx b/client/src/components/ui/input.tsx
index 02c28ba..4f550c4 100644
--- a/client/src/components/ui/input.tsx
+++ b/client/src/components/ui/input.tsx
@@ -7,7 +7,7 @@ function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
       type={type}
       data-slot="input"
       className={cn(
-        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
+        'h-8 pointer-coarse:h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
         className,
       )}
       {...props}
diff --git a/client/src/components/ui/toggle.tsx b/client/src/components/ui/toggle.tsx
index f60413d..4094a9a 100644
--- a/client/src/components/ui/toggle.tsx
+++ b/client/src/components/ui/toggle.tsx
@@ -13,9 +13,9 @@ const toggleVariants = cva(
       },
       size: {
         default:
-          'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
-        sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
-        lg: 'h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
+          'h-8 min-w-8 px-2.5 pointer-coarse:h-11 pointer-coarse:min-w-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
+        sm: "h-7 min-w-7 pointer-coarse:h-11 pointer-coarse:min-w-11 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
+        lg: 'h-9 min-w-9 px-2.5 pointer-coarse:h-11 pointer-coarse:min-w-11 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
       },
     },
     defaultVariants: {
diff --git a/docs/produit/apparence-et-navigation.md b/docs/produit/apparence-et-navigation.md
index d844343..4206eb6 100644
--- a/docs/produit/apparence-et-navigation.md
+++ b/docs/produit/apparence-et-navigation.md
@@ -121,7 +121,7 @@ Le menu à trois traits a laissé sa place à la barre d'onglets (R-APP-60) et a
 2. R-APP-51 · Quand l'application elle-même rencontre un problème, un message invite à réessayer plus tard.
 3. R-APP-52 · Les erreurs propres à une fonctionnalité sont décrites dans le fichier de cette fonctionnalité.
 4. R-APP-53 · Les confirmations et les erreurs d'une action terminée s'affichent dans une courte notification en bas de l'écran, qui disparaît d'elle-même et suit le thème clair ou sombre.
-5. R-APP-54 · Sur un écran tactile, les petits boutons (menu « … » d'une photo, croix qui ferme une fenêtre) sont agrandis à la taille d'un doigt ; à la souris, ils restent compacts.
+5. R-APP-54 · Sur un écran tactile, tous les boutons, champs de saisie, entrées de menu et choix des préférences sont agrandis à la taille d'un doigt, y compris les plus petits (menu « … » d'une photo, croix qui ferme une fenêtre, œil du mot de passe). À la souris, ils restent compacts.
 
 **Messages affichés**
 
~~~~

### Task 5: Drop the per-component overrides

**Commit:** `refactor(client): drop per-component coarse overrides`

**Scope:** `COARSE_POINTER_TARGET_CLASSES` and the `pointer-coarse:` classes the primitives now give, removed. No behaviour change.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/collections/SelectedCollectionBar.tsx b/client/src/components/collections/SelectedCollectionBar.tsx
index 3558bed..c487742 100644
--- a/client/src/components/collections/SelectedCollectionBar.tsx
+++ b/client/src/components/collections/SelectedCollectionBar.tsx
@@ -86,13 +86,7 @@ function CollectionMenu({ name, onSelect, onPlay, triggerRef }: CollectionMenuPr
   return (
     <DropdownMenu>
       <DropdownMenuTrigger asChild>
-        <Button
-          ref={triggerRef}
-          variant="ghost"
-          size="icon"
-          className="pointer-coarse:size-11"
-          aria-label={`Actions pour ${name}`}
-        >
+        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={`Actions pour ${name}`}>
           <EllipsisIcon />
         </Button>
       </DropdownMenuTrigger>
diff --git a/client/src/components/frame/LayoutToggle.tsx b/client/src/components/frame/LayoutToggle.tsx
index c70c4d2..398ca59 100644
--- a/client/src/components/frame/LayoutToggle.tsx
+++ b/client/src/components/frame/LayoutToggle.tsx
@@ -15,8 +15,6 @@ export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps): JSX
       variant="outline"
       size="lg"
       spacing={0}
-      // Each item 44 px under a finger, the size touch guidelines ask for.
-      className="*:pointer-coarse:size-11"
       value={layout}
       // Radix sends '' when the pressed item is clicked again: keep the current layout.
       onValueChange={(value) => {
diff --git a/client/src/components/frame/PhotoActionsMenu.tsx b/client/src/components/frame/PhotoActionsMenu.tsx
index 115f19b..e6b0342 100644
--- a/client/src/components/frame/PhotoActionsMenu.tsx
+++ b/client/src/components/frame/PhotoActionsMenu.tsx
@@ -5,7 +5,6 @@ import { useCollections } from '@/collections/CollectionsContext.ts'
 import type { Collection } from '@/collections/collection.ts'
 import { CollectionNameDialog } from '@/components/collections/CollectionNameDialog.tsx'
 import { CollectionsSubmenu } from '@/components/collections/CollectionsSubmenu.tsx'
-import { COARSE_POINTER_TARGET_CLASSES } from '@/components/frame/controlClasses.ts'
 import { DeletePhotoDialog } from '@/components/frame/DeletePhotoDialog.tsx'
 import { ShareSheet } from '@/components/sharing/ShareSheet.tsx'
 import { Button } from '@/components/ui/button.tsx'
@@ -16,7 +15,6 @@ import {
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu.tsx'
 import { useStartRadio } from '@/hooks/useStartRadio.ts'
-import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
 
 type PhotoActionsMenuProps = {
@@ -99,7 +97,7 @@ function MenuTrigger({ label, className, triggerRef }: MenuTriggerProps): JSX.El
         variant="ghost"
         size="icon-sm"
         aria-label={label}
-        className={cn(COARSE_POINTER_TARGET_CLASSES, className)}
+        className={className}
       >
         <EllipsisIcon />
       </Button>
diff --git a/client/src/components/frame/controlClasses.ts b/client/src/components/frame/controlClasses.ts
index 43fbee1..33da3b6 100644
--- a/client/src/components/frame/controlClasses.ts
+++ b/client/src/components/frame/controlClasses.ts
@@ -10,6 +10,3 @@ export const GLASS_BUTTON_CLASSES = `${GLASS_CLASSES} size-11 text-white/80 hove
 // A button inside the glass pill: the pill is the glass, the button only lights up.
 export const PILL_BUTTON_CLASSES =
   'size-11 rounded-full text-white/80 hover:bg-white/10 hover:text-white dark:hover:bg-white/10 aria-pressed:bg-white/15 aria-pressed:text-white data-[state=on]:bg-white/15 data-[state=on]:text-white'
-
-// 44 px under a finger, the size touch guidelines ask for; a mouse keeps the compact button.
-export const COARSE_POINTER_TARGET_CLASSES = 'pointer-coarse:size-11'
diff --git a/client/src/components/library/LibraryHeader.tsx b/client/src/components/library/LibraryHeader.tsx
index 26810b5..0691a9f 100644
--- a/client/src/components/library/LibraryHeader.tsx
+++ b/client/src/components/library/LibraryHeader.tsx
@@ -24,7 +24,7 @@ function FrameModeButton(): JSX.Element {
       asChild
       size="lg"
       // A phone opens the frame from the tab bar instead.
-      className="hidden rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85 pointer-coarse:h-11 md:inline-flex"
+      className="hidden rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85 md:inline-flex"
     >
       {/* The state: leaving the frame comes back to this library entry. Full screen is asked on
           the click itself: browsers grant it only during a user gesture. */}
@@ -55,7 +55,7 @@ export function LibraryHeader({
         </p>
       </div>
       <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
-        <Button size="lg" className="hidden pointer-coarse:h-11 md:inline-flex" onClick={onAdd}>
+        <Button size="lg" className="hidden md:inline-flex" onClick={onAdd}>
           <PlusIcon aria-hidden data-icon="inline-start" />
           Ajouter
         </Button>
diff --git a/client/src/components/library/LibraryNotices.tsx b/client/src/components/library/LibraryNotices.tsx
index e50974d..5259549 100644
--- a/client/src/components/library/LibraryNotices.tsx
+++ b/client/src/components/library/LibraryNotices.tsx
@@ -9,7 +9,7 @@ type AddProps = { onAdd: () => void }
 
 function AddPhotoButton({ onAdd }: AddProps): JSX.Element {
   return (
-    <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
+    <Button size="lg" onClick={onAdd}>
       <ImagePlusIcon aria-hidden data-icon="inline-start" />
       Ajouter une photo
     </Button>
@@ -42,7 +42,7 @@ export function UnavailableCollection({ message }: { message: string }): JSX.Ele
   return (
     <div className={NOTICE_CLASSES}>
       <p className="text-muted-foreground">{message}</p>
-      <Button asChild variant="outline" className="pointer-coarse:h-11">
+      <Button asChild variant="outline">
         <Link to="/">Voir toutes les photos</Link>
       </Button>
     </div>
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index e80bec1..ba5d3f3 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -18,12 +18,7 @@ type LoadMoreButtonProps = Pick<PhotoLibrary, 'isLoadingMore' | 'loadMore'>
 function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.Element {
   return (
     <div className="flex justify-center px-4 pb-6 sm:px-8 sm:pb-8">
-      <Button
-        variant="outline"
-        className="pointer-coarse:h-11"
-        onClick={loadMore}
-        disabled={isLoadingMore}
-      >
+      <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
         {isLoadingMore ? 'Chargement…' : 'Charger plus'}
       </Button>
     </div>
diff --git a/client/src/components/library/UploadForm.tsx b/client/src/components/library/UploadForm.tsx
index 2777d32..cf989ce 100644
--- a/client/src/components/library/UploadForm.tsx
+++ b/client/src/components/library/UploadForm.tsx
@@ -114,19 +114,13 @@ function PickButtons({ onChange }: Pick<PickButtonProps, 'onChange'>): JSX.Eleme
 function UploadButtons({ hasFile, isSending, onShare }: UploadButtonsProps): JSX.Element {
   return (
     <div className="flex flex-col gap-2">
-      <Button
-        type="submit"
-        size="lg"
-        className="pointer-coarse:h-11"
-        disabled={!hasFile || isSending}
-      >
+      <Button type="submit" size="lg" disabled={!hasFile || isSending}>
         {isSending ? 'Envoi…' : 'Ajouter à ma bibliothèque'}
       </Button>
       <Button
         type="button"
         variant="outline"
         size="lg"
-        className="pointer-coarse:h-11"
         disabled={!hasFile || isSending}
         onClick={onShare}
       >
diff --git a/client/src/components/mail/MailAnnouncementCard.tsx b/client/src/components/mail/MailAnnouncementCard.tsx
index 63bd7fb..e3d3c71 100644
--- a/client/src/components/mail/MailAnnouncementCard.tsx
+++ b/client/src/components/mail/MailAnnouncementCard.tsx
@@ -27,9 +27,7 @@ export function MailAnnouncementCard({
           {sendersLabel([...photos].reverse())}
         </p>
       </div>
-      <Button className="pointer-coarse:h-11" onClick={onDiscover}>
-        Découvrir
-      </Button>
+      <Button onClick={onDiscover}>Découvrir</Button>
     </section>
   )
 }
diff --git a/client/src/components/ui/dialog.tsx b/client/src/components/ui/dialog.tsx
index 64c8b1e..77ba974 100644
--- a/client/src/components/ui/dialog.tsx
+++ b/client/src/components/ui/dialog.tsx
@@ -59,11 +59,7 @@ function DialogContent({
         {children}
         {showCloseButton && (
           <DialogPrimitive.Close data-slot="dialog-close" asChild>
-            <Button
-              variant="ghost"
-              className="absolute top-2 right-2 pointer-coarse:size-11"
-              size="icon-sm"
-            >
+            <Button variant="ghost" className="absolute top-2 right-2" size="icon-sm">
               <XIcon />
               <span className="sr-only">Fermer</span>
             </Button>
diff --git a/client/src/components/viewer/ViewerTopBar.tsx b/client/src/components/viewer/ViewerTopBar.tsx
index e74432e..3f45c84 100644
--- a/client/src/components/viewer/ViewerTopBar.tsx
+++ b/client/src/components/viewer/ViewerTopBar.tsx
@@ -20,7 +20,7 @@ function StartFrameButton({ onStartFrame }: Pick<ViewerTopBarProps, 'onStartFram
       size="sm"
       onClick={onStartFrame}
       // The glass, but a pill wide enough for its label.
-      className={cn(VIEWER_BUTTON_CLASSES, 'w-auto px-3 pointer-coarse:w-auto')}
+      className={cn(VIEWER_BUTTON_CLASSES, 'w-auto px-3')}
     >
       <PlayIcon data-icon="inline-start" />
       Mode cadre
diff --git a/client/src/components/viewer/viewerClasses.ts b/client/src/components/viewer/viewerClasses.ts
index 52841a1..eb3b1a0 100644
--- a/client/src/components/viewer/viewerClasses.ts
+++ b/client/src/components/viewer/viewerClasses.ts
@@ -1,12 +1,6 @@
-import {
-  COARSE_POINTER_TARGET_CLASSES,
-  GLASS_BUTTON_CLASSES,
-} from '@/components/frame/controlClasses.ts'
+import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
 import { cn } from '@/lib/utils.ts'
 
 // The frame's glass, smaller: a viewer on a computer screen does not need wall-sized buttons.
-export const VIEWER_BUTTON_CLASSES = cn(
-  GLASS_BUTTON_CLASSES,
-  'size-9',
-  COARSE_POINTER_TARGET_CLASSES,
-)
+// The Button's own coarse size still gives a finger 44 px.
+export const VIEWER_BUTTON_CLASSES = cn(GLASS_BUTTON_CLASSES, 'size-9')
~~~~

---

## `feat/frame-wake-lock`

### Task 6: Keep the frame screen awake

**Commit:** `feat(client): keep the frame screen awake`

**Scope:** `useScreenWakeLock`, called by `FramePage`; R-CAD-98; ARCHITECTURE.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/ARCHITECTURE.md b/ARCHITECTURE.md
index 60732cd..0b6c5a9 100644
--- a/ARCHITECTURE.md
+++ b/ARCHITECTURE.md
@@ -55,7 +55,7 @@ Le détail des fichiers n'est pas listé ici : il change trop vite pour rester j
 
 Visionneuse : l'adresse `/?photo=<id>` ouvre la photo, un lien la partage. Ouvrir depuis la bibliothèque ajoute une entrée d'historique, passer d'une photo à l'autre la remplace, et fermer revient en arrière : le bouton retour d'Android ferme la visionneuse. Près de la fin des photos chargées, la page suivante se charge. Une photo supprimée pendant qu'on la regarde laisse sa place à la suivante (la précédente si c'était la plus ancienne), et la visionneuse se ferme quand il n'en reste aucune ; un lien vers une photo inconnue charge les pages jusqu'à la trouver, puis ferme s'il n'y en a plus. « Mode cadre » remplace l'entrée de la visionneuse (ou s'ajoute au-dessus de la bibliothèque depuis son en-tête) : quitter le cadre ramène une seule visionneuse, et le retour arrière la bibliothèque. Le lien « Cadre » de la barre ajoute une entrée d'historique ordinaire : c'est aussi l'adresse qu'un cadre ouvre au démarrage.
 
-Plein écran (`client/src/fullscreen.ts`) : le navigateur ne l'accorde que pendant un geste de la personne, donc les entrées (lien « Cadre » de la barre du haut et de la barre d'onglets, « Mode cadre » de la bibliothèque et de la visionneuse) appellent `enterFullscreen()` dans le clic lui-même, avant la navigation ; c'est tout le document qui passe en plein écran, et la navigation de l'application, sans rechargement, l'y laisse. Un refus (réglage du navigateur, iPhone qui n'a pas de plein écran d'élément) est ignoré : le cadre fonctionne dans la fenêtre. En plein écran, le navigateur garde Échap pour lui : `useFrameFullscreen` écoute `fullscreenchange` et quitte le cadre quand le plein écran se termine, quelle qu'en soit la cause, sauf si un menu ou une fenêtre est ouvert (`isOverlayOpen`) : cet Échap visait la fenêtre, le cadre reste, hors plein écran ; au démontage (✕, retour arrière, lien), il retire son écouteur puis sort du plein écran, pour que la bibliothèque n'y reste jamais. Hors plein écran, Échap quitte le cadre comme avant (`useEscapeToClose`). Un cadre ouvert directement sur `/frame` n'a pas eu de clic : un bouton « Plein écran » (`components/frame/FullscreenButton.tsx`, état lu par `useIsFullscreen` avec `useSyncExternalStore`) s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo, tant que le document n'est pas en plein écran.
+Plein écran (`client/src/fullscreen.ts`) : le navigateur ne l'accorde que pendant un geste de la personne, donc les entrées (lien « Cadre » de la barre du haut et de la barre d'onglets, « Mode cadre » de la bibliothèque et de la visionneuse) appellent `enterFullscreen()` dans le clic lui-même, avant la navigation ; c'est tout le document qui passe en plein écran, et la navigation de l'application, sans rechargement, l'y laisse. Un refus (réglage du navigateur, iPhone qui n'a pas de plein écran d'élément) est ignoré : le cadre fonctionne dans la fenêtre. En plein écran, le navigateur garde Échap pour lui : `useFrameFullscreen` écoute `fullscreenchange` et quitte le cadre quand le plein écran se termine, quelle qu'en soit la cause, sauf si un menu ou une fenêtre est ouvert (`isOverlayOpen`) : cet Échap visait la fenêtre, le cadre reste, hors plein écran ; au démontage (✕, retour arrière, lien), il retire son écouteur puis sort du plein écran, pour que la bibliothèque n'y reste jamais. Hors plein écran, Échap quitte le cadre comme avant (`useEscapeToClose`). Un cadre ouvert directement sur `/frame` n'a pas eu de clic : un bouton « Plein écran » (`components/frame/FullscreenButton.tsx`, état lu par `useIsFullscreen` avec `useSyncExternalStore`) s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo, tant que le document n'est pas en plein écran. Écran allumé : `useScreenWakeLock` (`FramePage`) demande un Wake Lock « screen » pour que l'appareil ne se mette pas en veille, le redemande à chaque retour de la page au premier plan (le navigateur le lâche quand elle est cachée) et le rend au démontage ; sans prise en charge ou sur refus, rien n'est affiché.
 
 Réglages du cadre (`client/src/frameSettings.ts`) : le modèle d'affichage, l'ordre de lecture, la vitesse et la source des photos sont gardés par appareil dans le `localStorage` (clé `familyframe.frame-settings`, un objet JSON). Chaque valeur est vérifiée seule à la lecture : une valeur inconnue revient à sa valeur par défaut sans effacer les autres. Chaque accès est dans un `try/catch` : en navigation privée, ou si le stockage est bloqué, les choix valent pour la visite. `useFrameSettings` relit le stockage sur l'événement `storage`, que le navigateur envoie aux autres onglets du même site. La pause et le bandeau de vignettes restent en mémoire (`useSlideshowSettings`) : ils reviennent à leur valeur par défaut à chaque ouverture.
 
diff --git a/client/src/hooks/useScreenWakeLock.ts b/client/src/hooks/useScreenWakeLock.ts
new file mode 100644
index 0000000..7846bfb
--- /dev/null
+++ b/client/src/hooks/useScreenWakeLock.ts
@@ -0,0 +1,38 @@
+import { useEffect } from 'react'
+
+// A lock the browser already dropped (page hidden) has nothing left to release.
+function ignoreReleaseError(_error: unknown): void {}
+
+// A frame on a wall must not dim or lock after the device's idle delay. The browser drops the
+// lock each time the page is hidden, so it is asked again when the page comes back.
+export function useScreenWakeLock(): void {
+  useEffect(() => {
+    // Older browsers have no Wake Lock: the frame works, the screen follows its own settings.
+    if (!('wakeLock' in navigator)) return
+    let sentinel: WakeLockSentinel | null = null
+    let isActive = true
+
+    async function requestLock(): Promise<void> {
+      if (document.visibilityState !== 'visible') return
+      try {
+        const lock = await navigator.wakeLock.request('screen')
+        // The frame was left while the browser answered: nothing else would release this lock.
+        if (!isActive) {
+          await lock.release()
+          return
+        }
+        sentinel = lock
+      } catch {
+        // Refused (battery saver, browser setting): no message, the screen may just dim.
+      }
+    }
+
+    requestLock()
+    document.addEventListener('visibilitychange', requestLock)
+    return () => {
+      isActive = false
+      document.removeEventListener('visibilitychange', requestLock)
+      sentinel?.release().catch(ignoreReleaseError)
+    }
+  }, [])
+}
diff --git a/client/src/pages/FramePage.tsx b/client/src/pages/FramePage.tsx
index 1aa83c7..e4b4eb7 100644
--- a/client/src/pages/FramePage.tsx
+++ b/client/src/pages/FramePage.tsx
@@ -6,6 +6,7 @@ import { MailRevealDialog } from '@/components/mail/MailRevealDialog.tsx'
 import { type FrameMode, useFrameMode } from '@/hooks/useFrameMode.ts'
 import { useMailReveal } from '@/hooks/useMailReveal.ts'
 import { usePhotoMail } from '@/hooks/usePhotoMail.ts'
+import { useScreenWakeLock } from '@/hooks/useScreenWakeLock.ts'
 import { cn } from '@/lib/utils.ts'
 
 // The frame is a screen on a wall: dark keeps the photos in front.
@@ -60,6 +61,7 @@ export default function FramePage(): JSX.Element {
   const frame = useFrameMode()
   const mail = usePhotoMail()
   const reveal = useMailReveal()
+  useScreenWakeLock()
 
   // The photos just opened joined the slideshow while the reveal was open: they were seen,
   // no pill should announce them again.
diff --git a/docs/produit/cadre.md b/docs/produit/cadre.md
index a8e8476..085bbc2 100644
--- a/docs/produit/cadre.md
+++ b/docs/produit/cadre.md
@@ -7,7 +7,7 @@ Le cadre est la page à laisser affichée en plein écran sur l'appareil posé c
 **Ce que l'on peut faire**
 
 - Se connecter sur l'appareil du cadre avec le compte dont on veut afficher les photos, puis ouvrir « Cadre ».
-- Laisser l'appareil allumé : le cadre reste connecté et à jour sans intervention.
+- Laisser l'appareil allumé : le cadre reste connecté et à jour sans intervention, et l'écran ne se met pas en veille tant que le cadre est affiché.
 - Ouvrir le cadre en plein écran d'un seul toucher, depuis la barre du haut (ou la barre d'onglets d'un téléphone), la bibliothèque ou une photo ouverte.
 - Passer en plein écran avec le bouton « Plein écran » quand le cadre a été ouvert directement (au démarrage de l'appareil, par exemple).
 - Quitter le cadre (✕, Échap ou sortie du plein écran) pour revenir à la bibliothèque, sur la photo qui était affichée.
@@ -31,6 +31,7 @@ Le cadre est la page à laisser affichée en plein écran sur l'appareil posé c
 15. R-CAD-59 · Sortir du plein écran, de n'importe quelle façon (✕, touche Échap, touche F11, geste de l'appareil), quitte le cadre : on revient à la bibliothèque, sur la photo qui était affichée, ou à la bibliothèque seule s'il n'y avait pas de photo. Exception : si un menu ou une fenêtre est ouvert (menu « … », « Envoyer à des proches », « Supprimer cette photo ? »), sortir du plein écran ne quitte pas le cadre, car la touche Échap visait ce menu : le cadre reste affiché, hors plein écran, et le bouton « Plein écran » revient.
 16. R-CAD-60 · Quitter le cadre autrement (bouton retour du navigateur, « Retour à la bibliothèque ») sort aussi du plein écran : la bibliothèque ne reste jamais en plein écran.
 17. R-CAD-61 · Tant que le cadre n'est pas en plein écran, un bouton « Plein écran » s'affiche en haut à droite, sur le diaporama comme sur les écrans sans photo. Sur le diaporama, il s'efface avec les autres boutons (R-CAD-24). Il n'apparaît pas sur un appareil qui ne permet pas le plein écran.
+18. R-CAD-98 · Tant que le cadre est affiché, l'écran de l'appareil reste allumé : il ne s'assombrit pas et ne se verrouille pas, même sans toucher l'appareil. Quitter le cadre rend à l'appareil son réglage de mise en veille. Si l'on passe à une autre application puis revient au cadre, l'écran reste de nouveau allumé. Sur un appareil ou un navigateur qui ne le permet pas, ou en mode économie d'énergie, l'écran suit son propre réglage, sans message.
 
 **Messages affichés**
 
~~~~

### Task 6a: Review fix: wake lock hook under 30 lines

**Commit:** `refactor(client): bring the wake lock hook under 30 lines`

**Scope:** `requestScreenLock` module function. Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/hooks/useScreenWakeLock.ts b/client/src/hooks/useScreenWakeLock.ts
index 7846bfb..e194b45 100644
--- a/client/src/hooks/useScreenWakeLock.ts
+++ b/client/src/hooks/useScreenWakeLock.ts
@@ -3,6 +3,17 @@ import { useEffect } from 'react'
 // A lock the browser already dropped (page hidden) has nothing left to release.
 function ignoreReleaseError(_error: unknown): void {}
 
+// null when the page is hidden or the lock refused (battery saver, browser setting): no
+// message, the screen may just dim.
+async function requestScreenLock(): Promise<WakeLockSentinel | null> {
+  if (document.visibilityState !== 'visible') return null
+  try {
+    return await navigator.wakeLock.request('screen')
+  } catch {
+    return null
+  }
+}
+
 // A frame on a wall must not dim or lock after the device's idle delay. The browser drops the
 // lock each time the page is hidden, so it is asked again when the page comes back.
 export function useScreenWakeLock(): void {
@@ -13,18 +24,11 @@ export function useScreenWakeLock(): void {
     let isActive = true
 
     async function requestLock(): Promise<void> {
-      if (document.visibilityState !== 'visible') return
-      try {
-        const lock = await navigator.wakeLock.request('screen')
-        // The frame was left while the browser answered: nothing else would release this lock.
-        if (!isActive) {
-          await lock.release()
-          return
-        }
-        sentinel = lock
-      } catch {
-        // Refused (battery saver, browser setting): no message, the screen may just dim.
-      }
+      const lock = await requestScreenLock()
+      if (lock === null) return
+      // The frame was left while the browser answered: nothing else would release this lock.
+      if (!isActive) lock.release().catch(ignoreReleaseError)
+      else sentinel = lock
     }
 
     requestLock()
~~~~

---

## `feat/viewer-chrome`

### Task 7: Viewer controls step aside

**Commit:** `feat(client): viewer controls step aside`

**Scope:** `useViewerChrome`, `chromeClasses`; top bar, caption and arrows fade and turn inert; arrows hidden on coarse pointers; R-BIB-49 to -52.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/viewer/PhotoViewer.tsx b/client/src/components/viewer/PhotoViewer.tsx
index ac5fe5d..859e408 100644
--- a/client/src/components/viewer/PhotoViewer.tsx
+++ b/client/src/components/viewer/PhotoViewer.tsx
@@ -4,6 +4,7 @@ import { ViewerCaption } from '@/components/viewer/ViewerCaption.tsx'
 import { ViewerCarousel } from '@/components/viewer/ViewerCarousel.tsx'
 import { ViewerTopBar } from '@/components/viewer/ViewerTopBar.tsx'
 import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
+import { useViewerChrome } from '@/hooks/useViewerChrome.ts'
 import type { ViewerParam } from '@/hooks/useViewerParam.ts'
 import { useViewerPhoto } from '@/hooks/useViewerPhoto.ts'
 import type { Photo } from '@/photo.ts'
@@ -30,12 +31,19 @@ function focusPhotoTile(event: Event, photoId: string): void {
 }
 
 function ViewerPhoto({ library, viewer, photo, index }: ViewerPhotoProps): JSX.Element {
+  const chrome = useViewerChrome()
   return (
     <>
-      <ViewerCarousel photos={library.photos} currentId={photo.id} onCurrentChange={viewer.show} />
-      <ViewerCaption photo={photo} />
+      <ViewerCarousel
+        photos={library.photos}
+        currentId={photo.id}
+        onCurrentChange={viewer.show}
+        chrome={chrome}
+      />
+      <ViewerCaption photo={photo} isVisible={chrome.isVisible} />
       <ViewerTopBar
         photo={photo}
+        isVisible={chrome.isVisible}
         counter={viewerCounter(index, library)}
         onClose={viewer.close}
         onStartFrame={() => viewer.startFrame(photo.id)}
diff --git a/client/src/components/viewer/ViewerCaption.tsx b/client/src/components/viewer/ViewerCaption.tsx
index 69487f0..fb72dc6 100644
--- a/client/src/components/viewer/ViewerCaption.tsx
+++ b/client/src/components/viewer/ViewerCaption.tsx
@@ -1,16 +1,25 @@
 import type { JSX } from 'react'
+import { chromeClasses } from '@/components/viewer/viewerClasses.ts'
+import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
 import { formatPhotoDay, quotedMessage } from '@/photoLabel.ts'
 
 type ViewerCaptionProps = {
   photo: Photo
+  isVisible: boolean
 }
 
-export function ViewerCaption({ photo }: ViewerCaptionProps): JSX.Element {
+export function ViewerCaption({ photo, isVisible }: ViewerCaptionProps): JSX.Element {
   return (
     // Swipes over the caption must still reach the carousel underneath. The text stays above the
-    // home bar and beside a sideways notch.
-    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent pt-16 pr-[max(1.5rem,env(safe-area-inset-right))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] text-white">
+    // home bar and beside a sideways notch. Hidden, it stays readable to screen readers: it holds
+    // nothing to focus.
+    <div
+      className={cn(
+        'pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent pt-16 pr-[max(1.5rem,env(safe-area-inset-right))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] text-white',
+        chromeClasses(isVisible),
+      )}
+    >
       <p className="text-lg font-medium tabular-nums drop-shadow-md">
         <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
       </p>
diff --git a/client/src/components/viewer/ViewerCarousel.tsx b/client/src/components/viewer/ViewerCarousel.tsx
index a842168..f6576b8 100644
--- a/client/src/components/viewer/ViewerCarousel.tsx
+++ b/client/src/components/viewer/ViewerCarousel.tsx
@@ -7,26 +7,30 @@ import {
   CarouselNext,
   CarouselPrevious,
 } from '@/components/ui/carousel.tsx'
-import { VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
+import { chromeClasses, VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
 import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
 import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
+import type { ViewerChrome } from '@/hooks/useViewerChrome.ts'
 import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
 import { photoLabel } from '@/photoLabel.ts'
 
-// At the first or last photo the arrow has nowhere to go: it steps aside.
-const ARROW_CLASSES = cn(VIEWER_BUTTON_CLASSES, 'disabled:opacity-0')
+// At the first or last photo the arrow has nowhere to go: it steps aside. A finger swipes: no
+// arrows on a touch screen.
+const ARROW_CLASSES = cn(VIEWER_BUTTON_CLASSES, 'disabled:opacity-0 pointer-coarse:hidden')
 
 type ViewerCarouselProps = {
   photos: Photo[]
   currentId: string
   onCurrentChange: (photoId: string) => void
+  chrome: ViewerChrome
 }
 
 export function ViewerCarousel({
   photos,
   currentId,
   onCurrentChange,
+  chrome,
 }: ViewerCarouselProps): JSX.Element {
   const [api, setApi] = useState<CarouselApi>()
   // Frozen at mount: Embla re-inits on new options, and would on every swipe.
@@ -35,12 +39,14 @@ export function ViewerCarousel({
   }))
   useCarouselPhoto({ api, photos, currentId, onCurrentChange })
   useCarouselArrowKeys(api)
+  const arrowClasses = cn(ARROW_CLASSES, chromeClasses(chrome.isVisible))
 
   return (
     <Carousel setApi={setApi} opts={options}>
       <CarouselContent>
         {photos.map((photo) => (
           <CarouselItem key={photo.id}>
+            {/* biome-ignore lint/a11y/useKeyWithClickEvents: the tap toggle is for touch; a keyboard shows the controls with Tab (useViewerChrome). */}
             <img
               className="h-svh w-full object-contain"
               src={photo.url}
@@ -49,6 +55,8 @@ export function ViewerCarousel({
               decoding="async"
               // The browser's own image drag would steal the mouse from the carousel's swipe.
               draggable={false}
+              onPointerDown={chrome.onPhotoPointerDown}
+              onClick={chrome.onPhotoClick}
             />
           </CarouselItem>
         ))}
@@ -56,12 +64,16 @@ export function ViewerCarousel({
       <CarouselPrevious
         variant="ghost"
         aria-label="Photo précédente"
-        className={cn(ARROW_CLASSES, 'left-[max(1rem,env(safe-area-inset-left))]')}
+        data-viewer-controls
+        inert={!chrome.isVisible}
+        className={cn(arrowClasses, 'left-[max(1rem,env(safe-area-inset-left))]')}
       />
       <CarouselNext
         variant="ghost"
         aria-label="Photo suivante"
-        className={cn(ARROW_CLASSES, 'right-[max(1rem,env(safe-area-inset-right))]')}
+        data-viewer-controls
+        inert={!chrome.isVisible}
+        className={cn(arrowClasses, 'right-[max(1rem,env(safe-area-inset-right))]')}
       />
     </Carousel>
   )
diff --git a/client/src/components/viewer/ViewerTopBar.tsx b/client/src/components/viewer/ViewerTopBar.tsx
index 3f45c84..a0f5a47 100644
--- a/client/src/components/viewer/ViewerTopBar.tsx
+++ b/client/src/components/viewer/ViewerTopBar.tsx
@@ -2,12 +2,13 @@ import { PlayIcon, XIcon } from 'lucide-react'
 import type { JSX } from 'react'
 import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
 import { Button } from '@/components/ui/button.tsx'
-import { VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
+import { chromeClasses, VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
 import { cn } from '@/lib/utils.ts'
 import type { Photo } from '@/photo.ts'
 
 type ViewerTopBarProps = {
   photo: Photo
+  isVisible: boolean
   counter: string
   onClose: () => void
   onStartFrame: () => void
@@ -44,6 +45,7 @@ function CloseViewerButton({ onClose }: Pick<ViewerTopBarProps, 'onClose'>): JSX
 
 export function ViewerTopBar({
   photo,
+  isVisible,
   counter,
   onClose,
   onStartFrame,
@@ -51,8 +53,16 @@ export function ViewerTopBar({
   return (
     // ✕ top left and the actions top right, as on the slideshow. The row spans the screen: only
     // its buttons take pointers, swipes beside them reach the carousel. Its shade runs under the
-    // notch, its buttons stay below it.
-    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))] *:pointer-events-auto">
+    // notch, its buttons stay below it. Hidden, inert keeps its buttons out of focus and clicks.
+    <div
+      data-viewer-controls
+      inert={!isVisible}
+      className={cn(
+        'pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))]',
+        isVisible && '*:pointer-events-auto',
+        chromeClasses(isVisible),
+      )}
+    >
       <CloseViewerButton onClose={onClose} />
       <p aria-live="polite" className="mx-auto text-sm text-white/80 tabular-nums">
         {counter}
diff --git a/client/src/components/viewer/viewerClasses.ts b/client/src/components/viewer/viewerClasses.ts
index eb3b1a0..989fc51 100644
--- a/client/src/components/viewer/viewerClasses.ts
+++ b/client/src/components/viewer/viewerClasses.ts
@@ -2,5 +2,13 @@ import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
 import { cn } from '@/lib/utils.ts'
 
 // The frame's glass, smaller: a viewer on a computer screen does not need wall-sized buttons.
+// Kept mounted so hiding can fade. Leaving is faster than arriving: the photo comes back quickly.
+export function chromeClasses(isVisible: boolean): string {
+  return cn(
+    'transition-opacity ease-out motion-reduce:transition-none',
+    isVisible ? 'opacity-100 duration-300' : 'opacity-0 duration-200',
+  )
+}
+
 // The Button's own coarse size still gives a finger 44 px.
 export const VIEWER_BUTTON_CLASSES = cn(GLASS_BUTTON_CLASSES, 'size-9')
diff --git a/client/src/hooks/useViewerChrome.ts b/client/src/hooks/useViewerChrome.ts
new file mode 100644
index 0000000..d15321b
--- /dev/null
+++ b/client/src/hooks/useViewerChrome.ts
@@ -0,0 +1,95 @@
+import { type PointerEvent, useEffect, useRef, useState } from 'react'
+import { flushSync } from 'react-dom'
+import { isOverlayOpen } from '@/hooks/useIdle.ts'
+
+const HIDE_DELAY_MS = 3000
+const CONTROLS_SELECTOR = '[data-viewer-controls]'
+
+export type ViewerChrome = {
+  isVisible: boolean
+  onPhotoPointerDown: (event: PointerEvent) => void
+  onPhotoClick: () => void
+}
+
+// Someone pointing at a button, tabbing through them or reading a menu is still using the
+// controls: they must not vanish under them.
+function isUsingControls(): boolean {
+  if (isOverlayOpen()) return true
+  return Array.from(document.querySelectorAll(CONTROLS_SELECTOR)).some(
+    (controls) => controls.matches(':hover') || controls.querySelector(':focus-visible') !== null,
+  )
+}
+
+// A hidden control is inert: focus left on it would drop out of the viewer, onto the page.
+function moveFocusOffControls(): void {
+  if (!document.activeElement?.closest(CONTROLS_SELECTOR)) return
+  document.querySelector<HTMLElement>('[data-photo-viewer]')?.focus()
+}
+
+type HideTimer = { restart: () => void; clear: () => void }
+
+// Controls in use when the delay ends wait one more delay.
+function createHideTimer(setIsVisible: (isVisible: boolean) => void): HideTimer {
+  let hideTimer = 0
+  function hideUnlessInUse(): void {
+    if (isUsingControls()) {
+      restart()
+      return
+    }
+    moveFocusOffControls()
+    setIsVisible(false)
+  }
+  function restart(): void {
+    window.clearTimeout(hideTimer)
+    hideTimer = window.setTimeout(hideUnlessInUse, HIDE_DELAY_MS)
+  }
+  return { restart, clear: () => window.clearTimeout(hideTimer) }
+}
+
+// A plain function the effect wires up; it returns its cleanup.
+function watchActivity(setIsVisible: (isVisible: boolean) => void): () => void {
+  const hideTimer = createHideTimer(setIsVisible)
+  function handlePointerMove(event: globalThis.PointerEvent): void {
+    // A finger only moves to swipe: the controls stay as they are.
+    if (event.pointerType !== 'mouse') return
+    setIsVisible(true)
+    hideTimer.restart()
+  }
+  function handleKeyDown(event: KeyboardEvent): void {
+    if (event.key !== 'Tab') return
+    // Synchronous, and in the capture phase: the controls lose inert before Tab moves the focus.
+    flushSync(() => setIsVisible(true))
+    hideTimer.restart()
+  }
+  // A mouse may never move again: its controls still step aside. A finger waits for a tap.
+  if (window.matchMedia('(pointer: fine)').matches) hideTimer.restart()
+  window.addEventListener('pointermove', handlePointerMove)
+  window.addEventListener('keydown', handleKeyDown, true)
+  return () => {
+    hideTimer.clear()
+    window.removeEventListener('pointermove', handlePointerMove)
+    window.removeEventListener('keydown', handleKeyDown, true)
+  }
+}
+
+// The photo first: controls show on mouse movement or Tab and step aside after a pause; on a
+// touch screen a tap on the photo toggles them. Embla swallows the click that ends a swipe, so
+// onPhotoClick only ever sees taps.
+export function useViewerChrome(): ViewerChrome {
+  const [isVisible, setIsVisible] = useState(true)
+  // Read on pointerdown: Safari's click event carries no pointer type.
+  const pointerTypeRef = useRef('mouse')
+
+  useEffect(() => watchActivity(setIsVisible), [])
+
+  return {
+    isVisible,
+    onPhotoPointerDown: (event) => {
+      pointerTypeRef.current = event.pointerType
+    },
+    // A mouse click on the photo would hide what the mouse movement just showed.
+    onPhotoClick: () => {
+      if (pointerTypeRef.current !== 'mouse') setIsVisible((wasVisible) => !wasVisible)
+    },
+  }
+}
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 36e9e2c..13704ac 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -61,6 +61,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 - Passer de l'un à l'autre avec les boutons « Miniatures » et « Liste ».
 - Charger les photos plus anciennes avec « Charger plus ».
 - Ouvrir une photo en grand dans l'application, puis passer à la suivante ou à la précédente d'un geste du doigt, avec les flèches à l'écran ou celles du clavier.
+- Sur une photo ouverte, laisser la photo seule à l'écran : les boutons, le compteur, la légende et les flèches s'effacent, et reviennent quand on en a besoin.
 - Ouvrir le menu « … » d'une photo pour lancer sa radio sur le cadre (voir [cadre.md](cadre.md#radio)), l'envoyer à un ami, la ranger dans ses collections (voir [collections.md](collections.md#ranger-ses-photos-dans-une-collection)) ou la supprimer.
 - Lancer le mode cadre, en plein écran, depuis la bibliothèque (« Mode cadre » sur un ordinateur, l'onglet « Cadre » sur un téléphone), ou depuis une photo ouverte pour que le diaporama commence par elle (voir [cadre.md](cadre.md)).
 - Découvrir les photos envoyées par ses proches depuis l'annonce placée sous l'en-tête (voir [partage.md](partage.md#recevoir-une-photo)).
@@ -88,7 +89,11 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 17. R-BIB-45 · La bibliothèque ne propose ni la gestion des amis ni les invitations : « Amis » et, pour l'administrateur, « Invitations » sont dans la barre du haut sur un ordinateur ; sur un téléphone, « Amis » est un onglet de la barre d'onglets et « Invitations » est dans le menu du compte.
 18. R-BIB-46 · Le nombre de photos s'affiche sous le titre (« 12 photos ») ; « Plus de 30 photos » tant que des photos plus anciennes ne sont pas encore chargées. Dans une collection, il compte les photos de cette collection ; il disparaît quand la collection ne peut pas s'afficher (« Cette collection n'existe plus. »).
 19. R-BIB-47 · Une bibliothèque vide propose « Ajouter une photo », qui ouvre le même panneau que « Ajouter ».
-20. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
+20. R-BIB-49 · Sur un écran tactile, toucher la photo ouverte efface les boutons, le compteur et la légende ; la toucher de nouveau les fait revenir. Passer à une autre photo d'un geste du doigt les laisse comme ils sont. Ils ne s'effacent jamais seuls. Il n'y a pas de flèches à l'écran : le geste du doigt les remplace.
+21. R-BIB-50 · À la souris, les boutons, le compteur, la légende et les flèches apparaissent dès que la souris bouge et s'effacent après 3 secondes sans mouvement. Ils restent tant que la souris est sur un bouton ou qu'un menu ou une fenêtre est ouvert (menu « … », « Envoyer à des proches », « Supprimer cette photo ? »). Cliquer sur la photo ne les efface pas.
+22. R-BIB-51 · Au clavier, les flèches gauche et droite changent de photo sans faire revenir les boutons ; la touche Tab les fait revenir et passe d'un bouton à l'autre. Ils restent tant que l'un d'eux est choisi au clavier. Effacés, ils ne peuvent pas être choisis.
+23. R-BIB-52 · Les boutons apparaissent et s'effacent en fondu ; si l'appareil demande de réduire les animations, ils apparaissent et disparaissent d'un coup.
+24. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
 
 **Messages affichés**
 
~~~~

### Task 7a: Review fix: announce the position while hidden

**Commit:** `fix(client): announce the photo position while the viewer bar is hidden`

**Scope:** sr-only live counter in `PhotoViewer`; visible counter `aria-hidden`. Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/viewer/PhotoViewer.tsx b/client/src/components/viewer/PhotoViewer.tsx
index 859e408..ae550db 100644
--- a/client/src/components/viewer/PhotoViewer.tsx
+++ b/client/src/components/viewer/PhotoViewer.tsx
@@ -32,8 +32,13 @@ function focusPhotoTile(event: Event, photoId: string): void {
 
 function ViewerPhoto({ library, viewer, photo, index }: ViewerPhotoProps): JSX.Element {
   const chrome = useViewerChrome()
+  const counter = viewerCounter(index, library)
   return (
     <>
+      {/* Outside the top bar, which turns inert when hidden: ← → still announce the position. */}
+      <p aria-live="polite" className="sr-only">
+        {counter}
+      </p>
       <ViewerCarousel
         photos={library.photos}
         currentId={photo.id}
@@ -44,7 +49,7 @@ function ViewerPhoto({ library, viewer, photo, index }: ViewerPhotoProps): JSX.E
       <ViewerTopBar
         photo={photo}
         isVisible={chrome.isVisible}
-        counter={viewerCounter(index, library)}
+        counter={counter}
         onClose={viewer.close}
         onStartFrame={() => viewer.startFrame(photo.id)}
       />
diff --git a/client/src/components/viewer/ViewerTopBar.tsx b/client/src/components/viewer/ViewerTopBar.tsx
index a0f5a47..5660f3e 100644
--- a/client/src/components/viewer/ViewerTopBar.tsx
+++ b/client/src/components/viewer/ViewerTopBar.tsx
@@ -64,7 +64,8 @@ export function ViewerTopBar({
       )}
     >
       <CloseViewerButton onClose={onClose} />
-      <p aria-live="polite" className="mx-auto text-sm text-white/80 tabular-nums">
+      {/* Announced by PhotoViewer instead: the hidden bar is inert, out of screen readers' reach. */}
+      <p aria-hidden className="mx-auto text-sm text-white/80 tabular-nums">
         {counter}
       </p>
       <StartFrameButton onStartFrame={onStartFrame} />
~~~~

### Task 7b: Review fix: comment says why

**Commit:** `refactor(client): drop a comment that said what, not why`

**Scope:** `useViewerChrome` comment removed. Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/hooks/useViewerChrome.ts b/client/src/hooks/useViewerChrome.ts
index d15321b..b656f68 100644
--- a/client/src/hooks/useViewerChrome.ts
+++ b/client/src/hooks/useViewerChrome.ts
@@ -46,7 +46,6 @@ function createHideTimer(setIsVisible: (isVisible: boolean) => void): HideTimer
   return { restart, clear: () => window.clearTimeout(hideTimer) }
 }
 
-// A plain function the effect wires up; it returns its cleanup.
 function watchActivity(setIsVisible: (isVisible: boolean) => void): () => void {
   const hideTimer = createHideTimer(setIsVisible)
   function handlePointerMove(event: globalThis.PointerEvent): void {
~~~~

### Task 7c: Review fix: focus stays in the viewer on tap

**Commit:** `fix(client): keep focus in the viewer when a tap hides its controls`

**Scope:** `moveFocusOffControls` before a tap hides. Found by the fresh-context review.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/hooks/useViewerChrome.ts b/client/src/hooks/useViewerChrome.ts
index b656f68..8c00b8e 100644
--- a/client/src/hooks/useViewerChrome.ts
+++ b/client/src/hooks/useViewerChrome.ts
@@ -88,7 +88,9 @@ export function useViewerChrome(): ViewerChrome {
     },
     // A mouse click on the photo would hide what the mouse movement just showed.
     onPhotoClick: () => {
-      if (pointerTypeRef.current !== 'mouse') setIsVisible((wasVisible) => !wasVisible)
+      if (pointerTypeRef.current === 'mouse') return
+      if (isVisible) moveFocusOffControls()
+      setIsVisible(!isVisible)
     },
   }
 }
~~~~

---

## `feat/library-surface`

### Task 8: Library photos on the page surface

**Commit:** `feat(client): library photos on the app's own surface`

**Scope:** `LibrarySection` without `dark` and `bg-frame-background`; list rows on theme tokens; grid tile ⋯ keeps its dark pill (open too); `PhotoActionsMenu` `theme` prop; R-BIB-28 « Remplacée », R-BIB-53, R-APP-34.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/frame/PhotoActionsMenu.tsx b/client/src/components/frame/PhotoActionsMenu.tsx
index e6b0342..3239b57 100644
--- a/client/src/components/frame/PhotoActionsMenu.tsx
+++ b/client/src/components/frame/PhotoActionsMenu.tsx
@@ -17,9 +17,16 @@ import {
 import { useStartRadio } from '@/hooks/useStartRadio.ts'
 import type { Photo } from '@/photo.ts'
 
+// The frame and the viewer are always dark; the library follows the app's theme.
+type MenuTheme = 'dark' | 'app'
+
+const THEME_CLASSES: Record<MenuTheme, string | undefined> = { dark: 'dark', app: undefined }
+
 type PhotoActionsMenuProps = {
   photo: Photo
   label: string
+  // 'dark' by default: the menu and its dialogs portal to body, outside a dark screen.
+  theme?: MenuTheme
   className?: string
   // Items above "Supprimer": the slideshow adds its speed.
   children?: ReactNode
@@ -30,6 +37,7 @@ type MenuDialog = { kind: 'share' | 'delete' | 'createCollection'; photo: Photo
 
 type MenuDialogsProps = {
   dialog: MenuDialog
+  themeClass: string | undefined
   onClose: () => void
   triggerRef: RefObject<HTMLButtonElement | null>
 }
@@ -54,8 +62,7 @@ function focusOnClose(triggerRef: RefObject<HTMLButtonElement | null>): (event:
 }
 
 // Outside the menu content: closing the menu must not unmount the dialogs.
-// `dark`: the sheet and dialogs portal to body, outside the frame's dark <main>.
-function MenuDialogs({ dialog, onClose, triggerRef }: MenuDialogsProps): JSX.Element {
+function MenuDialogs({ dialog, themeClass, onClose, triggerRef }: MenuDialogsProps): JSX.Element {
   const addToNewCollection = useAddToNewCollection(dialog?.photo)
   const focusTrigger = focusOnClose(triggerRef)
   const photoFor = (kind: NonNullable<MenuDialog>['kind']) =>
@@ -67,7 +74,7 @@ function MenuDialogs({ dialog, onClose, triggerRef }: MenuDialogsProps): JSX.Ele
         target={sharedPhoto ? { kind: 'library', photo: sharedPhoto } : null}
         onClose={onClose}
         onCloseAutoFocus={focusTrigger}
-        className="dark"
+        className={themeClass}
       />
       <DeletePhotoDialog
         photo={photoFor('delete')}
@@ -79,7 +86,7 @@ function MenuDialogs({ dialog, onClose, triggerRef }: MenuDialogsProps): JSX.Ele
         onClose={onClose}
         onSaved={addToNewCollection}
         onCloseAutoFocus={focusTrigger}
-        className="dark"
+        className={themeClass}
       />
     </>
   )
@@ -107,15 +114,15 @@ function MenuTrigger({ label, className, triggerRef }: MenuTriggerProps): JSX.El
 
 type MenuItemsProps = {
   photo: Photo
+  themeClass: string | undefined
   onOpen: (dialog: MenuDialog) => void
   children?: ReactNode
 }
 
-function MenuItems({ photo, onOpen, children }: MenuItemsProps): JSX.Element {
+function MenuItems({ photo, themeClass, onOpen, children }: MenuItemsProps): JSX.Element {
   const startRadio = useStartRadio()
   return (
-    // `dark`: the menu portals to body, outside the frame's dark <main>.
-    <DropdownMenuContent align="end" className="dark">
+    <DropdownMenuContent align="end" className={themeClass}>
       {children}
       <DropdownMenuItem onSelect={() => startRadio(photo.id)}>
         <RadioIcon />
@@ -140,21 +147,28 @@ function MenuItems({ photo, onOpen, children }: MenuItemsProps): JSX.Element {
 export function PhotoActionsMenu({
   photo,
   label,
+  theme = 'dark',
   className,
   children,
 }: PhotoActionsMenuProps): JSX.Element {
   const [dialog, setDialog] = useState<MenuDialog>(null)
   const triggerRef = useRef<HTMLButtonElement>(null)
+  const themeClass = THEME_CLASSES[theme]
 
   return (
     <>
       <DropdownMenu>
         <MenuTrigger label={label} className={className} triggerRef={triggerRef} />
-        <MenuItems photo={photo} onOpen={setDialog}>
+        <MenuItems photo={photo} themeClass={themeClass} onOpen={setDialog}>
           {children}
         </MenuItems>
       </DropdownMenu>
-      <MenuDialogs dialog={dialog} onClose={() => setDialog(null)} triggerRef={triggerRef} />
+      <MenuDialogs
+        dialog={dialog}
+        themeClass={themeClass}
+        onClose={() => setDialog(null)}
+        triggerRef={triggerRef}
+      />
     </>
   )
 }
diff --git a/client/src/components/frame/PhotoGridTile.tsx b/client/src/components/frame/PhotoGridTile.tsx
index 4cea2c7..6fc10a2 100644
--- a/client/src/components/frame/PhotoGridTile.tsx
+++ b/client/src/components/frame/PhotoGridTile.tsx
@@ -19,7 +19,7 @@ export function PhotoGridTile({ photo, isCurrent, onSelect }: PhotoGridTileProps
         aria-current={isCurrent}
         // The viewer focuses this tile when it closes on this photo.
         data-photo-id={photo.id}
-        className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-frame-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
+        className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
       >
         <img
           className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/tile:scale-105"
@@ -29,10 +29,12 @@ export function PhotoGridTile({ photo, isCurrent, onSelect }: PhotoGridTileProps
           decoding="async"
         />
       </button>
+      {/* A dark pill whatever the theme: it sits on the photo, not on the page. */}
       <PhotoActionsMenu
         photo={photo}
         label={`Actions : ${photoLabel(photo)}`}
-        className="absolute top-2 right-2 rounded-full bg-black/55 text-white/80 backdrop-blur-sm hover:bg-black/75 hover:text-white dark:hover:bg-black/75"
+        theme="app"
+        className="absolute top-2 right-2 rounded-full bg-black/55 text-white/80 backdrop-blur-sm hover:bg-black/75 hover:text-white aria-expanded:bg-black/75 aria-expanded:text-white dark:hover:bg-black/75"
       />
     </li>
   )
diff --git a/client/src/components/frame/PhotoListRow.tsx b/client/src/components/frame/PhotoListRow.tsx
index 0a8ef66..d4d48d4 100644
--- a/client/src/components/frame/PhotoListRow.tsx
+++ b/client/src/components/frame/PhotoListRow.tsx
@@ -25,7 +25,7 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
         aria-current={isCurrent}
         // The viewer focuses this row when it closes on this photo.
         data-photo-id={photo.id}
-        className="flex w-full items-center gap-4 rounded-xl p-2 pr-14 text-left outline-none hover:bg-white/5 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
+        className="flex w-full items-center gap-4 rounded-xl p-2 pr-14 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
       >
         <img
           className="size-14 shrink-0 rounded-lg object-cover"
@@ -39,14 +39,17 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
             {ROW_DATE_FORMAT.format(new Date(photo.createdAt))}
           </time>
           {photo.senderName !== null && (
-            <span className="truncate text-sm text-white/70">Envoyée par {photo.senderName}</span>
+            <span className="truncate text-sm text-muted-foreground">
+              Envoyée par {photo.senderName}
+            </span>
           )}
         </span>
       </button>
       <PhotoActionsMenu
         photo={photo}
         label={`Actions : ${photoLabel(photo)}`}
-        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full text-white/80"
+        theme="app"
+        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full text-muted-foreground"
       />
     </li>
   )
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index ba5d3f3..92c5364 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -47,8 +47,8 @@ export function LibrarySection(props: LibrarySectionProps): JSX.Element {
   const { hasMore, isLoadingMore, loadMore } = props.library
 
   return (
-    // `dark` and the frame background: the frame's components look as designed.
-    <section aria-label="Photos" className="dark rounded-2xl bg-frame-background text-foreground">
+    // The page's own surface: the library follows the app's theme; only the frame is always dark.
+    <section aria-label="Photos">
       <LibraryPhotos {...props} />
       {hasMore && <LoadMoreButton isLoadingMore={isLoadingMore} loadMore={loadMore} />}
     </section>
diff --git a/docs/produit/apparence-et-navigation.md b/docs/produit/apparence-et-navigation.md
index 4206eb6..6b2880a 100644
--- a/docs/produit/apparence-et-navigation.md
+++ b/docs/produit/apparence-et-navigation.md
@@ -75,7 +75,7 @@ Le menu à trois traits a laissé sa place à la barre d'onglets (R-APP-60) et a
 2. R-APP-31 · En « Système », un changement de réglage de l'appareil (passage automatique en sombre le soir, par exemple) s'applique aussitôt, sans recharger.
 3. R-APP-32 · Le choix s'applique immédiatement à toute l'application.
 4. R-APP-33 · Le choix est retenu sur cet appareil et dans ce navigateur seulement : il ne suit pas le compte sur ses autres appareils. Si l'appareil ne permet pas de le retenir (navigation privée, par exemple), le choix vaut jusqu'à la fermeture de la page, puis l'application revient à « Système ».
-5. R-APP-34 · Le cadre et les photos de la bibliothèque restent toujours sur fond sombre, quel que soit le thème (R-CAD-02, R-BIB-28).
+5. R-APP-34 · Le cadre et une photo ouverte en grand restent toujours sur fond sombre, quel que soit le thème (R-CAD-02). Les photos de la bibliothèque, elles, suivent le thème (R-BIB-53).
 
 **Messages affichés**
 
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index 13704ac..bbee259 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -78,7 +78,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 6. R-BIB-25 · Cliquer sur une photo l'ouvre en grand dans l'application.
 7. R-BIB-26 · Remplacée : une photo reçue n'apparaît plus dès son arrivée, mais une fois découverte (R-BIB-42).
 8. R-BIB-27 · Après une coupure de réseau, la bibliothèque se recharge seule depuis le début dès que la connexion revient, pour rattraper ce qui a changé entre-temps, sans revenir aux 30 premières photos.
-9. R-BIB-28 · Les photos de la bibliothèque sont toujours sur fond sombre, quel que soit le thème choisi, pour présenter les photos comme sur le cadre.
+9. R-BIB-28 · Remplacée : les photos de la bibliothèque suivent désormais le thème choisi (R-BIB-53). Elles étaient toujours sur fond sombre, comme sur le cadre.
 10. R-BIB-29 · Remplacée : la carte « Vos proches » a quitté la bibliothèque (R-BIB-45).
 11. R-BIB-36 · La photo affiche sa date, et « Envoyée par » suivi du nom quand elle a été reçue.
 12. R-BIB-37 · Un compteur indique la position de la photo (« 3 / 42 ») ; « 30+ » signifie que d'autres photos plus anciennes ne sont pas encore chargées.
@@ -93,7 +93,8 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 21. R-BIB-50 · À la souris, les boutons, le compteur, la légende et les flèches apparaissent dès que la souris bouge et s'effacent après 3 secondes sans mouvement. Ils restent tant que la souris est sur un bouton ou qu'un menu ou une fenêtre est ouvert (menu « … », « Envoyer à des proches », « Supprimer cette photo ? »). Cliquer sur la photo ne les efface pas.
 22. R-BIB-51 · Au clavier, les flèches gauche et droite changent de photo sans faire revenir les boutons ; la touche Tab les fait revenir et passe d'un bouton à l'autre. Ils restent tant que l'un d'eux est choisi au clavier. Effacés, ils ne peuvent pas être choisis.
 23. R-BIB-52 · Les boutons apparaissent et s'effacent en fondu ; si l'appareil demande de réduire les animations, ils apparaissent et disparaissent d'un coup.
-24. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
+24. R-BIB-53 · Les photos de la bibliothèque, en miniatures comme en liste, s'affichent sur le fond de la page et suivent le thème choisi, clair ou sombre, comme le reste de l'application ; leur menu « … » et les fenêtres qu'il ouvre aussi. Seul le cadre, et une photo ouverte en grand, restent toujours sombres. Sur une miniature, le bouton « … » reste un rond sombre, posé sur la photo.
+25. R-BIB-42 · La bibliothèque se met à jour seule, sans recharger la page : une photo ajoutée depuis un autre appareil apparaît en tête, une photo reçue y entre à sa date de réception dès qu'elle est découverte (sur cet appareil ou un autre), une photo supprimée disparaît.
 
 **Messages affichés**
 
~~~~

### Task 9: Add button steps aside while scrolling down

**Commit:** `feat(client): add button steps aside while scrolling down`

**Scope:** `useHideOnScrollDown`; `AddPhotoFab` hides and returns, ring of page colour; R-BIB-48 amended.

**Gate:** `pnpm check` and `pnpm typecheck` green.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/library/AddPhotoFab.tsx b/client/src/components/library/AddPhotoFab.tsx
index 189b9e3..535ab5b 100644
--- a/client/src/components/library/AddPhotoFab.tsx
+++ b/client/src/components/library/AddPhotoFab.tsx
@@ -1,20 +1,34 @@
 import { PlusIcon } from 'lucide-react'
 import type { JSX } from 'react'
 import { Button } from '@/components/ui/button.tsx'
+import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown.ts'
+import { cn } from '@/lib/utils.ts'
+
+// pointer-coarse:size-14 beats the Button's coarse h-11. The ring of page colour keeps the
+// button apart from a photo under it, in either theme.
+const FAB_CLASSES =
+  'fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom)_+_1rem)] z-20 size-14 rounded-full pointer-coarse:size-14 shadow-lg ring-2 ring-background transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none md:hidden'
+
+// Slides below the screen edge; with reduced motion it only disappears. Still focusable: the
+// keyboard reaching it brings it back.
+const HIDDEN_CLASSES = 'pointer-events-none translate-y-24 opacity-0 motion-reduce:translate-y-0'
 
 type AddPhotoFabProps = {
   onAdd: () => void
 }
 
 // A phone's « Ajouter », where the thumb rests: bottom right, above the tab bar and the home bar.
-// A computer keeps the button in the header. pointer-coarse:size-14 beats the Button's coarse h-11.
+// A computer keeps the button in the header.
 export function AddPhotoFab({ onAdd }: AddPhotoFabProps): JSX.Element {
+  const { isHidden, ref, onFocus } = useHideOnScrollDown()
   return (
     <Button
+      ref={ref}
       onClick={onAdd}
+      onFocus={onFocus}
       aria-label="Ajouter une photo"
       title="Ajouter une photo"
-      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom)_+_1rem)] z-20 size-14 rounded-full pointer-coarse:size-14 shadow-lg md:hidden"
+      className={cn(FAB_CLASSES, isHidden && HIDDEN_CLASSES)}
     >
       <PlusIcon aria-hidden className="size-6" />
     </Button>
diff --git a/client/src/hooks/useHideOnScrollDown.ts b/client/src/hooks/useHideOnScrollDown.ts
new file mode 100644
index 0000000..f354a8a
--- /dev/null
+++ b/client/src/hooks/useHideOnScrollDown.ts
@@ -0,0 +1,50 @@
+import { type RefObject, useEffect, useRef, useState } from 'react'
+
+// Smaller moves are a finger resting on the screen, not a scroll: the button would flicker.
+const SCROLL_THRESHOLD_PX = 12
+// At the end of the list the page's bottom padding keeps the button clear of the last row.
+const END_MARGIN_PX = 48
+
+export type HideOnScrollDown = {
+  isHidden: boolean
+  ref: RefObject<HTMLButtonElement | null>
+  onFocus: () => void
+}
+
+function isAtPageEnd(): boolean {
+  const scrolledTo = window.innerHeight + window.scrollY
+  return scrolledTo >= document.documentElement.scrollHeight - END_MARGIN_PX
+}
+
+// Keyboard focus keeps the button shown. Focus left by a tap or a closing panel is dropped
+// instead: a hidden button must not hold it.
+function keepsKeyboardFocus(button: HTMLButtonElement | null): boolean {
+  if (button === null || document.activeElement !== button) return false
+  if (button.matches(':focus-visible')) return true
+  button.blur()
+  return false
+}
+
+// A floating button covers what scrolls under it: it steps aside while the page goes down and
+// comes back when it goes up, at the top, at the end, or when the keyboard reaches it.
+export function useHideOnScrollDown(): HideOnScrollDown {
+  const [isHidden, setIsHidden] = useState(false)
+  const ref = useRef<HTMLButtonElement>(null)
+
+  useEffect(() => {
+    let lastY = window.scrollY
+    function handleScroll(): void {
+      const y = window.scrollY
+      if (Math.abs(y - lastY) < SCROLL_THRESHOLD_PX) return
+      const isGoingDown = y > lastY
+      lastY = y
+      // y <= 0: the top, iOS bounces below it.
+      if (!isGoingDown || y <= 0 || isAtPageEnd()) setIsHidden(false)
+      else if (!keepsKeyboardFocus(ref.current)) setIsHidden(true)
+    }
+    window.addEventListener('scroll', handleScroll, { passive: true })
+    return () => window.removeEventListener('scroll', handleScroll)
+  }, [])
+
+  return { isHidden, ref, onFocus: () => setIsHidden(false) }
+}
diff --git a/docs/produit/bibliotheque.md b/docs/produit/bibliotheque.md
index bbee259..0ff278f 100644
--- a/docs/produit/bibliotheque.md
+++ b/docs/produit/bibliotheque.md
@@ -28,7 +28,7 @@ La bibliothèque contient toutes les photos d'un compte : celles qu'il a ajouté
 13. R-BIB-12 · Après un ajout réussi, le panneau se ferme, un message de réussite s'affiche, et la photo apparaît en tête de la bibliothèque et sur le cadre qui lit toute la bibliothèque, sur tous les appareils connectés au compte, sans recharger la page. Ajoutée pendant qu'une collection est affichée, elle est aussi rangée dans cette collection (R-COL-21).
 14. R-BIB-13 · Après un échec, la photo reste choisie dans le panneau et un message explique la raison.
 15. R-BIB-44 · Fermer le panneau sans rien envoyer abandonne la photo choisie : il s'ouvre vide la fois suivante.
-16. R-BIB-48 · Sur un téléphone, « Ajouter » est un bouton rond « + » qui reste en bas à droite de l'écran, au-dessus de la barre d'onglets, pendant que l'on fait défiler les photos ; il n'apparaît que sur la bibliothèque. L'en-tête n'y montre plus « Ajouter » ni « Mode cadre » : le cadre s'ouvre avec l'onglet « Cadre » (R-APP-64). La fin de la page reste visible au-dessus du bouton.
+16. R-BIB-48 · Sur un téléphone, « Ajouter » est un bouton rond « + » en bas à droite de l'écran, au-dessus de la barre d'onglets, bien visible en thème clair comme sombre ; il n'apparaît que sur la bibliothèque. Il s'efface pendant que l'on fait défiler les photos vers le bas, pour ne pas cacher leurs boutons « … », et revient dès que l'on remonte, en haut de la page ou à la fin de la liste. Au clavier, il revient quand on l'atteint ; effacé, il ne garde pas la sélection. Si l'appareil demande de réduire les animations, il disparaît et revient sans glisser. L'en-tête n'y montre plus « Ajouter » ni « Mode cadre » : le cadre s'ouvre avec l'onglet « Cadre » (R-APP-64). La fin de la page reste visible au-dessus du bouton.
 
 **Messages affichés**
 
~~~~

### Task 10: Library photos line up with the page

**Commit:** `fix(client): library photos line up with the page's edges`

**Scope:** `PhotoGrid` (2 columns on a phone, ~12rem columns from `sm`), `PhotoList` and `PhotoListRow` edge to edge, « Charger plus » padding. No product rule changes.

**Gate:** `pnpm check` and `pnpm typecheck` green; `pnpm build` and `pnpm test` green at the tip.

- [x] **Final diff**

~~~~diff
diff --git a/client/src/components/frame/PhotoGrid.tsx b/client/src/components/frame/PhotoGrid.tsx
index 6b3fada..e417c32 100644
--- a/client/src/components/frame/PhotoGrid.tsx
+++ b/client/src/components/frame/PhotoGrid.tsx
@@ -9,9 +9,14 @@ type PhotoGridProps = {
   onSelect: (id: string) => void
 }
 
+// Edge to edge with the page's header. Two columns on a phone: each tile carries a 44 px « … »
+// that would hide too much of a third-width photo. From sm, as many ~12rem columns as fit.
+const GRID_CLASSES =
+  'grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4'
+
 export function PhotoGrid({ photos, currentId, onSelect }: PhotoGridProps): JSX.Element {
   return (
-    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8">
+    <ul className={GRID_CLASSES}>
       {photos.map((photo) => (
         <PhotoGridTile
           key={photo.id}
diff --git a/client/src/components/frame/PhotoList.tsx b/client/src/components/frame/PhotoList.tsx
index 833fb5c..819efb2 100644
--- a/client/src/components/frame/PhotoList.tsx
+++ b/client/src/components/frame/PhotoList.tsx
@@ -11,7 +11,8 @@ type PhotoListProps = {
 
 export function PhotoList({ photos, currentId, onSelect }: PhotoListProps): JSX.Element {
   return (
-    <ul className="mx-auto flex max-w-3xl flex-col gap-1 p-8">
+    // The page's full width: thumbnails and « … » line up with the header's edges.
+    <ul className="flex flex-col gap-1">
       {photos.map((photo) => (
         <PhotoListRow
           key={photo.id}
diff --git a/client/src/components/frame/PhotoListRow.tsx b/client/src/components/frame/PhotoListRow.tsx
index d4d48d4..d28c244 100644
--- a/client/src/components/frame/PhotoListRow.tsx
+++ b/client/src/components/frame/PhotoListRow.tsx
@@ -17,7 +17,8 @@ type PhotoListRowProps = {
 
 export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps): JSX.Element {
   return (
-    // The ellipsis is a sibling of the row button: a button cannot hold a button.
+    // The ellipsis is a sibling of the row button: a button cannot hold a button. No side padding:
+    // the thumbnail and the ellipsis sit on the header's edges; pr-12 keeps the text off the ellipsis.
     <li className="relative">
       <button
         type="button"
@@ -25,7 +26,7 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
         aria-current={isCurrent}
         // The viewer focuses this row when it closes on this photo.
         data-photo-id={photo.id}
-        className="flex w-full items-center gap-4 rounded-xl p-2 pr-14 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
+        className="flex w-full items-center gap-3 rounded-xl py-2 pr-12 text-left outline-none hover:bg-muted sm:gap-4 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
       >
         <img
           className="size-14 shrink-0 rounded-lg object-cover"
@@ -35,7 +36,7 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
           decoding="async"
         />
         <span className="flex min-w-0 flex-1 flex-col">
-          <time dateTime={photo.createdAt} className="text-lg tabular-nums">
+          <time dateTime={photo.createdAt} className="truncate text-base tabular-nums sm:text-lg">
             {ROW_DATE_FORMAT.format(new Date(photo.createdAt))}
           </time>
           {photo.senderName !== null && (
@@ -49,7 +50,7 @@ export function PhotoListRow({ photo, isCurrent, onSelect }: PhotoListRowProps):
         photo={photo}
         label={`Actions : ${photoLabel(photo)}`}
         theme="app"
-        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full text-muted-foreground"
+        className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full text-muted-foreground"
       />
     </li>
   )
diff --git a/client/src/components/library/LibrarySection.tsx b/client/src/components/library/LibrarySection.tsx
index 92c5364..27cce7f 100644
--- a/client/src/components/library/LibrarySection.tsx
+++ b/client/src/components/library/LibrarySection.tsx
@@ -17,7 +17,7 @@ type LoadMoreButtonProps = Pick<PhotoLibrary, 'isLoadingMore' | 'loadMore'>
 
 function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.Element {
   return (
-    <div className="flex justify-center px-4 pb-6 sm:px-8 sm:pb-8">
+    <div className="flex justify-center pt-6">
       <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
         {isLoadingMore ? 'Chargement…' : 'Charger plus'}
       </Button>
~~~~

---

## Final verification (controller)

- Chrome, desktop (≥ 768 px): top bar unchanged (links, avatar menu without « Invitations »), header « Ajouter » and « Mode cadre », no tab bar, no floating button, toasts bottom right as before, mouse sizes unchanged; viewer: controls fade after 3 s still, return on movement, stay while hovering a button or with the « … » menu open, Tab brings them back.
- Chrome, 360 px phone viewport (a same-origin iframe, or device mode with touch): tab bar on `/`, `/friends`, `/settings`, `/admin/invitations`, absent on `/frame`, `/login`, `/invite/…`, the 404; active tab marked; « Cadre » opens the frame; « + » opens the add panel; nothing hidden behind the bar or the button; no horizontal scroll; toasts above the bar (also at 700 px wide); 44 px controls in device mode (coarse pointer).
- Library surface (PR E): light and dark themes, grid and list, the page background under the photos, readable rows and dates, the tile's ⋯ pill dark on the photo (also while its menu is open), its menu and dialogs in the app's theme; at 360 px the « + » hides while scrolling down, returns on the way up and at the end, Tab reaches it when hidden; desktop unchanged apart from the panel colour.
- Real phone (the author): safe areas around the notch and the home bar, tap and swipe in the viewer, the screen staying awake on the frame, the browser bar colour.

## Drift Log

- **Order of work:** the brief, the spec and a placeholder of this plan were committed first (Task 0); the final diffs were added once the code was done, folded into that commit with a `fixup` and `git rebase --autosquash --update-refs`.
- **Task 4, not in the spec's list:** the upload form's pick tiles (`h-20`) would have shrunk to 44 px under the Button's coarse `h-11`; pinned with `pointer-coarse:h-20`. The frame's two notice pills (« N nouvelles photos », « Photos reçues ») were 40 px tall; `pointer-coarse:min-h-11`. Spec D12 amended in place (the spec was not delivered yet).
- **Task 6:** the hook first ran 31 lines (caught by the review, Task 6a).
- **Task 7:** `watchActivity` ran over 30 lines; the timer moved to `createHideTimer`. Biome's `useKeyWithClickEvents` flagged the photo's `onClick`: kept with a `biome-ignore` that gives the reason (the keyboard shows the controls with Tab; the tap is for touch). The caption is faded but not `inert`, so screen readers still read it (spec Q10). Tab is caught in the capture phase with `flushSync` so the first Tab already lands on a control (spec D17).
- **Fresh-context review** (after Task 7, a reviewer with no context; it replied to the controller, who relayed it), every finding fixed in an added commit on the branch it belongs to, the stack kept linear by `git rebase -i --update-refs`:
  - Task 3a: between 640 and 767 px `sm:py-10` beat `max-md:pb-24` (later in the CSS), so the « + » could cover « Charger plus ». The other pages have no such conflict: the tab bar's room is padded by `TabBarLayout`'s own wrapper, which has no `sm:` padding.
  - Task 3b: Sonner applies `mobileOffset` only up to 600 px; the tab bar shows up to 767 px. Both offsets now read `--toast-bottom`; R-APP-66 and spec D7 say so.
  - Task 3c: R-APP-12 came after R-APP-55, and the tab bar section before « Menu mobile (retiré) »; sections and rules now follow their numbers. R-PRF-01 now mentions « Invitations » between « Préférences » and the theme for the admin on a phone. Spec's product-docs list now names R-APP-12 (amended in place).
  - Task 3d: the avatar trigger became `grid` on desktop too; now `pointer-coarse:grid`.
  - Task 6a: `useScreenWakeLock` was 31 lines; `requestScreenLock` moved to module level.
  - Task 7a: the hidden, inert top bar took its live counter out of screen readers' reach, so ← → changed photo unannounced; an `sr-only` live region in `PhotoViewer` carries it now.
  - Task 7b: a comment said what, not why; dropped.
  - Task 7c: hiding by tap did not move focus off the controls, unlike the timer.
  - Checked by the reviewer and found fine: no primitive variant shrinks or distorts a component; routes per D2; Embla swallows the click that ends a swipe; wake lock races and StrictMode double mount; Tab un-inerts before focus moves; the hidden desktop « Invitations » item is skipped by keyboard navigation.
- **Gates after the rebase:** `pnpm check` and `pnpm typecheck` green on each of the 16 commits; at the tip `pnpm build` green and `pnpm test` → `Test Files  25 passed (25)`, `Tests  301 passed (301)`.
- **PR E, library surface** (the author's phone test: « Le fond noir de la liste photo, aucune bonne raison d'avoir ce style »; the black « + » nearly vanished on the black panel and covered the rows' ⋯). Relayed by the controller after PRs A to D were cherry-picked into the repo, so those 16 commits stay as they are and PR E goes on top:
  - Task 8: the panel drops `dark` and `bg-frame-background`. `PhotoActionsMenu` forced `dark` on its menu and dialogs, which portal to `body`; on the library they now follow the theme through a `theme` prop (`'dark'` by default for the frame and the viewer, `'app'` for the library). The tile's ⋯ needed `aria-expanded:bg-black/75`: the ghost variant's `aria-expanded:bg-muted` would turn the open pill light under white icons in the light theme. Pending tiles do not exist on this stack (step 14). R-BIB-28 « Remplacée », R-BIB-53 new, R-APP-34 amended.
  - Task 9: "hidden must not keep focus" and "focusing it shows it" are met together. The hidden button stays focusable (no `inert`); keyboard focus (`:focus-visible`) keeps it shown; any other focus (a tap, or a panel returning focus to it) is dropped before it hides. Spec D21.
  - Layout: the photo grid and list keep their padding, so desktop only loses the panel colour. At 360 px nothing gets wider.
- **PR E, widths** (the author's desktop screenshots at 2000 px, and the phone: « problème de cohérence sur la largeur des éléments et des conteneurs du contenu par rapport aux listes de photos, et sur mobile c'est pas fameux non plus »): the list sat in a narrower centred column (`max-w-3xl mx-auto p-8`), the grid inset by `p-8`, both leftovers of the black panel removed in Task 8. Task 10 aligns both with the page container (spec D22). Phone grid: 2 columns, not 3, because of the tile's 44 px « … ». At 360 px the date gets about 212 px (328 px container − 56 px thumbnail − 12 px gap − 48 px for the « … ») and « 30 sept. 2026, 23:59 » at 16 px needs about 170 px. No horizontal scroll at 360, 768 or 1280 px: the phone grid is `grid-cols-2` (`minmax(0, 1fr)`), and from `sm` the container (≥ 608 px) always fits one 12rem column. No product rule mentions widths or columns: `docs/produit/` unchanged.
- **Gates for PR E:** `pnpm check` and `pnpm typecheck` green on each of the 5 commits; at the tip `pnpm build` green and `pnpm test` → `Test Files  25 passed (25)`, `Tests  301 passed (301)`.
