"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Heart, MapPin, Gift, Calendar, Lock, Users, Settings, Plus, Copy, Check,
  ChevronLeft, ExternalLink, Trash2, ClipboardList, Wallet, Briefcase, Clock,
  NotebookPen, Image as ImageIcon, HandCoins,
} from "lucide-react";

const EMPTY_CHECKLIST = {
  "9-12 Months Before": [
    { text: "Set the budget and discuss who is contributing", done: false },
    { text: "Choose a wedding date and create a guest list draft", done: false },
    { text: "Book your venue for ceremony and reception", done: false },
  ],
  "6-8 Months Before": [
    { text: "Book photographer & videographer", done: false },
    { text: "Book caterer and arrange a tasting", done: false },
  ],
  "3-5 Months Before": [
    { text: "Order invitations and stationery", done: false },
    { text: "Apply for marriage licence", done: false },
  ],
  "6-8 Weeks Before": [
    { text: "Send wedding invitations", done: false },
    { text: "Finalise seating chart and place cards", done: false },
  ],
  "Final Days": [
    { text: "Confirm final payments to vendors", done: false },
    { text: "Prepare emergency kit", done: false },
  ],
};

function genCode(name) {
  const base = name.split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "GUEST";
  return `${base}-${Math.floor(100 + Math.random() * 900)}`;
}

function configFromRow(row) {
  return {
    names: row.names,
    date: row.wedding_date,
    story: row.story,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    venueMapsUrl: row.venue_maps_url,
    schedule: row.schedule || [],
    registryLinks: row.registry_links || [],
    gallery: row.gallery || [],
    adminCode: row.admin_code,
  };
}
function rowFromConfig(c) {
  return {
    id: 1,
    names: c.names,
    wedding_date: c.date,
    story: c.story,
    venue_name: c.venueName,
    venue_address: c.venueAddress,
    venue_maps_url: c.venueMapsUrl,
    schedule: c.schedule,
    registry_links: c.registryLinks,
    gallery: c.gallery,
    admin_code: c.adminCode,
  };
}
function guestFromRow(row) {
  return {
    name: row.name,
    rsvpStatus: row.rsvp_status || "",
    partySize: row.party_size || 1,
    maxParty: row.max_party || 2,
    meal: row.meal || "",
    dietary: row.dietary || "",
    message: row.message || "",
  };
}

export default function Page() {
  const [config, setConfig] = useState(null);
  const [guests, setGuests] = useState({});
  const [planner, setPlanner] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("login");
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeCode, setActiveCode] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: cfgRow } = await supabase.from("site_config").select("*").eq("id", 1).single();
      if (cfgRow) setConfig(configFromRow(cfgRow));

      const { data: guestRows } = await supabase.from("guests").select("*");
      const guestMap = {};
      (guestRows || []).forEach((g) => (guestMap[g.code] = guestFromRow(g)));
      setGuests(guestMap);

      const { data: plannerRow } = await supabase.from("planner").select("*").eq("id", 1).single();
      if (plannerRow) {
        setPlanner({
          checklist: Object.keys(plannerRow.checklist || {}).length ? plannerRow.checklist : EMPTY_CHECKLIST,
          budget: plannerRow.budget || [],
          vendors: plannerRow.vendors || [],
          timeline: plannerRow.timeline || [],
          notes: plannerRow.notes || "",
        });
      }
      setLoaded(true);
    })();
  }, []);

  async function saveConfig(next) {
    setConfig(next);
    await supabase.from("site_config").upsert(rowFromConfig(next));
  }
  async function upsertGuest(code, guest) {
    const next = { ...guests, [code]: guest };
    setGuests(next);
    await supabase.from("guests").upsert({
      code,
      name: guest.name,
      rsvp_status: guest.rsvpStatus,
      party_size: guest.partySize,
      max_party: guest.maxParty,
      meal: guest.meal,
      dietary: guest.dietary,
      message: guest.message,
    });
  }
  async function deleteGuest(code) {
    const next = { ...guests };
    delete next[code];
    setGuests(next);
    await supabase.from("guests").delete().eq("code", code);
  }
  async function savePlanner(next) {
    setPlanner(next);
    await supabase.from("planner").upsert({ id: 1, ...next });
  }

  function handleLogin() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    if (code === config.adminCode.toUpperCase()) {
      setView("admin");
      setLoginError("");
      return;
    }
    if (guests[code]) {
      setActiveCode(code);
      setView("guest");
      setLoginError("");
      return;
    }
    setLoginError("We couldn't find that code. Double-check your invitation, or contact the couple.");
  }

  if (!loaded || !config || !planner) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-stone-400 italic">Loading your invitation…</p>
      </div>
    );
  }

  if (view === "login") {
    return <LoginScreen config={config} codeInput={codeInput} setCodeInput={setCodeInput} onLogin={handleLogin} error={loginError} />;
  }
  if (view === "admin") {
    return (
      <AdminView
        config={config} guests={guests} planner={planner}
        saveConfig={saveConfig} upsertGuest={upsertGuest} deleteGuest={deleteGuest} savePlanner={savePlanner}
        onExit={() => setView("login")}
      />
    );
  }
  return (
    <GuestView
      config={config} guest={guests[activeCode]} code={activeCode}
      upsertGuest={upsertGuest} onExit={() => setView("login")}
    />
  );
}

