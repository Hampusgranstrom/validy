// Seeded dataset representing Swedish housing cooperatives (bostadsrättsföreningar).
// All numbers are in SEK unless noted. Areas in square meters.

export type Cooperative = {
  id: string;
  name: string;
  organization_number: string;
  address: string;
  city: string;
  founded_year: number;
  total_apartments: number;
  total_residential_area_sqm: number;
  total_commercial_area_sqm: number;
  notes: string;
};

export type Loan = {
  id: string;
  cooperative_id: string;
  lender: string;
  principal_amount: number;
  interest_rate: number; // as decimal, e.g. 0.032 = 3.2%
  fixed_until: string | null; // ISO date, null = variable rate
  amortization_per_year: number;
  loan_type: "fixed" | "variable";
};

export type Apartment = {
  id: string;
  cooperative_id: string;
  apartment_number: string;
  area_sqm: number;
  rooms: number;
  floor: number;
  monthly_fee: number;
  share_of_cooperative: number; // andelstal in percent (0..100)
};

export type AnnualReport = {
  id: string;
  cooperative_id: string;
  year: number;
  total_revenue: number;
  total_expenses: number;
  interest_expense: number;
  maintenance_expense: number;
  net_result: number;
  equity: number;
  maintenance_fund: number;
  cash_position: number;
};

export type MaintenanceItem = {
  id: string;
  cooperative_id: string;
  planned_year: number;
  description: string;
  estimated_cost: number;
  status: "planned" | "in_progress" | "completed";
};

export const cooperatives: Cooperative[] = [
  {
    id: "coop-katthuset",
    name: "BRF Katthuset",
    organization_number: "769612-4421",
    address: "Kattvägen 12",
    city: "Stockholm",
    founded_year: 2004,
    total_apartments: 48,
    total_residential_area_sqm: 3210,
    total_commercial_area_sqm: 180,
    notes:
      "Föreningen äger huset med markupplåtelse. Två lokaler hyrs ut till en frisör och en mindre kontorshyresgäst.",
  },
  {
    id: "coop-solrosen",
    name: "BRF Solrosen",
    organization_number: "769605-2210",
    address: "Solrosvägen 4",
    city: "Uppsala",
    founded_year: 1998,
    total_apartments: 32,
    total_residential_area_sqm: 2180,
    total_commercial_area_sqm: 0,
    notes: "Välskött förening med låg belåning och stark kassa.",
  },
  {
    id: "coop-bergskristallen",
    name: "BRF Bergskristallen",
    organization_number: "769622-9087",
    address: "Bergsvägen 28",
    city: "Göteborg",
    founded_year: 2018,
    total_apartments: 64,
    total_residential_area_sqm: 4520,
    total_commercial_area_sqm: 0,
    notes: "Nybyggd förening 2018, hög belåning i förhållande till intäkter.",
  },
  {
    id: "coop-tallgarden",
    name: "BRF Tallgården",
    organization_number: "769608-1144",
    address: "Tallgatan 9",
    city: "Malmö",
    founded_year: 2009,
    total_apartments: 56,
    total_residential_area_sqm: 3900,
    total_commercial_area_sqm: 0,
    notes: "Balanserad ekonomi, stambyte planerat 2027.",
  },
  {
    id: "coop-eklunda",
    name: "BRF Eklunda",
    organization_number: "769599-0021",
    address: "Eklundavägen 2",
    city: "Linköping",
    founded_year: 1985,
    total_apartments: 24,
    total_residential_area_sqm: 1640,
    total_commercial_area_sqm: 60,
    notes: "Äldre förening, nästan skuldfri.",
  },
];

