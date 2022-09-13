declare module "git-side-band-message" {
  function encode(str: string, prefix?: string): Buffer;
  export default encode;
}
