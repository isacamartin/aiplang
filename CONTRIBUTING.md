# Contribuindo com aiplang

Obrigado pelo interesse! aiplang é um projeto open-source e qualquer contribuição é bem-vinda.

## Como contribuir

### 🐛 Reportar bugs
Abra uma [Issue](https://github.com/isacamartin/aiplang/issues/new) com:
- Versão do aiplang (`npx aiplang --version`)
- O arquivo `.aip` que causou o problema
- O erro completo do terminal
- O que você esperava vs o que aconteceu

### 💡 Sugerir features
Use [GitHub Discussions → Ideas](https://github.com/isacamartin/aiplang/discussions/categories/ideas) para discutir antes de abrir uma Issue.

### 📖 Melhorar documentação
PRs com melhorias em README, PROMPT_GUIDE.md ou nos templates são sempre aceitos.

### 🧩 Adicionar templates
Crie um `.aip` funcional, teste com `npx aiplang start`, abra um PR para a pasta `/templates`.

### 🔧 Contribuir com código
1. Fork o repositório
2. `cd packages/aiplang-pkg && npm install`
3. Edite `bin/aiplang.js` (CLI + frontend) ou `server/server.js` (backend)
4. Teste: `node bin/aiplang.js build seu-arquivo.aip --out /tmp/test`
5. Abra um PR com descrição clara do que mudou e por quê

## Estrutura do projeto

```
packages/aiplang-pkg/
  bin/aiplang.js          ← CLI + parser + renderer (frontend)
  server/server.js        ← Full-stack server (backend + ORM)
  runtime/aiplang-hydrate.js   ← Hydrate runtime (browser)
  runtime/aiplang-runtime.js   ← Full runtime (browser)

templates/               ← .aip templates prontos
docs/                    ← GitHub Pages
vscode-extension/        ← VS Code syntax + snippets
```

## Princípios do projeto

- **AI-first**: a sintaxe deve ser otimizada para o LLM gerar, não para humano escrever
- **Zero config**: tudo deve funcionar sem configuração manual
- **Um arquivo**: o ideal é um app completo num único `.aip`
- **Determinístico**: mesma sintaxe → mesmo output, sempre

## Code style

- JavaScript simples, sem TypeScript
- Funções pequenas com nomes descritivos
- Sem frameworks de teste externos — os testes ficam em `.github/workflows/tests.yml`

## Dúvidas?

Abra uma [Discussion](https://github.com/isacamartin/aiplang/discussions) ou um [Issue](https://github.com/isacamartin/aiplang/issues).
