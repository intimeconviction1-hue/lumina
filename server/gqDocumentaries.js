// Les six titres sont ceux de la sélection de Kyle MacNeill publiée par British GQ.
const frenchPath = '/article/you-can-see-everything-6-documentaires-a-voir-durgence-avant-le-film-sur-elizabeth-holmes';
const britishPath = '/article/6-wild-and-twisty-documentaries-to-watch-before-you-can-see-everything-30-10-26';
const source = 'https://www.gqmagazine.fr' + frenchPath;

export const gqDocumentaries = [
  { id: 'grizzly-man', title: 'Grizzly Man', year: 2005, creator: 'Werner Herzog',
    description: 'Werner Herzog revient sur la vie de Timothy Treadwell, qui filmait les grizzlis en Alaska.' },
  { id: 'spermworld', title: 'Spermworld', year: 2024, creator: 'Lance Oppenheim',
    description: 'Une plongée dans le monde des dons de sperme organisés en dehors des cliniques.' },
  { id: 'tickled', title: 'Tickled', year: 2016, creator: 'David Farrier, Dylan Reeve',
    description: 'Une enquête sur des compétitions de chatouilles qui prend un tour inattendu à mesure que les réalisateurs remontent à leur organisateur.' },
  { id: 'f-for-fake', title: 'F for Fake', year: 1973, creator: 'Orson Welles',
    description: 'Un essai sur le faux et l’illusion, construit autour du faussaire Elmyr de Hory et du biographe Clifford Irving.' },
  { id: 'bowling-for-columbine', title: 'Bowling for Columbine', year: 2002, creator: 'Michael Moore',
    description: 'Michael Moore enquête sur la place des armes à feu dans la société américaine après la tuerie de Columbine.' },
  { id: 'close-up', title: 'Close-Up', year: 1990, creator: 'Abbas Kiarostami',
    description: 'Abbas Kiarostami mêle procès et reconstitution pour raconter comment un homme s’est fait passer pour le cinéaste Mohsen Makhmalbaf.' },
].map(work => ({ ...work, type: 'documentaire', status: 'À voir', source_url: source }));

export function isGqDocumentaryList(url) {
  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname.replace(/\/$/, '');
  return (host === 'gqmagazine.fr' && path === frenchPath)
    || (host === 'gq-magazine.co.uk' && path === britishPath);
}
