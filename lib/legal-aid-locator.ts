/**
 * Legal Aid and Tenants' Rights Organization Locator
 *
 * Provides state-specific legal resources for tenants
 * Competitive feature to match TenantGuard AI's attorney locator
 */

export interface LegalResource {
  name: string;
  type: 'Tenants Union' | 'Legal Aid' | 'Tribunal' | 'Regulator' | 'Community Legal Centre';
  state: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  services: string[];
  freeLegalAdvice: boolean;
  urgent: boolean;
}

/**
 * Comprehensive legal resources for Australian tenants by state
 */
export const LEGAL_RESOURCES: LegalResource[] = [
  // VICTORIA
  {
    name: 'Tenants Victoria',
    type: 'Tenants Union',
    state: 'VIC',
    phone: '03 9416 2577',
    email: 'tenantsvic@tenantsvic.org.au',
    website: 'https://tenantsvic.org.au',
    address: 'Level 2, 247 Flinders Lane, Melbourne VIC 3000',
    services: ['Free legal advice', 'Tenancy information', 'Advocacy', 'Tribunal support'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'Victorian Civil and Administrative Tribunal (VCAT)',
    type: 'Tribunal',
    state: 'VIC',
    phone: '1300 018 228',
    email: 'vcat@vcat.vic.gov.au',
    website: 'https://www.vcat.vic.gov.au',
    address: '55 King Street, Melbourne VIC 3000',
    services: ['Dispute resolution', 'Hearings', 'Orders and decisions'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Consumer Affairs Victoria',
    type: 'Regulator',
    state: 'VIC',
    phone: '1300 558 181',
    website: 'https://www.consumer.vic.gov.au/housing/renting',
    services: ['Information', 'Complaints', 'Investigations', 'Bond claims'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Victoria Legal Aid',
    type: 'Legal Aid',
    state: 'VIC',
    phone: '1300 792 387',
    website: 'https://www.legalaid.vic.gov.au',
    services: ['Free legal advice', 'Duty lawyer service', 'Legal representation'],
    freeLegalAdvice: true,
    urgent: true,
  },

  // NEW SOUTH WALES
  {
    name: "Tenants' Union of NSW",
    type: 'Tenants Union',
    state: 'NSW',
    phone: '02 8117 3700',
    email: 'tunsw@tenantsunion.org.au',
    website: 'https://www.tenants.org.au',
    address: 'Suite 201, 55 Holt Street, Surry Hills NSW 2010',
    services: ['Free legal advice', 'Resources', 'Advocacy', 'Advice line'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'NSW Civil and Administrative Tribunal (NCAT)',
    type: 'Tribunal',
    state: 'NSW',
    phone: '1300 006 228',
    email: 'ncat@ncat.nsw.gov.au',
    website: 'https://www.ncat.nsw.gov.au',
    address: 'John Maddison Tower, 86-90 Goulburn Street, Sydney NSW 2000',
    services: ['Tenancy disputes', 'Hearings', 'Orders'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'NSW Fair Trading',
    type: 'Regulator',
    state: 'NSW',
    phone: '13 32 20',
    website: 'https://www.fairtrading.nsw.gov.au',
    services: ['Information', 'Complaints', 'Bond lodgement'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Legal Aid NSW',
    type: 'Legal Aid',
    state: 'NSW',
    phone: '1300 888 529',
    website: 'https://www.legalaid.nsw.gov.au',
    services: ['Free legal advice', 'Grants of legal aid', 'Duty services'],
    freeLegalAdvice: true,
    urgent: true,
  },

  // QUEENSLAND
  {
    name: 'Tenants Queensland',
    type: 'Tenants Union',
    state: 'QLD',
    phone: '1300 744 263',
    email: 'tenantsqld@tenantsqld.org.au',
    website: 'https://tenantsqld.org.au',
    address: '46 Balfour Street, New Farm QLD 4005',
    services: ['Free advice', 'Resources', 'Advocacy', 'Tribunal support'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'Queensland Civil and Administrative Tribunal (QCAT)',
    type: 'Tribunal',
    state: 'QLD',
    phone: '1300 753 228',
    website: 'https://www.qcat.qld.gov.au',
    services: ['Dispute resolution', 'Hearings', 'Orders'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Residential Tenancies Authority (RTA)',
    type: 'Regulator',
    state: 'QLD',
    phone: '1300 366 311',
    website: 'https://www.rta.qld.gov.au',
    services: ['Bond lodgement', 'Dispute resolution', 'Information'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Legal Aid Queensland',
    type: 'Legal Aid',
    state: 'QLD',
    phone: '1300 651 188',
    website: 'https://www.legalaid.qld.gov.au',
    services: ['Free legal advice', 'Duty lawyer', 'Legal representation'],
    freeLegalAdvice: true,
    urgent: true,
  },

  // WESTERN AUSTRALIA
  {
    name: 'Circle Green Community Legal',
    type: 'Community Legal Centre',
    state: 'WA',
    phone: '08 9221 1111',
    website: 'https://www.circlegreen.org.au',
    services: ['Tenancy advice', 'Legal assistance', 'Advocacy'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'WA Magistrates Court',
    type: 'Tribunal',
    state: 'WA',
    phone: '08 9425 2222',
    website: 'https://www.courts.wa.gov.au',
    services: ['Tenancy disputes', 'Hearings'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Consumer Protection WA',
    type: 'Regulator',
    state: 'WA',
    phone: '1300 304 054',
    website: 'https://www.commerce.wa.gov.au/consumer-protection',
    services: ['Tenancy information', 'Bond lodgement', 'Complaints'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Legal Aid WA',
    type: 'Legal Aid',
    state: 'WA',
    phone: '1300 650 579',
    website: 'https://www.legalaid.wa.gov.au',
    services: ['Legal advice', 'Duty lawyer', 'Grants of aid'],
    freeLegalAdvice: true,
    urgent: true,
  },

  // SOUTH AUSTRALIA
  {
    name: 'SA Tenants Advice and Advocacy Service',
    type: 'Tenants Union',
    state: 'SA',
    phone: '08 8223 6500',
    website: 'https://www.syc.net.au/home/housing-options/tenants-advice-advocacy-service/',
    services: ['Free advice', 'Advocacy', 'Tribunal representation'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'South Australian Civil and Administrative Tribunal (SACAT)',
    type: 'Tribunal',
    state: 'SA',
    phone: '1800 723 767',
    website: 'https://www.sacat.sa.gov.au',
    services: ['Dispute resolution', 'Hearings'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Consumer and Business Services SA (CBS)',
    type: 'Regulator',
    state: 'SA',
    phone: '131 882',
    website: 'https://www.cbs.sa.gov.au',
    services: ['Tenancy information', 'Bond lodgement'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Legal Services Commission SA',
    type: 'Legal Aid',
    state: 'SA',
    phone: '1300 366 424',
    website: 'https://www.lsc.sa.gov.au',
    services: ['Free legal advice', 'Duty services', 'Legal representation'],
    freeLegalAdvice: true,
    urgent: true,
  },

  // TASMANIA
  {
    name: 'Tenants Union of Tasmania',
    type: 'Tenants Union',
    state: 'TAS',
    phone: '03 6223 2641',
    email: 'tutas@tutas.org.au',
    website: 'https://www.tutas.org.au',
    services: ['Free advice', 'Resources', 'Advocacy'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'Tasmanian Civil and Administrative Tribunal (TasCAT)',
    type: 'Tribunal',
    state: 'TAS',
    phone: '1800 657 500',
    website: 'https://www.tascat.tas.gov.au',
    services: ['Dispute resolution', 'Hearings'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Consumer, Building and Occupational Services (CBOS)',
    type: 'Regulator',
    state: 'TAS',
    phone: '1300 654 499',
    website: 'https://www.cbos.tas.gov.au',
    services: ['Tenancy information', 'Bond lodgement'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Legal Aid Tasmania',
    type: 'Legal Aid',
    state: 'TAS',
    phone: '1300 366 611',
    website: 'https://www.legalaid.tas.gov.au',
    services: ['Free legal advice', 'Duty lawyer', 'Grants of aid'],
    freeLegalAdvice: true,
    urgent: true,
  },

  // ACT
  {
    name: 'Tenants ACT',
    type: 'Tenants Union',
    state: 'ACT',
    phone: '02 6247 2011',
    email: 'tenantsact@tenantsact.org.au',
    website: 'https://www.tenantsact.org.au',
    services: ['Free advice', 'Advocacy', 'Resources'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'ACT Civil and Administrative Tribunal (ACAT)',
    type: 'Tribunal',
    state: 'ACT',
    phone: '02 6207 1740',
    website: 'https://www.acat.act.gov.au',
    services: ['Dispute resolution', 'Hearings'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Access Canberra',
    type: 'Regulator',
    state: 'ACT',
    phone: '13 22 81',
    website: 'https://www.accesscanberra.act.gov.au',
    services: ['Tenancy information', 'Bond lodgement'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Legal Aid ACT',
    type: 'Legal Aid',
    state: 'ACT',
    phone: '1300 654 314',
    website: 'https://www.legalaidact.org.au',
    services: ['Free legal advice', 'Duty lawyer', 'Legal representation'],
    freeLegalAdvice: true,
    urgent: true,
  },

  // NORTHERN TERRITORY
  {
    name: 'Darwin Community Legal Service',
    type: 'Community Legal Centre',
    state: 'NT',
    phone: '08 8982 1111',
    website: 'https://www.dcls.org.au',
    services: ['Tenancy advice', 'Legal assistance'],
    freeLegalAdvice: true,
    urgent: true,
  },
  {
    name: 'Northern Territory Civil and Administrative Tribunal (NTCAT)',
    type: 'Tribunal',
    state: 'NT',
    phone: '1800 604 622',
    website: 'https://www.ntcat.nt.gov.au',
    services: ['Dispute resolution', 'Hearings'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'Consumer Affairs NT',
    type: 'Regulator',
    state: 'NT',
    phone: '1800 019 319',
    website: 'https://justice.nt.gov.au/attorney-general-and-justice/consumer-affairs',
    services: ['Tenancy information', 'Bond lodgement'],
    freeLegalAdvice: false,
    urgent: false,
  },
  {
    name: 'NT Legal Aid Commission',
    type: 'Legal Aid',
    state: 'NT',
    phone: '1800 019 343',
    website: 'https://www.ntlac.nt.gov.au',
    services: ['Free legal advice', 'Duty lawyer', 'Legal representation'],
    freeLegalAdvice: true,
    urgent: true,
  },
];

/**
 * Get legal resources for a specific state
 */
export function getLegalResourcesByState(state: string): LegalResource[] {
  return LEGAL_RESOURCES.filter(resource => resource.state === state);
}

/**
 * Get urgent/free legal advice resources for a state
 */
export function getUrgentLegalAid(state: string): LegalResource[] {
  return LEGAL_RESOURCES.filter(
    resource =>
      resource.state === state &&
      (resource.freeLegalAdvice === true || resource.urgent === true)
  );
}

/**
 * Get all resources of a specific type
 */
export function getResourcesByType(
  type: LegalResource['type']
): LegalResource[] {
  return LEGAL_RESOURCES.filter(resource => resource.type === type);
}

/**
 * Get tribunal for a state
 */
export function getTribunalForState(state: string): LegalResource | undefined {
  return LEGAL_RESOURCES.find(
    resource => resource.state === state && resource.type === 'Tribunal'
  );
}

/**
 * Get tenants' union for a state
 */
export function getTenantsUnionForState(state: string): LegalResource | undefined {
  return LEGAL_RESOURCES.find(
    resource => resource.state === state && resource.type === 'Tenants Union'
  );
}
