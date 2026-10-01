/**
 * Palpite de link de cifra/letra a partir do nome e do artista, no padrão de URL dos dois sites:
 * `Clichê` + `Sorriso Maroto` -> `sorriso-maroto/cliche`. Se o palpite errar, o site abre um 404 com
 * busca e a pessoa cola o link certo no lugar.
 */

/** minúsculas, sem acento, sem apóstrofo e com hífen no lugar de tudo que não é letra ou número. */
export function urlSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "Clichê (Ao Vivo)" é a mesma música de "Clichê": o que vem entre parênteses/colchetes sai do título. */
const withoutAnnotations = (title: string) => title.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');

function songPath(title: string, artist: string): string | null {
  const t = urlSlug(withoutAnnotations(title));
  const a = urlSlug(artist);
  return t && a ? `${a}/${t}/` : null;
}

export const cifraClubUrl = (title: string, artist: string) => {
  const path = songPath(title, artist);
  return path ? `https://www.cifraclub.com.br/${path}` : '';
};

export const letrasUrl = (title: string, artist: string) => {
  const path = songPath(title, artist);
  return path ? `https://www.letras.mus.br/${path}` : '';
};
