export interface Background {
  id: string
  label: string
  blurb: string
  asset: string
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'fluid-ink',
    label: 'Ink',
    blurb: 'Clouds of magenta, cyan and yellow dye.',
    asset: '/backgrounds/fluid-ink.jpg',
  },
]

export const DEFAULT_BACKGROUND = BACKGROUNDS[0].id

export function getBackground(id: string): Background {
  return BACKGROUNDS.find((background) => background.id === id) ?? BACKGROUNDS[0]
}

export function backgroundTexture(id: string): string {
  return `background-${getBackground(id).id}`
}
