// =====================================================================
// Δίκτυο Γραφείων Διασύνδεσης — λειτουργία τεχνητής νοημοσύνης (Supabase Edge Function "ai")
//
// Ενέργειες:
//   bulletin  { month: "YYYY-MM" }          → Δελτίο του μήνα (αυτόματο, χωρίς επεξεργασία από ανθρώπους)
//   improve   { kind, title, body }         → βελτίωση κειμένου ανάρτησης
//   translate { title, body }               → αγγλική εκδοχή ανάρτησης
//
// Στο AI στέλνεται ΜΟΝΟ το κείμενο των αναρτήσεων και το όνομα του ιδρύματος —
// ποτέ ονόματα, email ή άλλα στοιχεία χρηστών.
// Χρειάζεται το μυστικό GEMINI_API_KEY (Edge Functions → Secrets).
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MONTHS_NOM = ["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"];
const MONTHS_ACC = ["Ιανουάριο","Φεβρουάριο","Μάρτιο","Απρίλιο","Μάιο","Ιούνιο","Ιούλιο","Αύγουστο","Σεπτέμβριο","Οκτώβριο","Νοέμβριο","Δεκέμβριο"];
const KIND = { drasi: "Δράση", kalipraktiki: "Καλή πρακτική", ekdilosi: "Εκδήλωση", seminario: "Ανοιχτό σεμινάριο", eykairia: "Δημόσια ευκαιρία", yliko: "Υλικό για φοιτητές", diakrisi: "Διάκριση", nea: "Νέα του γραφείου" } as Record<string, string>;
const FOOTER = "Το δελτίο συντάχθηκε αυτόματα από τις δημοσιευμένες αναρτήσεις των γραφείων του Δικτύου και, για τις ευκαιρίες από δημόσιες πηγές, από αναζήτηση στο διαδίκτυο. Κανένα γραφείο δεν επεξεργάζεται το κείμενο.";

type GeminiOut = { text: string; sources: { title: string; uri: string }[] };

