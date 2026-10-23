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
const KIND = { drasi: "Δράση", seminario: "Ανοιχτό σεμινάριο", eykairia: "Δημόσια ευκαιρία" } as Record<string, string>;
const FOOTER = "Το δελτίο συντάχθηκε αυτόματα με τεχνητή νοημοσύνη, αποκλειστικά από δημοσιευμένες αναρτήσεις των γραφείων του Δικτύου. Κανένα γραφείο δεν επεξεργάζεται το κείμενο.";

async function gemini(system: string, prompt: string, asJson = false): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("NO_AI_KEY");
  const models = [Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest", "gemini-2.5-flash"];
  let last = "";
  for (const model of models) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, ...(asJson ? { responseMimeType: "application/json" } : {}) },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
      if (text) return text;
      last = "empty";
      continue;
    }
    last = `${res.status} ${await res.text()}`;
    if (res.status === 429) throw new Error("AI_BUSY");
    if (res.status !== 404) break;
  }
  console.error("Gemini error:", last);
  throw new Error("AI_FAILED");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "NOT_SIGNED_IN" }, 401);
    const { data: me } = await admin.from("profiles").select("office_id,status").eq("id", user.id).single();
    if (!me || me.status !== "approved") return json({ error: "NOT_APPROVED" }, 403);

    const input = await req.json();
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
        .gte("created_at", start).lt("created_at", end).neq("kind", "seminario").order("created_at");
      const { data: seminars } = await admin.from("posts").select("id,office_id,kind,title,body,event_date,event_time,source,created_at")
        .eq("kind", "seminario").gte("event_date", start.slice(0, 10)).lt("event_date", end2).order("event_date");
      const items = [...(posted || []), ...(seminars || [])];
      const sig = items.map((p) => `${p.id}:${p.created_at}:${(p.title || "").length}:${(p.body || "").length}`).join("|") || "empty";

      const { data: existing } = await admin.from("bulletins").select("*").eq("month", month).maybeSingle();
      if (existing && existing.source_sig === sig && existing.ai) return json({ bulletin: existing });

      let content: string;
      if (!items.length) {
        content = `# Ο μήνας στα Γραφεία Διασύνδεσης\n**${MONTHS_NOM[m - 1]} ${y}**\n\nΤον ${MONTHS_ACC[m - 1]} δεν υπήρξαν αναρτήσεις στο Δίκτυο.\n\n${FOOTER}`;
      } else {
        const data = items.map((p) => ({
          ίδρυμα: O[p.office_id]?.name || p.office_id,
          συντομογραφία: O[p.office_id]?.short || p.office_id,
          είδος: KIND[p.kind],
          τίτλος: p.title,
          κείμενο: (p.body || "").slice(0, 1200),
          ...(p.kind === "seminario" ? { ημερομηνία_σεμιναρίου: p.event_date, ώρα: p.event_time } : {}),
          ...(p.kind === "eykairia" && p.source ? { πηγή: p.source } : {}),
        }));
        content = await gemini(
          `Συντάσσεις το μηνιαίο «Δελτίο του Δικτύου» των Γραφείων Διασύνδεσης των ελληνικών ΑΕΙ. Γράφεις ζεστά, επαγγελματικά ελληνικά.
ΚΑΝΟΝΕΣ (αυστηροί):
- Χρησιμοποιείς ΜΟΝΟ πληροφορίες από τις αναρτήσεις που σου δίνονται. Δεν επινοείς αριθμούς, ονόματα, ημερομηνίες ή αποτελέσματα.
- Κάθε στοιχείο αναφέρει το ίδρυμα από το οποίο προέρχεται.
- Όλα τα ιδρύματα αντιμετωπίζονται ισότιμα: καμία σύγκριση, κατάταξη, αξιολόγηση ή «καλύτερο/περισσότερο».
- Δεν αναφέρεις ονόματα προσώπων.
- Μορφή: μόνο # για τον τίτλο, ## για ενότητες, - για λίστες, **έντονα**. Τίποτε άλλο (όχι πίνακες, όχι συνδέσμους).
ΔΟΜΗ:
# Ο μήνας στα Γραφεία Διασύνδεσης
**${MONTHS_NOM[m - 1]} ${y}**
(μια εισαγωγική παράγραφος 2-3 προτάσεων)
## Δράσεις των γραφείων   (μόνο αν υπάρχουν)
## Ανοιχτά σεμινάρια για όλους τους φοιτητές   (μόνο αν υπάρχουν, με ημερομηνία και ώρα)
## Δημόσιες ευκαιρίες   (μόνο αν υπάρχουν)
## Τάσεις του Δικτύου   (2-3 προτάσεις για τα κοινά θέματα που απασχολούν τα γραφεία συνολικά, χωρίς να ξεχωρίζεις ιδρύματα)
Μην προσθέσεις υπογραφή ή σημείωση στο τέλος.`,
          `Αναρτήσεις του μήνα (JSON):\n${JSON.stringify(data)}`,
        );
        content = content.replace(/^```[a-z]*\n?|```$/g, "").trim() + `\n\n${FOOTER}`;
      }

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
