# Validy

En minimalistisk chatt där du frågar din data. Validy kopplar Claude till
strukturerade tabeller över bostadsrättsföreningar — föreningar, lån,
lägenheter, årsredovisningar och underhållsplaner — och korsar dem för att
svara på frågor som:

> Hur ser bostadsrätten Katthusets förutsättningar ut om räntan höjs 2%?

Modellen identifierar föreningen, hämtar lån och senaste årsredovisning,
simulerar räntehöjningen lån för lån, räknar ut effekten på årsresultat och
nödvändig avgiftshöjning per kvm och per lägenhet, och presenterar slutsatsen
i klartext.

## Kom igång

```bash
npm install
cp .env.example .env.local
# lägg in din ANTHROPIC_API_KEY i .env.local
npm run dev
```

Öppna http://localhost:3000.

## Hur det fungerar

- **Frontend** — `app/page.tsx` + `components/chat.tsx`. Minimalistisk
  monokrom chatt med SSE-streaming av tokens och verktygskörningar.
- **Backend** — `app/api/chat/route.ts` driver en Anthropic tool-use-loop
  och streamar både text och verktygsanrop till klienten.
- **Datalager** — `lib/data.ts` håller det seedade datasetet
  (5 föreningar inkl. Katthuset, deras lån, lägenheter, årsredovisningar
  och underhållsplaner).
- **Verktyg** — `lib/tools.ts` exponerar verktyg som
  `search_cooperatives`, `get_cooperative`, `simulate_interest_change`,
  `compare_cooperatives` osv.

## Byta modell

Ange `ANTHROPIC_MODEL` i `.env.local`. Standard är `claude-sonnet-4-6`.
För djupare resonemang använd `claude-opus-4-7`.
