// Les six titres sont ceux de la sélection de Kyle MacNeill publiée par British GQ.
const frenchPath = '/article/you-can-see-everything-6-documentaires-a-voir-durgence-avant-le-film-sur-elizabeth-holmes';
const britishPath = '/article/6-wild-and-twisty-documentaries-to-watch-before-you-can-see-everything-30-10-26';
const source = 'https://www.gqmagazine.fr' + frenchPath;

export const gqDocumentaries = [
  { id: 'grizzly-man', title: 'Grizzly Man', year: 2005, creator: 'Werner Herzog',
    duration_minutes: 103, country: 'États-Unis',
    cover_image: 'https://fr.web.img6.acsta.net/medias/nmedia/18/35/93/07/18453521.jpg',
    description: 'Werner Herzog revient sur la vie de Timothy Treadwell, qui filmait les grizzlis en Alaska.' },
  { id: 'spermworld', title: 'Spermworld', year: 2024, creator: 'Lance Oppenheim',
    duration_minutes: 84, country: 'États-Unis',
    cover_image: 'https://static.wixstatic.com/media/7956db_640ec5bc81e740d4b86c2abd12446881~mv2.jpg',
    description: 'Une plongée dans le monde des dons de sperme organisés en dehors des cliniques.' },
  { id: 'tickled', title: 'Tickled', year: 2016, creator: 'David Farrier, Dylan Reeve',
    duration_minutes: 92, country: 'Nouvelle-Zélande',
    cover_image: 'https://fr.web.img6.acsta.net/pictures/16/08/16/12/30/425756.jpg',
    description: 'Une enquête sur des compétitions de chatouilles qui prend un tour inattendu à mesure que les réalisateurs remontent à leur organisateur.' },
  { id: 'f-for-fake', title: 'F for Fake', year: 1973, creator: 'Orson Welles',
    duration_minutes: 85, country: 'France, Iran, Allemagne de l’Ouest',
    cover_image: 'https://fr.web.img4.acsta.net/pictures/22/12/14/08/54/2617441.jpg',
    description: 'Un essai sur le faux et l’illusion, construit autour du faussaire Elmyr de Hory et du biographe Clifford Irving.' },
  { id: 'bowling-for-columbine', title: 'Bowling for Columbine', year: 2002, creator: 'Michael Moore',
    duration_minutes: 120, country: 'États-Unis, Canada',
    cover_image: 'https://fr.web.img2.acsta.net/medias/nmedia/00/02/45/18/affiche2.jpg',
    description: 'Michael Moore enquête sur la place des armes à feu dans la société américaine après la tuerie de Columbine.' },
  { id: 'close-up', title: 'Close-Up', year: 1990, creator: 'Abbas Kiarostami',
    duration_minutes: 94, country: 'Iran',
    cover_image: 'https://fr.web.img3.acsta.net/pictures/16/02/08/12/55/304121.jpg',
    description: 'Abbas Kiarostami mêle procès et reconstitution pour raconter comment un homme s’est fait passer pour le cinéaste Mohsen Makhmalbaf.' },
].map(work => ({ ...work, type: 'documentaire', genre: ['documentaire'], status: 'À voir', source_url: source }));

export function isGqDocumentaryList(url) {
  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname.replace(/\/$/, '');
  return (host === 'gqmagazine.fr' && path === frenchPath)
    || (host === 'gq-magazine.co.uk' && path === britishPath);
}
