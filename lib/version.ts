// Fonte única da versão do app: o campo "version" do package.json (SemVer), injetado pelo next.config.ts.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION as string;