/* Mistral (ευρωπαϊκή υπηρεσία AI): χρησιμοποιείται αν υπάρχει το μυστικό MISTRAL_API_KEY */
async function callMistral(system: string, prompt: string, json: boolean, search = false): Promise<GeminiOut> {
  // Mistral (ΕΕ) ή Groq (δωρεάν, χωρίς κάρτα): ίδια μορφή αιτήματος
  const groq = !Deno.env.get("MISTRAL_API_KEY") && !!Deno.env.get("GROQ_API_KEY");
  const key = (groq ? Deno.env.get("GROQ_API_KEY")! : Deno.env.get("MISTRAL_API_KEY")!).trim().replace(/^["']|["']$/g, "");
  console.log(`[ai] κλειδί ${groq ? "Groq" : "Mistral"}: ${key.slice(0, 4)}… (${key.length} χαρακτήρες)`);
  const model = groq ? (Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b") : (Deno.env.get("MISTRAL_MODEL") || "mistral-small-latest");
  const url = groq ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.mistral.ai/v1/chat/completions";
  // Η αναζήτηση της Groq αποτυγχάνει πού και πού με «Parsing failed»: ξαναδοκιμάζουμε (και με μικρότερο μοντέλο)
  const attempts = search && groq ? [model, model, "openai/gpt-oss-20b"] : [model];
  let res: Response | null = null;
  for (let i = 0; i < attempts.length; i++) {
  const mdl = attempts[i];
  console.log(`[ai] ${groq ? "Groq" : "Mistral"} → ${mdl}${search ? " (αναζήτηση, προσπάθεια " + (i + 1) + ")" : ""}`);
  const t0 = Date.now();
  res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    signal: AbortSignal.timeout(search ? 35000 : 45000),
    body: JSON.stringify({
      model: mdl, temperature: search ? 0.3 : 0.4,
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
      ...(search ? { tools: [{ type: "browser_search" }], tool_choice: "required", reasoning_effort: "low", max_completion_tokens: 3000 } : {}),
    }),
  });
  console.log(`[ai] ${groq ? "Groq" : "Mistral"} → ${res.status} σε ${Date.now() - t0}ms`);
  if (res.status === 400 && i < attempts.length - 1) { console.error("[ai] ξαναδοκιμή:", (await res.text()).slice(0, 200)); continue; }
  break;
  }
  if (!res) throw new Error("AI_FAILED");
  if (res.status === 429) throw new Error("AI_BUSY");
  if (!res.ok) { console.error(`${groq ? "Groq" : "Mistral"} error:`, res.status, await res.text()); throw new Error("AI_FAILED"); }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message || {};
  const text = String(msg.content || "").replace(/【[^】]*】/g, "").trim();
  if (!text) throw new Error("AI_FAILED");
  // Πηγές από την αναζήτηση (όπου υπάρχουν)
  const sources: { title: string; uri: string }[] = [];
  const walk = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    const r = o as Record<string, unknown>;
    if (typeof r.url === "string" && /^https:\/\//.test(r.url)) sources.push({ title: String(r.title || ""), uri: r.url });
    Object.values(r).forEach(walk);
  };
  if (search) walk(msg.executed_tools);
  return { text, sources };
}

async function callGemini(system: string, prompt: string, opts: { json?: boolean; search?: boolean } = {}): Promise<GeminiOut> {
  if (Deno.env.get("GROQ_API_KEY") && !Deno.env.get("MISTRAL_API_KEY")) return callMistral(system, prompt, !!opts.json, !!opts.search);
  if (Deno.env.get("MISTRAL_API_KEY") && !opts.search) return callMistral(system, prompt, !!opts.json);
  const key = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!key) { console.error("[ai] λείπει το GEMINI_API_KEY"); throw new Error("NO_AI_KEY"); }
  console.log(`[ai] κλειδί: ${key.slice(0, 3)}… (${key.length} χαρακτήρες)`);
  const models = [Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest", "gemini-2.5-flash"];
  let last = "";
  for (const model of models) {
    console.log(`[ai] Gemini → ${model}${opts.search ? " (με αναζήτηση)" : ""}`);
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(opts.search ? 60000 : 40000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(opts.search ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.4, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
      }),
    });
    } catch (e) {
      console.error(`[ai] Gemini ${model} δεν απάντησε σε ${Date.now() - t0}ms:`, e instanceof Error ? e.message : e);
      last = "timeout";
      continue;
    }
    console.log(`[ai] Gemini ${model} → ${res.status} σε ${Date.now() - t0}ms`);
    if (res.ok) {
      const data = await res.json();
      const cand = data?.candidates?.[0];
      const text = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
      const sources = (cand?.groundingMetadata?.groundingChunks || [])
        .map((c: { web?: { title?: string; uri?: string } }) => ({ title: c.web?.title || "", uri: c.web?.uri || "" }))
        .filter((x: { uri: string }) => /^https:\/\//.test(x.uri));
      if (text) return { text, sources };
      last = "empty";
      continue;
    }
    last = `${res.status} ${await res.text()}`;
    console.error(`[ai] Gemini error: ${last.slice(0, 500)}`);
    if (res.status === 429) throw new Error("AI_BUSY");
    if (res.status !== 404) break;
  }
  console.error("Gemini error:", last);
  throw new Error("AI_FAILED");
}
async function gemini(system: string, prompt: string, asJson = false): Promise<string> {
  return (await callGemini(system, prompt, { json: asJson })).text;
}

