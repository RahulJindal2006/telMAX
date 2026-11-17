# Fonts

Both files are served from this site; nothing is loaded from Google Fonts.

| File | Typeface | Stands in for | Licence |
| --- | --- | --- | --- |
| `figtree-latin.woff2` | Figtree, variable weight 300 to 900, Latin | Proxima Nova (text and interface) | SIL Open Font License 1.1, `Figtree-OFL.txt` |
| `fraunces-soft-latin.woff2` | Fraunces, upright, weight 400 to 700, Latin | Quincy CF (headings) | SIL Open Font License 1.1, `Fraunces-OFL.txt` |

`fraunces-soft-latin.woff2` is a subset made for this site from the full
variable font: the "soft" axis is fixed at 100 and the "wonk" axis at 0,
weight is limited to 400 to 700, and the optical-size axis is kept, so
large headings and small text each get the right cut. The italic is not
included. It is loaded in CSS under the name "Fraunces Soft".

To use telMAX's licensed brand typefaces instead, add their files here,
point the two `@font-face` rules at the top of `src/styles/global.css`
at them, and change `--sans` and `--serif`.
