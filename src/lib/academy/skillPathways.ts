/** Evidence-aware career pathway suggestions. Illustrative until grounded in verified market datasets. */
export interface SkillPathway {
  id: string; title: string; prerequisite: string; outcomes: string[];
  reasons: [string,string,string]; labs: string[]; roles: string[];
  evidenceStatus: "illustrative" | "verified"; sourceUrls: string[];
}
export const AFRICA_SKILL_PATHWAYS: SkillPathway[] = [
  {id:"network-cloud",title:"Networking → Cloud Support",prerequisite:"Basic computer literacy",outcomes:["IPv4/subnetting","Linux fundamentals","Cloud virtual networks"],reasons:["Networking concepts underpin cloud infrastructure","Hands-on troubleshooting can be demonstrated in labs","Provides a foundation for infrastructure and security specialisation"],labs:["Build and troubleshoot a LAN","Configure a simulated cloud VPC and subnet"],roles:["IT support trainee","Network support trainee","Cloud support trainee"],evidenceStatus:"illustrative",sourceUrls:[]},
  {id:"ai-automation",title:"Python → AI & Workflow Automation",prerequisite:"Basic computer literacy",outcomes:["Python scripting","Data handling","AI evaluation and safety"],reasons:["Automating repeatable tasks is useful across sectors","Portfolio projects demonstrate practical ability","AI systems require human oversight and quality evaluation"],labs:["Automate a spreadsheet workflow","Evaluate an AI assistant on a test dataset"],roles:["Junior automation developer","AI operations assistant"],evidenceStatus:"illustrative",sourceUrls:[]},
  {id:"cyber-operations",title:"Networking → Cybersecurity Operations",prerequisite:"Networking fundamentals recommended",outcomes:["TCP/IP","Log analysis","Access controls"],reasons:["Security work depends on understanding networks and systems","Incident exercises build transferable diagnostic skills","Operational security involves ongoing monitoring and response"],labs:["Investigate simulated suspicious traffic","Triage a sample security alert"],roles:["SOC trainee","Junior security analyst"],evidenceStatus:"illustrative",sourceUrls:[]},
  {id:"service-management",title:"ITIL v5 → IT Service Management",prerequisite:"No technical prerequisite for introductory learning",outcomes:["Service value","Incident and request workflows","Continual improvement"],reasons:["Service management connects technology work to user outcomes","Scenario decisions practise prioritisation and communication","Can complement networking, cloud and support skills"],labs:["Triage a simulated service incident","Design a service improvement plan"],roles:["Service desk trainee","IT operations coordinator"],evidenceStatus:"illustrative",sourceUrls:[]},
  {id:"data",title:"SQL → Data Analytics",prerequisite:"Basic spreadsheets",outcomes:["SQL querying","Data quality","Visual reporting"],reasons:["Many organisations need reliable reporting","Analytical projects can be assessed using real datasets","Data literacy supports cloud and AI learning"],labs:["Clean an anonymised dataset","Build a decision dashboard"],roles:["Junior reporting analyst","Data analyst trainee"],evidenceStatus:"illustrative",sourceUrls:[]},
];
export type LearnerGoal = "first-job" | "career-change" | "cloud" | "ai" | "security" | "it-service";
const GOAL_PREFERENCES: Record<LearnerGoal,string[]> = {
  "first-job":["network-cloud","service-management","data"],
  "career-change":["data","network-cloud","ai-automation"],
  cloud:["network-cloud","cyber-operations","ai-automation"],
  ai:["ai-automation","data","network-cloud"],
  security:["cyber-operations","network-cloud","service-management"],
  "it-service":["service-management","network-cloud","cyber-operations"],
};
export function recommendLearningPaths(goal: LearnerGoal, count=3): SkillPathway[] {
  if (!GOAL_PREFERENCES[goal]) throw new RangeError("Unknown learner goal");
  return GOAL_PREFERENCES[goal].slice(0,Math.max(0,Math.min(3,count))).map(id=>AFRICA_SKILL_PATHWAYS.find(p=>p.id===id)!);
}
