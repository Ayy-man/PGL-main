import type { CreatePersonaInput } from "./types";

export const STARTER_PERSONAS: CreatePersonaInput[] = [
  {
    name: "Finance Elite",
    description: "C-suite at PE/VC firms, $100M+ AUM",
    filters: {
      titles: ["CEO", "CFO", "CIO", "Managing Director", "Managing Partner", "Partner"],
      seniorities: ["c_suite", "vp", "director"],
      industries: ["Financial Services", "Venture Capital & Private Equity", "Investment Management"],
      companySize: ["51-200", "201-500", "501-1000", "1001-5000", "5001-10000"],
      keywords: "private equity venture capital asset management"
    }
  },
  {
    name: "Tech Execs",
    description: "VP+ at unicorns or public tech companies",
    filters: {
      titles: ["VP", "SVP", "EVP", "CTO", "CPO", "CEO"],
      seniorities: ["c_suite", "vp"],
      industries: ["Computer Software", "Internet", "Information Technology and Services"],
      companySize: ["201-500", "501-1000", "1001-5000", "5001-10000", "10001+"],
      keywords: "technology software SaaS"
    }
  },
  {
    name: "Startup Founders",
    description: "Founder/CEO, Series B+, tech sector",
    filters: {
      titles: ["Founder", "Co-Founder", "CEO", "Co-CEO"],
      seniorities: ["c_suite", "owner"],
      industries: ["Computer Software", "Internet", "Information Technology and Services", "Financial Services"],
      companySize: ["11-50", "51-200", "201-500"],
      keywords: "startup founder series"
    }
  },
  {
    name: "BigLaw Partners",
    description: "Partners at Am Law 200 firms",
    filters: {
      titles: ["Partner", "Managing Partner", "Senior Partner", "Equity Partner", "Named Partner"],
      seniorities: ["c_suite", "vp", "director", "owner"],
      industries: ["Law Practice", "Legal Services"],
      companySize: ["201-500", "501-1000", "1001-5000", "5001-10000"]
    }
  },
  {
    name: "Crypto/Web3",
    description: "Founder/Executive at crypto/blockchain companies",
    filters: {
      titles: ["Founder", "Co-Founder", "CEO", "CTO", "Head of"],
      seniorities: ["c_suite", "vp", "owner"],
      industries: ["Financial Services", "Computer Software", "Internet"],
      keywords: "crypto blockchain web3 defi nft"
    }
  }
];
