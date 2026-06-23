import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TITLES = [
  "Freud en Israël", "Géographie des ténèbres", "Ghosts of a Holy War", "Heidegger et les juifs",
  "Histoire critique du Vieux Testament", "Histoire de la droite israélienne", "Histoire de ma vie",
  "Histoire des Juifs", "Introduction au Talmud", "Isaac", "Isidore et Simone Juifs en résistance",
  "Israël Rêve d'une terre nouvelle", "Je suis Juif et je me soigne", "Joseph et ses frères",
  "Judéobsessions", "K.O. à Tel Aviv tome 1", "L'affaire chocolat", "L'affaire Eszter Solymosi",
  "L'amitié", "L'Annonce", "L'Argent Données et débats", "L'envol de la mémoire",
  "L'hébreu 3000 ans d'histoire", "L'honorable correspondant", "L'Orient dévoilé",
  "La Bible en schémas", "La braise et la flamme", "La Cliente", "La Dernière Histoire juive",
  "La Guemara Sanhédrin", "La Hagada", "La maison de mon père", "La maison des otages",
  "La mort d'un juif", "La patiente du jeudi", "La poignée d'élus", "La Porte du vent",
  "La renaissance de l'hébreu", "La révolte d'Israël", "La Rose de Java", "La route d'Ein Harod",
  "Le baptême ou la mort", "Le Bouquin de l'humour juif", "Le chemin de la frontière",
  "Le cinéma israélien de la modernité", "Le commentaire sur la Torah", "Le commis", "Le Complot",
  "Le droit et les Juifs", "Le juif arabe", "Le juif errant est arrivé", "Le Juif rouge",
  "Le livre des passeurs", "Le métier de mourir", "Le nouveau cinéma israélien",
  "Le pacte germano-sioniste", "Le paradis des autres", "Le puits d'eaux vives", "Le Rire de Dieu",
  "Le roi des Juifs", "Le Roman de Moïse", "Le roman du malheur", "Le salut par les juifs",
  "Le saut d'Aaron", "Le savoir des victimes", "Le secret de la Torah", "Le sentier de rectitude",
  "Le siècle juif", "Le Tableau du peintre juif", "Le Tailleur de Relizane", "Le Talmud",
  "Le Talmud par thèmes", "Lectures bibliques", "Les deux Raoul et les Autobus Blancs",
  "Les Effinger", "Les Enfants de Cadillac", "Les enfants de la liberté",
  "Les figures juives de marx", "Les juifs dans l'histoire", "Les Juifs de Belleville",
  "Les Juifs français et le nazisme", "Les legendes des juifs tome 1",
  "Les Maisons hantées de Meyer Levin", "Les plus belles légendes juives", "Les Puits de Nuremberg",
  "Les récits hassidiques du Rabbi de Kotzk", "Les Secrets de la Bible", "Les Vengeurs",
  "Lève-toi et tue le premier", "L'incroyable histoire du peuple juif", "Ma Bible est une autre Bible",
  "Maïmonide", "Marie pleurait sur les pieds de Jésus", "Mémoires d'un anarchiste juif",
  "Menahem Begin", "Midrash de notre temps", "Ne le dis pas à ton frère",
  "On pensait qu'il allait revenir", "On peut rire de tout sauf de sa mère",
  "Personne ne quitte Palo Alto", "Place des Héros",
  "Quand l'administration française était antisémite", "Qui-vive", "Rashi Ebauche d'un portrait",
  "Reportages en Israël", "Rue Ordener rue Labat", "Samson le Nazir", "Sans appel", "Solitary",
  "Stern Gang", "Sur le dualisme en Israël", "Sur les rives de Tibériade",
  "Théâtre et sacré dans la tradition juive", "Toutes les vies de Théo",
  "Tribulations d'un jeune Juif polonais", "Turbulences", "Un homme sans mots",
  "Un jeune homme à la recherche de l'amour", "Un nommé Schulz",
  "Un nouveau défi pour la croyance en dieu", "Une terre pas si sainte", "Une vie volée",
  "Vies de Job", "Vivre", "Voir ci-dessous amour", "Zakhor"
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  // Fetch all books
  const allWorks = await base44.asServiceRole.entities.Works.filter({ type: "livre" }, "-created_date", 5000);

  let updated = 0;
  let notFound = [];

  for (const title of TITLES) {
    // Normalize: lowercase, trim, collapse spaces
    const normalize = s => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/['']/g, "'");
    const normTitle = normalize(title);
    const match = allWorks.find(w => {
      const wt = normalize(w.title || '');
      return wt === normTitle || wt.includes(normTitle) || normTitle.includes(wt);
    });

    if (!match) {
      notFound.push(title);
      continue;
    }

    const currentGenres = Array.isArray(match.genre) ? match.genre : (match.genre ? [match.genre] : []);
    if (currentGenres.includes("juifs")) continue; // already tagged

    await base44.asServiceRole.entities.Works.update(match.id, {
      genre: [...currentGenres, "juifs"]
    });
    updated++;
  }

  return Response.json({
    success: true,
    updated,
    not_found_count: notFound.length,
    not_found: notFound,
  });
});