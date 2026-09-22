# keystone-app

🗝️ Keystone is an AI web builder: describe a site, Keystone generates it, you
refine it turn by turn, then publish it. This is the builder UI (the API and
generation engine live in `keystone-api`), and it also serves the Keystone
marketing landing and pricing pages. Apache-2.0.

Stack: Bun, [TanStack Start](https://tanstack.com/start), TanStack Query +
[graphql-request](https://github.com/jasonkuhrt/graphql-request) +
[graphql-codegen](https://the-guild.dev/graphql/codegen), Tailwind CSS with
thornberry design tokens, Gatekeeper (auth), Aether (billing). Scaffolded from
`template-tanstack-start`.

## Run locally

First, `cp .env.local.template .env.local` and fill in the values.

```bash
bun install
bun dev          # http://localhost:3000
```

Or run the whole stack from the metarepo with `tilt up`.

`bun dev` also runs GraphQL codegen in watch mode, regenerating the typed React
Query hooks in `src/generated/graphql.ts` from the `.graphql` documents under
`src/lib/graphql/`.

## Surface

- `/` - marketing landing (Keystone plus the Omni ecosystem upsell).
- `/pricing` - tier comparison and checkout.
- `/build` - the builder: chat on the left, a sandboxed live preview on the
  right, a model picker, a design-system panel (Aura DTCG token import), and a
  publish panel. Publishing forwards the signed-in session to the hosted deploy;
  hosted publishing is gated by the API's `KEYSTONE_HOSTED_PUBLISH_ENABLED` flag,
  falling back to a read-only preview link when off.

## Docker

```sh
docker build -t keystone-app .
docker run -p 3000:3000 keystone-app
```

Multi-stage build (`deps` install, `builder` build, `runner` production image).
`NODE_PATH` resolves modules from both `/app/node_modules` and
`/app/.output/server/node_modules`; the server runs Bun directly
(`bun .output/server/index.mjs`) to avoid node shim compatibility issues.

## Testing

```sh
bun test                    # unit tests
bun test:watch
bun test:coverage

bunx playwright install     # once, for E2E
bun test:e2e
bun test:e2e:ui
```

Unit tests use [MSW](https://mswjs.io) to mock API calls; GraphQL mocks are
auto-generated in `src/generated/graphql.mock.ts` via GraphQL Code Generator.

## License

The code in this repository is licensed under Apache 2.0, &copy;
[Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
