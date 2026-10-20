# Copy diet (v2.2)

Every string that changed, was removed or was added in `packages/core/src/strings.ts` since v2.1 (`f2c807c`), plus copy that lived outside it. Word counts are in brackets; `{placeholders}` count as one word.

Limits: headline 6 words, one supporting line of 12, buttons 3, at most 2 buttons visible in a results or empty state. `packages/core/test/format.test.ts` checks the button limit for both languages and that "your turn" exists in exactly one key (`link.yourTurn`, used only while swiping).

## strings.ts

| key | old EN | new EN | old TR | new TR |
| --- | --- | --- | --- | --- |
| `brand` | WhatToWatch (1) | *removed* (0) | WhatToWatch (1) | *removed* (0) |
| `landing.kicker` | Night shift · 01:12 (3) | *removed* (0) | Gece vardiyası · 01:12 (3) | *removed* (0) |
| `landing.headline` | Couch. Two people. Forty minutes of scrolling. Let's end this. (10) | Forty minutes of scrolling. Enough. (5) | Kanepe. İki kişi. 40 dakikadır kaydırıyorsunuz. Bitirelim şunu. (8) | Kırk dakikadır kaydırıyorsunuz. Yeter. (4) |
| `landing.sub` | Everyone swipes the same stack. The first thing you all say yes to is what you watch. Less arguing. Not none, but less. (23) | Swipe the same stack. Watch what you all liked. (9) | Herkes aynı desteyi kaydırır. Hepinizin evet dediği ilk şey, bu akşam izlenecek olan. Tartışma azalır. Bitmez ama azalır. (18) | Aynı desteyi kaydırın, hepinizin beğendiğini izleyin. (6) |
| `landing.start` | Start a movie night (4) | Start movie night (3) | Film gecesi başlat (3) | Film gecesi başlat (3) |
| `landing.badCode` | That's not a room code. Six letters and numbers, no zeros or ones. (13) | Not a room code: six characters, no 0 or 1. (10) | Bu bir oda kodu değil. Altı harf ve rakam; sıfır ya da bir yok. (14) | Oda kodu değil: altı karakter, 0 ya da 1 yok. (10) |
| `landing.orSearch` | Or just look something up (5) | *removed* (0) | Ya da direkt bir şey ara (6) | *removed* (0) |
| `search.short` | Two letters at least. Browsing the shelves in the meantime. (10) | Two letters at least. Browsing till then. (7) | En az iki harf. O zamana kadar rafları gez. (9) | En az iki harf. O zamana kadar rafları gez. (9) |
| `filters.close` | Close (1) | *removed* (0) | Kapat (1) | *removed* (0) |
| `search.title` | Search the shelves (3) | *removed* (0) | Raflarda ara (2) | *removed* (0) |
| `search.placeholder` | Title, actor, that one director (5) | Title or actor (3) | Film, dizi, oyuncu, o yönetmen (5) | Film, dizi, oyuncu (3) |
| `search.prompt` | Type something. We'll check the back room. (7) | *removed* (0) | Bir şey yaz. Arka odaya bakalım. (6) | *removed* (0) |
| `search.empty` | Nothing under that name. Check the spelling, or try the original title. (12) | Nothing under that name. Try the original title. (8) | Bu isimde bir şey yok. Yazımı kontrol et ya da orijinal adıyla dene. (13) | Bu isimde bir şey yok. Orijinal adıyla dene. (8) |
| `search.titles` | Titles (1) | *removed* (0) | Filmler ve diziler (3) | *removed* (0) |
| `search.collections` | Series and sets (3) | *removed* (0) | Seriler (1) | *removed* (0) |
| `common.error` | The tape got chewed. Give it a second and try again. (11) | The tape got chewed. Try again. (6) | Kaset sıkıştı. Bir saniye bekle, tekrar dene. (7) | Kaset sıkıştı. Tekrar dene. (4) |
| `title.noProviders` | Not streaming in {region} right now. Might show up next month. Might not. (13) | Not streaming in {region} right now. (6) | Şu an {region} bölgesinde hiçbir platformda yok. Gelecek ay gelebilir. Gelmeyebilir de. (12) | Şu an {region} bölgesinde yayında değil. (6) |
| `title.partOf` | Part of {name} (3) | Part of {name} (3) | {name} serisinden (2) | Seriden: {name} (2) |
| `collection.parts` | In order (2) | *removed* (0) | Sırasıyla (1) | *removed* (0) |
| `footer.note` | Open late. No accounts, no tracking, no popcorn. (8) | No accounts. No tracking. No popcorn. (6) | Geç saate kadar açık. Hesap yok, takip yok, patlamış mısır da yok. (12) | Hesap yok. Takip yok. Mısır yok. (6) |
| `setup.mode.linkHint` | You swipe, send a link, they swipe later. No waiting around. (11) | You swipe, send a link, they swipe later. (8) | Önce sen kaydırırsın, linki atarsın, o sonra kaydırır. Kimse kimseyi beklemez. (11) | Sen kaydırırsın, linki atarsın, o sonra kaydırır. (7) |
| `setup.liveDown` | Live rooms are off tonight. Link mode does the same thing, one person at a time. (16) | Live rooms are off tonight. Pass a link instead. (9) | Canlı odalar bu gece kapalı. Link modu aynı işi görüyor, sadece sırayla. (12) | Canlı odalar bu gece kapalı. Link gönder. (7) |
| `lobby.waiting` | You need at least one more person. Send them the code. (11) | One more person needed. Send the code. (7) | En az bir kişi daha lazım. Kodu gönder. (8) | Bir kişi daha lazım. Kodu gönder. (6) |
| `deck.loosen` | Loosen the filters (3) | Loosen filters (2) | Filtreleri gevşet (2) | Filtreleri gevşet (2) |
| `deck.matchesSoFar` | {n} matched (2) | *removed* (0) | {n} eşleşme (2) | *removed* (0) |
| `match.title` | Tonight, it's this. (3) | *removed* (0) | Bu akşam bu. (3) | *removed* (0) |
| `match.everyone` | Everyone said yes. Nobody's seen it. (6) | *removed* (0) | Herkes evet dedi. Kimse izlememiş. (5) | *removed* (0) |
| `match.keepGoing` | Keep swiping (2) | *removed* (0) | Devam et (2) | *removed* (0) |
| `match.settle` | That's the one (3) | *removed* (0) | Tamam, bu (2) | *removed* (0) |
| `match.watchOn` | Watch on (2) | *removed* (0) | Nerede izlenir (2) | *removed* (0) |
| `match.details` | Full details (2) | *removed* (0) | Tüm detaylar (2) | *removed* (0) |
| `shortlist.title` | The shortlist (2) | *removed* (0) | Kısa liste (2) | *removed* (0) |
| `shortlist.hint` | In the order you agreed on them. (7) | *removed* (0) | Anlaştığınız sırayla. (2) | *removed* (0) |
| `shortlist.empty` | No matches yet. Somebody's being picky. (6) | *removed* (0) | Henüz eşleşme yok. Biri nazlanıyor. (5) | *removed* (0) |
| `link.share` | Send your picks (3) | *removed* (0) | Seçimlerini gönder (2) | *removed* (0) |
| `link.shareHint` | They open it, swipe the same stack, and the matches show up on their screen. They can send it back. (20) | *removed* (0) | Linki açar, aynı desteyi kaydırır, eşleşmeler onun ekranında çıkar. İsterse geri gönderir. (12) | *removed* (0) |
| `link.done` | Done swiping? Send it over. (5) | *removed* (0) | Bitti mi? Gönder gitsin. (4) | *removed* (0) |
| `link.noMatchYet` | No overlap yet. Send it on and see what they say. (11) | *removed* (0) | Henüz ortak bir şey yok. Gönder, bakalım o ne diyecek. (10) | *removed* (0) |
| `share.blind` | Which ones? That stays between you and the tape. (9) | *removed* (0) | Hangileri olduğu seninle kaset arasında kalsın. (6) | *removed* (0) |
| `share.shelfEnd` | That's the whole shelf for these filters, so this is the stack. (12) | Shelf's empty for these filters. This is the stack. (9) | Bu filtrelerle raf bu kadar, deste de bu. (8) | Bu filtrelerle raf bu kadar. Deste de bu. (8) |
| `share.line` | Send it over. They swipe the same stack, and the results land on their screen. (15) | They swipe the same cards. Results land on their screen. (10) | Linki at, o da kaydırsın. Sonuçlar onun ekranında. (8) | Linki at, o da kaydırsın. Sonuçlar onun ekranında. (8) |
| `share.orCopy` | Or copy it from here (5) | *removed* (0) | Ya da buradan kopyala (4) | *removed* (0) |
| `capped.newDeck` | Deal a new stack (4) | New stack (2) | Yeni deste dağıt (3) | Yeni deste (2) |
| `waiting.title` | Your part's done. Waiting on your friend. (7) | Done. Waiting on your friend. (5) | Senin kısmın bitti. Arkadaşını bekliyoruz. (5) | Bitti. Arkadaşını bekliyoruz. (3) |
| `waiting.body` | When they finish, the results show up on their screen. They can send them back to you. (17) | Results show up on their screen when they finish. (9) | O bitirince sonuçlar onun ekranında çıkar. İsterse sana geri gönderir. (10) | O bitirince sonuçlar onun ekranında çıkar. (6) |
| `results.swap` | Swap: you start this time (5) | You go first (3) | Değişelim: bu sefer sen başla (5) | Sen başla (2) |
| `results.addPerson` | Add another person (3) | Add another person (3) | Bir kişi daha ekle (4) | Kişi ekle (2) |
| `room.waitingOn` | You're through the stack. Waiting on {names}. (7) | *removed* (0) | Desteyi bitirdin. {names} bekleniyor. (4) | *removed* (0) |
| `room.leave` | Leave room (2) | *removed* (0) | Odadan çık (2) | *removed* (0) |
| `series.films` | — (0) | {n} films (2) | — (0) | {n} film (2) |
| `series.has` | — (0) | Has {title} (2) | — (0) | İçinde: {title} (2) |
| `series.matching` | — (0) | {n} of {of} match (4) | — (0) | {n}/{of} film uyuyor (3) |
| `series.onService` | — (0) | {n} of {of} on {service} (5) | — (0) | {service}: {n}/{of} film (3) |
| `series.startWith` | — (0) | Start with: {title} ({year}) (4) | — (0) | Buradan başla: {title} ({year}) (4) |
| `series.whereToStart` | — (0) | Where to start (3) | — (0) | Nereden başlamalı (2) |
| `series.flip` | — (0) | What's in it (3) | — (0) | İçinde ne var (3) |
| `series.flipBack` | — (0) | Back to the cover (4) | — (0) | Kapağa dön (2) |
| `series.nowhere` | — (0) | Not streaming (2) | — (0) | Yayında değil (2) |
| `results.more` | — (0) | More (1) | — (0) | Diğer (1) |

