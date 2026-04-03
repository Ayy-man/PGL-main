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
    description: "Equity partners at firms with highest profit per partner — $7M-$9M+ PEP",
    filters: {
      organization_names: [
        "Kirkland & Ellis",
        "Wachtell Lipton Rosen & Katz",
        "Latham & Watkins",
        "Quinn Emanuel Urquhart & Sullivan",
        "Davis Polk & Wardwell",
        "Simpson Thacher & Bartlett",
        "Paul Weiss Rifkind Wharton & Garrison",
        "Sullivan & Cromwell",
        "Cravath Swaine & Moore",
        "Skadden Arps Slate Meagher & Flom"
      ],
      titles: ["Partner", "Managing Partner", "Equity Partner", "Senior Partner"],
      seniorities: ["director", "vp", "c_suite", "owner"],
      industries: ["Law Practice", "Legal Services"]
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
  },
  {
    name: "Prop Trading Elite",
    description: "Traders and quants at top proprietary trading firms — average comp $650K-$1.4M+",
    filters: {
      organization_names: [
        "Jane Street",
        "Citadel Securities",
        "XTX Markets",
        "Hudson River Trading",
        "Jump Trading",
        "Virtu Financial",
        "DRW",
        "Two Sigma",
        "Optiver",
        "IMC Trading",
        "Akuna Capital"
      ],
      titles: ["Trader", "Quantitative Trader", "Quant Researcher", "Quantitative Analyst", "Portfolio Manager"],
      seniorities: ["senior", "manager", "director", "vp"],
      keywords: "quantitative trading"
    }
  },
  {
    name: "Hedge Fund Leaders",
    description: "Portfolio managers and principals at top-performing hedge funds",
    filters: {
      organization_names: [
        "Citadel",
        "Renaissance Technologies",
        "Millennium Management",
        "D.E. Shaw",
        "Two Sigma",
        "Point72 Asset Management",
        "Bridgewater Associates",
        "AQR Capital Management",
        "Balyasny Asset Management",
        "Schonfeld Strategic Advisors",
        "ExodusPoint Capital Management"
      ],
      titles: ["Portfolio Manager", "Managing Director", "Partner", "Principal", "Head of Trading"],
      seniorities: ["c_suite", "vp", "director"],
    }
  },
  {
    name: "Top Tech Earners",
    description: "Senior engineers and leadership at the 20 highest-paying tech companies",
    filters: {
      organization_names: [
        "OpenAI",
        "Anthropic",
        "NVIDIA",
        "Meta",
        "Google",
        "Microsoft",
        "Apple",
        "Amazon",
        "Stripe",
        "Netflix",
        "Palantir",
        "Databricks",
        "Salesforce",
        "Snowflake",
        "Tesla",
        "Uber",
        "Airbnb",
        "Coinbase",
        "LinkedIn",
        "Adobe"
      ],
      titles: ["Staff Engineer", "Principal Engineer", "Distinguished Engineer", "VP of Engineering", "Director of Engineering", "CTO", "VP of Product"],
      seniorities: ["senior", "manager", "director", "vp", "c_suite"],
    }
  }
];