export const loans: Loan[] = [
  // Katthuset – 75 MSEK i lån, blandning av fast och rörligt
  {
    id: "loan-katt-1",
    cooperative_id: "coop-katthuset",
    lender: "SEB",
    principal_amount: 28_000_000,
    interest_rate: 0.0395,
    fixed_until: "2026-09-30",
    amortization_per_year: 280_000,
    loan_type: "fixed",
  },
  {
    id: "loan-katt-2",
    cooperative_id: "coop-katthuset",
    lender: "Handelsbanken",
    principal_amount: 22_000_000,
    interest_rate: 0.041,
    fixed_until: "2027-03-31",
    amortization_per_year: 220_000,
    loan_type: "fixed",
  },
  {
    id: "loan-katt-3",
    cooperative_id: "coop-katthuset",
    lender: "Nordea",
    principal_amount: 15_000_000,
    interest_rate: 0.0355,
    fixed_until: null,
    amortization_per_year: 150_000,
    loan_type: "variable",
  },
  {
    id: "loan-katt-4",
    cooperative_id: "coop-katthuset",
    lender: "Swedbank",
    principal_amount: 10_000_000,
    interest_rate: 0.0362,
    fixed_until: null,
    amortization_per_year: 100_000,
    loan_type: "variable",
  },

  // Solrosen – låg belåning
  {
    id: "loan-sol-1",
    cooperative_id: "coop-solrosen",
    lender: "Handelsbanken",
    principal_amount: 8_500_000,
    interest_rate: 0.029,
    fixed_until: "2028-06-30",
    amortization_per_year: 170_000,
    loan_type: "fixed",
  },

  // Bergskristallen – tungt belånad (nybygge)
  {
    id: "loan-berg-1",
    cooperative_id: "coop-bergskristallen",
    lender: "SBAB",
    principal_amount: 95_000_000,
    interest_rate: 0.043,
    fixed_until: "2026-12-31",
    amortization_per_year: 950_000,
    loan_type: "fixed",
  },
  {
    id: "loan-berg-2",
    cooperative_id: "coop-bergskristallen",
    lender: "Nordea",
    principal_amount: 45_000_000,
    interest_rate: 0.0395,
    fixed_until: null,
    amortization_per_year: 450_000,
    loan_type: "variable",
  },

  // Tallgården
  {
    id: "loan-tall-1",
    cooperative_id: "coop-tallgarden",
    lender: "SEB",
    principal_amount: 32_000_000,
    interest_rate: 0.0345,
    fixed_until: "2027-09-30",
    amortization_per_year: 480_000,
    loan_type: "fixed",
  },
  {
    id: "loan-tall-2",
    cooperative_id: "coop-tallgarden",
    lender: "Swedbank",
    principal_amount: 18_000_000,
    interest_rate: 0.038,
    fixed_until: null,
    amortization_per_year: 270_000,
    loan_type: "variable",
  },

  // Eklunda – nästan skuldfri
  {
    id: "loan-ek-1",
    cooperative_id: "coop-eklunda",
    lender: "Handelsbanken",
    principal_amount: 1_800_000,
    interest_rate: 0.031,
    fixed_until: "2029-03-31",
    amortization_per_year: 90_000,
    loan_type: "fixed",
  },
];

