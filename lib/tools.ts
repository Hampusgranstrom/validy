import {
  cooperatives,
  loans,
  apartments,
  annual_reports,
  maintenance_plan,
  type Cooperative,
} from "./data";

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export const tools: ToolDefinition[] = [
  {
    name: "list_cooperatives",
    description:
      "Listar alla bostadsrättsföreningar i datasetet med id, namn och stad. Använd om du behöver översikt eller om användaren inte angett en specifik förening.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_cooperatives",
    description:
      "Söker efter bostadsrättsföreningar via namn eller adress. Skiftlägesokänslig delsträngs-matchning.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Söksträng, t.ex. 'katthuset' eller 'Uppsala'." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_cooperative",
    description:
      "Hämtar fullständig information om en förening, inklusive lån, lägenheter (urval), senaste årsredovisning och underhållsplan. Använd när användaren ställer en fråga om en specifik förening.",
    input_schema: {
      type: "object",
      properties: {
        cooperative_id: { type: "string", description: "Föreningens id, t.ex. 'coop-katthuset'." },
      },
      required: ["cooperative_id"],
    },
  },
  {
    name: "list_loans",
    description: "Listar alla lån för en given förening.",
    input_schema: {
      type: "object",
      properties: { cooperative_id: { type: "string" } },
      required: ["cooperative_id"],
    },
  },
  {
    name: "list_apartments",
    description: "Listar urvalet av lägenheter som finns registrerade för en förening.",
    input_schema: {
      type: "object",
      properties: { cooperative_id: { type: "string" } },
      required: ["cooperative_id"],
    },
  },
  {
    name: "get_annual_reports",
    description:
      "Returnerar alla årsredovisningar för en förening, sorterade per år (senaste först).",
    input_schema: {
      type: "object",
      properties: { cooperative_id: { type: "string" } },
      required: ["cooperative_id"],
    },
  },
  {
    name: "get_maintenance_plan",
    description: "Returnerar underhållsplan för en förening.",
    input_schema: {
      type: "object",
      properties: { cooperative_id: { type: "string" } },
      required: ["cooperative_id"],
    },
  },
  {
    name: "simulate_interest_change",
    description:
      "Räknar fram konsekvensen av en räntejustering för en förening. Lägger angiven delta_percentage_points (i procentenheter, t.ex. 2 = +2pp) på alla lån och beräknar ny årlig räntekostnad, förändring jämfört med nuläget, samt vilken månadsavgiftshöjning per kvm och per lägenhet som krävs för att kompensera fullt ut. Returnerar både aggregerade siffror och per-lån.",
    input_schema: {
      type: "object",
      properties: {
        cooperative_id: { type: "string" },
        delta_percentage_points: {
          type: "number",
          description: "Förändring i procentenheter, kan vara negativ. 2 betyder +2pp.",
        },
      },
      required: ["cooperative_id", "delta_percentage_points"],
    },
  },
  {
    name: "compare_cooperatives",
    description:
      "Jämför nyckeltal mellan två eller fler föreningar: belåning per kvm, räntekostnad/intäkter, snittavgift och kassa.",
    input_schema: {
      type: "object",
      properties: {
        cooperative_ids: {
          type: "array",
          items: { type: "string" },
          description: "Lista av föreningens id:n.",
        },
      },
      required: ["cooperative_ids"],
    },
  },
];

function findCoop(id: string): Cooperative | undefined {
  return cooperatives.find((c) => c.id === id);
}

function aggregateLoans(coopId: string) {
  const ls = loans.filter((l) => l.cooperative_id === coopId);
  const total = ls.reduce((s, l) => s + l.principal_amount, 0);
  const weightedRate =
    total === 0 ? 0 : ls.reduce((s, l) => s + l.principal_amount * l.interest_rate, 0) / total;
  const annualInterest = ls.reduce((s, l) => s + l.principal_amount * l.interest_rate, 0);
  return { loans: ls, total_debt: total, weighted_avg_rate: weightedRate, annual_interest_expense: annualInterest };
}

function latestReport(coopId: string) {
  return annual_reports
    .filter((r) => r.cooperative_id === coopId)
    .sort((a, b) => b.year - a.year)[0];
}