## Outside strings.ts

| where | old | new |
| --- | --- | --- |
| Share screen (`share-screen.tsx`, `share-view.tsx`) | headline + "Which ones? That stays…" kicker + optional sticker + paragraph + button + "Or copy it from here" label + field | headline + one line (the picky/shelf note replaces the line when there is one) + button + field (no label) |
| Waiting screen (link-room, mobile link) | notice (headline + paragraph) stacked on top of a second share screen | one share screen: "Done. Waiting on your friend." + one line + button + field |
| Zero-match results (web and mobile) | 4 buttons: swap, loosen, send back, add person | 2 buttons (You go first, Loosen filters) + a "More" text link that reveals the other two |
| Landing hero | "Night shift · 01:12" kicker + headline + line | headline + line |
| Landing "Deciding with someone?" | headline + 3 sentences | headline + one line |
| Footer | attribution + "Open late. No accounts…" (repeats the header badge) | attribution + "No accounts. No tracking. No popcorn." |
| Collection page | name + TMDB overview paragraph + "In order · 3" heading + poster grid | tape label + name + "Where to start: …" + numbered parts (year · runtime · rating · services) |
| `apps/web/app/layout.tsx` meta description | Swipe the same stack of movies together. The first one everybody likes, you watch. (15) | Find something to watch tonight. Search, or swipe one stack together. (11) |
| `apps/match/app/layout.tsx` meta description | Everyone swipes the same stack. First thing you all say yes to, you watch. (14) | Swipe the same stack. Watch what you all liked. (9) |

## Bug fixed

The zero-match screenshot from v2.1 showed "AYŞE ALREADY SWIPED. YOUR TURN." above the results. That kicker belongs to the friend's deck only. The results screens never render it, and e2e (k) checks a zero-match results screen in EN and TR for "your turn" / "sıra sende".
