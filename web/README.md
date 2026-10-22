# Reed–Solomon Visual Lab

An interactive mathematical notebook for learning Reed–Solomon codes, Hamming distance, and list decoding in the context of STARKs. Built with TypeScript, React, and Vite, with a white paper-like interface, editable tapes, typeset mathematics, and green Hamming balls.

This is a frontend package inside the research repository. It shares the repository's Git history with the Rust code, Markdown notes, and future Lean work.

## Run locally

Use Node.js 22.12 or newer.

```sh
cd web
pnpm install --frozen-lockfile
pnpm run dev
```

Open the local URL printed by Vite. Each experiment has its own URL under `/visuals/`. The application computes locally in the browser and requires no API keys or backend.

```sh
pnpm run typecheck
pnpm test
pnpm run format:check
pnpm run build
pnpm run preview
```

`pnpm run build` checks TypeScript and writes the production site to `dist/`. `pnpm test` runs mathematical, serialization, and interaction tests. `pnpm run test:watch` watches tests during development.

Use `pnpm run format` to format the frontend's TypeScript, styles, configuration, and documentation with Prettier.

## Implemented experiments

| Step | Experiment                | Interactions                                                                                                                                        |
| ---- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | Tape to polynomial        | Edit integers modulo the selected field, add/remove slots with buttons, and follow each coefficient into its polynomial term.                       |
| 02   | Build a codeword          | Change the rate or evaluation count; inspect modular evaluation arithmetic and the resulting output tape.                                           |
| 03   | Measure errors            | Edit aligned reference/received rows; each unequal column contributes one to Δ. Inspect δ and a compact distance diagram.                           |
| 04   | Grow a Hamming ball       | Explore all 32 binary words of length five, change the center and radius, and optionally highlight the repetition code.                             |
| 05   | List decoding             | Read the guided explainer, compare exact one/two-candidate examples, grow the radius, and inspect every nearby polynomial.                          |
| 06   | Interleaved RS            | Edit two to four messages; follow each polynomial into an evaluation row. Inspect column tuples and compare shared versus separate error positions. |
| 07   | Random Linear Combination | Edit two vector tapes and α, sample α, switch input presets, and see whether h = f + αg is a codeword.                                              |
| 08   | MCA                       | Edit f and g, compare three aligned vector/codeword pairs on the same set S, and count failures across all 17 challenges.                           |
| 09   | From codes to proofs      | Edit trace evaluations, recover the polynomial with IFFT/Lagrange interpolation, extend it with FFT, and inspect a local FRI fold.                  |

**Tape editing:** Delete and Backspace edit digits normally; pressing either key again when the cell is empty removes that slot and focuses a neighboring cell. **Remove last coefficient** is also available. At least one coefficient slot remains. Integer input is reduced modulo the selected field (for example, 20 becomes 3 in F₁₇); the typed digits stay visible until Enter or blur. Negative integers wrap too, and decimal integer strings are reduced exactly before conversion to JavaScript numbers. Empty or invalid drafts left without deleting the cell revert to the last valid coefficient on Enter or blur.

The default RS example uses the prime field F₁₇, coefficients `[3, 2, 1]`, and evaluation points `0…7`. Its codeword is `[3, 6, 11, 1, 10, 4, 0, 15]`. Its minimum distance is 6 and its guaranteed unique-decoding radius is 2.

**List decoding** includes three short explanations: the definition, why multiple answers can fit, and the role of list-size bounds in STARK soundness. The example buttons load F₁₇ with k = 3 and n = 8; they separate the error count from the search radius so readers can grow the list while keeping the received word fixed. The explainer also distinguishes finding a candidate list from choosing the original message and interpolating a known clean codeword. Existing /visuals/decoding-radius links remain valid.

The guided corruption pattern has exactly one candidate at two errors and exactly two at three errors. The **Three-error example** button loads that ambiguity directly. The shared fixture is [rs-f17-k3-n8.json](../examples/rs-f17-k3-n8.json).

Experiments share the current polynomial and received word. Changing coefficients, block length, or field restores the received word to the new clean codeword. Built-in decoding and FFT presets are temporary: leaving their lesson restores the experiment you were working on, including the message from step 01. Reloading a preset also keeps that original experiment available. A compact polynomial stays visible in the later RS steps; the binary Hamming-ball universe has separate settings. **Reset** restores all experiments to their defaults and clears any saved experiment.

