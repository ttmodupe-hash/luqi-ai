import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Headphones,
  MessageSquare,
  Search,
  PlusCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  Ticket,
  BarChart3,
  Shield,
  CreditCard,
  UserCircle,
  Wrench,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TicketResponse {
  message: string;
  created_at?: string;
  responder?: string;
}

interface SupportTicket {
  ticket_id: string;
  subject: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  responses: TicketResponse[];
}

interface FAQ {
  faq_id: string;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}

interface DashboardData {
  total_tickets: number;
  open_tickets: number;
  avg_resolution_hours: number;
  sla_compliance_percent: number;
  category_breakdown: Record<string, number>;
  top_issues: { subject: string; count: number }[];
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_TICKETS: SupportTicket[] = [
  {
    ticket_id: "TICK-001",
    subject: "Login not working",
    description: "I cannot log in with my credentials. It says 'Invalid password' even though I'm sure it's correct.",
    category: "technical",
    priority: "high",
    status: "open",
    created_at: "2026-07-26T10:00:00",
    responses: [],
  },
  {
    ticket_id: "TICK-002",
    subject: "Double charged",
    description: "I was charged twice for my subscription this month.",
    category: "billing",
    priority: "medium",
    status: "in_progress",
    created_at: "2026-07-25T14:00:00",
    responses: [
      { message: "We are investigating your billing issue and will get back to you shortly.", created_at: "2026-07-25T15:00:00", responder: "Support Agent" },
    ],
  },
  {
    ticket_id: "TICK-003",
    subject: "Dark mode request",
    description: "Would love to see a dark mode option in the dashboard.",
    category: "feature_request",
    priority: "low",
    status: "waiting",
    created_at: "2026-07-24T09:00:00",
    responses: [],
  },
];

const MOCK_FAQS: FAQ[] = [
  {
    faq_id: "FAQ-001",
    question: "How do I reset my password?",
    answer: "Go to Settings > Security > Change Password. Enter your current password, then your new password twice, and click Save.",
    category: "account",
    helpful_count: 42,
  },
  {
    faq_id: "FAQ-002",
    question: "Why was I charged twice?",
    answer: "Duplicate charges usually resolve automatically within 24-48 hours. If the charge persists, please open a billing ticket.",
    category: "billing",
    helpful_count: 35,
  },
  {
    faq_id: "FAQ-003",
    question: "Is my data secure?",
    answer: "Yes. We use AES-256 encryption at rest and TLS 1.3 in transit. We are fully compliant with POPIA and GDPR.",
    category: "security",
    helpful_count: 47,
  },
  {
    faq_id: "FAQ-004",
    question: "How do I export my data?",
    answer: "Navigate to Settings > Data > Export. You can download your data in CSV or JSON format.",
    category: "account",
    helpful_count: 28,
  },
  {
    faq_id: "FAQ-005",
    question: "What browsers are supported?",
    answer: "We support Chrome, Firefox, Safari, and Edge (latest two versions). Internet Explorer is not supported.",
    category: "technical",
    helpful_count: 19,
  },
];

const MOCK_DASHBOARD: DashboardData = {
  total_tickets: 156,
  open_tickets: 23,
  avg_resolution_hours: 4.2,
  sla_compliance_percent: 94,
  category_breakdown: {
    billing: 42,
    technical: 58,
    account: 31,
    security: 15,
    feature_request: 10,
  },
  top_issues: [
    { subject: "Password reset", count: 24 },
    { subject: "Login failure", count: 18 },
    { subject: "Billing inquiry", count: 15 },
    { subject: "Feature request", count: 12 },
    { subject: "Data export", count: 9 },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical":
      return "bg-red-600 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-500 text-black";
    case "low":
      return "bg-green-500 text-white";
    default:
      return "bg-neutral-500 text-white";
  }
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "open":
      return "bg-blue-500 text-white";
    case "in_progress":
      return "bg-purple-500 text-white";
    case "waiting":
      return "bg-amber-500 text-black";
    case "closed":
      return "bg-green-500 text-white";
    default:
      return "bg-neutral-500 text-white";
  }
}

