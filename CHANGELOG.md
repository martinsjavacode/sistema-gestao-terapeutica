# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.2](https://github.com/martinsjavacode/sistema-gestao-terapeutica/compare/v0.1.1...v0.1.2) (2026-07-28)

### Features

* **attendances:** create linked appointment on attendance insertion ([f88a649](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/f88a6496770c796e2501034c7b79c3a0e539c167))
* booking online + refatoração DRY/SOLID ([e4b2829](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/e4b2829ef43e60024fa639911a4fda5a5838b09f))
* fichas personalizáveis de atendimento (ex-protocolos) ([0882d93](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/0882d93221a37d5d94d06405e058f0884b4b9f99))
* **fichas:** configuração detalhada dos campos personalizados ([bc82665](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/bc826655f1ac1ed0676c38d5cf5ad38e6670a7b9))
* **fichas:** drag and drop editor com [@dnd-kit](https://github.com/dnd-kit) ([819b904](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/819b90413229747f63b5d7fb5cf0cb5409d20ee2))
* **fichas:** fase 1 — fundação com is_default, snapshot e tipos de campo ([c4eccb9](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/c4eccb949c895a9d86c3da7684e1a8aba30728af))
* **fichas:** fase 2 — configuração com tipos de campo e ficha padrão ([85b69a4](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/85b69a4484d38fd57de2ba155d31e4903d75a225))
* **fichas:** fase 3 — renderização dos 4 tipos de campo e versionamento ([9b126f1](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/9b126f1d2618533cd57a2174fcd77d9cbb7a59ff))
* **fichas:** seções custom com múltiplos campos (fields) ([d8ac080](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/d8ac08020cff48564b6d9969c3ec352ec38cfc3b))
* melhorar sidebar do booking e snippets em todos os textareas ([07b6270](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/07b6270eb566e5ce291ce4653636c4ecef174d29))
* melhorias em templates, relatório e realtime ([e518443](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/e518443aa68ee5c76c0dd09f68b6ab9be83a037f))
* modularizar técnicas de terapia por plano ([e450685](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/e450685cf8c39a79c98e19647637373b1b337106))
* **templates:** adicionar grupos de campos (cards) em seções customizadas ([782e996](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/782e996f642e3eeeae2ec7c8e441b51d1cc91907))

### Bug Fixes

* campos personalizados composite/repeatable ([572f19c](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/572f19cfa5d72a3ea8216849d84a69644ed8690f))
* **migrations:** bucket logos usa ON CONFLICT DO NOTHING ([658da5e](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/658da5edab303a01e0f51db6e7d2afc3c91feb5a))
* renomear 'Protocolos' → 'Fichas' no sidebar, breadcrumbs e onboarding ([1d87403](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/1d8740348e0b32ddec1e47115bfcb1b074ca64a6))
* renomear rota /protocols → /templates ([17d6b4f](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/17d6b4fbd821d649f904363907f9e721204f5f20))
* signup flow, date validation, attendance status sync e remove PDF ([65ed840](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/65ed840400d383b332666f0aa7a52e84ce732ddd))
* **templates:** remover classe form-row para evitar conflito de estilos ([3391e23](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/3391e23952d9d51796fc2703d5f2996ec2612307))
## 0.1.1 (2026-07-19)

### Features

* Add initial project setup with React, TypeScript, and Supabase ([837fc2f](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/837fc2fa8c1bf660b08b8929771c1614133e6c6d))
* agenda estilo Google Calendar + ajustes UX ([9fce4de](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/9fce4de90217b8784fcd84df5d2002e56354d145))
* agenda, seções por terapia, histórico do cliente e redesign do relatório ([29bb72d](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/29bb72dc5f5c8741c6238e6d3aa3c90da3aab35d))
* implementar multitenancy SaaS e relatório público ([cfdcec2](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/cfdcec222e8d052a45cc186529c753ef383cd996))
* melhorias layout de clientes ([e96f240](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/e96f2408d715459fc006c9bec9f37d71bb5dec86))
* melhorias UX na tela de atendimento e relatório ([8570c00](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/8570c00c53f176ead3d4312a6554c7060026551c))
* **settings:** unifica equipe com badges de status clicáveis ([6e8e1de](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/6e8e1ded6c7cd5634f4a70b2570f60ed21706fa9))
* **ux:** implement phase 10 (polish & details) ([b560c1f](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/b560c1f3b9aec72f1f647302e6a07ab898569eca))
* **ux:** implement phases 1-4 of UX improvements ([86e207c](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/86e207c0046920c8c79d6c4877634435b46f310b))
* **ux:** implement phases 5-6 (snippets + dashboard advanced) ([1482822](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/1482822af475efc620d9652b6c999c9771f6eb78))
* **ux:** implement phases 7-8 (protocols + automations) ([0dd3b21](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/0dd3b2136d9412d8407130145e761ae2b849f429))

### Bug Fixes

* **ci:** manual adjustments to CI workflows ([5f9e4da](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/5f9e4daf63b4c7fa2bc4045aeb26eef46399bbb2))
* **ci:** use commitlint --last in feature pipeline ([aace07f](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/aace07f436b751f7b5037a039b73e85f0251e8b1))
* **ci:** use commitlint --last to avoid validating historical commits ([be33866](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/be338665b15416bf602f989268fdcc1011dc660f))
* **ci:** use origin/main for commitlint base, remove develop workflow ([c5fdb91](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/c5fdb9148dd0ae2e5091ec021666091f7044ec8f))
* correções Settings (nome consultório, upload logo, slug) ([85ac0d8](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/85ac0d831f34d2bc84bcfc48ccc0ba50d13ee2a1))
* **lint:** resolve all eslint errors and modernize config ([b81bc54](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/b81bc545c9654abb0d59bf2fabf08bc8573be8d2))
* **types:** resolve all 57 tsc -b errors for clean pre-push ([b591121](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/b591121bb12417dbfd68dfd42e706cc21cdaf047))
* **ux:** align sidebar icons when collapsed ([77dba2d](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/77dba2d18d23f95296c34d23bb91c527991ecb3f))
* **ux:** move collapse button inside footer to avoid overlap with logout ([42fe69e](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/42fe69e805e54f390d147b49f391a1bc22c71bf8))
* **ux:** sidebar starts collapsed by default ([b8d2364](https://github.com/martinsjavacode/sistema-gestao-terapeutica/commit/b8d23640426c912b52f5fc3a855996846f09e330))