**From codes to proofs** uses the same polynomial on a roots-of-unity domain. The initial trace is [6, 10, 2, 11] on [1, 4, 16, 13] in F₁₇. Its eight-value LDE is [6, 11, 10, 15, 2, 3, 11, 0]. The different evaluation points explain why this codeword differs from step 02. The trace length m is the next power of two at least as large as the message's coefficient count, with zero padding. Its degree bound is less than m, and the LDE rate is m/N.

The four views distinguish the prover's interpolation and extension work from the verifier's local folding relation. Change the first folded entry, then inspect different query pairs to see a failure or a missed alteration. This computes exact field arithmetic; it does not implement Merkle authentication, Fiat–Shamir, multiple FRI rounds, computation constraints, or zero-knowledge masking. A passing local check is not a complete proof. Fields or message lengths without a suitable FFT extension offer an explicit F₁₇ preset.

**Copy link** preserves the displayed experiment, including the field, message, received word, radius, and deterministic seed. Opening a shared link restores those settings. Browser back/forward navigation between lessons keeps the latest experiment instead of reverting to older message values. A temporary preset's original experiment is saved in browser history state; it is not included in the preset's shared link. There is no browser-storage dependency.

**Interleaved RS** treats a column as one symbol in F_q^ℓ. The first row shares the earlier polynomial; other rows have independent editable messages with the same k slots. “Same column” versus “Different columns” keeps one changed entry per row but changes the column distance. It compares the reference and received matrices, not distance to the nearest interleaved codeword.

**Random Linear Combination** uses its own fixed RS code over F₁₇, with k = 2 and ordered domain `[1, 2, 4, 8, 16, 15, 13, 9]`. The starting vectors are `f = [1, 2, 4, 8, 1, 15, 13, 9]` and `g = [0, 0, 0, 0, 5, 0, 0, 0]`. Only α = 3 combines them into a codeword, the evaluation of p(X) = X. Edit any input cell modulo 17, choose or sample α, switch either input to a codeword or non-codeword preset, and reset the example. Valid codewords appear green and other words gray. Selecting a result cell shows its modular arithmetic. The live relative distance δ(h,C) checks all 289 codewords and shows the minimum mismatch count divided by 8, its percentage, and a nearest polynomial; ties are reported explicitly. The probability counts all 17 challenges for the current inputs, and Copy link preserves both vectors and α.

