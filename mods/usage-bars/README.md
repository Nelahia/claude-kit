# usage-bars

Rounded, muted gradient progress bars above the prompt of **Claude Code Desktop**: context window, 5-hour window, 7-day window, and the spend of the current session.

![usage-bars above the Claude Code Desktop prompt](docs/screenshot.png)

## Install

In a Claude Code terminal session:

```
/plugin install usage-bars --marketplace Nelahia/claude-kit
```

Answer `y` to add the marketplace, then pick the `user` scope. The mod is active right away, and in every session started afterwards, including the desktop app.

## What it shows

| Item | Source | Notes |
| --- | --- | --- |
| `context` | the model's context window | With an API key, token counts show too (`42k/200k`). |
| `5h` / `7d` | subscription usage limits | `↻` is the time left before the reset. |
| `spend` | a gateway's spend limit | Only when the account has one. |
| `spent` | cost of the session, as `/cost` totals it | Covers the session, not the whole month. |

A bar turns from its normal gradient to a warm tone (terracotta to brick red) past 85%.

## Customize

Everything lives in `hooks/`:

- `register.tsx`: `BAR_WIDTH` and `BAR_HEIGHT` size the bars, `TRACK` is the empty-track color.
- `gauge.ts`: `PALETTES` and `HOT` hold each gauge's gradient. Thresholds and the reset format are there too.

The layout counts character cells (about 8 px each), not pixels. If you lengthen the bars, check that the block does not overflow.

## Limits

- Built for the **desktop app**: the bars are `Svg` elements. In a plain terminal the mod draws nothing.
- The 5h and 7d windows only appear on a subscription, and only after the first API response.

## Structure

```
.claude-plugin/   plugin.json
hooks/            gauge.ts (pure logic) · register.tsx (drawing)
types/            the mod's state contract
docs/             screenshot
```
