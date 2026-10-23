import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
let sb = null;

/* =====================================================================
   Σταθερά δεδομένα
   ===================================================================== */
const OFFICES_SEED = [
  ['ekpa','ΕΚΠΑ','Εθνικό και Καποδιστριακό Πανεπιστήμιο Αθηνών','Αθήνα','Αττική',['uoa.gr']],
  ['emp','ΕΜΠ','Εθνικό Μετσόβιο Πολυτεχνείο','Αθήνα','Αττική',['ntua.gr']],
  ['opa','ΟΠΑ','Οικονομικό Πανεπιστήμιο Αθηνών','Αθήνα','Αττική',['aueb.gr']],
  ['papei','ΠΑΠΕΙ','Πανεπιστήμιο Πειραιώς','Πειραιάς','Αττική',['unipi.gr']],
  ['panteio','ΠΑΝΤ','Πάντειο Πανεπιστήμιο','Αθήνα','Αττική',['panteion.gr']],
  ['hua','ΧΠ','Χαροκόπειο Πανεπιστήμιο','Καλλιθέα','Αττική',['hua.gr']],
  ['aua','ΓΠΑ','Γεωπονικό Πανεπιστήμιο Αθηνών','Αθήνα','Αττική',['aua.gr']],
  ['askt','ΑΣΚΤ','Ανωτάτη Σχολή Καλών Τεχνών','Αθήνα','Αττική',['asfa.gr']],
  ['uniwa','ΠΑΔΑ','Πανεπιστήμιο Δυτικής Αττικής','Αιγάλεω','Αττική',['uniwa.gr']],
  ['aspete','ΑΣΠΑΙΤΕ','Ανωτάτη Σχολή Παιδαγωγικής και Τεχνολογικής Εκπαίδευσης','Μαρούσι','Αττική',['aspete.gr']],
  ['auth','ΑΠΘ','Αριστοτέλειο Πανεπιστήμιο Θεσσαλονίκης','Θεσσαλονίκη','Κεντρική Μακεδονία',['auth.gr']],
  ['uom','ΠΑΜΑΚ','Πανεπιστήμιο Μακεδονίας','Θεσσαλονίκη','Κεντρική Μακεδονία',['uom.edu.gr','uom.gr']],
  ['ihu','ΔΙΠΑΕ','Διεθνές Πανεπιστήμιο της Ελλάδος','Θεσσαλονίκη','Κεντρική Μακεδονία',['ihu.gr','ihu.edu.gr']],
  ['uowm','ΠΔΜ','Πανεπιστήμιο Δυτικής Μακεδονίας','Κοζάνη','Δυτική Μακεδονία',['uowm.gr']],
  ['duth','ΔΠΘ','Δημοκρίτειο Πανεπιστήμιο Θράκης','Κομοτηνή','Αν. Μακεδονία & Θράκη',['duth.gr']],
  ['uth','ΠΘ','Πανεπιστήμιο Θεσσαλίας','Βόλος','Θεσσαλία',['uth.gr']],
  ['uoi','ΠΙ','Πανεπιστήμιο Ιωαννίνων','Ιωάννινα','Ήπειρος',['uoi.gr']],
  ['ionio','ΙΠ','Ιόνιο Πανεπιστήμιο','Κέρκυρα','Ιόνια Νησιά',['ionio.gr']],
  ['upatras','ΠΠ','Πανεπιστήμιο Πατρών','Πάτρα','Δυτική Ελλάδα',['upatras.gr','upnet.gr']],
  ['eap','ΕΑΠ','Ελληνικό Ανοικτό Πανεπιστήμιο','Πάτρα','Δυτική Ελλάδα',['eap.gr']],
  ['uop','ΠΑΠΕΛ','Πανεπιστήμιο Πελοποννήσου','Τρίπολη','Πελοπόννησος',['uop.gr']],
  ['aegean','ΠΑΙΓ','Πανεπιστήμιο Αιγαίου','Μυτιλήνη','Νησιά Αιγαίου',['aegean.gr']],
  ['uoc','ΠΚ','Πανεπιστήμιο Κρήτης','Ηράκλειο · Ρέθυμνο','Κρήτη',['uoc.gr']],
  ['tuc','ΠΟΛΚ','Πολυτεχνείο Κρήτης','Χανιά','Κρήτη',['tuc.gr']],
  ['hmu','ΕΛΜΕΠΑ','Ελληνικό Μεσογειακό Πανεπιστήμιο','Ηράκλειο','Κρήτη',['hmu.gr']]
].map(([id,short,name,city,region,domains]) => ({ id, short, name, city, region, domains, responsible:'', email:'', phone:'', website:'', logo_url:'', about:'' }));

const REGION_ORDER = ['Αττική','Κεντρική Μακεδονία','Δυτική Μακεδονία','Αν. Μακεδονία & Θράκη','Θεσσαλία','Ήπειρος','Ιόνια Νησιά','Δυτική Ελλάδα','Πελοπόννησος','Νησιά Αιγαίου','Κρήτη'];
const KINDS = { drasi:'Δράση', ekdilosi:'Εκδήλωση', seminario:'Ανοιχτό σεμινάριο', eykairia:'Δημόσια ευκαιρία', yliko:'Υλικό για φοιτητές', diakrisi:'Διάκριση', nea:'Νέα του γραφείου' };
const DATED = ['seminario', 'ekdilosi'];
const KIND_PLURAL = { all:'Όλα τα είδη', drasi:'Δράσεις', ekdilosi:'Εκδηλώσεις', seminario:'Σεμινάρια', eykairia:'Ευκαιρίες', yliko:'Υλικό', diakrisi:'Διακρίσεις', nea:'Νέα' };
const M_SHORT = ['Ιαν','Φεβ','Μαρ','Απρ','Μαΐ','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ'];
const M_NOM = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];
const M_GEN = ['Ιανουαρίου','Φεβρουαρίου','Μαρτίου','Απριλίου','Μαΐου','Ιουνίου','Ιουλίου','Αυγούστου','Σεπτεμβρίου','Οκτωβρίου','Νοεμβρίου','Δεκεμβρίου'];
const M_ACC = ['Ιανουάριο','Φεβρουάριο','Μάρτιο','Απρίλιο','Μάιο','Ιούνιο','Ιούλιο','Αύγουστο','Σεπτέμβριο','Οκτώβριο','Νοέμβριο','Δεκέμβριο'];

/* =====================================================================
   Προεπισκόπηση: ενδεικτικά δεδομένα στη μνήμη
   ===================================================================== */
