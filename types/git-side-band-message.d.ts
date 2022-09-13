declare module "git-side-band-message" {
  function encode(str: string, prefix?: Buffer): Buffer;
  export default encode;
}