// Apartments – urval per förening (representativt, inte komplett över alla lgh)
export const apartments: Apartment[] = [
  // Katthuset – 48 lgh, vi listar några representativa
  { id: "apt-katt-101", cooperative_id: "coop-katthuset", apartment_number: "101", area_sqm: 42, rooms: 1.5, floor: 1, monthly_fee: 3850, share_of_cooperative: 1.31 },
  { id: "apt-katt-203", cooperative_id: "coop-katthuset", apartment_number: "203", area_sqm: 68, rooms: 2, floor: 2, monthly_fee: 5680, share_of_cooperative: 2.11 },
  { id: "apt-katt-305", cooperative_id: "coop-katthuset", apartment_number: "305", area_sqm: 84, rooms: 3, floor: 3, monthly_fee: 6920, share_of_cooperative: 2.62 },
  { id: "apt-katt-407", cooperative_id: "coop-katthuset", apartment_number: "407", area_sqm: 112, rooms: 4, floor: 4, monthly_fee: 8740, share_of_cooperative: 3.49 },
  { id: "apt-katt-501", cooperative_id: "coop-katthuset", apartment_number: "501", area_sqm: 138, rooms: 5, floor: 5, monthly_fee: 10550, share_of_cooperative: 4.30 },

  { id: "apt-sol-12", cooperative_id: "coop-solrosen", apartment_number: "12", area_sqm: 72, rooms: 3, floor: 2, monthly_fee: 4100, share_of_cooperative: 3.30 },
  { id: "apt-sol-22", cooperative_id: "coop-solrosen", apartment_number: "22", area_sqm: 96, rooms: 4, floor: 3, monthly_fee: 5300, share_of_cooperative: 4.41 },

  { id: "apt-berg-14", cooperative_id: "coop-bergskristallen", apartment_number: "14", area_sqm: 65, rooms: 2, floor: 2, monthly_fee: 7950, share_of_cooperative: 1.44 },
  { id: "apt-berg-44", cooperative_id: "coop-bergskristallen", apartment_number: "44", area_sqm: 102, rooms: 4, floor: 5, monthly_fee: 12450, share_of_cooperative: 2.26 },

  { id: "apt-tall-08", cooperative_id: "coop-tallgarden", apartment_number: "08", area_sqm: 70, rooms: 3, floor: 1, monthly_fee: 4980, share_of_cooperative: 1.80 },
  { id: "apt-tall-31", cooperative_id: "coop-tallgarden", apartment_number: "31", area_sqm: 95, rooms: 4, floor: 4, monthly_fee: 6720, share_of_cooperative: 2.44 },

  { id: "apt-ek-3", cooperative_id: "coop-eklunda", apartment_number: "3", area_sqm: 78, rooms: 3, floor: 1, monthly_fee: 2980, share_of_cooperative: 4.76 },
];

export const annual_reports: AnnualReport[] = [
  // Katthuset
  {
    id: "ar-katt-2023", cooperative_id: "coop-katthuset", year: 2023,
    total_revenue: 5_240_000, total_expenses: 5_120_000,
    interest_expense: 2_010_000, maintenance_expense: 720_000,
    net_result: 120_000, equity: 18_400_000, maintenance_fund: 2_100_000, cash_position: 3_200_000,
  },
  {
    id: "ar-katt-2024", cooperative_id: "coop-katthuset", year: 2024,
    total_revenue: 5_580_000, total_expenses: 5_710_000,
    interest_expense: 2_640_000, maintenance_expense: 760_000,
    net_result: -130_000, equity: 18_270_000, maintenance_fund: 2_180_000, cash_position: 2_810_000,
  },
  {
    id: "ar-katt-2025", cooperative_id: "coop-katthuset", year: 2025,
    total_revenue: 5_820_000, total_expenses: 5_770_000,
    interest_expense: 2_805_000, maintenance_expense: 790_000,
    net_result: 50_000, equity: 18_320_000, maintenance_fund: 2_240_000, cash_position: 2_640_000,
  },

  // Solrosen
  {
    id: "ar-sol-2024", cooperative_id: "coop-solrosen", year: 2024,
    total_revenue: 2_140_000, total_expenses: 1_910_000,
    interest_expense: 248_000, maintenance_expense: 380_000,
    net_result: 230_000, equity: 12_200_000, maintenance_fund: 1_840_000, cash_position: 3_100_000,
  },
  {
    id: "ar-sol-2025", cooperative_id: "coop-solrosen", year: 2025,
    total_revenue: 2_180_000, total_expenses: 1_930_000,
    interest_expense: 248_000, maintenance_expense: 390_000,
    net_result: 250_000, equity: 12_450_000, maintenance_fund: 1_910_000, cash_position: 3_280_000,
  },

  // Bergskristallen
  {
    id: "ar-berg-2024", cooperative_id: "coop-bergskristallen", year: 2024,
    total_revenue: 8_640_000, total_expenses: 8_910_000,
    interest_expense: 5_870_000, maintenance_expense: 410_000,
    net_result: -270_000, equity: 9_100_000, maintenance_fund: 980_000, cash_position: 1_840_000,
  },
  {
    id: "ar-berg-2025", cooperative_id: "coop-bergskristallen", year: 2025,
    total_revenue: 9_120_000, total_expenses: 9_320_000,
    interest_expense: 5_860_000, maintenance_expense: 480_000,
    net_result: -200_000, equity: 8_900_000, maintenance_fund: 1_040_000, cash_position: 1_720_000,
  },

  // Tallgården
  {
    id: "ar-tall-2024", cooperative_id: "coop-tallgarden", year: 2024,
    total_revenue: 4_980_000, total_expenses: 4_810_000,
    interest_expense: 1_790_000, maintenance_expense: 650_000,
    net_result: 170_000, equity: 16_400_000, maintenance_fund: 2_800_000, cash_position: 2_910_000,
  },
  {
    id: "ar-tall-2025", cooperative_id: "coop-tallgarden", year: 2025,
    total_revenue: 5_080_000, total_expenses: 4_920_000,
    interest_expense: 1_790_000, maintenance_expense: 690_000,
    net_result: 160_000, equity: 16_560_000, maintenance_fund: 2_860_000, cash_position: 3_010_000,
  },

  // Eklunda
  {
    id: "ar-ek-2024", cooperative_id: "coop-eklunda", year: 2024,
    total_revenue: 980_000, total_expenses: 870_000,
    interest_expense: 56_000, maintenance_expense: 240_000,
    net_result: 110_000, equity: 8_200_000, maintenance_fund: 1_420_000, cash_position: 2_160_000,
  },
  {
    id: "ar-ek-2025", cooperative_id: "coop-eklunda", year: 2025,
    total_revenue: 1_010_000, total_expenses: 880_000,
    interest_expense: 56_000, maintenance_expense: 250_000,
    net_result: 130_000, equity: 8_330_000, maintenance_fund: 1_470_000, cash_position: 2_290_000,
  },
];