const mock = (() => {
  const me = { id:'u-me', email:'diasyndesi@uowm.gr', full_name:'Γραφείο Διασύνδεσης ΠΔΜ', office_id:'uowm', status:'approved', is_admin:true, created_at:'2026-10-20T09:00:00Z' };
  let id = 100;
  const P = (office_id, kind, title, body, created_at, extra={}) => ({ id:++id, office_id, author:'u-x', kind, title, body, created_at, event_date:null, event_time:null, link:'', source:'', ...extra });
  return {
    session: { user:{ id:me.id, email:me.email }, profile: me },
    me,
    offices: OFFICES_SEED.map(o => ({ ...o })),
    posts: [
      P('auth','drasi','Ολοκληρώθηκε η φθινοπωρινή Ημέρα Καριέρας','Μεγάλη συμμετοχή φοιτητών και εργοδοτών από πολλούς κλάδους. Δοκιμάσαμε σύντομες παρουσιάσεις εργοδοτών ανά κλάδο και λειτούργησαν πολύ καλά.','2026-10-18T10:00:00Z'),
      P('uowm','drasi','Κύκλος εργαστηρίων «Πρώτα βήματα» για πρωτοετείς','Τέσσερις συναντήσεις σε Κοζάνη, Φλώρινα, Καστοριά και Πτολεμαΐδα, ώστε οι νέοι φοιτητές να γνωρίσουν το Γραφείο από την αρχή των σπουδών τους.','2026-10-15T10:00:00Z',{author:'u-me'}),
      P('ekpa','seminario','Πώς γράφω βιογραφικό που διαβάζεται','Διαδικτυακό σεμινάριο ανοιχτό σε φοιτητές και αποφοίτους όλων των ιδρυμάτων. Οι εγγραφές γίνονται στη σελίδα του Γραφείου μας.','2026-10-14T10:00:00Z',{event_date:'2026-11-12',event_time:'17:00'}),
      P('uoc','drasi','Πρόγραμμα καθοδήγησης με αποφοίτους','Απόφοιτοι που εργάζονται σε διάφορους κλάδους συναντούν τελειόφοιτους σε μικρές ομάδες. Πρώτη χρονιά λειτουργίας.','2026-10-12T10:00:00Z'),
      P('uom','eykairia','Πανελλήνιος διαγωνισμός φοιτητικών επιχειρηματικών ιδεών','Ανοιχτή πρόσκληση για ομάδες φοιτητών. Όροι και προθεσμίες στην επίσημη ανακοίνωση των διοργανωτών.','2026-10-11T10:00:00Z',{source:'Δημόσια πρόσκληση'}),
      P('uowm','seminario','Συνέντευξη εργασίας: προσομοίωση και συμβουλές','Πρακτικό σεμινάριο με παραδείγματα ερωτήσεων και ανατροφοδότηση. Ανοιχτό σε φοιτητές όλων των ιδρυμάτων.','2026-10-10T10:00:00Z',{author:'u-me',event_date:'2026-11-19',event_time:'18:00'}),
      P('aegean','drasi','Συμβουλευτική καριέρας για όλα τα νησιά','Συναντήσεις μέσω τηλεδιάσκεψης για φοιτητές σε Μυτιλήνη, Σάμο, Χίο, Ρόδο, Σύρο και Λήμνο, με κοινό πρόγραμμα ραντεβού.','2026-10-08T10:00:00Z'),
      P('uniwa','seminario','Το επαγγελματικό μου προφίλ στο LinkedIn','Βήμα βήμα δημιουργία προφίλ, με ζωντανά παραδείγματα.','2026-10-07T10:00:00Z',{event_date:'2026-11-26',event_time:'17:30'}),
      P('ihu','eykairia','Ευρωπαϊκή εβδομάδα επαγγελματικών δεξιοτήτων','Εκδηλώσεις σε πολλές χώρες, με διαδικτυακές συμμετοχές ανοιχτές και για Έλληνες φοιτητές.','2026-10-06T10:00:00Z',{source:'Ευρωπαϊκή πρωτοβουλία'}),
      P('uth','drasi','Επισκέψεις φοιτητών σε επιχειρήσεις της περιοχής','Ομάδες φοιτητών επισκέφθηκαν παραγωγικές μονάδες και συζήτησαν με στελέχη τους για τις απαιτήσεις των θέσεων.','2026-10-02T10:00:00Z'),
      P('uoi','seminario','Επιχειρηματικότητα για φοιτητές: από την ιδέα στο σχέδιο','Εισαγωγικό σεμινάριο για όσους σκέφτονται να ξεκινήσουν κάτι δικό τους.','2026-10-01T10:00:00Z',{event_date:'2026-12-03',event_time:'16:00'}),
      P('duth','eykairia','Νέα πρόσκληση προγράμματος της ΔΥΠΑ για νέους','Σύνοψη για ενημέρωση φοιτητών και αποφοίτων. Για όρους και προθεσμίες ισχύει η επίσημη ανακοίνωση.','2026-09-29T10:00:00Z',{source:'Δημόσια ανακοίνωση'}),
      P('uth','ekdilosi','Ημέρα Καριέρας Θεσσαλίας 2026','Εκθέτες από όλους τους κλάδους και σύντομες ομιλίες για τη μετάβαση στην αγορά εργασίας.','2026-10-21T10:00:00Z',{event_date:'2026-11-14',event_time:'10:00',source:'Βόλος, Συνεδριακό Κέντρο'}),
      P('upatras','drasi','«Γραφείο στο αμφιθέατρο»: 10 λεπτά στην αρχή του μαθήματος','Σε συνεννόηση με διδάσκοντες, ένα στέλεχος του γραφείου παρουσιάζει σύντομα τις υπηρεσίες στην αρχή μαθημάτων πρώτου έτους. Η επισκεψιμότητα του γραφείου αυξήθηκε αισθητά.','2026-10-19T10:00:00Z'),
      P('ekpa','yliko','Οδηγός σύνταξης βιογραφικού (PDF)','Ο ενημερωμένος οδηγός μας για φοιτητές και αποφοίτους, ελεύθερα διαθέσιμος.','2026-10-16T10:00:00Z',{link:'https://example.org/odigos'}),
      P('ionio','drasi','Εργαστήριο για τη δημιουργική βιομηχανία','Επαγγελματίες από τη μουσική, τα οπτικοακουστικά μέσα και τον σχεδιασμό μίλησαν για τις διαδρομές τους.','2026-09-28T10:00:00Z')
    ],
    threads: [
      { id:1, office_id:'uowm', author:'u-me', title:'Καλώς ήρθατε στο Δίκτυο', created_at:'2026-10-20T09:00:00Z' },
      { id:2, office_id:'uth', author:'u-x', title:'Ιδέες για διαδικτυακά σεμινάρια την άνοιξη', created_at:'2026-10-19T09:00:00Z' },
      { id:3, office_id:'duth', author:'u-x', title:'Πώς προσεγγίζετε τους πρωτοετείς;', created_at:'2026-10-17T09:00:00Z' }
    ],
    messages: [
      { id:1, thread_id:1, office_id:'uowm', author:'u-me', body:'Καλησπέρα σε όλους. Ο χώρος αυτός είναι μόνο για τα στελέχη των γραφείων, για να γνωριστούμε και να μοιραζόμαστε ό,τι κρίνει ο καθένας χρήσιμο.', created_at:'2026-10-20T09:00:00Z' },
      { id:2, thread_id:1, office_id:'auth', author:'u-x', body:'Πολύ καλή ιδέα. Θα ανεβάσουμε τις επόμενες εβδομάδες τις δράσεις μας.', created_at:'2026-10-20T11:00:00Z' },
      { id:3, thread_id:1, office_id:'aegean', author:'u-x', body:'Για εμάς, με τόσα νησιά, τα ανοιχτά σεμινάρια είναι το πιο χρήσιμο κομμάτι.', created_at:'2026-10-20T12:30:00Z' },
      { id:4, thread_id:2, office_id:'uth', author:'u-x', body:'Ποια θέματα ζητούν περισσότερο οι φοιτητές σας; Σκεφτόμαστε ένα σεμινάριο για τη μετάβαση από τις σπουδές στην εργασία.', created_at:'2026-10-19T09:00:00Z' },
      { id:5, thread_id:2, office_id:'ekpa', author:'u-x', body:'Σε εμάς ζήτηση έχουν το βιογραφικό και η προετοιμασία για συνέντευξη.', created_at:'2026-10-19T10:00:00Z' },
      { id:6, thread_id:3, office_id:'duth', author:'u-x', body:'Οι πρωτοετείς έρχονται στο γραφείο πολύ αργά. Έχει βρει κανείς τρόπο να τους γνωρίσει νωρίτερα;', created_at:'2026-10-17T09:00:00Z' },
      { id:7, thread_id:3, office_id:'uowm', author:'u-me', body:'Εμείς ξεκινήσαμε φέτος εργαστήρια σε κάθε πόλη τον πρώτο μήνα. Θα γράψουμε πώς πήγε.', created_at:'2026-10-17T12:00:00Z' }
    ],
    bulletins: [],
    profiles: [
      me,
      { id:'u-p1', email:'career@auth.gr', full_name:'Μαρία Π.', office_id:'auth', status:'pending', is_admin:false, created_at:'2026-10-21T10:00:00Z' },
      { id:'u-p2', email:'diasyndesi@uth.gr', full_name:'Γιώργος Κ.', office_id:'uth', status:'pending', is_admin:false, created_at:'2026-10-22T08:00:00Z' }
    ],
    nextId(){ return ++id; }
  };
})();

/* =====================================================================
   Επίπεδο δεδομένων
   ===================================================================== */
const must = ({ data, error }) => { if (error) throw error; return data; };
const clone = x => JSON.parse(JSON.stringify(x));

const api = {
  async init() {
    if (DEMO) return;
    const m = await import(SUPABASE_ESM);
    sb = m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  },
  async me() {
    if (DEMO) return mock.session ? clone(mock.session) : null;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const profile = must(await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
    return { user: session.user, profile };
  },
  async signIn(email, password) {
    if (DEMO) { mock.session = { user:{ id:mock.me.id, email:mock.me.email }, profile:mock.me }; return; }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message.includes('Invalid login') ? 'Λάθος email ή κωδικός.' : error.message);
  },
  async signUp(email, password, full_name) {
    if (DEMO) throw new Error('Στην προεπισκόπηση δεν γίνονται εγγραφές.');
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name } } });
    if (error) {
      if (/database error/i.test(error.message)) throw new Error('Επιτρέπεται εγγραφή μόνο με ιδρυματικό email ελληνικού ΑΕΙ.');
      if (/already registered/i.test(error.message)) throw new Error('Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδεθείτε από την καρτέλα «Είσοδος».');
      throw new Error(error.message);
    }
  },
  async signOut() { if (DEMO) { mock.session = null; return; } await sb.auth.signOut(); },

  async offices() { return DEMO ? clone(mock.offices) : must(await sb.from('offices').select('*')); },
  async updateOffice(id, fields) {
    if (DEMO) { Object.assign(mock.offices.find(o => o.id === id), fields); return; }
    must(await sb.from('offices').update(fields).eq('id', id));
  },
  async uploadLogo(officeId, file) {
    if (DEMO) {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      await api.updateOffice(officeId, { logo_url: url }); return url;
    }
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${officeId}/logo-${Date.now()}.${ext}`;
    must(await sb.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type }));
    const { data } = sb.storage.from('logos').getPublicUrl(path);
    await api.updateOffice(officeId, { logo_url: data.publicUrl });
    return data.publicUrl;
  },

  async posts() {
    if (DEMO) return clone(mock.posts).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return must(await sb.from('posts').select('*').order('created_at', { ascending: false }).limit(500));
  },
  async createPost(p) {
    const row = { ...p, office_id: S.me.profile.office_id };
    if (DEMO) { mock.posts.unshift({ id: mock.nextId(), author: mock.me.id, created_at: new Date().toISOString(), ...row }); return; }
    must(await sb.from('posts').insert(row));
  },
  async deletePost(id) {
    if (DEMO) { mock.posts = mock.posts.filter(p => p.id !== id); return; }
    must(await sb.from('posts').delete().eq('id', id));
  },

  async threads() {
    if (DEMO) return clone(mock.threads).map(t => ({ ...t, count: mock.messages.filter(m => m.thread_id === t.id).length, last: mock.messages.filter(m => m.thread_id === t.id).map(m => m.created_at).sort().pop() || t.created_at }));
    const rows = must(await sb.from('threads').select('*, messages(count)').order('created_at', { ascending: false }));
    return rows.map(t => ({ ...t, count: t.messages?.[0]?.count || 0, last: t.created_at }));
  },
  async messages(threadId) {
    if (DEMO) return clone(mock.messages.filter(m => m.thread_id === threadId));
    return must(await sb.from('messages').select('*').eq('thread_id', threadId).order('created_at'));
  },
  async createThread(title, body) {
    const office_id = S.me.profile.office_id;
    if (DEMO) {
      const t = { id: mock.nextId(), office_id, author: mock.me.id, title, created_at: new Date().toISOString() };
      mock.threads.unshift(t);
      mock.messages.push({ id: mock.nextId(), thread_id: t.id, office_id, author: mock.me.id, body, created_at: t.created_at });
      return t.id;
    }
    const t = must(await sb.from('threads').insert({ title, office_id }).select().single());
    must(await sb.from('messages').insert({ thread_id: t.id, office_id, body }));
    return t.id;
  },
  async sendMessage(thread_id, body) {
    const office_id = S.me.profile.office_id;
    if (DEMO) { mock.messages.push({ id: mock.nextId(), thread_id, office_id, author: mock.me.id, body, created_at: new Date().toISOString() }); return; }
    must(await sb.from('messages').insert({ thread_id, office_id, body }));
  },

  async ai(action, payload = {}) {
    if (DEMO) {
      await new Promise(r => setTimeout(r, 700));
      if (action === 'bulletin') return { bulletin: { month: payload.month, content: composeBulletin(payload.month, true), ai: false, generated_at: new Date().toISOString() } };
      if (action === 'improve') return { text: `Το Γραφείο Διασύνδεσης του ${officeName(myOffice())} ενημερώνει: ${payload.body}`.trim() };
      if (action === 'translate') return { title: '[EN] ' + payload.title, body: '[EN] ' + payload.body };
    }
    let res;
    try {
      res = await Promise.race([
        sb.functions.invoke('ai', { body: { action, ...payload } }),
        new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('Η υπηρεσία άργησε πολύ να απαντήσει. Δοκιμάστε ξανά σε λίγο.'), { code: 'TIMEOUT' })), action === 'bulletin' ? 90000 : 45000))
      ]);
    } catch (e) { throw e; }
    const { data, error } = res;
    if (error) {
      let code = '', status = error.context?.status || '';
      try { code = (await error.context?.clone?.().json?.())?.error || (await error.context?.json())?.error || ''; } catch (_) {}
      const msgs = {
        NO_AI_KEY: 'Η αυτόματη σύνταξη δεν έχει ενεργοποιηθεί ακόμη.',
        AI_BUSY: 'Η υπηρεσία είναι απασχολημένη. Δοκιμάστε ξανά σε ένα λεπτό.',
        AI_FAILED: 'Η υπηρεσία δεν απάντησε. Δοκιμάστε ξανά αργότερα.'
      };
      const err = new Error(msgs[code] || `Η αυτόματη σύνταξη δεν είναι διαθέσιμη αυτή τη στιγμή (κωδικός: ${code || status || error.name || 'δίκτυο'}).`);
      err.code = code || 'UNAVAILABLE';
      throw err;
    }
    return data;
  },

  async profiles() {
    if (DEMO) return clone(mock.profiles);
    return must(await sb.from('profiles').select('*').order('created_at', { ascending: false }));
  },
  async setProfile(id, fields) {
    if (DEMO) { Object.assign(mock.profiles.find(p => p.id === id), fields); return; }
    must(await sb.from('profiles').update(fields).eq('id', id));
  }
};


/* Λογότυπο: κόβει αυτόματα το λευκό/διάφανο περιθώριο και το κάνει καθαρό PNG (έως 800px) */
async function prepareLogo(file) {
  if (file.type === 'image/svg+xml') return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] > 16 && !(d[i] > 242 && d[i + 1] > 242 && d[i + 2] > 242)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return file;
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, k = Math.min(1, 800 / Math.max(cw, ch));
    const o = document.createElement('canvas'); o.width = Math.round(cw * k); o.height = Math.round(ch * k);
    const octx = o.getContext('2d'); octx.imageSmoothingQuality = 'high';
    octx.drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
    const blob = await new Promise(r => o.toBlob(r, 'image/png'));
    return blob ? new File([blob], 'logo.png', { type: 'image/png' }) : file;
  } catch (_) { return file; } finally { URL.revokeObjectURL(url); }
}

/* =====================================================================
   Κατάσταση & βοηθητικά
   ===================================================================== */
const S = {
  me: null, offices: [], O: {}, posts: [], view: 'arxiki',
  kind: 'all', region: '', q: '', officeId: null, threadId: null,
  bulMonth: null, bulCache: {}, adminTab: 'pending'
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${M_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDay = iso => { const d = new Date(iso + 'T12:00:00'); return { d: d.getDate(), m: M_SHORT[d.getMonth()] }; };
const monthLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${M_NOM[m - 1]} ${y}`; };
const monthGen = ym => { const [y, m] = ym.split('-').map(Number); return `${M_GEN[m - 1]} ${y}`; };
const todayISO = () => new Date().toISOString().slice(0, 10);
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const myOffice = () => S.me?.profile?.office_id;
const isAdmin = () => !!S.me?.profile?.is_admin;
const officeName = id => S.O[id]?.name || id;
const officeShort = id => S.O[id]?.short || id;