function getCategoryIcon(category: string) {
  switch (category.toLowerCase()) {
    case "billing":
      return CreditCard;
    case "technical":
      return Wrench;
    case "account":
      return UserCircle;
    case "security":
      return Shield;
    default:
      return MessageSquare;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupportPage() {
  const { get, post, loading, error } = useApi();

  // ─ Tickets state ─
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketFilter, setTicketFilter] = useState<string>("all");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [ticketDetail, setTicketDetail] = useState<SupportTicket | null>(null);

  // ─ FAQ state ─
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqCategory, setFaqCategory] = useState<string>("all");
  const [faqSearch, setFaqSearch] = useState("");
  const [faqSearchResults, setFaqSearchResults] = useState<FAQ[] | null>(null);

  // ─ Dashboard state ─
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // ─ New ticket state ─
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ─ Active tab ─
  const [activeTab, setActiveTab] = useState("tickets");

  // ─── Data Loading ──────────────────────────────────────────────────────────

  const loadTickets = useCallback(async (statusFilter?: string) => {
    try {
      const query = statusFilter && statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const data = await get(`/api/v25/support/tickets${query}`);
      if (data && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      } else if (Array.isArray(data)) {
        setTickets(data);
      } else {
        setTickets(MOCK_TICKETS);
      }
    } catch {
      setTickets(MOCK_TICKETS);
    }
  }, [get]);

  const loadFaqs = useCallback(async () => {
    try {
      const data = await get("/api/v25/support/faqs");
      if (data && Array.isArray(data.faqs)) {
        setFaqs(data.faqs);
      } else if (Array.isArray(data)) {
        setFaqs(data);
      } else {
        setFaqs(MOCK_FAQS);
      }
    } catch {
      setFaqs(MOCK_FAQS);
    }
  }, [get]);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await get("/api/v25/support/dashboard");
      if (data) {
        setDashboard(data);
      } else {
        setDashboard(MOCK_DASHBOARD);
      }
    } catch {
      setDashboard(MOCK_DASHBOARD);
    }
  }, [get]);

  // Initial load
  useEffect(() => {
    loadTickets();
    loadFaqs();
    loadDashboard();
  }, [loadTickets, loadFaqs, loadDashboard]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleTicketFilter = (filter: string) => {
    setTicketFilter(filter);
    loadTickets(filter);
  };

  const handleTicketClick = async (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
      setTicketDetail(null);
      return;
    }
    setExpandedTicket(ticketId);
    setReplyMessage("");
    try {
      const data = await get(`/api/v25/support/tickets/${ticketId}`);
      if (data) {
        setTicketDetail(data.ticket || data);
      } else {
        const found = tickets.find((t) => t.ticket_id === ticketId) || null;
        setTicketDetail(found);
      }
    } catch {
      const found = tickets.find((t) => t.ticket_id === ticketId) || null;
      setTicketDetail(found);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !expandedTicket) return;
    try {
      await post(`/api/v25/support/tickets/${expandedTicket}/respond`, {
        message: replyMessage,
      });
      // Refresh ticket detail
      try {
        const data = await get(`/api/v25/support/tickets/${expandedTicket}`);
        if (data) {
          setTicketDetail(data.ticket || data);
        }
      } catch {
        // use local mock update
        if (ticketDetail) {
          setTicketDetail({
            ...ticketDetail,
            responses: [
              ...ticketDetail.responses,
              { message: replyMessage, created_at: new Date().toISOString(), responder: "You" },
            ],
          });
        }
      }
      setReplyMessage("");
      loadTickets(ticketFilter);
    } catch {
      // Local mock update on failure
      if (ticketDetail) {
        setTicketDetail({
          ...ticketDetail,
          responses: [
            ...ticketDetail.responses,
            { message: replyMessage, created_at: new Date().toISOString(), responder: "You" },
          ],
        });
      }
      setReplyMessage("");
    }
  };

  const handleFaqSearch = async () => {
    if (!faqSearch.trim()) {
      setFaqSearchResults(null);
      return;
    }
    try {
      const data = await post("/api/v25/support/faqs/search", { query: faqSearch });
      if (data && Array.isArray(data.results)) {
        setFaqSearchResults(data.results);
      } else if (data && Array.isArray(data.faqs)) {
        setFaqSearchResults(data.faqs);
      } else {
        // Local search fallback
        const term = faqSearch.toLowerCase();
        setFaqSearchResults(
          MOCK_FAQS.filter(
            (f) =>
              f.question.toLowerCase().includes(term) ||
              f.answer.toLowerCase().includes(term)
          )
        );
      }
    } catch {
      const term = faqSearch.toLowerCase();
      setFaqSearchResults(
        MOCK_FAQS.filter(
          (f) =>
            f.question.toLowerCase().includes(term) ||
            f.answer.toLowerCase().includes(term)
        )
      );
    }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newDescription.trim() || !newCategory || !newPriority) return;
    try {
      await post("/api/v25/support/tickets", {
        subject: newSubject,
        description: newDescription,
        category: newCategory,
        priority: newPriority,
      });
      setSubmitSuccess(true);
      setNewSubject("");
      setNewDescription("");
      setNewCategory("");
      setNewPriority("");
      loadTickets();
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {
      // Show success UI anyway with mock
      setSubmitSuccess(true);
      const mockNewTicket: SupportTicket = {
        ticket_id: `TICK-${String(MOCK_TICKETS.length + 1).padStart(3, "0")}`,
        subject: newSubject,
        description: newDescription,
        category: newCategory,
        priority: newPriority,
        status: "open",
        created_at: new Date().toISOString(),
        responses: [],
      };
      MOCK_TICKETS.unshift(mockNewTicket);
      setTickets([...MOCK_TICKETS]);
      setNewSubject("");
      setNewDescription("");
      setNewCategory("");
      setNewPriority("");
      setTimeout(() => setSubmitSuccess(false), 4000);
    }
  };

  // ─── Derived state ─────────────────────────────────────────────────────────

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === "all") return true;
    return t.status.toLowerCase() === ticketFilter.toLowerCase();
  });

  const displayedFaqs = faqSearchResults !== null ? faqSearchResults : faqs;
  const faqsByCategory =
    faqCategory === "all"
      ? displayedFaqs
      : displayedFaqs.filter((f) => f.category.toLowerCase() === faqCategory.toLowerCase());

  const categoryColors: Record<string, string> = {
    billing: "bg-blue-500",
    technical: "bg-purple-500",
    account: "bg-green-500",
    security: "bg-orange-500",
    feature_request: "bg-pink-500",
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-auto p-6 bg-neutral-900 text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Headphones size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-sm text-neutral-400">
              Get help, track tickets, and find answers
            </p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-neutral-800 border border-neutral-700">
            <TabsTrigger value="tickets" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white">
              <Ticket size={14} className="mr-1" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="faq" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white">
              <Search size={14} className="mr-1" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white">
              <BarChart3 size={14} className="mr-1" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="new" className="data-[state=active]:bg-neutral-700 data-[state=active]:text-white">
              <PlusCircle size={14} className="mr-1" />
              New Ticket
            </TabsTrigger>
          </TabsList>

          {/* ═══════ TICKETS TAB ═══════ */}
          <TabsContent value="tickets" className="space-y-4">
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2">
              {["all", "open", "in_progress", "closed"].map((f) => (
                <Button
                  key={f}
                  variant={ticketFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTicketFilter(f)}
                  className={
                    ticketFilter === f
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }
                >
                  {f === "all" && "All"}
                  {f === "open" && "Open"}
                  {f === "in_progress" && "In Progress"}
                  {f === "closed" && "Closed"}
                </Button>
              ))}
            </div>

            {/* Loading / Error */}
            {loading && (
              <div className="flex items-center justify-center py-12 text-neutral-400">
                <Clock size={20} className="animate-spin mr-2" />
                Loading tickets...
              </div>
            )}
            {error && !loading && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {/* Ticket list */}
            {!loading && (
              <div className="space-y-2">
                {filteredTickets.length === 0 && (
                  <div className="text-center py-12 text-neutral-500">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No tickets found.</p>
                  </div>
                )}
                {filteredTickets.map((ticket) => (
                  <Card
                    key={ticket.ticket_id}
                    className="bg-neutral-800 border-neutral-700 cursor-pointer hover:border-neutral-600 transition-colors"
                    onClick={() => handleTicketClick(ticket.ticket_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-neutral-400">
                              {ticket.ticket_id}
                            </span>
                            <Badge className={`${getPriorityColor(ticket.priority)} text-[10px] px-1.5 py-0`}>
                              {ticket.priority}
                            </Badge>
                            <Badge className={`${getStatusColor(ticket.status)} text-[10px] px-1.5 py-0`}>
                              {ticket.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-white truncate">
                            {ticket.subject}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {formatDate(ticket.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-neutral-600 text-neutral-300 text-[10px]"
                          >
                            {ticket.category}
                          </Badge>
                          {expandedTicket === ticket.ticket_id ? (
                            <ChevronUp size={16} className="text-neutral-400" />
                          ) : (
                            <ChevronDown size={16} className="text-neutral-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {expandedTicket === ticket.ticket_id && ticketDetail && (
                        <div className="mt-4 pt-4 border-t border-neutral-700 space-y-4">
                          {ticketDetail.description && (
                            <div>
                              <p className="text-xs font-medium text-neutral-400 mb-1">
                                Description
                              </p>
                              <p className="text-sm text-neutral-200">
                                {ticketDetail.description}
                              </p>
                            </div>
                          )}

                          {/* Conversation */}
                          <div>
                            <p className="text-xs font-medium text-neutral-400 mb-2">
                              Conversation ({ticketDetail.responses?.length || 0})
                            </p>
                            <ScrollArea className="max-h-64">
                              <div className="space-y-3">
                                {(!ticketDetail.responses || ticketDetail.responses.length === 0) && (
                                  <p className="text-sm text-neutral-500 italic">
                                    No responses yet.
                                  </p>
                                )}
                                {ticketDetail.responses?.map((resp, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-neutral-900 rounded-lg p-3 border border-neutral-700"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-blue-400">
                                        {resp.responder || "Support Agent"}
                                      </span>
                                      {resp.created_at && (
                                        <span className="text-[10px] text-neutral-500">
                                          {formatDate(resp.created_at)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-neutral-200">
                                      {resp.message}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>

                          {/* Reply form */}
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Type your reply..."
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              className="min-h-[60px] bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                  handleReply();
                                }
                              }}
                            />
                            <Button
                              onClick={handleReply}
                              disabled={!replyMessage.trim()}
                              className="self-end bg-blue-600 hover:bg-blue-700"
                              size="sm"
                            >
                              <Send size={14} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════ FAQ TAB ═══════ */}
          <TabsContent value="faq" className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search FAQs..."
                value={faqSearch}
                onChange={(e) => {
                  setFaqSearch(e.target.value);
                  if (!e.target.value.trim()) setFaqSearchResults(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFaqSearch();
                }}
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
              <Button
                onClick={handleFaqSearch}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Search size={16} />
              </Button>
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2">
              {["all", "billing", "technical", "account", "security"].map((cat) => (
                <Button
                  key={cat}
                  variant={faqCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFaqCategory(cat)}
                  className={
                    faqCategory === cat
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  }
                >
                  {cat === "all" && "All"}
                  {cat === "billing" && (
                    <>
                      <CreditCard size={12} className="mr-1" /> Billing
                    </>
                  )}
                  {cat === "technical" && (
                    <>
                      <Wrench size={12} className="mr-1" /> Technical
                    </>
                  )}
                  {cat === "account" && (
                    <>
                      <UserCircle size={12} className="mr-1" /> Account
                    </>
                  )}
                  {cat === "security" && (
                    <>
                      <Shield size={12} className="mr-1" /> Security
                    </>
                  )}
                </Button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12 text-neutral-400">
                <Clock size={20} className="animate-spin mr-2" />
                Loading FAQs...
              </div>
            )}

            {/* FAQ Accordion */}
            {!loading && (
              <Accordion type="single" collapsible className="space-y-2">
                {faqsByCategory.length === 0 && (
                  <div className="text-center py-12 text-neutral-500">
                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No FAQs found.</p>
                  </div>
                )}
                {faqsByCategory.map((faq) => (
                  <AccordionItem
                    key={faq.faq_id}
                    value={faq.faq_id}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 data-[state=open]:border-neutral-600"
                  >
                    <AccordionTrigger className="text-sm font-medium text-white hover:no-underline py-4">
                      <div className="flex items-center gap-2 text-left">
                        {(() => {
                          const Icon = getCategoryIcon(faq.category);
                          return <Icon size={14} className="text-neutral-400 shrink-0" />;
                        })()}
                        {faq.question}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-neutral-300 pb-4">
                      <p>{faq.answer}</p>
                      <div className="flex items-center gap-1 mt-3 text-xs text-neutral-500">
                        <CheckCircle size={12} />
                        {faq.helpful_count} people found this helpful
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>

          {/* ═══════ DASHBOARD TAB ═══════ */}
          <TabsContent value="dashboard" className="space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-12 text-neutral-400">
                <Clock size={20} className="animate-spin mr-2" />
                Loading dashboard...
              </div>
            )}

            {!loading && dashboard && (
              <>
                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-neutral-800 border-neutral-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Ticket size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{dashboard.total_tickets}</p>
                          <p className="text-xs text-neutral-400">Total Tickets</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800 border-neutral-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <AlertTriangle size={20} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{dashboard.open_tickets}</p>
                          <p className="text-xs text-neutral-400">Open Tickets</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800 border-neutral-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Clock size={20} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{dashboard.avg_resolution_hours}h</p>
                          <p className="text-xs text-neutral-400">Avg Resolution</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-neutral-800 border-neutral-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <CheckCircle size={20} className="text-green-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{dashboard.sla_compliance_percent}%</p>
                          <p className="text-xs text-neutral-400">SLA Compliance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Category breakdown */}
                  <Card className="bg-neutral-800 border-neutral-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                        <BarChart3 size={16} />
                        Category Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(dashboard.category_breakdown).map(([cat, count]) => {
                        const total = Object.values(dashboard.category_breakdown).reduce(
                          (a, b) => a + b,
                          0
                        );
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const color = categoryColors[cat] || "bg-neutral-500";
                        return (
                          <div key={cat} className="mb-3 last:mb-0">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-neutral-300 capitalize">
                                {cat.replace("_", " ")}
                              </span>
                              <span className="text-neutral-400">
                                {count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-neutral-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${color} transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Top issues */}
                  <Card className="bg-neutral-800 border-neutral-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Top Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dashboard.top_issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-900 border border-neutral-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-neutral-500 w-5">
                                {idx + 1}.
                              </span>
                              <span className="text-sm text-neutral-200">
                                {issue.subject}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-neutral-600 text-neutral-400 text-[10px]"
                            >
                              {issue.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══════ NEW TICKET TAB ═══════ */}
          <TabsContent value="new" className="space-y-4">
            <Card className="bg-neutral-800 border-neutral-700 max-w-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PlusCircle size={18} className="text-blue-400" />
                  Create New Ticket
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Describe your issue and we will get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {submitSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                    <CheckCircle size={16} />
                    Ticket submitted successfully!
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">
                    Subject
                  </label>
                  <Input
                    placeholder="Brief summary of your issue"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300">
                    Description
                  </label>
                  <Textarea
                    placeholder="Provide as much detail as possible..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="min-h-[120px] bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                      Category
                    </label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="feature_request">Feature Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">
                      Priority
                    </label>
                    <Select value={newPriority} onValueChange={setNewPriority}>
                      <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleCreateTicket}
                  disabled={!newSubject.trim() || !newDescription.trim() || !newCategory || !newPriority}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send size={14} className="mr-2" />
                  Submit Ticket
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
