# Backend-free game sharing

A game link shares the event name, card IDs, card order, numbers and blank cells.
Calls, winning targets, pause state, themes and print preferences stay on the device.
New games use a fresh 128-bit Web Crypto seed and a versioned deterministic generator.
Existing and imported cards use lossless packed contents when no matching seed exists.

## Link protocol

The fragment is `#bingo=<base64url JSON>.<checksum>`.
The checksum is the first 128 bits of SHA-256 over the encoded JSON. It detects
accidental corruption; it does not authenticate the organiser or prevent editing.
The fragment is decoded locally and is not included in the HTTP page request.

JSON payloads are `[1, name, count, seed]` for generated games and
`[2, name, cardIds, packedCards]` for exact contents. Version 1 uses a 16-byte
seed encoded as unpadded Base64url. Packed cards use 17 bytes each: a 27-bit
occupancy mask, fifteen 7-bit numbers in row order, and four zero padding bits.
Packed bytes are Base64url within the payload. Legacy repeated values are preserved.
Derived card titles are reconstructed using the existing import convention.

Keep `shareGeneratorV1.ts` behaviour and byte order unchanged. Future changes need
a new protocol version. Its fixed example in `shareGame.test.ts` guards old links.
AES-CTR with the seed as a 128-bit key, an all-zero initial counter and a 64-bit
counter field supplies deterministic random bytes. Integers use rejection sampling.
Cards have five numbers per row, at least one per column, sorted column values,
and unique numbers from the appropriate column ranges, including 90. Duplicate
cards are rejected. These constraints do not imply uniform sampling of all valid grids.
The bounded random stream fails explicitly if exhausted, rather than repeating.

Live draws use the existing independent draw path; they never use the shared seed.
Anyone with a game link can reconstruct the entire deck. It provides neither
private card allocation nor multiplayer synchronisation or proof of a fair draw.

## Device state and limits

Opening a link restores progress only from that exact game's local content key.
The key hashes the name, card IDs, order and cell values, independent of link format.
An invalid local copy does not prevent opening valid shared cards. Invalid links
leave existing saved data intact. Generated or imported replacement games clear
the old fragment. Sharing a running game never includes its progress.

Names are limited to 320 UTF-8 bytes, decks to 1,000 cards and fragments to 8,000
characters. Exact links grow with deck size. Oversized decks retain file export
as the fallback; the interface explains this. There is no universal guarantee that
every messaging service preserves links up to this application limit.
Clipboard failures expose a selectable link for manual copying.
