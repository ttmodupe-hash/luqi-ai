# LUQI launch artwork

The workspace uses a hand-drawn open Q with a warm tail. The previous four-tile
header arrangement has been removed. The mark contains no Microsoft logo,
Windows panes, third-party icon, external font or embedded raster artwork.
This is a design change, not trademark clearance for the LUQI name or mark.

`public/luqi-mark.svg` is the header mark. `public/icon.svg` is the favicon and
source for the 192px/512px install icons. `public/icon-maskable.svg` keeps the
artwork inside a maskable icon's safe area. Both frontend public directories
contain the same assets. Run `bash scripts/render-brand-icons.sh` with Inkscape
installed when updating the checked-in PNGs; the app build needs no renderer.

The old PNG files were 1px images rather than their declared install sizes.
They are replaced by real 192px/512px artwork. Favicon and manifest URLs use a
revision to avoid reusing cached artwork; nonexistent app-store screenshots
were removed from the alternate manifest. Public descriptions now describe
the limited, availability-dependent AI trial alongside notes and physics.

Microsoft's published guidance warns against confusingly similar branding:
https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks
Before a broad commercial release, review the name and mark in the intended
markets with qualified trademark advice. No affiliation or clearance is claimed.
