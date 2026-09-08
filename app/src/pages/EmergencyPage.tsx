import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { loadLocalState, saveLocalState } from "@/lib/localDb";
import {
  Phone,
  AlertTriangle,
  HeartPulse,
  Flame,
  ShieldAlert,
  Users,
  Plus,
  Trash2,
  Zap,
  Droplets,
  Car,
  Home,
  Brain,
  Baby,
  Pill,
  MessageSquare,
  CheckCircle2,
  Info,
} from "lucide-react";

/* Types */

interface EmergencyService {
  id: string;
  name: string;
  number: string;
  scope: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  note?: string;
}

interface CrisisGuide {
  id: string;
  title: string;
  icon: React.ElementType;
  steps: string[];
  donts: string[];
  callFirst?: string;
}

interface NetworkContact {
  id: string;
  name: string;
  role: string;
  phone: string;
}

/* National emergency numbers — South Africa */

const EMERGENCY_SERVICES: EmergencyService[] = [
  {
    id: "SVC-112",
    name: "National Emergency (112)",
    number: "112",
    scope: "All emergencies from any mobile phone — police, ambulance, fire",
    icon: Phone,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    note: "Works with zero airtime balance and even without a SIM card",
  },
  {
    id: "SVC-POL",
    name: "SAPS Police",
    number: "10111",
    scope: "Crime in progress, break-ins, threats to life",
    icon: ShieldAlert,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  {
    id: "SVC-AMB",
    name: "Ambulance & Fire",
    number: "10177",
    scope: "Medical emergencies, fires, rescue",
    icon: HeartPulse,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  {
    id: "SVC-POI",
    name: "Poisons Information",
    number: "13 11 26",
    scope: "Poisoning, chemical exposure, medication overdose guidance",
    icon: Pill,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  {
    id: "SVC-MH",
    name: "Mental Health Crisis (SADAG)",
    number: "0800 567 567",
    scope: "Suicide prevention, mental health crisis support — 24/7",
    icon: Brain,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    note: "Free call from any phone",
  },
  {
    id: "SVC-CHILD",
    name: "Childline SA",
    number: "0800 055 555",
    scope: "Children in danger, abuse, or distress — free, 24/7",
    icon: Baby,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  {
    id: "SVC-GBV",
    name: "GBV National Helpline",
    number: "0800 428 942",
    scope: "Gender-based violence support and referral — free, 24/7",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
];

/* Crisis guides — real first-response steps */

const CRISIS_GUIDES: CrisisGuide[] = [
  {
    id: "GUIDE-MED",
    title: "Medical Emergency",
    icon: HeartPulse,
    callFirst: "10177 or 112",
    steps: [
      "Check the scene is safe before approaching the person",
      "Call 10177 (ambulance) or 112 — state your exact location first, then the condition",
      "If unresponsive and not breathing normally: start CPR — push hard and fast in the centre of the chest (100–120/min) until help arrives",
      "If bleeding: apply firm direct pressure with a clean cloth; do not remove embedded objects",
      "If conscious but in distress: keep them still, loosen tight clothing, note what they took/ate and when",
    ],
    donts: [
      "Do NOT move someone with a suspected spine/neck injury unless there is immediate danger",
      "Do NOT give food or water to an unconscious or semi-conscious person",
      "Do NOT induce vomiting after poisoning — call 13 11 26 first",
    ],
  },
  {
    id: "GUIDE-FIRE",
    title: "Fire",
    icon: Flame,
    callFirst: "10177 or 112",
    steps: [
      "Get everyone out first — possessions never matter",
      "Call 10177 once outside; give the address and what is burning",
      "Small cooking fire only: smother with a lid or damp cloth — never water on oil",
      "Close doors behind you to slow the spread",
      "Meet at a pre-agreed assembly point and account for everyone",
    ],
    donts: [
      "Do NOT re-enter a burning building — tell firefighters who is inside",
      "Do NOT use lifts during a fire",
      "Do NOT throw water on electrical or oil fires",
    ],
  },
  {
    id: "GUIDE-POWER",
    title: "Extended Power Outage / Blackout",
    icon: Zap,
    callFirst: undefined,
    steps: [
      "Report the outage to your municipality (Joburg 011 688 1400, Cape Town 0860 103 089, eThekwini 031 311 1111, Tshwane 012 358 9999)",
      "Keep fridge and freezer closed — food stays safe ~4 hours fridge, ~24–48 hours full freezer",
      "Unplug sensitive electronics; leave one light on so you know when power returns",
      "Charge devices from a power bank or car (engine running, outdoors)",
      "Check on elderly or medical-device-dependent neighbours",
    ],
    donts: [
      "Do NOT run generators or braais indoors — carbon monoxide kills silently",
      "Do NOT use candles near curtains; prefer battery torches",
      "Do NOT open the deep freeze to check it",
    ],
  },
  {
    id: "GUIDE-FLOOD",
    title: "Flood / Heavy Rain Emergency",
    icon: Droplets,
    callFirst: "112 if anyone is trapped",
    steps: [
      "Move to higher ground immediately — do not wait for instructions",
      "Turn off electricity at the main switch if water is entering the home and it is safe to reach",
      "Never walk or drive through moving water — 30 cm of moving water sweeps a car away",
      "If trapped in a vehicle in rising water: unbuckle, open windows, get onto the roof",
      "After: photograph damage for insurance before cleaning",
    ],
    donts: [
      "Do NOT touch electrical equipment while standing in water",
      "Do NOT drink floodwater — treat all of it as contaminated",
      "Do NOT return home until authorities say it is safe",
    ],
  },
  {
    id: "GUIDE-BREAKIN",
    title: "Break-in / Intruder",
    icon: Home,
    callFirst: "10111",
    steps: [
      "If someone is inside: leave quietly if you can; if not, lock/barricade yourself in a room and call 10111",
      "Stay on the line with the operator; whisper if needed",
      "Note descriptions: height, clothing, direction of travel, vehicle",
      "If you arrive home to signs of entry: do NOT go inside — call 10111 from outside",
      "After: do not touch anything until police have attended",
    ],
    donts: [
      "Do NOT confront or corner an intruder",
      "Do NOT call out 'I have a gun' unless you actually do",
      "Do NOT post about it on social media before police attend",
    ],
  },
  {
    id: "GUIDE-ACCIDENT",
    title: "Road Accident",
    icon: Car,
    callFirst: "112",
    steps: [
      "Hazards on, park safely, warn traffic with a triangle if you have one",
      "Call 112 — give the road name, nearest intersection or kilometre marker",
      "Check breathing and bleeding; control heavy bleeding with direct pressure",
      "Do not remove helmets from injured motorcyclists unless they cannot breathe",
      "Exchange details: name, licence, plate, insurer; photograph everything",
    ],
    donts: [
      "Do NOT move injured people unless the vehicle is on fire",
      "Do NOT admit fault at the scene — state facts only",
      "Do NOT leave the scene of an injury accident",
    ],
  },
];

/* Component */

export default function EmergencyPage() {
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkContact[]>([]);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [loaded, setLoaded] = useState(false);

  // My Network persists locally via IndexedDB — survives zero-data
  useEffect(() => {
    loadLocalState<NetworkContact[]>("emergency-network").then((saved) => {
      if (saved) setNetwork(saved);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveLocalState("emergency-network", network);
  }, [network, loaded]);

  const addContact = useCallback(() => {
    if (!newName.trim() || !newPhone.trim()) return;
    setNetwork((prev) => [
      ...prev,
      { id: `NET-${Date.now()}`, name: newName.trim(), role: newRole.trim() || "Contact", phone: newPhone.trim() },
    ]);
    setNewName("");
    setNewRole("");
    setNewPhone("");
  }, [newName, newRole, newPhone]);

  const removeContact = useCallback((id: string) => {
    setNetwork((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Emergency Hub</h1>
            <p className="text-neutral-400 text-sm">South Africa — national numbers, crisis guides, your local network</p>
          </div>
        </div>

        {/* Offline notice */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300">
                This page works fully offline once loaded. <span className="text-white font-medium">112 works with zero airtime and even without a SIM card.</span> During network outages, an SMS often goes through when mobile data does not.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* National emergency numbers */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-5 h-5 text-red-400" /> National Emergency Numbers
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {EMERGENCY_SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <a key={svc.id} href={`tel:${svc.number.replace(/\s/g, "")}`} className="block">
                  <Card className="bg-neutral-900 border-neutral-800 hover:border-red-500/40 transition-colors h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl ${svc.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-5 w-5 ${svc.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-white text-sm truncate">{svc.name}</p>
                            <span className="text-red-400 font-bold text-lg flex-shrink-0">{svc.number}</span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">{svc.scope}</p>
                          {svc.note && <p className="text-xs text-cyan-400 mt-1">{svc.note}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </div>

        {/* Crisis guides */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-yellow-400" /> Crisis First-Response Guides
          </h2>
          <div className="space-y-3">
            {CRISIS_GUIDES.map((guide) => {
              const Icon = guide.icon;
              const open = openGuide === guide.id;
              return (
                <Card key={guide.id} className="bg-neutral-900 border-neutral-800">
                  <CardContent className="p-0">
                    <button
                      onClick={() => setOpenGuide(open ? null : guide.id)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{guide.title}</p>
                          {guide.callFirst && (
                            <p className="text-xs text-red-400">Call first: {guide.callFirst}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-neutral-800 text-neutral-400">
                        {open ? "Close" : "Open"}
                      </Badge>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-emerald-400 mb-2">DO — in order:</p>
                          <ul className="space-y-2">
                            {guide.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-red-400 mb-2">DO NOT:</p>
                          <ul className="space-y-2">
                            {guide.donts.map((dont, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                {dont}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* My Network — user-defined local contacts */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" /> My Local Network
            <span className="text-xs text-neutral-500 font-normal">— saved on this device, works offline</span>
          </h2>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm text-neutral-400">
                Add your community policing forum (CPF), neighbourhood watch, estate security, family, and trusted neighbours. They live only on this device.
              </p>
              <div className="grid sm:grid-cols-3 gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g. CPF Control)" className="bg-neutral-800 border-neutral-700" />
                <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role (e.g. Neighbourhood Watch)" className="bg-neutral-800 border-neutral-700" />
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone number" className="bg-neutral-800 border-neutral-700" />
              </div>
              <Button onClick={addContact} disabled={!newName.trim() || !newPhone.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add to My Network
              </Button>

              {network.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {network.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-cyan-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{contact.name}</p>
                          <p className="text-xs text-neutral-500">{contact.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${contact.phone}`} className="text-emerald-400 font-medium text-sm">{contact.phone}</a>
                        <Button variant="ghost" size="sm" onClick={() => removeContact(contact.id)} className="text-neutral-500 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
                  <p className="text-sm">No local contacts yet — add your CPF, watch, or family above</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer honesty note */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-500">
                Numbers shown are South African national services. This hub guides first response — it does not dispatch services, and your contacts stay on your device. In any life-threatening emergency, call 112 first.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