**MCA** uses the same RS code as Random Linear Combination: F₁₇, k = 2, and ordered domain `[1, 2, 4, 8, 16, 15, 13, 9]`. The starting vectors are `f = [0, 0, 0, 0, 0, 0, 7, 14]` and `g = [0, 0, 0, 0, 0, 0, 1, 1]`, adapted from [Mutual Correlated Agreement (MCA) for Dummies](https://hackmd.io/@-urCr-W9R8mS-UktGXSzbQ/S1_dP1Z3Mg). Six compact, aligned rows pair f, g, and h = f + αg with nearest codewords u₀, u₁, and c. The agreement set S between h and c is highlighted across every pair. Green cells match inside S, red cells differ inside S, and gray cells lie outside S. The “Only show S” toggle restricts all six rows to those same positions. D and S are listed beneath the tapes, with S ⊆ D.

The MCA failure event requires a sufficiently large set S where the combination agrees with a codeword but at least one input has no codeword explanation on the same S. This follows [WHIR §4.2, Definition 4.9](https://eprint.iacr.org/2024/1586), PDF retrieved September 13, 2026. The UI fixes δ = 1/4, so S needs at least six of the eight points. All 289 codewords are checked for input explanations. Since the minimum codeword distance is 7, a qualifying c is unique, and any codeword explaining an input on S is also that input’s unique nearest codeword. If h is more than two entries from every codeword, there is no qualifying agreement and no MCA failure. Tests independently enumerate every sufficiently large support and every codeword, including custom vectors and nearest-codeword ties.

For the starting vectors, α = 3 and α = 10 are the only MCA errors, so the exact failure probability is 2/17. Both codeword inputs give zero failures. Editable vectors, the α slider, random sampling, all 17 challenge buttons, and reset update the analysis immediately; Copy link preserves f, g, and α. Older F₅ MCA links load the new article example with a migration notice. The fractions describe the selected inputs, not worst-case soundness bounds.

## Deploy on Vercel

Import the **whole research repository** into Vercel and configure:

| Setting                                                              | Value                               |
| -------------------------------------------------------------------- | ----------------------------------- |
| Root Directory                                                       | `web`                               |
| Framework Preset                                                     | Vite                                |
| Install Command                                                      | `pnpm install --frozen-lockfile`    |
| Build Command                                                        | `pnpm run build`                    |
| Output Directory                                                     | `dist`                              |
| Node.js Version                                                      | `22.x` or a newer supported version |
| Include source files outside of the Root Directory in the Build Step | Enabled                             |

The last setting lets Vite read the existing Markdown notes from `../notes/`. Tests also consume fixtures from `../examples/`. The notes are bundled at build time, so the deployed app does not depend on a local filesystem or a separate notes server.

[vercel.json](./vercel.json) includes the SPA rewrite required for opening or refreshing a deep link such as `/visuals/hamming-ball`. No deployment has been created by this implementation.

See [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite) for SPA routing and its [monorepo FAQ](https://vercel.com/docs/monorepos/monorepo-faq) for including files outside the root directory.

## Structure

```text
web/
├── src/
│   ├── App.tsx                 Shared shell, navigation, and note access
│   ├── main.tsx                Application entry and bundled fonts
│   ├── core/math.ts            Pure small-field math and bounded enumeration
│   ├── core/search.ts          Exact non-enumeration cases and explicit unknown results
│   ├── core/agreement.ts       Interleaving, column supports, and exact MCA enumeration
│   ├── core/stark.ts           Lagrange interpolation, FFT/IFFT, LDE, and FRI pair arithmetic
│   ├── state/
│   │   ├── model.ts            Experiment types, validation, URL format
│   │   └── ExperimentContext.tsx
│   ├── components/             Math, tape, controls, and notes dialog
│   ├── visuals/BallScene.tsx    Distance-shell layout and green ball rendering
│   ├── lessons/
│   │   ├── registry.ts         Lesson metadata and lazy imports
│   │   └── *.tsx               One module per experiment
│   ├── styles.css              Shell, shared components, and base responsive styles
│   └── lesson-layouts.css      Visual relationships and responsive lesson layouts
├── tests/                      Math, links, and primary interactions
├── vite.config.ts
└── vercel.json
```

Add an experiment by creating a lesson module, adding its stable ID to `LESSON_IDS` in `src/state/model.ts`, and registering its metadata and lazy import in `src/lessons/registry.ts`. The shell automatically supplies navigation, grouping, step headings, note access, and previous/next links. Add the mathematics to `core/` rather than embedding it in layout code.

The notes remain ordinary Markdown in [notes/](../notes/). The notes dialog renders the relevant section of [grand_list_decoding.md](../notes/grand_list_decoding.md), [codes_to_proofs.md](../notes/codes_to_proofs.md) for the STARK lesson, or [reed-solomon-soundness.md](../notes/agentic_notes/reed-solomon-soundness.md) for the agreement lessons, with math support and a download of the source. Mermaid blocks in the source are displayed as code.

## Mathematical conventions and limits

- The initial arithmetic engine supports the prime fields F₅, F₇, and F₁₇. Switching fields loads a fresh preset. It does not silently reinterpret an existing experiment.
- The message has `k` coefficient slots, even when trailing coefficients are zero. The zero polynomial has no ordinary nonnegative degree.
- The first five lessons use the ordered RS domain `0…n−1`. Parameters satisfy `1 ≤ k ≤ n ≤ q`. The STARK lesson uses its own power-of-two multiplicative domains, with `m < N` and `N` dividing `q−1`; it does not reinterpret the earlier received word on those domains.
- Rate is the exact derived fraction `k/n`; the rate selector only offers attainable choices.
- Errors `e = Δ(c,w)` and search radius `E` are separate quantities. They can be linked for the guided decoding experiment.
- Crossing `t = floor((n−k)/2)` ends the worst-case unique-decoding guarantee. A particular received word can still have a unique candidate beyond it.
- Candidate lists are exact when available. Enumeration is capped at 10,000 codewords and 250,000 coordinate evaluations per search. Above the cap, a known codeword at distance e determines a singleton list when e ≤ E and e + E < d. At E = 0, interpolation followed by re-evaluation determines membership exactly. Other cases show **Count unavailable**, keep the reference codeword visible, and offer a small example. Unknown counts are never displayed as zero.
- The nearby-polynomials diagram draws a subset of codewords; its count searches the complete supported codebook. It does not enumerate the ambient space F₁₇⁸.
- Ball membership uses exact Hamming distances. Circular layouts preserve distance from the selected center, not all pairwise distances. Integer rings show shell distances; labels appear for the center, selection, hover, and keyboard focus. The zero-radius ball uses a minimum visible marker, and contains only the center word.
- The binary repetition code `{00000,11111}` is a separate teaching example, not a Reed–Solomon code.
- Shared JSON fixtures encode field elements as decimal strings to support future Rust/Lean examples without JavaScript integer rounding. The current TypeScript engine accepts only its documented small fields.
- Exhaustive checks are not Lean proofs. The fixture records that it is not formally verified.

## Planned features

These are future experiments, separate from the nine implemented lessons. The new subject-based notes have a detailed [visual sequence and implementation plan](../plans/research-notes-visuals.md).

Next from those notes:

| Planned visual                            | What the interaction will teach                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Soundness budgets                         | Plot query bits separately from assumed reduction bounds; reproduce the note’s exact benchmark without calling it whole-protocol security. |
| Build an interpolant                      | Select monomials, build finite-field constraints, and inspect exact rank, nullity, and a kernel witness.                                   |
| Hasse derivatives and jets                | Read the local expansion as a coefficient tape and track characteristic-dependent factorials.                                              |
| Contact and support root mass             | Count vanishing orders on the actual agreement set and inspect the inequality forcing a quotient to vanish.                                |
| Shared factors and differential equations | See why a nonzero kernel can retain a forbidden factor, and when a derivative equation adds an independent condition.                      |
| Source support optimization               | Explore interval dependencies and source/counting tradeoffs.                                                                               |
| First-jet balance                         | Compare the leading-model transition with exact finite discriminants; distinguish it from a certified soundness ceiling.                   |
| From experiment to certificate            | Connect source, domain, component, and budget obligations, with explicit evidence status.                                                  |

Further foundations and STARK visuals:

| Planned visual                       | What the interaction will teach                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Recover from any k evaluations       | Select clean evaluation points and reconstruct the message polynomial; remove one to see the remaining freedom. |
| FRI across rounds                    | Follow linked queries through successive folds, Merkle authentication, and the final degree check.              |
| From constraints to proximity        | Connect trace constraints, quotient polynomials, and low-degree testing in a complete STARK example.            |
| Why d = n−k+1                        | Compare two polynomials and relate shared evaluations to the roots of their difference.                         |
| Find the worst received word         | Compare a particular list with the maximum list size over all centers in a fully enumerable tiny example.       |
| Rate versus decoding thresholds      | Compare unique decoding, Johnson, and capacity benchmarks with their assumptions and finite-length corrections. |
| Errors versus erasures               | Compare unknown corruptions with known missing positions and explore the budget `2e+s ≤ n−k`.                   |
| Folding                              | Bundle positions of one evaluation tape and see how the alphabet and Hamming metric change.                     |
| Roots-of-unity domains and cosets    | Traverse structured evaluation domains and inspect their algebraic relations.                                   |
| MDS through generator-matrix columns | Select Vandermonde columns and compute their exact finite-field rank.                                           |
| Higher-order MDS                     | Inspect intersections of several column spans using verified small examples.                                    |
| Correlated agreement                 | Highlight shared agreement coordinates and inspect combinations of words.                                       |
| Soundness in bits                    | Convert stated error bounds into bits with explicit parameters and hypotheses.                                  |
| Counterexample workbench             | Load Rust-generated or formally checked fixtures and inspect their words and agreement sets.                    |

Future MCA extensions can compare radius-versus-error profiles, additional challenge distributions, and certified bounds. Any worst-case claim needs a sourced theorem with its hypotheses; the implemented finite examples do not establish one.

The longer design and implementation plan is [plans/rs-visual-lab.md](../plans/rs-visual-lab.md).
