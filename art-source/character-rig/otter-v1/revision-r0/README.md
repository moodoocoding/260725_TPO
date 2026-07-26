# Episode 1 clothing rig revision R0

This directory freezes the shared clothing connection contract before the
episode-one inventory is expanded.

## Fixed geometry

- Canvas: `1024 × 1536`
- Canvas center: `x=512`
- Rig and garment center: `x=526`
- Waist anchor: `W=(526,858)`
- Waist connection: `x=382~670`
- Waist band: `y=842~878`
- Target overlap: `24~30px`
- Accepted overlap: `20~36px`

`wear-contract.json` is the machine-readable source of truth.
`rig-guide.svg` is the visual guide for artists.

Per-item runtime transforms are not allowed. If an item misses the shared
connection, its source path must be revised.
