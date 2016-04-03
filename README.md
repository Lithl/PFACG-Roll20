# PFACG-Roll20

**freeze.js:** Any token with "freeze" (case insensitive) in its name will be stuck in place. This is used for things like the representations of the blessings deck, so they don't get moved all over the board.

**locations.js:** Stores position data to placing tokens to represent cards on the table.

**main.js:** Handles *most* of the API commands used by the system.

**management.js:** Manages the game itself (start/reset)

**static-data.js:** Stores card data for all cards from Rise of the Runelords base set & most expansions (all APs, character deck expansion, and promo cards; individual character deck card/deck data not included because I don't own them).

**utility.js:** Utility functions used by the rest of the system. They're all string-manipulation functions, and so they're prototyped onto `String` (except `guid`, which is static).
