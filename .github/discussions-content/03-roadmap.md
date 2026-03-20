# 🗺️ Roadmap público — aiplang

O que está sendo construído e quando.

## ✅ Feito (v2.9.1)

- `.env` auto-load
- PostgreSQL via `~db postgres $DATABASE_URL`
- WebSockets (`~realtime`)
- Cache in-memory (`~cache key ttl`)
- `~import ./auth.aip` — arquivos modulares
- `~lang v2.9` — versionamento semântico
- 5 templates prontos (blog, ecommerce, todo, analytics, chat)
- GitHub Actions — testes automáticos
- SECURITY.md — threat model
- PROMPT_GUIDE.md — como gerar apps bons
- VS Code syntax highlighting + snippets

## 🔨 Em construção (próximas versões)

- [ ] Playground online — cole um prompt, veja o app rodando
- [ ] VS Code extension na Marketplace
- [ ] `npx aiplang export` — gera código Next.js/Express equivalente
- [ ] Admin panel customizável com blocos `.aip`
- [ ] Suporte a multi-LLM (Gemini, Llama, Grok)

## 💡 Backlog (ideas aprovadas)

- [ ] `~cron "0 9 * * *" jobName` — cron jobs
- [ ] `~webhook /api/github` — webhook handlers
- [ ] `~graphql` — endpoint GraphQL automático
- [ ] Playground embeddável (iframe)
- [ ] `aiplang tune` — fine-tuning com seus exemplos

---

**Quer votar em uma feature?** 👍 nos itens acima ou abra uma [Idea](../discussions/categories/ideas).

**Quer contribuir?** Veja [CONTRIBUTING.md](../CONTRIBUTING.md).
