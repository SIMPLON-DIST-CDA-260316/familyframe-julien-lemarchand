# Friends: a cross request accepts

- Date: 2026-11-24
- Changes: open question 2 and the rejected "auto-accepting a reverse request on send" of [the friends design](2026-11-24-friends-design.md)
- AI usage: while testing the friends page on his phone, the author got « Une demande est déjà en attente avec cette personne. Si elle vous l'a envoyée, acceptez-la ci-dessous » inside the new « Ajouter un ami » dialog and asked whether that was the best experience. Claude Code answered no, proposed this change or a client-only fallback, and wrote it after the author asked to do it properly.

## Context

Step 4 answered `409 FRIEND_REQUEST_EXISTS` to a request towards someone whose request already waits, and counted on the « Accepter » button right below the form. Two things broke that:

- the form moved into a dialog: « ci-dessous » is hidden behind it, the user has to close it, find the pending list and accept;
- both people want the same friendship. Answering with an error and a chore turns agreement into a failure.

## Decision

`POST /api/friendships` towards someone whose request waits for me **accepts that request**:

| Case                         | Before                      | Now                                               |
| ---------------------------- | --------------------------- | ------------------------------------------------- |
| no link                      | `201 { friendship }`        | unchanged                                         |
| my own request already waits | `409 FRIEND_REQUEST_EXISTS` | unchanged                                         |
| their request waits for me   | `409 FRIEND_REQUEST_EXISTS` | `200 { friendship }`: same `id`, now a friendship |
| already friends              | `409 ALREADY_FRIENDS`       | unchanged                                         |

- The acceptance is the same atomic write as `POST /api/friendships/:id/accept` (`acceptReceived`, filtered on `{ id, addresseeId, status: 'pending' }`). If the request was cancelled or answered between the read and the write, the write matches nothing and the answer stays `409 FRIEND_REQUEST_EXISTS`.
- The status code tells the client what happened: 201, a request was sent; 200, an existing row became the friendship. The body keeps one shape, `{ friendship }`.
- The service returns `{ friendship, isAccepted }`; the log is `friendship.accepted`, as for the button.

The step 4 objection was "a second write path and two response shapes". The write path is the existing `acceptReceived`, not a new one, and the shape stays `{ friendship }`: only the status differs.

## Tests

- Unit: a second request from the same sender stays `FRIEND_REQUEST_EXISTS`; a reverse pending request is accepted (`acceptReceived(id, requesterId)`, no `create`, `isAccepted: true`, `friendship.accepted` logged); a reverse request gone before the write answers `FRIEND_REQUEST_EXISTS`.
- Bruno: `create/03-edge-demande-inverse` (409) is removed, `create/04…08` become `03…07`. A new folder `friendships/reverse/` (seq 5, after `delete/`, which leaves no friendship) holds `01-nominal-acceptation-croisee` (the member asks the admin in a script, the admin asks the member → 200, same id, the member sees the admin in `friends`) and `02-nominal-retrait` (204, the folder can run again). 71 → 72 requests.

## Consequence for step 5

[The sharing plan](../plans/2026-11-24-sharing.md) counts 71 Bruno requests at its start: it now starts at 72, and every later count shifts by one. Unit test counts shift by one too (two parametrized cases become three tests).