function avatar(id, size = '') {
  const o = S.O[id];
  if (!o) return `<span class="av ${size}"></span>`;
  return o.logo_url
    ? `<span class="av logo ${size}" title="${esc(o.name)}"><img src="${esc(o.logo_url)}" alt="Λογότυπο ${esc(o.short)}"></span>`
    : `<span class="av ${size}" title="${esc(o.name)}">${esc(o.short)}</span>`;
}

let toastTimer;
function toast(msg) {
  clearTimeout(toastTimer);
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  toastTimer = setTimeout(() => t.remove(), 2800);
}
function errMsg(e) { return e?.message || 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'; }

function dialog(html, onMount) {
  const layer = $('#layer');
  layer.innerHTML = `<div class="scrim" id="scrim"><div class="dialog" role="dialog" aria-modal="true">${html}</div></div>`;
  const close = () => { layer.innerHTML = ''; };
  $('#scrim').addEventListener('click', e => { if (e.target.id === 'scrim' || e.target.closest('[data-close]')) close(); });
  const first = layer.querySelector('input,textarea,select,button');
  if (first) first.focus();
  onMount?.(close);
  return close;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#layer').innerHTML = ''; });

/* Απλή μορφοποίηση δελτίου: # ## - **έντονα** */
function renderMarkup(text) {
  const inline = s => esc(s).replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const out = []; let list = false;
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    if (list) { out.push('</ul>'); list = false; }
    if (line.startsWith('## ')) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith('# ')) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('');
}

/* =====================================================================
   Εικονίδια
   ===================================================================== */
const I = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  offices:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01"/></svg>',
  posts:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  bulletin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h6"/><path d="m19 3 .6 1.4L21 5l-1.4.6L19 7l-.6-1.4L17 5l1.4-.6z" fill="currentColor"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  person:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  cal:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>'
};
const NETWORK_ART = `<svg class="hero-art" viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="1.4"><path d="M30 60 100 25 170 70 150 160 70 175 30 60Z"/><path d="M100 25 100 100 30 60M100 100 170 70M100 100 150 160M100 100 70 175M30 60 70 175M100 25 150 160"/></g><g fill="#fff"><circle cx="30" cy="60" r="7"/><circle cx="100" cy="25" r="7"/><circle cx="170" cy="70" r="7"/><circle cx="150" cy="160" r="7"/><circle cx="70" cy="175" r="7"/><circle cx="100" cy="100" r="11"/></g></svg>`;

/* =====================================================================
   Πλοήγηση
   ===================================================================== */
const NAV = [
  ['arxiki','Αρχική','home'], ['grafeia','Γραφεία','offices'], ['anartiseis','Αναρτήσεις','posts'],
  ['syzitisi','Συζήτηση','chat'], ['deltio','Δελτίο','bulletin']
];
const ALL_VIEWS = [...NAV.map(n => n[0]), 'logariasmos', 'diaxeirisi', 'aporrito'];

function go(view, opts = {}) {
  S.view = ALL_VIEWS.includes(view) ? view : 'arxiki';
  Object.assign(S, opts);
  try { history.replaceState(null, '', '#' + S.view); } catch (_) {}
  render();
  window.scrollTo(0, 0);
}