export const maintenance_plan: MaintenanceItem[] = [
  { id: "mp-katt-1", cooperative_id: "coop-katthuset", planned_year: 2026, description: "Takomläggning, etapp 1", estimated_cost: 1_400_000, status: "planned" },
  { id: "mp-katt-2", cooperative_id: "coop-katthuset", planned_year: 2028, description: "Stamspolning och relining", estimated_cost: 2_800_000, status: "planned" },
  { id: "mp-katt-3", cooperative_id: "coop-katthuset", planned_year: 2030, description: "Fönsterbyte gemensamma utrymmen", estimated_cost: 900_000, status: "planned" },

  { id: "mp-sol-1", cooperative_id: "coop-solrosen", planned_year: 2027, description: "Fasadputs", estimated_cost: 620_000, status: "planned" },

  { id: "mp-berg-1", cooperative_id: "coop-bergskristallen", planned_year: 2031, description: "Garageunderhåll", estimated_cost: 1_100_000, status: "planned" },

  { id: "mp-tall-1", cooperative_id: "coop-tallgarden", planned_year: 2027, description: "Stambyte", estimated_cost: 8_500_000, status: "planned" },
  { id: "mp-tall-2", cooperative_id: "coop-tallgarden", planned_year: 2029, description: "Yttertak", estimated_cost: 1_700_000, status: "planned" },

  { id: "mp-ek-1", cooperative_id: "coop-eklunda", planned_year: 2026, description: "Trapphusrenovering", estimated_cost: 480_000, status: "planned" },
];

export const schema_summary = `
Tabeller i datasetet:

cooperatives(id, name, organization_number, address, city, founded_year,
  total_apartments, total_residential_area_sqm, total_commercial_area_sqm, notes)

loans(id, cooperative_id → cooperatives.id, lender, principal_amount,
  interest_rate, fixed_until, amortization_per_year, loan_type)

apartments(id, cooperative_id, apartment_number, area_sqm, rooms, floor,
  monthly_fee, share_of_cooperative)

annual_reports(id, cooperative_id, year, total_revenue, total_expenses,
  interest_expense, maintenance_expense, net_result, equity, maintenance_fund,
  cash_position)

maintenance_plan(id, cooperative_id, planned_year, description, estimated_cost, status)

Notering: monthly_fee är per månad i SEK. interest_rate uttrycks som decimal
(0.039 = 3.9%). share_of_cooperative är andelstal i procent. principal_amount
är kvarvarande skuld i SEK.
`.trim();
