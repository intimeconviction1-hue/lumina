import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { time_available, mood, context, candidates } = await req.json();

  // Garde-fou : liste vide ou trop courte
  if (!candidates || candidates.length === 0) {
    return Response.json({ no_match: true, reason: "Aucune œuvre en veille disponible." });
  }

  // Construire la liste candidates pour le prompt (titre + type + genre + durée + plateforme)
  const candidateLines = candidates.map((w, i) =>
    `${i + 1}. "${w.title}" — ${w.type}${w.genre?.length ? ` (${w.genre.slice(0,2).join(", ")})` : ""}${w.duration_minutes ? ` — ${w.duration_minutes} min` : ""}${w.platform?.length ? ` — sur ${w.platform[0]}` : ""}`
  ).join("\n");

  const prompt = `Tu es un assistant de recommandation culturelle. Ton rôle est de choisir UNE œuvre dans la liste suivante, en fonction des préférences de l'utilisateur.

PRÉFÉRENCES :
- Temps disponible : ${time_available}
- Humeur : ${mood}
- Contexte : ${context}

LISTE DES ŒUVRES EN VEILLE (numérotées) :
${candidateLines}

RÈGLES STRICTES :
1. Tu dois choisir exactement UNE œuvre dans cette liste numérotée. Jamais une œuvre inventée.
2. Si aucune œuvre ne correspond raisonnablement, réponds avec no_match=true et une reason courte.
3. La raison doit être une phrase courte (max 12 mots), factuelle, liée aux préférences. Pas de poésie.
4. Réponds UNIQUEMENT en JSON. Aucun texte en dehors du JSON.

FORMAT DE RÉPONSE (choisir l'un des deux) :

Si tu trouves un match :
{"title": "Titre exact de l'œuvre", "reason": "Raison courte et factuelle"}

Si aucun match raisonnable :
{"no_match": true, "reason": "Explication courte"}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        reason: { type: "string" },
        no_match: { type: "boolean" }
      }
    }
  });

  // Validation : vérifier que le titre proposé existe bien dans les candidates
  if (!result.no_match && result.title) {
    const match = candidates.find(w =>
      w.title.toLowerCase().trim() === result.title.toLowerCase().trim()
    );
    if (!match) {
      // Hallucination détectée : titre inconnu
      return Response.json({ no_match: true, reason: "Aucune correspondance exacte trouvée dans ta liste." });
    }
    return Response.json({ work: match, reason: result.reason });
  }

  return Response.json({ no_match: true, reason: result.reason || "Aucune œuvre ne correspond parfaitement." });
});