export interface Background {
  id: string
  label: string
  blurb: string
  asset: string
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'canvas-fluid',
    label: 'Canvas',
    blurb: 'Pigment rings on woven turquoise canvas.',
    asset: '/backgrounds/canvas-fluid.jpg',
  },
  {
    id: 'fluid-ink',
    label: 'Ink',
    blurb: 'Clouds of magenta, cyan and yellow dye.',
    asset: '/backgrounds/fluid-ink.jpg',
  },
  {
    id: 'mosaic-grid',
    label: 'Mosaic',
    blurb: 'A quiet grid of pastel glass fragments.',
    asset: '/backgrounds/mosaic-grid.jpg',
  },
  {
    id: 'industrial-grunge',
    label: 'Grunge',
    blurb: 'Weathered turquoise paint and rust.',
    asset: '/backgrounds/industrial-grunge.jpg',
  },
  {
    id: 'frosted-glass',
    label: 'Glass',
    blurb: 'Cool blue glass beaded with water.',
    asset: '/backgrounds/frosted-glass.jpg',
  },
]

export const DEFAULT_BACKGROUND = BACKGROUNDS[0].id

export function getBackground(id: string): Background {
  return BACKGROUNDS.find((background) => background.id === id) ?? BACKGROUNDS[0]
}

export function backgroundTexture(id: string): string {
  return `background-${getBackground(id).id}`
}
