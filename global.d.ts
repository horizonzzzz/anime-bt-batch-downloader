declare module "*.svg" {
  const src: string
  export default src
}

declare module "*.png" {
  const src: string
  export default src
}

declare module "data-text:*" {
  const content: string
  export default content
}
