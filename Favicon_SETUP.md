# Custom Favicon Setup

To replace the default favicon with your custom "Motoring" logo:

1. Create a new favicon file (16x16, 32x32, or 64x64 pixels) in .ico format
2. Name it `favicon.ico`
3. Replace the existing file at `/public/favicon.ico`

## Alternative approach using image files:

If you prefer to use PNG or SVG files instead of ICO:

1. Create your logo as a 32x32 PNG file named `favicon.png`
2. Or create an SVG file named `favicon.svg`
3. Update the metadata in `app/layout.tsx` to reference the new file:

```ts
export const metadata: Metadata = {
  title: "Motoring",
  description: "Sistem Manajemen Kendaraan - Motoring",
  icons: {
    icon: "/favicon.png", // or "/favicon.svg"
  },
};
```

## Recommended favicon generators:

- https://www.favicon-generator.org/
- https://realfavicongenerator.net/
- Use your existing logo or create a simple "M" symbol to match the design in your homepage