export async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_cooperatives": {
      return cooperatives.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        total_apartments: c.total_apartments,
      }));
    }

    case "search_cooperatives": {
      const q = String(input.query ?? "").toLowerCase().trim();
      return cooperatives
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.address.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.organization_number.includes(q),
        )
        .map((c) => ({ id: c.id, name: c.name, city: c.city, address: c.address }));
    }

    case "get_cooperative": {
      const id = String(input.cooperative_id);
      const coop = findCoop(id);
      if (!coop) return { error: `Hittade ingen förening med id ${id}` };
      const { loans: ls, total_debt, weighted_avg_rate, annual_interest_expense } = aggregateLoans(id);
      const apts = apartments.filter((a) => a.cooperative_id === id);
      const reports = annual_reports
        .filter((r) => r.cooperative_id === id)
        .sort((a, b) => b.year - a.year);
      const plan = maintenance_plan.filter((m) => m.cooperative_id === id);
      return {
        cooperative: coop,
        loans: ls,
        loan_summary: {
          total_debt,
          weighted_avg_rate,
          annual_interest_expense,
          debt_per_sqm: total_debt / coop.total_residential_area_sqm,
        },
        apartments_sample: apts,
        annual_reports: reports,
        maintenance_plan: plan,
      };
    }

    case "list_loans": {
      const id = String(input.cooperative_id);
      const agg = aggregateLoans(id);
      return agg;
    }

    case "list_apartments": {
      const id = String(input.cooperative_id);
      return apartments.filter((a) => a.cooperative_id === id);
    }

    case "get_annual_reports": {
      const id = String(input.cooperative_id);
      return annual_reports
        .filter((r) => r.cooperative_id === id)
        .sort((a, b) => b.year - a.year);
    }

    case "get_maintenance_plan": {
      const id = String(input.cooperative_id);
      return maintenance_plan.filter((m) => m.cooperative_id === id);
    }

    case "simulate_interest_change": {
      const id = String(input.cooperative_id);
      const delta = Number(input.delta_percentage_points) / 100;
      const coop = findCoop(id);
      if (!coop) return { error: `Hittade ingen förening med id ${id}` };
      const ls = loans.filter((l) => l.cooperative_id === id);
      const report = latestReport(id);

      const perLoan = ls.map((l) => {
        const currentAnnual = l.principal_amount * l.interest_rate;
        const newRate = l.interest_rate + delta;
        const newAnnual = l.principal_amount * newRate;
        return {
          loan_id: l.id,
          lender: l.lender,
          loan_type: l.loan_type,
          fixed_until: l.fixed_until,
          principal_amount: l.principal_amount,
          current_rate: l.interest_rate,
          new_rate: newRate,
          current_annual_interest: currentAnnual,
          new_annual_interest: newAnnual,
          delta_annual: newAnnual - currentAnnual,
        };
      });

      const currentTotal = perLoan.reduce((s, x) => s + x.current_annual_interest, 0);
      const newTotal = perLoan.reduce((s, x) => s + x.new_annual_interest, 0);
      const deltaAnnual = newTotal - currentTotal;
      const deltaMonthly = deltaAnnual / 12;

      const required_monthly_fee_per_sqm = deltaMonthly / coop.total_residential_area_sqm;
      const required_monthly_fee_per_apartment = deltaMonthly / coop.total_apartments;

      // Note: when fixed_until is in the future the rate change only impacts the
      // loan when renegotiated. Compute "immediate impact" (variable only) too.
      const today = new Date().toISOString().slice(0, 10);
      const immediate = perLoan.filter(
        (x) => x.loan_type === "variable" || (x.fixed_until && x.fixed_until <= today),
      );
      const immediateDeltaAnnual = immediate.reduce((s, x) => s + x.delta_annual, 0);

      return {
        cooperative: { id: coop.id, name: coop.name },
        delta_percentage_points: Number(input.delta_percentage_points),
        per_loan: perLoan,
        totals: {
          current_annual_interest: currentTotal,
          new_annual_interest_if_all_repriced: newTotal,
          delta_annual_if_all_repriced: deltaAnnual,
          delta_monthly_if_all_repriced: deltaMonthly,
          immediate_delta_annual_variable_only: immediateDeltaAnnual,
          immediate_delta_monthly_variable_only: immediateDeltaAnnual / 12,
        },
        fee_impact_if_fully_passed_on: {
          required_monthly_fee_per_sqm,
          required_monthly_fee_per_apartment_average: required_monthly_fee_per_apartment,
        },
        latest_report_context: report
          ? {
              year: report.year,
              total_revenue: report.total_revenue,
              net_result: report.net_result,
              cash_position: report.cash_position,
              new_implied_net_result: report.net_result - deltaAnnual,
              new_implied_net_result_variable_only: report.net_result - immediateDeltaAnnual,
            }
          : null,
      };
    }

    case "compare_cooperatives": {
      const ids = (input.cooperative_ids as string[]) ?? [];
      return ids.map((id) => {
        const coop = findCoop(id);
        if (!coop) return { id, error: "not found" };
        const agg = aggregateLoans(id);
        const r = latestReport(id);
        const apts = apartments.filter((a) => a.cooperative_id === id);
        const avgFee =
          apts.length === 0
            ? null
            : apts.reduce((s, a) => s + a.monthly_fee / a.area_sqm, 0) / apts.length;
        return {
          id: coop.id,
          name: coop.name,
          city: coop.city,
          total_apartments: coop.total_apartments,
          total_residential_area_sqm: coop.total_residential_area_sqm,
          total_debt: agg.total_debt,
          debt_per_sqm: agg.total_debt / coop.total_residential_area_sqm,
          weighted_avg_rate: agg.weighted_avg_rate,
          annual_interest_expense: agg.annual_interest_expense,
          latest_year: r?.year,
          latest_net_result: r?.net_result,
          cash_position: r?.cash_position,
          maintenance_fund: r?.maintenance_fund,
          avg_monthly_fee_per_sqm_sample: avgFee,
        };
      });
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
