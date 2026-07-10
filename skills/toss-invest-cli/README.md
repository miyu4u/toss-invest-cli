# toss-invest-cli Skill

Standalone operating skill for the compiled `toss-invest-cli` command.

## Runtime contract

- `toss-invest-cli` is the supplied compiled executable name; the caller must expose it on `PATH` before use. This package intentionally does not prescribe an installation path.
- The complete execution, query, order, dry-run, output, and live-order safety contract is in [`SKILL.md`](./SKILL.md).
- The package has no external documentation or helper-script dependency.