function LoginScreen({ config, codeInput, setCodeInput, onLogin, error }) {
  const dateObj = new Date(config.date);
  const formatted = isNaN(dateObj) ? config.date : dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <Heart className="w-6 h-6 text-rose-700 mx-auto mb-6" strokeWidth={1.5} />
        <h1 className="text-4xl sm:text-5xl text-stone-800 mb-3 tracking-tight">{config.names}</h1>
        <p className="text-stone-500 tracking-widest text-sm uppercase mb-10">{formatted}</p>
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
          <Lock className="w-5 h-5 text-amber-700 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-stone-600 text-sm mb-5">Enter the personal code from your invitation to view your details and RSVP.</p>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLogin()}
            placeholder="e.g. JORDAN-482"
            className="w-full text-center tracking-widest uppercase border border-stone-300 rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-amber-600 text-stone-800"
          />
          {error && <p className="text-rose-700 text-xs mb-3">{error}</p>}
          <button onClick={onLogin} className="w-full bg-rose-800 hover:bg-rose-900 text-white rounded-lg py-3 font-medium transition-colors">
            View My Invitation
          </button>
        </div>
        <p className="text-stone-400 text-xs mt-8">Can't find your code? Reach out to the couple directly.</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-amber-700" strokeWidth={1.5} />
        <h2 className="text-2xl text-stone-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function GuestView({ config, guest, code, upsertGuest, onExit }) {
  const [status, setStatus] = useState(guest.rsvpStatus);
  const [partySize, setPartySize] = useState(guest.partySize);
  const [meal, setMeal] = useState(guest.meal);
  const [dietary, setDietary] = useState(guest.dietary);
  const [message, setMessage] = useState(guest.message);
  const [saved, setSaved] = useState(false);
  const [giftAmount, setGiftAmount] = useState("25");
  const [giftLoading, setGiftLoading] = useState(false);

  const dateObj = new Date(config.date);
  const formatted = isNaN(dateObj) ? config.date : dateObj.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  async function handleSave() {
    await upsertGuest(code, { ...guest, rsvpStatus: status, partySize, meal, dietary, message });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleGift() {
    setGiftLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPounds: Number(giftAmount), guestCode: code, guestName: guest.name }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setGiftLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <button onClick={onExit} className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm mb-10">
          <ChevronLeft className="w-4 h-4" /> Back to code entry
        </button>

        <div className="text-center mb-14">
          <p className="text-amber-700 uppercase text-xs tracking-widest mb-2">You're invited</p>
          <h1 className="text-4xl text-stone-800 mb-2">{config.names}</h1>
          <p className="text-stone-500">{formatted}</p>
          <p className="text-stone-400 text-sm mt-4">Hello, {guest.name} 🤍</p>
        </div>

        <Section icon={Heart} title="Our Story"><p className="text-stone-600 leading-relaxed font-light">{config.story}</p></Section>

        <Section icon={Calendar} title="Schedule">
          <div className="space-y-3">
            {config.schedule.map((s, i) => (
              <div key={i} className="flex gap-4 border-b border-stone-200 pb-3">
                <div className="w-20 text-amber-700 text-sm font-medium shrink-0">{s.time}</div>
                <div><p className="text-stone-800 font-medium">{s.title}</p><p className="text-stone-500 text-sm">{s.detail}</p></div>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={MapPin} title="Venue">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <p className="text-stone-800 font-medium">{config.venueName}</p>
            <p className="text-stone-500 text-sm mb-3">{config.venueAddress}</p>
            <a href={config.venueMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-700 text-sm font-medium hover:underline">
              Open in Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </Section>

        <Section icon={Users} title="RSVP">
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-stone-700 text-sm mb-2">Will you be joining us?</p>
              <div className="flex gap-3">
                {["Joyfully Accepts", "Regretfully Declines"].map((opt) => (
                  <button key={opt} onClick={() => setStatus(opt)}
                    className={`flex-1 rounded-lg py-2 text-sm border transition-colors ${status === opt ? "bg-rose-800 text-white border-rose-800" : "border-stone-300 text-stone-600 hover:bg-stone-50"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {status === "Joyfully Accepts" && (
              <>
                <div>
                  <label className="text-stone-700 text-sm block mb-1">Number in your party (including you)</label>
                  <input type="number" min={1} max={guest.maxParty || 10} value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="w-24 border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600" />
                </div>
                <div>
                  <label className="text-stone-700 text-sm block mb-1">Meal choice</label>
                  <select value={meal} onChange={(e) => setMeal(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600">
                    <option value="">Select…</option><option>Chicken</option><option>Fish</option><option>Vegetarian</option><option>Vegan</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-700 text-sm block mb-1">Dietary requirements or allergies</label>
                  <input value={dietary} onChange={(e) => setDietary(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600" />
                </div>
              </>
            )}
            <div>
              <label className="text-stone-700 text-sm block mb-1">Leave a message for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600" />
            </div>
            <button onClick={handleSave} disabled={!status} className="w-full bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white rounded-lg py-3 font-medium transition-colors">
              {saved ? "Saved ✓" : "Save My RSVP"}
            </button>
          </div>
        </Section>

        {config.gallery?.length > 0 && (
          <Section icon={ImageIcon} title="Our Gallery">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {config.gallery.map((g, i) => (
                <figure key={i} className="rounded-xl overflow-hidden border border-stone-200 bg-white">
                  <img src={g.url} alt={g.caption || "Wedding photo"} className="w-full h-32 sm:h-36 object-cover" />
                  {g.caption && <figcaption className="text-xs text-stone-500 px-2 py-1.5">{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </Section>
        )}

        <Section icon={HandCoins} title="Send a Gift">
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
            <p className="text-stone-600 text-sm">If you'd like to contribute to our honeymoon instead of a physical gift, you can send any amount securely below.</p>
            <div className="flex gap-2">
              <span className="flex items-center px-3 border border-stone-300 rounded-lg text-stone-500">£</span>
              <input type="number" min="1" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)}
                className="flex-1 border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600" />
            </div>
            <button onClick={handleGift} disabled={giftLoading || !giftAmount}
              className="w-full bg-rose-800 hover:bg-rose-900 disabled:bg-stone-300 text-white rounded-lg py-3 font-medium transition-colors">
              {giftLoading ? "Redirecting…" : `Send £${giftAmount || 0} Securely`}
            </button>
            <p className="text-stone-400 text-xs">Payments are processed securely by Stripe. You'll be redirected to complete payment.</p>
          </div>
        </Section>

        {config.registryLinks?.length > 0 && (
          <Section icon={Gift} title="Registry">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {config.registryLinks.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="bg-white border border-stone-200 rounded-xl p-4 text-center text-stone-700 font-medium hover:border-amber-600 hover:text-amber-700 transition-colors">
                  {r.label}
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function AdminView({ config, guests, planner, saveConfig, upsertGuest, deleteGuest, savePlanner, onExit }) {
  const [tab, setTab] = useState("guests");
  const [draft, setDraft] = useState(config);
  const [newName, setNewName] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [gifts, setGifts] = useState([]);

  useEffect(() => {
    if (tab === "gifts") {
      supabase.from("gifts").select("*").eq("status", "paid").order("created_at", { ascending: false })
        .then(({ data }) => setGifts(data || []));
    }
  }, [tab]);

  async function addGuest() {
    if (!newName.trim()) return;
    const code = genCode(newName.trim());
    await upsertGuest(code, { name: newName.trim(), rsvpStatus: "", partySize: 1, maxParty: 2, meal: "", dietary: "", message: "" });
    setNewName("");
  }
  function copyCode(code) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1500);
  }
  async function handleSaveContent() { await saveConfig(draft); }

  const guestList = Object.entries(guests);
  const accepted = guestList.filter(([, g]) => g.rsvpStatus === "Joyfully Accepts");
  const declined = guestList.filter(([, g]) => g.rsvpStatus === "Regretfully Declines");
  const totalGifts = gifts.reduce((sum, g) => sum + g.amount_pence, 0) / 100;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button onClick={onExit} className="flex items-center gap-1 text-stone-400 hover:text-stone-600 text-sm mb-8"><ChevronLeft className="w-4 h-4" /> Exit admin</button>
        <div className="flex items-center gap-2 mb-8"><Settings className="w-5 h-5 text-amber-700" strokeWidth={1.5} /><h1 className="text-3xl text-stone-800">Admin Panel</h1></div>

        <div className="flex gap-2 mb-8 border-b border-stone-200 overflow-x-auto">
          {["guests", "rsvps", "gifts", "planning", "gallery", "content"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap ${tab === t ? "text-rose-800 border-b-2 border-rose-800" : "text-stone-400"}`}>{t}</button>
          ))}
        </div>

        {tab === "guests" && (
          <div>
            <div className="flex gap-2 mb-6">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGuest()}
                placeholder="Guest or household name" className="flex-1 border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600" />
              <button onClick={addGuest} className="bg-rose-800 hover:bg-rose-900 text-white rounded-lg px-4 flex items-center gap-1 text-sm font-medium"><Plus className="w-4 h-4" /> Add</button>
            </div>
            <div className="space-y-2">
              {guestList.length === 0 && <p className="text-stone-400 text-sm">No guests added yet.</p>}
              {guestList.map(([code, g]) => (
                <div key={code} className="flex items-center justify-between bg-white border border-stone-200 rounded-lg px-4 py-3">
                  <div><p className="text-stone-800 font-medium">{g.name}</p><p className="text-stone-400 text-xs">{g.rsvpStatus || "No response yet"}</p></div>
                  <div className="flex items-center gap-2">
                    <code className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded">{code}</code>
                    <button onClick={() => copyCode(code)} className="text-stone-400 hover:text-amber-700">{copiedCode === code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                    <button onClick={() => deleteGuest(code)} className="text-stone-400 hover:text-rose-700 text-xs">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "rsvps" && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-stone-200 rounded-xl p-4 text-center"><p className="text-2xl text-rose-800">{accepted.length}</p><p className="text-stone-500 text-sm">Accepted</p></div>
              <div className="bg-white border border-stone-200 rounded-xl p-4 text-center"><p className="text-2xl text-stone-500">{declined.length}</p><p className="text-stone-500 text-sm">Declined</p></div>
            </div>
            <div className="space-y-2">
              {guestList.filter(([, g]) => g.rsvpStatus).map(([code, g]) => (
                <div key={code} className="bg-white border border-stone-200 rounded-lg px-4 py-3">
                  <p className="text-stone-800 font-medium">{g.name} — <span className="text-sm text-stone-500">{g.rsvpStatus}</span></p>
                  {g.rsvpStatus === "Joyfully Accepts" && <p className="text-stone-500 text-sm">Party of {g.partySize} · {g.meal || "no meal selected"} {g.dietary && `· ${g.dietary}`}</p>}
                  {g.message && <p className="text-stone-600 text-sm italic mt-1">"{g.message}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "gifts" && (
          <div>
            <div className="bg-white border border-stone-200 rounded-xl p-5 mb-6 text-center">
              <p className="text-3xl text-rose-800">£{totalGifts.toFixed(2)}</p>
              <p className="text-stone-500 text-sm">Total received from {gifts.length} gift{gifts.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="space-y-2">
              {gifts.length === 0 && <p className="text-stone-400 text-sm">No gifts received yet.</p>}
              {gifts.map((g) => (
                <div key={g.id} className="bg-white border border-stone-200 rounded-lg px-4 py-3 flex justify-between">
                  <div><p className="text-stone-800 font-medium">{g.guest_name || "Anonymous"}</p><p className="text-stone-400 text-xs">{new Date(g.created_at).toLocaleDateString()}</p></div>
                  <p className="text-amber-700 font-medium">£{(g.amount_pence / 100).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "planning" && <PlanningPanel planner={planner} savePlanner={savePlanner} />}
        {tab === "gallery" && <GalleryPanel config={config} saveConfig={saveConfig} />}

        {tab === "content" && (
          <div className="space-y-5">
            <Field label="Couple Names" value={draft.names} onChange={(v) => setDraft({ ...draft, names: v })} />
            <Field label="Wedding Date" type="date" value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
            <Field label="Your Story" textarea value={draft.story} onChange={(v) => setDraft({ ...draft, story: v })} />
            <Field label="Venue Name" value={draft.venueName} onChange={(v) => setDraft({ ...draft, venueName: v })} />
            <Field label="Venue Address" value={draft.venueAddress} onChange={(v) => setDraft({ ...draft, venueAddress: v })} />
            <Field label="Venue Maps URL" value={draft.venueMapsUrl} onChange={(v) => setDraft({ ...draft, venueMapsUrl: v })} />
            <Field label="Admin Code (your private login)" value={draft.adminCode} onChange={(v) => setDraft({ ...draft, adminCode: v })} />
            <button onClick={handleSaveContent} className="bg-amber-700 hover:bg-amber-800 text-white rounded-lg px-5 py-2.5 font-medium">Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea }) {
  return (
    <div>
      <label className="text-stone-700 text-sm block mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600" />
      )}
    </div>
  );
}

function GalleryPanel({ config, saveConfig }) {
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const gallery = config.gallery || [];

  function addPhoto() {
    if (!newUrl.trim()) return;
    saveConfig({ ...config, gallery: [...gallery, { url: newUrl.trim(), caption: newCaption.trim() }] });
    setNewUrl(""); setNewCaption("");
  }
  function removePhoto(idx) { saveConfig({ ...config, gallery: gallery.filter((_, i) => i !== idx) }); }
  function updateCaption(idx, caption) { saveConfig({ ...config, gallery: gallery.map((g, i) => (i === idx ? { ...g, caption } : g)) }); }

  return (
    <div>
      <p className="text-stone-500 text-sm mb-5">Paste a link to a photo you've already hosted online (Google Photos, Imgur, Dropbox, etc). There's no file upload, only image links.</p>
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 space-y-3">
        <Field label="Photo URL" value={newUrl} onChange={setNewUrl} />
        <Field label="Caption (optional)" value={newCaption} onChange={setNewCaption} />
        <button onClick={addPhoto} className="bg-rose-800 hover:bg-rose-900 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Photo</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {gallery.map((g, idx) => (
          <div key={idx} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <img src={g.url} alt={g.caption || "photo"} className="w-full h-28 object-cover" />
            <div className="p-2">
              <input value={g.caption} onChange={(e) => updateCaption(idx, e.target.value)} placeholder="Caption" className="w-full text-xs bg-transparent focus:outline-none text-stone-600 mb-1" />
              <button onClick={() => removePhoto(idx)} className="text-stone-300 hover:text-rose-700 flex items-center gap-1 text-xs"><Trash2 className="w-3 h-3" /> Remove</button>
            </div>
          </div>
        ))}
      </div>
      {gallery.length === 0 && <p className="text-stone-400 text-sm">No photos added yet.</p>}
    </div>
  );
}

function PlanningPanel({ planner, savePlanner }) {
  const [sub, setSub] = useState("checklist");
  const subTabs = [
    { id: "checklist", label: "Checklist", icon: ClipboardList },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "vendors", label: "Vendors", icon: Briefcase },
    { id: "timeline", label: "Day-Of Timeline", icon: Clock },
    { id: "notes", label: "Notes", icon: NotebookPen },
  ];
  const totalDone = Object.values(planner.checklist).flat().filter((i) => i.done).length;
  const totalItems = Object.values(planner.checklist).flat().length;

  function toggleItem(category, idx) {
    const next = { ...planner, checklist: { ...planner.checklist } };
    next.checklist[category] = next.checklist[category].map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    savePlanner(next);
  }
  function addItem(category) {
    const next = { ...planner, checklist: { ...planner.checklist } };
    next.checklist[category] = [...next.checklist[category], { text: "New task", done: false }];
    savePlanner(next);
  }
  function editItemText(category, idx, text) {
    const next = { ...planner, checklist: { ...planner.checklist } };
    next.checklist[category] = next.checklist[category].map((it, i) => (i === idx ? { ...it, text } : it));
    savePlanner(next);
  }
  function removeItem(category, idx) {
    const next = { ...planner, checklist: { ...planner.checklist } };
    next.checklist[category] = next.checklist[category].filter((_, i) => i !== idx);
    savePlanner(next);
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${sub === t.id ? "bg-rose-800 text-white border-rose-800" : "border-stone-300 text-stone-600"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {sub === "checklist" && (
        <div>
          <p className="text-stone-500 text-sm mb-5">{totalDone} of {totalItems} tasks complete</p>
          <div className="space-y-6">
            {Object.entries(planner.checklist).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg text-stone-800 mb-2">{category}</h3>
                <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                      <button onClick={() => toggleItem(category, idx)} className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${item.done ? "bg-amber-700 border-amber-700" : "border-stone-300"}`}>
                        {item.done && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <input value={item.text} onChange={(e) => editItemText(category, idx, e.target.value)} className={`flex-1 text-sm bg-transparent focus:outline-none ${item.done ? "text-stone-400 line-through" : "text-stone-700"}`} />
                      <button onClick={() => removeItem(category, idx)} className="text-stone-300 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={() => addItem(category)} className="w-full text-left px-4 py-2.5 text-amber-700 text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add task</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === "budget" && (
        <EditableTable rows={planner.budget} columns={[
          { key: "category", label: "Category" }, { key: "estimated", label: "Estimated (£)" },
          { key: "actual", label: "Actual (£)" }, { key: "deposit", label: "Deposit Paid" }, { key: "balance", label: "Balance Due" },
        ]} onChange={(rows) => savePlanner({ ...planner, budget: rows })} newRow={{ category: "", estimated: "", actual: "", deposit: "", balance: "" }} />
      )}
      {sub === "vendors" && (
        <EditableTable rows={planner.vendors} columns={[
          { key: "name", label: "Vendor" }, { key: "category", label: "Category" }, { key: "contact", label: "Contact" },
          { key: "price", label: "Price" }, { key: "deposit", label: "Deposit" }, { key: "paid", label: "Paid" },
        ]} onChange={(rows) => savePlanner({ ...planner, vendors: rows })} newRow={{ name: "", category: "", contact: "", price: "", deposit: "", paid: "No" }} />
      )}
      {sub === "timeline" && (
        <EditableTable rows={planner.timeline} columns={[
          { key: "time", label: "Time" }, { key: "event", label: "Event" }, { key: "location", label: "Location" }, { key: "who", label: "Who's Involved" },
        ]} onChange={(rows) => savePlanner({ ...planner, timeline: rows })} newRow={{ time: "", event: "", location: "", who: "" }} />
      )}
      {sub === "notes" && (
        <textarea value={planner.notes} onChange={(e) => savePlanner({ ...planner, notes: e.target.value })} rows={14}
          placeholder="Jot down anything else — seating chart sketches, decor ideas, gift log, honeymoon plans…"
          className="w-full border border-stone-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-600 text-stone-700" />
      )}
    </div>
  );
}

function EditableTable({ rows, columns, onChange, newRow }) {
  function updateCell(idx, key, value) { onChange(rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r))); }
  function addRow() { onChange([...rows, { ...newRow }]); }
  function removeRow(idx) { onChange(rows.filter((_, i) => i !== idx)); }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-white border border-stone-200 rounded-xl overflow-hidden">
        <thead><tr className="bg-stone-100">{columns.map((c) => <th key={c.key} className="text-left px-3 py-2 text-stone-600 font-medium whitespace-nowrap">{c.label}</th>)}<th className="w-8"></th></tr></thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-stone-100">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-1.5"><input value={row[c.key] || ""} onChange={(e) => updateCell(idx, c.key, e.target.value)} className="w-full bg-transparent focus:outline-none focus:bg-stone-50 rounded px-1 py-1 text-stone-700" /></td>
              ))}
              <td className="px-2"><button onClick={() => removeRow(idx)} className="text-stone-300 hover:text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="mt-3 text-amber-700 text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add row</button>
    </div>
  );
}