/* Δημόσιες ευκαιρίες από το διαδίκτυο (μόνο για τον τρέχοντα μήνα) */
async function publicOpportunities(monthLabel: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const out = await callGemini(
      `Βρίσκεις στο διαδίκτυο ΤΡΕΧΟΥΣΕΣ δημόσιες ευκαιρίες για φοιτητές και νέους αποφοίτους ελληνικών πανεπιστημίων: προγράμματα της ΔΥΠΑ, εθνικούς ή ευρωπαϊκούς διαγωνισμούς, υποτροφίες, προγράμματα πρακτικής ή απασχόλησης δημόσιων φορέων και ευρωπαϊκών θεσμών.
ΣΗΜΕΡΙΝΗ ΗΜΕΡΟΜΗΝΙΑ: ${today}. Γράφεις ΜΟΝΟ ευκαιρίες που είναι ΑΝΟΙΧΤΕΣ σήμερα: η προθεσμία τους πρέπει να είναι μετά τις ${today}, ή να είναι συνεχούς υποβολής. Αν η προθεσμία έχει περάσει ή δεν είσαι βέβαιος, ΜΗΝ τη γράψεις.
ΚΑΝΟΝΕΣ: μόνο από επίσημες δημόσιες πηγές (υπουργεία, ΔΥΠΑ, ΕΕ, δημόσιοι οργανισμοί). Όχι αγγελίες ιδιωτικών εταιρειών. Όχι ειδήσεις για συγκεκριμένα πανεπιστήμια. Αν δεν είσαι βέβαιος για κάτι ή έχει λήξει, μην το γράψεις.
Μορφή: 3 έως 5 γραμμές λίστας, καθεμία "- **Τίτλος** (Φορέας): μία πρόταση περιγραφή, και προθεσμία αν αναφέρεται. [Επίσημη σελίδα](https://...)". Ο σύνδεσμος να είναι ακριβώς η διεύθυνση της επίσημης σελίδας που διάβασες· αν δεν την έχεις, παράλειψε τον σύνδεσμο. Γράφεις στα ελληνικά. Τίποτε άλλο, χωρίς εισαγωγή.`,
      `Ποιες δημόσιες ευκαιρίες για φοιτητές και νέους αποφοίτους στην Ελλάδα είναι ανοιχτές σήμερα (${today}) ή ανοίγουν μέσα στον ${monthLabel}; Μόνο όσες δεν έχουν λήξει.`,
      { search: true },
    );
    const items = out.text.split("\n").filter((l) => l.trim().startsWith("- ")).slice(0, 5);
    if (!items.length) return "";
    const seen = new Set<string>();
    const label = (x: { title: string; uri: string }) => (x.title || new URL(x.uri).hostname.replace(/^www\./, "")).replace(/[\[\]]/g, "").slice(0, 60);
    const src = out.sources.filter((x) => (seen.has(x.uri) ? false : (seen.add(x.uri), true))).slice(0, 6)
      .map((x) => `[${label(x)}](${x.uri})`);
    void src;
    return `## Ευκαιρίες από δημόσιες πηγές\n${items.join("\n")}\n\nΒρέθηκαν με αυτόματη αναζήτηση στο διαδίκτυο. Για όρους και προθεσμίες ισχύει πάντα η επίσημη ανακοίνωση του φορέα.`;
  } catch (e) {
    console.error("opportunities:", e instanceof Error ? e.message : e);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    console.log("[ai] έλεγχος χρήστη…");
    const { data: { user } } = await admin.auth.getUser(token);
    console.log(`[ai] χρήστης: ${user ? "ok" : "όχι"}`);
    if (!user) return json({ error: "NOT_SIGNED_IN" }, 401);
    const { data: me } = await admin.from("profiles").select("office_id,status").eq("id", user.id).single();
    if (!me || me.status !== "approved") return json({ error: "NOT_APPROVED" }, 403);

    const input = await req.json();
    console.log(`[ai] ενέργεια: ${input.action}`);
    const { data: offices } = await admin.from("offices").select("id,short,name");
    const O = Object.fromEntries((offices || []).map((o) => [o.id, o]));

    /* ---------- Βελτίωση κειμένου ---------- */
    if (input.action === "improve") {
      const office = O[me.office_id];
      const text = await gemini(
        "Είσαι επιμελητής ανακοινώσεων Γραφείων Διασύνδεσης ελληνικών πανεπιστημίων. Ξαναγράφεις πρόχειρα κείμενα σε σαφή, ευγενικά, θεσμικά ελληνικά, σύντομα (έως 120 λέξεις). ΜΗΝ προσθέτεις στοιχεία που δεν υπάρχουν στο πρόχειρο (ημερομηνίες, αριθμούς, ονόματα, συνδέσμους). Επιστρέφεις ΜΟΝΟ το τελικό κείμενο, χωρίς τίτλο, χωρίς εισαγωγικά, χωρίς markdown.",
        `Ίδρυμα: ${office?.name || ""}\nΕίδος: ${KIND[input.kind] || "Δράση"}\nΤίτλος: ${String(input.title || "").slice(0, 200)}\nΠρόχειρο κείμενο:\n${String(input.body || "").slice(0, 4000)}\n\nΓράψε την ανακοίνωση εκ μέρους του Γραφείου Διασύνδεσης του ιδρύματος.`,
      );
      return json({ text });
    }

    /* ---------- Αγγλική εκδοχή ---------- */
    if (input.action === "translate") {
      const out = await gemini(
        "You translate Greek university career-office announcements into clear, natural British English. Keep the meaning exactly; do not add facts. Return JSON: {\"title\": string, \"body\": string}.",
        `Title: ${String(input.title || "").slice(0, 200)}\nText:\n${String(input.body || "").slice(0, 4000)}`,
        true,
      );
      const parsed = JSON.parse(out);
      return json({ title: String(parsed.title || ""), body: String(parsed.body || "") });
    }

    /* ---------- Δελτίο του μήνα ---------- */
    if (input.action === "bulletin") {
      const month = String(input.month || "");
      if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "BAD_MONTH" }, 400);
      const [y, m] = month.split("-").map(Number);
      const now = new Date();
      if (y * 12 + m > now.getUTCFullYear() * 12 + now.getUTCMonth() + 1) return json({ error: "FUTURE_MONTH" }, 400);
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      const end = new Date(Date.UTC(y, m, 1)).toISOString();
      const end2 = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);

      const { data: posted } = await admin.from("posts").select("id,office_id,kind,title,body,event_date,event_time,source,created_at")
        .gte("created_at", start).lt("created_at", end).not("kind", "in", "(seminario,ekdilosi)").order("created_at");
      const { data: seminars } = await admin.from("posts").select("id,office_id,kind,title,body,event_date,event_time,source,created_at")
        .in("kind", ["seminario", "ekdilosi"]).gte("event_date", start.slice(0, 10)).lt("event_date", end2).order("event_date");
      const items = [...(posted || []), ...(seminars || [])];
      const sig = items.map((p) => `${p.id}:${p.created_at}:${(p.title || "").length}:${(p.body || "").length}`).join("|") || "empty";

      const { data: existing } = await admin.from("bulletins").select("*").eq("month", month).maybeSingle();
      const isCurrent = y === now.getUTCFullYear() && m === now.getUTCMonth() + 1;
      const fresh = !isCurrent || (existing?.generated_at && Date.now() - new Date(existing.generated_at).getTime() < 864e5);
      if (existing && existing.source_sig === sig && existing.ai && fresh) return json({ bulletin: existing });

      const webP = isCurrent ? publicOpportunities(`${MONTHS_NOM[m - 1]} ${y}`) : Promise.resolve("");
      let content: string;
      if (!items.length) {
        content = `# Ο μήνας στα Γραφεία Διασύνδεσης\n**${MONTHS_NOM[m - 1]} ${y}**\n\nΤον ${MONTHS_ACC[m - 1]} δεν υπήρξαν ακόμη αναρτήσεις των γραφείων στο Δίκτυο.`;
      } else {
        const officesN = new Set(items.map((p) => p.office_id)).size;
        const allowTrends = items.length >= 3 && officesN >= 2;
        const data = items.map((p) => ({
          ίδρυμα: O[p.office_id]?.name || p.office_id,
          συντομογραφία: O[p.office_id]?.short || p.office_id,
          είδος: KIND[p.kind],
          τίτλος: p.title,
          κείμενο: (p.body || "").slice(0, 1200),
          ...(p.kind === "seminario" || p.kind === "ekdilosi" ? { ημερομηνία: p.event_date, ώρα: p.event_time } : {}),
          ...(p.kind === "ekdilosi" && p.source ? { τόπος: p.source } : {}),
          ...(p.kind === "eykairia" && p.source ? { πηγή: p.source } : {}),
        }));
        content = await gemini(
          `Συντάσσεις το μηνιαίο «Δελτίο του Δικτύου» των Γραφείων Διασύνδεσης των ελληνικών ΑΕΙ. Γράφεις ζεστά, επαγγελματικά ελληνικά.
ΚΑΝΟΝΕΣ (αυστηροί):
- Χρησιμοποιείς ΜΟΝΟ πληροφορίες από τις αναρτήσεις που σου δίνονται. Δεν επινοείς αριθμούς, ονόματα, ημερομηνίες ή αποτελέσματα.
- Δεν προσθέτεις προσκλήσεις, σκοπούς, οφέλη ή χαρακτηρισμούς που δεν γράφει η ανάρτηση. Κάθε στοιχείο είναι 1-2 σύντομες προτάσεις.
- Κάθε στοιχείο αναφέρει το ίδρυμα από το οποίο προέρχεται.
- Όλα τα ιδρύματα αντιμετωπίζονται ισότιμα: καμία σύγκριση, κατάταξη, αξιολόγηση ή «καλύτερο/περισσότερο».
- Δεν αναφέρεις ονόματα προσώπων.
- Μορφή: μόνο # για τον τίτλο, ## για ενότητες, - για λίστες, **έντονα**. Τίποτε άλλο (όχι πίνακες, όχι συνδέσμους).
ΔΟΜΗ:
# Ο μήνας στα Γραφεία Διασύνδεσης
**${MONTHS_NOM[m - 1]} ${y}**
(μια εισαγωγική παράγραφος 2-3 προτάσεων)
## Δράσεις των γραφείων   (μόνο αν υπάρχουν)
## Εκδηλώσεις και ανοιχτά σεμινάρια   (μόνο αν υπάρχουν, με ημερομηνία, ώρα και τόπο αν δίνεται)
## Υλικό για φοιτητές   (μόνο αν υπάρχει)
## Διακρίσεις και νέα των γραφείων   (μόνο αν υπάρχουν)
## Δημόσιες ευκαιρίες   (μόνο αν υπάρχουν)
${allowTrends ? "## Τάσεις του Δικτύου   (2-3 προτάσεις για τα κοινά θέματα που φαίνονται σε αναρτήσεις ΠΕΡΙΣΣΟΤΕΡΩΝ γραφείων, χωρίς να ξεχωρίζεις ιδρύματα και χωρίς γενικολογίες· αν δεν υπάρχει πραγματικά κοινό θέμα, παράλειψε την ενότητα)" : "(ΜΗΝ γράψεις ενότητα «Τάσεις»: δεν υπάρχουν αρκετές αναρτήσεις.)"}
- Στην εισαγωγή μην γράφεις γενικόλογες φράσεις· πες απλά πόσα γραφεία μοιράστηκαν τι.
Μην προσθέσεις υπογραφή ή σημείωση στο τέλος.`,
          `Αναρτήσεις του μήνα (JSON):\n${JSON.stringify(data)}`,
        );
        content = content.replace(/^```[a-z]*\n?|```$/g, "").trim();
        if (!allowTrends) { const at = content.indexOf("## Τάσεις"); if (at > 0) content = content.slice(0, at).trim(); }
      }
      if (isCurrent) {
        const web = await webP;
        if (web) {
          const at = content.indexOf("## Τάσεις του Δικτύου");
          content = at > 0 ? `${content.slice(0, at)}${web}\n\n${content.slice(at)}` : `${content}\n\n${web}`;
        }
      }
      content += `\n\n${FOOTER}`;

      const row = { month, content, status: "approved", ai: true, source_sig: sig, generated_at: new Date().toISOString() };
      const { data: saved, error } = await admin.from("bulletins").upsert(row, { onConflict: "month" }).select().single();
      if (error) throw error;
      return json({ bulletin: saved });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    const known = ["NO_AI_KEY", "AI_BUSY", "AI_FAILED"].includes(msg);
    return json({ error: known ? msg : "SERVER_ERROR" }, known ? 503 : 500);
  }
});