function shell(inner) {
  const p = S.me.profile;
  return `
  ${DEMO ? '<div class="demo-strip gut"><b>Προεπισκόπηση.</b> Ενδεικτικά δεδομένα· οι αλλαγές δεν αποθηκεύονται.</div>' : ''}
  <header class="topbar"><div class="container gut">
    <a class="brand" href="#arxiki" data-go="arxiki"><img src="icons/icon-192.png" alt=""><span><b>Δίκτυο Γραφείων Διασύνδεσης</b><small>των ελληνικών ΑΕΙ</small></span></a>
    <nav class="topnav" aria-label="Κύρια πλοήγηση">${NAV.map(([k, l]) => `<a href="#${k}" data-go="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
    <button class="me-btn" data-go="logariasmos" aria-label="Ο λογαριασμός μου">${avatar(p.office_id)}<span class="lbl">${esc(officeShort(p.office_id))}</span></button>
  </div></header>
  <main class="gut"><div class="container stack view-in">${inner}</div></main>
  <nav class="tabbar" aria-label="Κύρια πλοήγηση">${NAV.map(([k, l, ic]) => `<a href="#${k}" data-go="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${I[ic]}${l}</a>`).join('')}</nav>`;
}

/* =====================================================================
   Προβολές
   ===================================================================== */
function postCard(p, { compact = false } = {}) {
  const o = S.O[p.office_id] || {};
  const mine = p.office_id === myOffice();
  const body = p.body.length > 240 && compact ? p.body.slice(0, 230).trimEnd() + '…' : p.body;
  const link = safeUrl(p.link);
  let foot = '';
  if (p.kind === 'seminario' && p.event_date) {
    const { d, m } = fmtDay(p.event_date);
    foot = `<span class="chip-date">${I.cal} ${d} ${m}${p.event_time ? ' · ' + esc(p.event_time) : ''} · διαδικτυακά</span>`;
  } else if (p.kind === 'ekdilosi' && p.event_date) {
    const { d, m } = fmtDay(p.event_date);
    foot = `<span class="chip-date k-ekdilosi">${I.cal} ${d} ${m}${p.event_time ? ' · ' + esc(p.event_time) : ''}${p.source ? ' · ' + esc(p.source) : ''}</span>`;
  } else if (p.kind === 'eykairia' && p.source) foot = `<span class="small muted">${esc(p.source)}</span>`;
  else foot = `<span class="small muted">${fmtDate(p.created_at)}</span>`;
  return `<article class="card post k-${p.kind}">
    <div class="who">${avatar(p.office_id, 'sm')}<div style="min-width:0"><b>${esc(o.name || '')}</b><small>${esc(o.city || '')} · ${fmtDate(p.created_at)}</small></div></div>
    <div><span class="kind k-${p.kind}">${KINDS[p.kind]}</span></div>
    <div data-lang="el"><h3>${esc(p.title)}</h3>${body ? `<p style="margin-top:8px">${esc(body)}</p>` : ''}</div>
    <div class="foot">${foot}<span style="display:flex;gap:6px">

      ${link ? `<a class="btn sm" href="${esc(link)}" target="_blank" rel="noopener">${p.kind === 'seminario' ? 'Εγγραφή' : p.kind === 'yliko' ? 'Άνοιγμα υλικού' : 'Περισσότερα'}</a>` : ''}
      ${mine || (isAdmin() && !compact) ? `<button class="btn sm ghost danger" data-del-post="${p.id}">Διαγραφή</button>` : ''}
    </span></div>
  </article>`;
}

function upcomingSeminars() {
  const t = todayISO();
  return S.posts.filter(p => DATED.includes(p.kind) && p.event_date && p.event_date >= t).sort((a, b) => a.event_date.localeCompare(b.event_date));
}
function semRow(p) {
  const { d, m } = fmtDay(p.event_date);
  const ev = p.kind === 'ekdilosi';
  return `<div class="sem"><div class="datebox${ev ? ' ev' : ''}"><b>${d}</b><span>${m}</span></div><div style="min-width:0"><h3 style="font-size:14.5px">${esc(p.title)}</h3><div class="small muted">${esc(officeShort(p.office_id))}${p.event_time ? ' · ' + esc(p.event_time) : ''} · ${ev ? (p.source ? esc(p.source) : 'εκδήλωση') : 'σεμινάριο ανοιχτό σε όλα τα ΑΕΙ'}</div></div></div>`;
}

function vHome() {
  const sixMonths = new Date(Date.now() - 182 * 864e5).toISOString();
  const drasis = S.posts.filter(p => p.kind === 'drasi' && p.created_at >= sixMonths).length;
  const active = new Set(S.posts.map(p => p.office_id)).size;
  const sems = upcomingSeminars();
  const p = S.me.profile;
  return `
  <section class="hero">
    ${NETWORK_ART}
    <div style="position:relative;display:flex;flex-direction:column;gap:10px">
      <div class="eyebrow">Καλώς ήρθατε · Γραφείο Διασύνδεσης ${esc(officeShort(p.office_id))}</div>
      <h1>Τα Γραφεία Διασύνδεσης όλης της χώρας, σε ένα κοινό σημείο</h1>
      <p class="lede">Κάθε γραφείο δείχνει τη δουλειά του, μοιράζεται υλικό, ανοίγει σεμινάρια σε φοιτητές άλλων ιδρυμάτων και ενημερώνει για δημόσιες ευκαιρίες. Η συμμετοχή είναι εθελοντική.</p>
      <div class="hero-actions"><button class="btn on" data-act="new-post">Νέα ανάρτηση</button><button class="btn out" data-go="deltio">Δελτίο του Δικτύου</button></div>
    </div>
    <div class="hero-stats">
      <div class="hstat"><b>${S.offices.length}</b><span>ιδρύματα στο δίκτυο</span></div>
      <div class="hstat"><b>${drasis}</b><span>δράσεις το τελευταίο εξάμηνο</span></div>
      <div class="hstat"><b>${sems.length}</b><span>επόμενες εκδηλώσεις και σεμινάρια</span></div>
      <div class="hstat"><b>${active}</b><span>γραφεία με αναρτήσεις</span></div>
    </div>
  </section>
  <p class="small muted" style="margin-top:-10px">Οι αριθμοί αφορούν το δίκτυο συνολικά. Δεν γίνεται σύγκριση ή κατάταξη ιδρυμάτων.</p>
  <div class="cols">
    <section class="stack" style="gap:12px">
      <div class="sec-head"><h2>Πρόσφατες αναρτήσεις</h2><a href="#anartiseis" data-go="anartiseis">Όλες →</a></div>
      <div class="grid">${S.posts.slice(0, 4).map(p => postCard(p, { compact: true })).join('') || '<div class="card empty">Δεν υπάρχουν ακόμη αναρτήσεις. Γίνετε το πρώτο γραφείο που θα μοιραστεί κάτι.</div>'}</div>
    </section>
    <aside class="stack" style="gap:14px">
      <div class="card pad"><div class="sec-head" style="margin-bottom:4px"><h2>Επόμενες εκδηλώσεις και σεμινάρια</h2><a href="#anartiseis" data-go="anartiseis" data-kind="seminario">Όλα →</a></div>
        ${sems.slice(0, 4).map(semRow).join('') || '<p class="small muted" style="padding:10px 0">Δεν έχουν ανακοινωθεί εκδηλώσεις ή σεμινάρια.</p>'}</div>
      <div class="card pad teaser stack" style="gap:8px"><div class="eyebrow">Αυτόματη σύνοψη</div><h3>Δελτίο του Δικτύου</h3>
        <p class="small">Κάθε μήνα συντάσσεται αυτόματα μια σύνοψη από τις αναρτήσεις όλων των γραφείων, μαζί με δημόσιες ευκαιρίες για φοιτητές.</p>
        <div><button class="btn warm sm" data-go="deltio">Άνοιγμα δελτίου</button></div></div>
    </aside>
  </div>
  <section class="card pad stack" style="gap:14px"><h2>Αρχές του Δικτύου</h2>
    <ul class="principles">${[
      'Η συμμετοχή κάθε γραφείου είναι εθελοντική.',
      'Κάθε γραφείο διαχειρίζεται μόνο τα δικά του στοιχεία και αναρτήσεις.',
      'Δεν αποθηκεύονται προσωπικά δεδομένα φοιτητών ή εργοδοτών.',
      'Κάθε ίδρυμα ακολουθεί τις δικές του διαδικασίες.',
      'Λειτουργεί συμπληρωματικά προς τις θεσμικές δράσεις του Υπουργείου και της ΕΘΑΑΕ.',
      'Όλα τα ιδρύματα εμφανίζονται ισότιμα, χωρίς κατατάξεις.'
    ].map(t => `<li>${I.check}<span>${t}</span></li>`).join('')}</ul>
  </section>`;
}

function vOffices() {
  if (S.officeId) return vOfficeDetail(S.officeId);
  const q = S.q.trim().toLowerCase();
  const list = S.offices.filter(o => !q || `${o.name} ${o.short} ${o.city} ${o.region}`.toLowerCase().includes(q));
  const regions = REGION_ORDER.filter(r => list.some(o => o.region === r)).concat([...new Set(list.map(o => o.region))].filter(r => !REGION_ORDER.includes(r)));
  return `
  <div class="page-head"><div><h1>Γραφεία Διασύνδεσης</h1><p class="lede">Όλα τα δημόσια ΑΕΙ της χώρας, ανά περιφέρεια. Κάθε γραφείο ενημερώνει μόνο τη δική του σελίδα.</p></div></div>
  <div class="search"><input id="q" type="search" placeholder="Αναζήτηση ιδρύματος ή πόλης" value="${esc(S.q)}" aria-label="Αναζήτηση ιδρύματος"></div>
  ${regions.map(r => `<section class="region"><div class="eyebrow">${esc(r)}</div><div class="grid">${list.filter(o => o.region === r).sort((a, b) => a.name.localeCompare(b.name, 'el')).map(o => `
    <button class="card office" data-office="${o.id}">${avatar(o.id)}<span style="min-width:0"><b>${esc(o.name)}</b><small>${esc(o.city || '')}</small></span></button>`).join('')}</div></section>`).join('') || '<div class="card empty">Δεν βρέθηκε ίδρυμα με αυτή την αναζήτηση.</div>'}`;
}

function vOfficeDetail(id) {
  const o = S.O[id]; if (!o) return '<div class="card empty">Το γραφείο δεν βρέθηκε.</div>';
  const posts = S.posts.filter(p => p.office_id === id);
  const val = v => v ? esc(v) : '<span class="empty-val">Δεν έχει συμπληρωθεί ακόμη</span>';
  const web = safeUrl(o.website);
  return `
  <div><button class="btn ghost sm" data-back-offices>← Όλα τα γραφεία</button></div>
  <section class="card pad stack" style="gap:18px">
    <div class="office-head">${avatar(id, 'lg')}<div style="min-width:0"><div class="eyebrow">${esc(o.region)} · ${esc(o.city)}</div><h1 style="font-size:clamp(20px,2.6vw,26px)">${esc(o.name)}</h1></div></div>
    <dl class="kv">
      <dt>Υπεύθυνος/η γραφείου</dt><dd>${val(o.responsible)}</dd>
      <dt>Email</dt><dd>${o.email ? `<span style="user-select:all">${esc(o.email)}</span>` : val('')}</dd>
      <dt>Τηλέφωνο</dt><dd>${val(o.phone)}</dd>
      <dt>Ιστοσελίδα</dt><dd>${web ? `<a href="${esc(web)}" target="_blank" rel="noopener">${esc(web.replace(/^https?:\/\//, ''))}</a>` : val('')}</dd>
      <dt>Σχετικά με το γραφείο</dt><dd>${val(o.about)}</dd>
    </dl>
    ${id === myOffice() ? '<div><button class="btn primary sm" data-go="logariasmos">Επεξεργασία στοιχείων του γραφείου μου</button></div>' : ''}
  </section>
  <section class="stack" style="gap:12px"><h2>Αναρτήσεις του γραφείου</h2>
    <div class="grid">${posts.map(p => postCard(p, { compact: true })).join('') || '<div class="card empty">Το γραφείο δεν έχει αναρτήσεις ακόμη.</div>'}</div>
  </section>`;
}

function vPosts() {
  const regions = REGION_ORDER.filter(r => S.offices.some(o => o.region === r));
  let list = S.posts.filter(p => S.kind === 'all' || p.kind === S.kind);
  if (S.region) list = list.filter(p => S.O[p.office_id]?.region === S.region);
  if (DATED.includes(S.kind)) list = list.slice().sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));
  const intro = {
    all: 'Ό,τι μοιράζονται τα γραφεία: δράσεις, εκδηλώσεις, σεμινάρια, ευκαιρίες, υλικό, διακρίσεις και νέα.',
    ekdilosi: 'Ημέρες καριέρας, ημερίδες και άλλες εκδηλώσεις των γραφείων, με ημερομηνία και τόπο.',
    yliko: 'Δημόσιοι οδηγοί, βίντεο και υλικό που έφτιαξαν τα γραφεία για φοιτητές και θέλουν να το μοιραστούν.',
    diakrisi: 'Βραβεία, αναγνωρίσεις και ορόσημα των γραφείων.',
    nea: 'Πρακτικά νέα των γραφείων: νέο ωράριο, νέα ιστοσελίδα, νέα υπηρεσία για φοιτητές.',
    drasi: 'Ό,τι θέλει κάθε γραφείο να δείξει: μια εκδήλωση που πέτυχε, ένα νέο πρόγραμμα, μια ιδέα που δούλεψε.',
    seminario: 'Διαδικτυακά σεμινάρια που ένα γραφείο ανοίγει και σε φοιτητές άλλων ιδρυμάτων. Οι εγγραφές γίνονται στο σύστημα του ιδρύματος που τα διοργανώνει.',
    eykairia: 'Προγράμματα, διαγωνισμοί και ημερίδες που έχουν ήδη ανακοινωθεί δημόσια.'
  }[S.kind];
  return `
  <div class="page-head"><div><h1>Αναρτήσεις</h1><p class="lede">${intro}</p></div><button class="btn primary" data-act="new-post">Νέα ανάρτηση</button></div>
  <div class="filters">
    <select id="kindSel" aria-label="Φίλτρο είδους">${Object.entries(KIND_PLURAL).map(([k, l]) => `<option value="${k}" ${S.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select id="regionSel" aria-label="Φίλτρο περιφέρειας"><option value="">Όλες οι περιφέρειες</option>${regions.map(r => `<option ${S.region === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
  </div>
  <div class="grid">${list.map(p => postCard(p)).join('') || '<div class="card empty">Δεν υπάρχουν αναρτήσεις με αυτά τα φίλτρα.</div>'}</div>`;
}

async function vThreads() {
  const threads = await api.threads();
  if (!S.threadId && threads.length && window.matchMedia('(min-width: 821px)').matches) S.threadId = threads[0].id;
  const t = threads.find(x => x.id === S.threadId);
  const msgs = t ? await api.messages(t.id) : [];
  const list = `<div class="tlist">
    <button class="btn primary" data-act="new-thread" style="margin-bottom:4px">Νέα συζήτηση</button>
    ${threads.map(x => `<button class="card titem" data-thread="${x.id}" aria-current="${x.id === S.threadId}">${avatar(x.office_id, 'sm')}<span style="min-width:0"><b style="font-size:14px">${esc(x.title)}</b><small>${esc(officeShort(x.office_id))} · ${x.count} ${x.count === 1 ? 'μήνυμα' : 'μηνύματα'}</small></span></button>`).join('') || '<div class="card empty">Δεν υπάρχουν συζητήσεις ακόμη.</div>'}
  </div>`;
  const pane = t ? `<section class="card" style="overflow:hidden">
      <div class="pad" style="border-bottom:1px solid var(--line);display:flex;gap:10px;align-items:center;justify-content:space-between">
        <div style="min-width:0"><h2 style="font-size:17px">${esc(t.title)}</h2><div class="small muted">Ξεκίνησε από ${esc(officeShort(t.office_id))} · ${fmtDate(t.created_at)}</div></div>
        <button class="btn ghost sm" data-thread-back>Λίστα</button></div>
      <div class="msgs">${msgs.map(m => `<div class="msg ${m.office_id === myOffice() ? 'mine' : ''}">${avatar(m.office_id, 'sm')}<div class="bub"><b>Γραφείο Διασύνδεσης ${esc(officeShort(m.office_id))} <span class="muted" style="font-weight:400">· ${fmtDate(m.created_at)}</span></b><div>${esc(m.body)}</div></div></div>`).join('')}</div>
      <form class="compose" id="replyForm"><input class="input" id="replyText" placeholder="Γράψτε απάντηση" aria-label="Απάντηση" maxlength="4000"><button class="btn primary">Αποστολή</button></form>
    </section>` : '';
  const narrow = window.matchMedia('(max-width: 820px)').matches;
  return `
  <div class="page-head"><div><h1>Συζήτηση</h1><p class="lede">Κλειστός χώρος μόνο για τα στελέχη των γραφείων, για γνωριμία και απλή συνεννόηση.</p></div></div>
  <div class="threads">${narrow ? (t ? pane : list) : list + (pane || '<div class="card empty">Επιλέξτε μια συζήτηση.</div>')}</div>`;
}

/* ---------- Δελτίο ---------- */
function composeBulletin(ym, demoAi = false) {
  const [y, m] = ym.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  const in2 = new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10);
  const posts = S.posts.filter(p => p.created_at >= start && p.created_at < end);
  const dr = posts.filter(p => p.kind === 'drasi');
  const ey = posts.filter(p => p.kind === 'eykairia');
  const other = posts.filter(p => !['drasi', 'eykairia', 'seminario', 'ekdilosi'].includes(p.kind));
  const se = S.posts.filter(p => DATED.includes(p.kind) && p.event_date && p.event_date >= start.slice(0, 10) && p.event_date < in2)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  const offices = new Set([...posts, ...se].map(p => p.office_id));
  const firstSentence = s => { const t = (s || '').split(/(?<=[.!;])\s/)[0].trim(); return t.length > 180 ? t.slice(0, 177) + '…' : t; };
  const lines = [`# Ο μήνας στα Γραφεία Διασύνδεσης`, `**${M_NOM[m - 1]} ${y}**`, ''];
  if (!offices.size) {
    lines.push(`Τον ${M_ACC[m - 1]} δεν υπήρξαν αναρτήσεις στο Δίκτυο.`);
  } else {
    const parts = [];
    if (dr.length) parts.push(`${dr.length} ${dr.length === 1 ? 'δράση' : 'δράσεις'}`);
    if (se.length) parts.push(`${se.length} ανοιχτ${se.length === 1 ? 'ό σεμινάριο' : 'ά σεμινάρια'} για φοιτητές όλων των ιδρυμάτων`);
    if (ey.length) parts.push(`${ey.length} δημόσι${ey.length === 1 ? 'α ευκαιρία' : 'ες ευκαιρίες'}`);
    const list = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' και ' + parts.at(-1) : parts[0];
    lines.push(`Τον ${M_ACC[m - 1]}, ${offices.size} ${offices.size === 1 ? 'γραφείο διασύνδεσης μοιράστηκε' : 'γραφεία διασύνδεσης μοιράστηκαν'} στο Δίκτυο ${list}.`);
  }
  if (dr.length) { lines.push('', '## Δράσεις των γραφείων'); dr.forEach(p => lines.push(`- **${officeShort(p.office_id)}:** ${p.title}. ${firstSentence(p.body)}`.trim())); }
  if (se.length) { lines.push('', '## Εκδηλώσεις και ανοιχτά σεμινάρια'); se.forEach(p => { const { d, m: mm } = fmtDay(p.event_date); lines.push(`- **${d} ${mm}${p.event_time ? ', ' + p.event_time : ''} · ${officeShort(p.office_id)}:** ${p.title}`); }); }
  if (other.length) { lines.push('', '## Καλές πρακτικές, υλικό και νέα'); other.forEach(p => lines.push(`- **${officeShort(p.office_id)} · ${KINDS[p.kind]}:** ${p.title}`)); }
  if (ey.length) { lines.push('', '## Δημόσιες ευκαιρίες'); ey.forEach(p => lines.push(`- **${p.title}** (ανάρτηση ${officeShort(p.office_id)})`)); }
  if (demoAi && offices.size) lines.push('', '## Τάσεις του Δικτύου', 'Στην προεπισκόπηση εδώ εμφανίζονται 2-3 προτάσεις για τα κοινά θέματα που απασχολούν τα γραφεία, χωρίς συγκρίσεις μεταξύ ιδρυμάτων.');
  lines.push('', 'Το δελτίο συντάχθηκε αυτόματα αποκλειστικά από δημοσιευμένες αναρτήσεις των γραφείων του Δικτύου.');
  return lines.join('\n');
}

const curMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
function bulletinMonths() {
  const months = new Set([curMonth()]);
  S.posts.forEach(p => months.add(p.created_at.slice(0, 7)));
  return [...months].filter(m => m <= curMonth()).sort().reverse().slice(0, 12);
}

function paper(b, { live, fallback }) {
  const when = b.generated_at ? `${fmtDate(b.generated_at)}, ${new Date(b.generated_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}` : '';
  return `<article class="paper">
    <div class="mast"><div class="eyebrow">Δελτίο του Δικτύου</div>
      <span class="status ${fallback ? 'draft' : 'approved'}">${fallback ? 'Προσωρινή εκδοχή' : live ? 'Ενημερώνεται αυτόματα' : 'Ολοκληρωμένο'}</span></div>
    ${renderMarkup(b.content)}
    <div class="sig">${fallback
      ? 'Προσωρινή εκδοχή, φτιαγμένη απευθείας από τις αναρτήσεις.'
      : `Τελευταία σύνταξη: ${when}.${live ? ' Το δελτίο του τρέχοντος μήνα ξαναγράφεται αυτόματα όταν προστίθενται ή αλλάζουν αναρτήσεις.' : ''}`}</div>
  </article>`;
}

async function loadBulletin(month) {
  try {
    const { bulletin } = await api.ai('bulletin', { month });
    S.bulCache[month] = { b: bulletin, fallback: false };
  } catch (e) {
    S.bulCache[month] = { b: { month, content: composeBulletin(month) }, fallback: true, reason: e.message };
  }
}

async function vBulletin() {
  const months = bulletinMonths();
  if (!S.bulMonth || !months.includes(S.bulMonth)) S.bulMonth = months[0];
  const month = S.bulMonth;
  const how = `<div class="how">
    <div class="card">${I.doc}<div><b>Μόνο από αναρτήσεις</b><span>Χρησιμοποιεί αποκλειστικά ό,τι έχουν ήδη δημοσιεύσει τα γραφεία.</span></div></div>
    <div class="card">${I.shield}<div><b>Κανένα προσωπικό δεδομένο</b><span>Χρησιμοποιείται μόνο το κείμενο των αναρτήσεων, ποτέ στοιχεία χρηστών.</span></div></div>
    <div class="card">${I.person}<div><b>Κανείς δεν το επεξεργάζεται</b><span>Κανένα γραφείο δεν μπορεί να αλλάξει όσα γράφτηκαν για τα άλλα. Για διόρθωση, το γραφείο διορθώνει την ανάρτησή του.</span></div></div>
  </div>`;
  const chips = `<div class="tabs" role="tablist">${months.map(m => `<button class="tab" role="tab" data-bul-month="${m}" aria-selected="${m === month}">${esc(monthLabel(m))}</button>`).join('')}</div>`;
  const cached = S.bulCache[month];
  let body;
  if (!cached) {
    body = `<div class="card pad loading" id="bulLoading">Συντάσσεται το δελτίο ${esc(monthGen(month))}. Την πρώτη φορά κάθε μέρας μπορεί να πάρει έως ένα λεπτό, γιατί αναζητούνται και δημόσιες ευκαιρίες· μετά ανοίγει αμέσως.</div>`;
    setTimeout(async () => { await loadBulletin(month); if (S.view === 'deltio' && S.bulMonth === month) render(); }, 0);
  } else {
    body = `${cached.fallback ? `<div class="alert info">${esc(cached.reason || '')} Εμφανίζεται προσωρινή εκδοχή.</div>` : ''}
      <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn sm" data-bul-copy>Αντιγραφή κειμένου</button>${cached.fallback ? '<button class="btn sm" data-bul-retry>Δοκιμή ξανά</button>' : ''}</div>
      ${paper(cached.b, { live: month === curMonth(), fallback: cached.fallback })}`;
  }
  return `
  <div class="page-head"><div><h1>Δελτίο του Δικτύου</h1>
    <p class="lede">Μια μηνιαία εικόνα όσων κάνουν τα γραφεία διασύνδεσης της χώρας, μαζί με δημόσιες ευκαιρίες για φοιτητές. Συντάσσεται αυτόματα, χωρίς επιπλέον δουλειά για κανένα γραφείο.</p></div></div>
  ${how}
  ${chips}
  ${body}`;
}

/* ---------- Λογαριασμός ---------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (S.view === 'logariasmos') render(); });

function vAccount() {
  const p = S.me.profile; const o = S.O[p.office_id] || {};
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `
  <div class="page-head"><div><h1>Ο λογαριασμός μου</h1><p class="lede">${esc(p.full_name || p.email)} · ${esc(p.email)}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${isAdmin() ? '<button class="btn" data-go="diaxeirisi">Διαχείριση χρηστών</button>' : ''}<button class="btn" data-act="logout">Αποσύνδεση</button></div></div>
  <div class="cols">
    <section class="card pad stack" style="gap:16px">
      <div><h2>Στοιχεία του γραφείου μου</h2><p class="small muted">Αυτά βλέπουν τα υπόλοιπα γραφεία στη σελίδα του ιδρύματός σας.</p></div>
      <div class="office-head">${avatar(p.office_id, 'lg')}<div class="stack" style="gap:6px"><b>${esc(o.name)}</b>
        <label class="btn sm" style="width:max-content">Ανέβασμα λογοτύπου<input type="file" id="logoFile" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden></label>
        <span class="small muted">PNG, JPG ή SVG. Το κενό περιθώριο κόβεται αυτόματα.</span></div></div>
      <form class="form" id="officeForm">
        <div class="field"><label for="f_resp">Υπεύθυνος/η γραφείου</label><input class="input" id="f_resp" value="${esc(o.responsible)}" maxlength="120"></div>
        <div class="row2"><div class="field"><label for="f_email">Email γραφείου</label><input class="input" id="f_email" type="email" value="${esc(o.email)}" maxlength="120"></div>
        <div class="field"><label for="f_phone">Τηλέφωνο</label><input class="input" id="f_phone" value="${esc(o.phone)}" maxlength="40"></div></div>
        <div class="field"><label for="f_web">Ιστοσελίδα</label><input class="input" id="f_web" type="url" placeholder="https://" value="${esc(o.website)}" maxlength="200"></div>
        <div class="field"><label for="f_about">Σχετικά με το γραφείο</label><textarea id="f_about" maxlength="1200">${esc(o.about)}</textarea></div>
        <div><button class="btn primary">Αποθήκευση</button></div>
      </form>
    </section>
    <aside class="stack" style="gap:14px">
      <div class="card pad stack" style="gap:10px"><h2>Εγκατάσταση εφαρμογής</h2>
        ${standalone ? '<p class="small">Η εφαρμογή είναι ήδη εγκατεστημένη σε αυτή τη συσκευή.</p>'
          : installEvt ? '<p class="small muted">Προσθέστε το Δίκτυο στην οθόνη σας για να ανοίγει σαν κανονική εφαρμογή.</p><div><button class="btn primary" data-act="install">Εγκατάσταση</button></div>'
          : ios ? '<p class="small muted">Στο iPhone ή iPad: πατήστε το κουμπί Κοινοποίηση στο Safari και μετά «Προσθήκη στην οθόνη Αφετηρίας».</p>'
          : '<p class="small muted">Στον υπολογιστή: πατήστε το εικονίδιο εγκατάστασης στη γραμμή διευθύνσεων του Chrome ή του Edge. Στο Android: μενού ⋮ και «Προσθήκη στην αρχική οθόνη».</p>'}
      </div>
      <div class="card pad stack" style="gap:6px"><h2>Προσωπικά δεδομένα</h2><p class="small muted">Τι κρατά η εφαρμογή και ποια δικαιώματα έχετε.</p><div><button class="btn sm" data-go="aporrito">Ενημέρωση</button></div></div>
      <div class="card pad stack" style="gap:6px"><h2>Ο ρόλος μου</h2><p class="small">${isAdmin() ? 'Διαχειριστής του Δικτύου: εγκρίνετε τους νέους χρήστες του Δικτύου.' : 'Στέλεχος γραφείου: δημοσιεύετε αναρτήσεις και ενημερώνετε τα στοιχεία του γραφείου σας.'}</p></div>
    </aside>
  </div>`;
}


/* ---------- Προστασία προσωπικών δεδομένων ---------- */
function vPrivacy() {
  return `
  <div class="page-head"><div><div class="eyebrow">Ενημέρωση</div><h1>Προστασία προσωπικών δεδομένων</h1>
    <p class="lede">Πώς χειρίζεται το Δίκτυο Γραφείων Διασύνδεσης τα στοιχεία των χρηστών του.</p></div></div>
  <article class="card pad stack" style="gap:16px;max-width:820px">
    <section class="stack" style="gap:6px"><h2>Ποιος είναι υπεύθυνος</h2>
      <p>Το Δίκτυο είναι πιλοτική πρωτοβουλία του Γραφείου Διασύνδεσης του Πανεπιστημίου Δυτικής Μακεδονίας. Για ερωτήματα σχετικά με τα δεδομένα σας επικοινωνήστε με το Γραφείο Διασύνδεσης του ΠΔΜ.</p></section>
    <section class="stack" style="gap:6px"><h2>Ποια δεδομένα κρατάμε</h2>
      <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px">
        <li>Για κάθε χρήστη: ονοματεπώνυμο, υπηρεσιακό email, ίδρυμα και κατάσταση έγκρισης.</li>
        <li>Για κάθε γραφείο: τα στοιχεία επικοινωνίας και το λογότυπο που συμπληρώνει το ίδιο το γραφείο.</li>
        <li>Τις αναρτήσεις και τα μηνύματα που δημοσιεύουν τα γραφεία.</li>
      </ul>
      <p><b>Δεν</b> κρατάμε στοιχεία φοιτητών, αποφοίτων ή εργοδοτών. Παρακαλούμε μην τα αναρτάτε.</p></section>
    <section class="stack" style="gap:6px"><h2>Για ποιο σκοπό</h2>
      <p>Αποκλειστικά για την επικοινωνία και τη συνεργασία μεταξύ των Γραφείων Διασύνδεσης των ΑΕΙ. Τα δεδομένα δεν χρησιμοποιούνται για διαφήμιση, δεν πωλούνται και δεν δίνονται σε τρίτους.</p></section>
    <section class="stack" style="gap:6px"><h2>Ποιος τα βλέπει</h2>
      <p>Μόνο εγκεκριμένα στελέχη Γραφείων Διασύνδεσης. Τα email των χρηστών τα βλέπουν μόνο οι διαχειριστές, για την έγκριση της πρόσβασης.</p></section>
    <section class="stack" style="gap:6px"><h2>Πού αποθηκεύονται</h2>
      <p>Σε διακομιστές της υπηρεσίας Supabase στην Ευρωπαϊκή Ένωση (Ιρλανδία). Η σελίδα της εφαρμογής φιλοξενείται στο GitHub Pages, που δεν αποθηκεύει δεδομένα χρηστών.</p></section>
    <section class="stack" style="gap:6px"><h2>Τεχνητή νοημοσύνη</h2>
      <p>Για την αυτόματη σύνταξη του Δελτίου (που περιλαμβάνει και αναζήτηση δημόσιων ευκαιριών στο διαδίκτυο) και για τη βελτίωση κειμένου, το κείμενο των αναρτήσεων και το όνομα του ιδρύματος αποστέλλονται στην υπηρεσία τεχνητής νοημοσύνης Groq. Ονόματα, email ή άλλα στοιχεία χρηστών δεν αποστέλλονται ποτέ. Η υπηρεσία βρίσκεται εκτός ΕΕ, γι' αυτό οι αναρτήσεις δεν πρέπει να περιέχουν προσωπικά δεδομένα.</p></section>
    <section class="stack" style="gap:6px"><h2>Για πόσο</h2>
      <p>Όσο ο λογαριασμός σας είναι ενεργός. Μπορείτε να ζητήσετε οποιαδήποτε στιγμή τη διαγραφή του λογαριασμού σας και των στοιχείων σας.</p></section>
    <section class="stack" style="gap:6px"><h2>Τα δικαιώματά σας</h2>
      <p>Έχετε δικαίωμα πρόσβασης, διόρθωσης και διαγραφής των δεδομένων σας, καθώς και δικαίωμα καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα. Τα στοιχεία του γραφείου σας μπορείτε να τα διορθώσετε μόνοι σας από τη σελίδα «Ο λογαριασμός μου».</p></section>
  </article>`;
}

/* ---------- Διαχείριση ---------- */
async function vAdmin() {
  if (!isAdmin()) return '<div class="card empty">Η σελίδα είναι μόνο για διαχειριστές.</div>';
  const all = await api.profiles();
  const rows = S.adminTab === 'pending' ? all.filter(p => p.status === 'pending') : all;
  const st = { pending: 'Σε αναμονή', approved: 'Εγκεκριμένος', rejected: 'Απορρίφθηκε' };
  return `
  <div><button class="btn ghost sm" data-go="logariasmos">← Λογαριασμός</button></div>
  <div class="page-head"><div><h1>Διαχείριση χρηστών</h1><p class="lede">Πριν εγκρίνετε κάποιον, βεβαιωθείτε ότι ανήκει στο Γραφείο Διασύνδεσης του ιδρύματός του, για παράδειγμα με ένα τηλεφώνημα στο γραφείο.</p></div></div>
  <div class="tabs"><button class="tab" data-admin-tab="pending" aria-selected="${S.adminTab === 'pending'}">Σε αναμονή (${all.filter(p => p.status === 'pending').length})</button><button class="tab" data-admin-tab="all" aria-selected="${S.adminTab === 'all'}">Όλοι (${all.length})</button></div>
  <div class="card table-wrap"><table>
    <thead><tr><th>Όνομα</th><th>Email</th><th>Ίδρυμα</th><th>Αίτηση</th><th>Κατάσταση</th><th></th></tr></thead>
    <tbody>${rows.map(p => `<tr>
      <td>${esc(p.full_name || '—')}${p.is_admin ? ' <span class="kind">Διαχειριστής</span>' : ''}</td><td>${esc(p.email)}</td><td>${esc(officeShort(p.office_id))}</td><td>${fmtDate(p.created_at)}</td>
      <td><span class="status ${p.status === 'approved' ? 'approved' : 'pending'}">${st[p.status]}</span></td>
      <td style="white-space:nowrap">${p.id === S.me.profile.id ? '<span class="small muted">εσείς</span>' : `
        ${p.status !== 'approved' ? `<button class="btn sm primary" data-prof="${p.id}" data-set="approved">Έγκριση</button>` : ''}
        ${p.status !== 'rejected' ? `<button class="btn sm ghost danger" data-prof="${p.id}" data-set="rejected">${p.status === 'approved' ? 'Ανάκληση' : 'Απόρριψη'}</button>` : ''}
        ${p.status === 'approved' ? `<button class="btn sm" data-prof="${p.id}" data-admin="${p.is_admin ? 0 : 1}">${p.is_admin ? 'Αφαίρεση διαχειριστή' : 'Ορισμός διαχειριστή'}</button>` : ''}`}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">Δεν υπάρχουν αιτήσεις σε αναμονή.</td></tr>'}</tbody>
  </table></div>`;
}

/* ---------- Είσοδος / αναμονή ---------- */
let authTab = 'login';
function vAuth(err = '') {
  return `<div class="auth gut"><div style="width:100%;max-width:440px">
    <div class="card auth-card">
      <div class="auth-brand"><img src="icons/icon-192.png" alt=""><div><h2>Δίκτυο Γραφείων Διασύνδεσης</h2><div class="small muted">των ελληνικών ΑΕΙ</div></div></div>
      ${DEMO ? '<div class="alert info">Προεπισκόπηση: πατήστε «Είσοδος» με οποιαδήποτε στοιχεία.</div>' : ''}
      <div class="tabs"><button class="tab" data-auth-tab="login" aria-selected="${authTab === 'login'}">Είσοδος</button><button class="tab" data-auth-tab="signup" aria-selected="${authTab === 'signup'}">Αίτηση πρόσβασης</button></div>
      ${err ? `<div class="alert">${esc(err)}</div>` : ''}
      <form class="form" id="authForm">
        ${authTab === 'signup' ? '<div class="field"><label for="a_name">Ονοματεπώνυμο</label><input class="input" id="a_name" required maxlength="120" autocomplete="name"></div>' : ''}
        <div class="field"><label for="a_email">Ιδρυματικό email</label><input class="input" id="a_email" type="email" required autocomplete="email" placeholder="onoma@uowm.gr"></div>
        <div class="field"><label for="a_pw">Κωδικός</label><input class="input" id="a_pw" type="password" required minlength="${authTab === 'signup' ? 8 : 1}" autocomplete="${authTab === 'signup' ? 'new-password' : 'current-password'}">${authTab === 'signup' ? '<span class="hint">Τουλάχιστον 8 χαρακτήρες.</span>' : ''}</div>
        ${authTab === 'signup' ? '<label class="small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="a_consent" required style="margin-top:3px"><span>Διάβασα την <a href="#aporrito" data-go="aporrito">ενημέρωση για την προστασία προσωπικών δεδομένων</a>.</span></label>' : ''}
        <button class="btn primary" id="authBtn">${authTab === 'signup' ? 'Υποβολή αίτησης' : 'Είσοδος'}</button>
      </form>
      ${authTab === 'signup' ? '<p class="small muted">Η πρόσβαση ενεργοποιείται αφού ένας διαχειριστής του Δικτύου επιβεβαιώσει ότι ανήκετε σε Γραφείο Διασύνδεσης.</p>' : ''}
    </div>
    <p class="auth-note"><a href="#aporrito" data-go="aporrito" style="color:inherit">Προστασία προσωπικών δεδομένων</a></p>
    <p class="auth-note">Πιλοτική πρωτοβουλία του Γραφείου Διασύνδεσης του Πανεπιστημίου Δυτικής Μακεδονίας. Μόνο για στελέχη Γραφείων Διασύνδεσης ελληνικών ΑΕΙ.</p>
  </div></div>`;
}
function vPending(status) {
  return `<div class="auth gut"><div class="card auth-card">
    <div class="auth-brand"><img src="icons/icon-192.png" alt=""><h2>${status === 'rejected' ? 'Η πρόσβαση δεν εγκρίθηκε' : 'Η αίτησή σας καταχωρίστηκε'}</h2></div>
    <p>${status === 'rejected' ? 'Αν πιστεύετε ότι πρόκειται για λάθος, επικοινωνήστε με το Γραφείο Διασύνδεσης του Πανεπιστημίου Δυτικής Μακεδονίας.' : 'Ένας διαχειριστής του Δικτύου θα επιβεβαιώσει ότι ανήκετε σε Γραφείο Διασύνδεσης και θα ενεργοποιήσει την πρόσβασή σας. Δοκιμάστε ξανά λίγο αργότερα.'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="recheck">Έλεγχος ξανά</button><button class="btn" data-act="logout">Αποσύνδεση</button></div>
  </div></div>`;
}

/* =====================================================================
   Απόδοση
   ===================================================================== */
let renderSeq = 0;
async function render() {
  const root = $('#app');
  const seq = ++renderSeq;
  if (S.view === 'aporrito' && S.me?.profile?.status !== 'approved') {
    root.innerHTML = `<main class="gut"><div class="container stack view-in" style="max-width:860px"><div><button class="btn ghost sm" data-go="arxiki">← Πίσω</button></div>${vPrivacy()}</div></main>`;
    return;
  }
  if (!S.me) { root.innerHTML = vAuth(); return; }
  const st = S.me.profile?.status;
  if (st !== 'approved') { root.innerHTML = vPending(st); return; }
  const views = { aporrito: vPrivacy, arxiki: vHome, grafeia: vOffices, anartiseis: vPosts, syzitisi: vThreads, deltio: vBulletin, logariasmos: vAccount, diaxeirisi: vAdmin };
  try {
    const html = await views[S.view]();
    if (seq !== renderSeq) return;
    root.innerHTML = shell(html);
  } catch (e) {
    if (seq !== renderSeq) return;
    root.innerHTML = shell(`<div class="alert">${esc(errMsg(e))}</div>`);
  }
  if (S.view === 'syzitisi') { const m = $('.msgs'); if (m) m.lastElementChild?.scrollIntoView({ block: 'nearest' }); }
}

async function loadData() {
  const [offices, posts] = await Promise.all([api.offices(), api.posts()]);
  S.offices = offices; S.O = Object.fromEntries(offices.map(o => [o.id, o])); S.posts = posts;
}
async function refreshPosts() { S.posts = await api.posts(); }

/* =====================================================================
   Διάλογοι
   ===================================================================== */
function newPostDialog(kind = 'drasi') {
  dialog(`
    <h2>Νέα ανάρτηση</h2>
    <p class="small muted" style="margin-top:-8px">Δημοσιεύεται ως Γραφείο Διασύνδεσης ${esc(officeShort(myOffice()))}.</p>
    <form class="form" id="postForm">
      <div class="field"><label for="p_kind">Είδος</label><select id="p_kind">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="p_title">Τίτλος</label><input class="input" id="p_title" required minlength="3" maxlength="200"></div>
      <div class="field"><label for="p_body">Περιγραφή</label><textarea id="p_body" maxlength="4000" placeholder="Γράψτε ελεύθερα, και πατήστε «Βελτίωση κειμένου» αν θέλετε."></textarea>
        <span class="hint">Μη γράφετε προσωπικά δεδομένα φοιτητών ή εργοδοτών.</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn warm sm" id="aiImprove">Βελτίωση κειμένου</button></div>
      <div id="p_extra"></div>
      <div class="acts"><button type="button" class="btn" data-close>Άκυρο</button><button class="btn primary">Δημοσίευση</button></div>
    </form>`, close => {
    const extra = () => {
      const k = $('#p_kind').value;
      $('#p_extra').innerHTML = k === 'seminario'
        ? `<div class="form"><div class="row2"><div class="field"><label for="p_date">Ημερομηνία</label><input class="input" type="date" id="p_date" required min="${todayISO()}"></div><div class="field"><label for="p_time">Ώρα</label><input class="input" type="time" id="p_time" value="17:00"></div></div>
           <div class="field"><label for="p_link">Σύνδεσμος εγγραφής</label><input class="input" type="url" id="p_link" placeholder="https://"><span class="hint">Οι εγγραφές γίνονται στο σύστημα του ιδρύματός σας.</span></div></div>`
        : k === 'ekdilosi'
        ? `<div class="form"><div class="row2"><div class="field"><label for="p_date">Ημερομηνία</label><input class="input" type="date" id="p_date" required></div><div class="field"><label for="p_time">Ώρα</label><input class="input" type="time" id="p_time" value="10:00"></div></div>
           <div class="field"><label for="p_source">Τόπος</label><input class="input" id="p_source" placeholder="π.χ. Κοζάνη, Αμφιθέατρο Α, ή διαδικτυακά" maxlength="120"></div>
           <div class="field"><label for="p_link">Σύνδεσμος (προαιρετικό)</label><input class="input" type="url" id="p_link" placeholder="https://"></div></div>`
        : k === 'yliko'
        ? `<div class="form"><div class="field"><label for="p_link">Σύνδεσμος στο υλικό</label><input class="input" type="url" id="p_link" placeholder="https://" required><span class="hint">Μόνο υλικό που είναι ήδη δημόσιο, π.χ. στην ιστοσελίδα του γραφείου σας.</span></div></div>`
        : ['nea', 'diakrisi'].includes(k)
        ? `<div class="form"><div class="field"><label for="p_link">Σύνδεσμος (προαιρετικό)</label><input class="input" type="url" id="p_link" placeholder="https://"></div></div>`
        : k === 'eykairia'
        ? `<div class="form"><div class="field"><label for="p_source">Φορέας ή πηγή</label><input class="input" id="p_source" placeholder="π.χ. Δημόσια ανακοίνωση" maxlength="120"></div>
           <div class="field"><label for="p_link">Σύνδεσμος επίσημης ανακοίνωσης</label><input class="input" type="url" id="p_link" placeholder="https://"></div></div>`
        : '';
    };
    extra(); $('#p_kind').addEventListener('change', extra);
    const busy = (btn, on, label) => { btn.disabled = on; btn.textContent = on ? 'Γράφεται…' : label; };
    $('#aiImprove').addEventListener('click', async ev => {
      const btn = ev.currentTarget, body = $('#p_body').value.trim(), title = $('#p_title').value.trim();
      if (!body && !title) { toast('Γράψτε πρώτα λίγες λέξεις για την ανάρτηση.'); return; }
      busy(btn, true);
      try { const { text } = await api.ai('improve', { kind: $('#p_kind').value, title, body }); $('#p_body').value = text; toast('Η πρόταση είναι έτοιμη. Μπορείτε να την αλλάξετε.'); }
      catch (err) { toast(errMsg(err)); }
      busy(btn, false, 'Βελτίωση κειμένου');
    });
    $('#postForm').addEventListener('submit', async e => {
      e.preventDefault();
      const k = $('#p_kind').value;
      const row = { kind: k, title: $('#p_title').value.trim(), body: $('#p_body').value.trim(), link: $('#p_link')?.value.trim() || '' };
      if (DATED.includes(k)) { row.event_date = $('#p_date').value; row.event_time = $('#p_time').value; }
      if (k === 'ekdilosi') row.source = $('#p_source').value.trim();
      if (k === 'eykairia') row.source = $('#p_source').value.trim();
      const btn = e.submitter; if (btn) btn.disabled = true;
      try { await api.createPost(row); await refreshPosts(); S.bulCache = {}; close(); toast('Δημοσιεύτηκε'); go('anartiseis', { kind: k, region: '' }); }
      catch (err) { toast(errMsg(err)); if (btn) btn.disabled = false; }
    });
  });
}

function newThreadDialog() {
  dialog(`<h2>Νέα συζήτηση</h2>
    <form class="form" id="threadForm">
      <div class="field"><label for="t_title">Θέμα</label><input class="input" id="t_title" required minlength="3" maxlength="200"></div>
      <div class="field"><label for="t_body">Πρώτο μήνυμα</label><textarea id="t_body" required maxlength="4000"></textarea></div>
      <div class="acts"><button type="button" class="btn" data-close>Άκυρο</button><button class="btn primary">Έναρξη</button></div>
    </form>`, close => {
    $('#threadForm').addEventListener('submit', async e => {
      e.preventDefault();
      try { const id = await api.createThread($('#t_title').value.trim(), $('#t_body').value.trim()); close(); go('syzitisi', { threadId: id }); }
      catch (err) { toast(errMsg(err)); }
    });
  });
}

function confirmDialog(text, okLabel, onOk) {
  dialog(`<h2>${esc(text)}</h2><div class="acts"><button class="btn" data-close>Άκυρο</button><button class="btn primary" id="okBtn">${esc(okLabel)}</button></div>`, close => {
    $('#okBtn').addEventListener('click', async () => { close(); await onOk(); });
  });
}

/* =====================================================================
   Συμβάντα
   ===================================================================== */
document.addEventListener('click', async e => {
  const t = e.target;
  const g = t.closest('[data-go]');
  if (g) { e.preventDefault(); const opts = { officeId: null }; if (g.dataset.kind) opts.kind = g.dataset.kind; if (g.dataset.go === 'syzitisi') opts.threadId = null; go(g.dataset.go, opts); return; }

  const act = t.closest('[data-act]')?.dataset.act;
  if (act === 'new-post') return newPostDialog(S.kind !== 'all' ? S.kind : 'drasi');
  if (act === 'new-thread') return newThreadDialog();
  if (act === 'logout') { await api.signOut(); S.me = null; authTab = 'login'; render(); return; }
  if (act === 'recheck') { S.me = await api.me(); if (S.me?.profile?.status === 'approved') await loadData(); render(); return; }
  if (act === 'install' && installEvt) { installEvt.prompt(); installEvt = null; return; }

  const at = t.closest('[data-auth-tab]'); if (at) { authTab = at.dataset.authTab; render(); return; }
  const off = t.closest('[data-office]'); if (off) { S.officeId = off.dataset.office; render(); window.scrollTo(0, 0); return; }
  if (t.closest('[data-back-offices]')) { S.officeId = null; render(); return; }
  const kt = t.closest('[data-kind-tab]'); if (kt) { S.kind = kt.dataset.kindTab; render(); return; }
  const th = t.closest('[data-thread]'); if (th) { S.threadId = Number(th.dataset.thread); render(); return; }
  if (t.closest('[data-thread-back]')) { S.threadId = null; render(); return; }

  const dp = t.closest('[data-del-post]');
  if (dp) return confirmDialog('Να διαγραφεί η ανάρτηση;', 'Διαγραφή', async () => {
    try { await api.deletePost(Number(dp.dataset.delPost)); await refreshPosts(); S.bulCache = {}; render(); toast('Η ανάρτηση διαγράφηκε'); } catch (err) { toast(errMsg(err)); }
  });

  // Αγγλικά / Ελληνικά σε κάρτα
  const lt = t.closest('[data-lang-toggle]');
  if (lt) { const card = lt.closest('.post'); const el = card.querySelector('[data-lang="el"]'), en = card.querySelector('[data-lang="en"]'); const toEn = en.hidden; en.hidden = !toEn; el.hidden = toEn; lt.textContent = toEn ? 'Ελληνικά' : 'English'; return; }

  // Δελτίο
  const bm = t.closest('[data-bul-month]'); if (bm) { S.bulMonth = bm.dataset.bulMonth; render(); return; }
  if (t.closest('[data-bul-retry]')) { delete S.bulCache[S.bulMonth]; render(); return; }
  if (t.closest('[data-bul-copy]')) {
    const b = S.bulCache[S.bulMonth]?.b; if (!b) return;
    const plain = b.content.replace(/\[([^\]]+)\]\((https:[^)]+)\)/g, '$1 ($2)').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+ /gm, '').replace(/^- /gm, '• ');
    try { await navigator.clipboard.writeText(plain); toast('Το κείμενο αντιγράφηκε'); }
    catch (_) { dialog(`<h2>Αντιγραφή κειμένου</h2><textarea id="copyArea" style="min-height:300px">${esc(plain)}</textarea><div class="acts"><button class="btn" data-close>Κλείσιμο</button></div>`, () => { const a = $('#copyArea'); a.focus(); a.select(); }); }
    return;
  }

  // Διαχείριση
  const tab = t.closest('[data-admin-tab]'); if (tab) { S.adminTab = tab.dataset.adminTab; render(); return; }
  const pr = t.closest('[data-prof]');
  if (pr) {
    const fields = pr.dataset.set ? { status: pr.dataset.set } : { is_admin: pr.dataset.admin === '1' };
    try { await api.setProfile(pr.dataset.prof, fields); render(); toast('Η αλλαγή αποθηκεύτηκε'); } catch (err) { toast(errMsg(err)); }
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    const pos = e.target.selectionStart; S.q = e.target.value; render().then(() => { const n = $('#q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } });
  }
});

document.addEventListener('change', async e => {
  if (e.target.id === 'regionSel') { S.region = e.target.value; render(); }
  if (e.target.id === 'kindSel') { S.kind = e.target.value; render(); }
  if (e.target.id === 'logoFile') {
    const raw = e.target.files[0]; if (!raw) return;
    if (raw.size > 8 * 1024 * 1024) { toast('Το αρχείο ξεπερνά τα 8 MB.'); return; }
    toast('Γίνεται επεξεργασία του λογοτύπου…');
    const f = await prepareLogo(raw);
    if (f.size > 2 * 1024 * 1024) { toast('Το λογότυπο είναι πολύ μεγάλο. Δοκιμάστε μικρότερο αρχείο.'); return; }
    try { await api.uploadLogo(myOffice(), f); S.offices = await api.offices(); S.O = Object.fromEntries(S.offices.map(o => [o.id, o])); render(); toast('Το λογότυπο ανέβηκε'); }
    catch (err) { toast(errMsg(err)); }
  }
});

document.addEventListener('submit', async e => {
  if (e.target.id === 'authForm') {
    e.preventDefault();
    const email = $('#a_email').value.trim().toLowerCase(), pw = $('#a_pw').value;
    const btn = $('#authBtn'); btn.disabled = true;
    try {
      if (authTab === 'signup') {
        const dom = email.split('@')[1] || '';
        if (!OFFICES_SEED.some(o => o.domains.some(d => dom === d || dom.endsWith('.' + d)))) throw new Error('Επιτρέπεται εγγραφή μόνο με ιδρυματικό email ελληνικού ΑΕΙ.');
        await api.signUp(email, pw, $('#a_name').value.trim());
      } else await api.signIn(email, pw);
      S.me = await api.me();
      if (S.me?.profile?.status === 'approved') await loadData();
      go(location.hash.slice(1) || 'arxiki');
    } catch (err) { $('#app').innerHTML = vAuth(errMsg(err)); }
  }
  if (e.target.id === 'officeForm') {
    e.preventDefault();
    const web = $('#f_web').value.trim();
    const fields = { responsible: $('#f_resp').value.trim(), email: $('#f_email').value.trim(), phone: $('#f_phone').value.trim(), website: web && !/^https?:\/\//i.test(web) ? 'https://' + web : web, about: $('#f_about').value.trim() };
    try { await api.updateOffice(myOffice(), fields); Object.assign(S.O[myOffice()], fields); toast('Τα στοιχεία αποθηκεύτηκαν'); }
    catch (err) { toast(errMsg(err)); }
  }
  if (e.target.id === 'replyForm') {
    e.preventDefault();
    const body = $('#replyText').value.trim(); if (!body) return;
    try { await api.sendMessage(S.threadId, body); render(); } catch (err) { toast(errMsg(err)); }
  }
});

/* =====================================================================
   Εκκίνηση
   ===================================================================== */
(async function start() {
  $('#app').innerHTML = '<div class="loading">Φόρτωση…</div>';
  try {
    await api.init();
    S.me = await api.me();
    if (S.me?.profile?.status === 'approved') await loadData();
  } catch (e) {
    $('#app').innerHTML = `<div class="auth gut"><div class="card auth-card"><h2>Δεν ήταν δυνατή η σύνδεση</h2><p>${esc(errMsg(e))}</p><button class="btn primary" onclick="location.reload()">Δοκιμή ξανά</button></div></div>`;
    return;
  }
  const h = (location.hash || '').slice(1);
  S.view = ALL_VIEWS.includes(h) ? h : 'arxiki';
  render();
  if (sb) sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.me = null; render(); } });
})();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
