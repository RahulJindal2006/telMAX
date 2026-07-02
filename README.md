# telMAX Website

A rebuild of the telMAX website using [Astro](https://astro.build) — a fast,
component-based framework that outputs plain static HTML/CSS.

## Running the site

```sh
npm install      # first time only
npm run dev      # local preview at http://localhost:4321
npm run build    # production build into ./dist
npm run preview  # preview the production build
```

## Project structure

```text
src/
├── layouts/
│   └── Layout.astro      # <head>, Header + Footer wrapper for every page
├── components/
│   ├── Header.astro      # sticky top navigation
│   └── Footer.astro      # footer link columns
├── pages/                # each .astro file = one URL
│   ├── index.astro       # /            Home (Residential)
│   ├── internet.astro    # /internet
│   ├── tv.astro          # /tv
│   ├── home-phone.astro  # /home-phone
│   ├── business.astro    # /business
│   ├── deals.astro       # /deals       MAX Deals
│   ├── refer-a-friend.astro
│   ├── support.astro
│   ├── about.astro
│   ├── careers.astro
│   ├── contact.astro
│   ├── my-telmax.astro
│   ├── privacy.astro
│   └── terms.astro
└── styles/
    └── global.css        # design tokens (colours, fonts) + shared styles

public/images/            # logos, icons, photos and badges
```

## Making changes

- **Colours / fonts:** edit the variables at the top of `src/styles/global.css`.
- **Navigation links:** edit the `navItems` array in `src/components/Header.astro`.
- **Footer links:** edit the `columns` array in `src/components/Footer.astro`.
- **Plans / prices:** each page has a data array at the top (inside the `---`
  fences) — e.g. `plans` in `internet.astro`. Change the data, not the markup.
- **Add a page:** drop a new `.astro` file in `src/pages/`; the filename becomes
  the URL.

## Notes

- **Fonts:** the live site uses licensed fonts (Proxima Nova, Quincy CF). This
  build uses free Google Fonts (Figtree, Fraunces) as close matches. Swap in the
  licensed fonts in `Layout.astro` + `global.css` if you have the licences.
- **Forms:** the contact, referral and sign-in forms are front-end only. Wire
  them to a backend or form service to make them functional.
- **Images:** real telMAX photos, logos, icons and badges were pulled from
  telmax.com into `public/images/`.
